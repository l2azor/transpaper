#!/usr/bin/env python3
"""
한국어 번역 PDF 생성 스크립트
reportlab Platypus를 사용하여 번역된 논문을 A4 PDF로 생성한다.

Usage:
    python build_pdf.py <output_dir> <output_pdf>

Example:
    python build_pdf.py output/ output/translated_paper.pdf

Expected input files in output_dir:
    - structure.json      (원문 구조)
    - translated_meta.json (번역된 제목/초록/키워드)
    - sec_*.json          (섹션별 번역 결과)
"""

import json
import os
import sys
import glob
import re

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    KeepTogether,
    Image as RLImage,
)
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def setup_korean_font():
    """한글 폰트를 등록한다. NotoSansKR → AppleSDGothicNeo 폴백."""
    font_candidates = [
        ("NotoSansKR", "fonts/NotoSansKR-Regular.ttf", None),
        ("AppleSDGothicNeo", "/System/Library/Fonts/AppleSDGothicNeo.ttc", 0),
    ]

    for font_name, font_path, sub_index in font_candidates:
        if not os.path.exists(font_path):
            continue
        try:
            if sub_index is not None:
                pdfmetrics.registerFont(TTFont(font_name, font_path, subfontIndex=sub_index))
            else:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
            print(f"Font loaded: {font_name} from {font_path}")
            return font_name
        except Exception as e:
            print(f"Warning: Failed to load {font_name}: {e}")
            continue

    print("Warning: No Korean font found. Using Helvetica (Korean may not render)")
    return "Helvetica"


def xml_escape(text):
    """reportlab Paragraph에서 사용할 수 있도록 XML 특수문자를 이스케이프한다."""
    if not text:
        return ""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    # 줄바꿈을 <br/> 로 변환
    text = text.replace("\n", "<br/>")
    return text


def create_styles(font_name):
    """PDF 스타일을 정의한다."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="KoreanTitle",
        fontName=font_name,
        fontSize=16,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=6 * mm,
        spaceBefore=4 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanAuthor",
        fontName=font_name,
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        spaceAfter=2 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanAbstractLabel",
        fontName=font_name,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
        fontWeight="bold",
    ))

    styles.add(ParagraphStyle(
        name="KoreanAbstract",
        fontName=font_name,
        fontSize=9,
        leading=14,
        alignment=TA_JUSTIFY,
        leftIndent=15 * mm,
        rightIndent=15 * mm,
        spaceAfter=4 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanKeywords",
        fontName=font_name,
        fontSize=9,
        leading=13,
        alignment=TA_LEFT,
        leftIndent=15 * mm,
        rightIndent=15 * mm,
        spaceAfter=6 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanH1",
        fontName=font_name,
        fontSize=13,
        leading=18,
        spaceBefore=8 * mm,
        spaceAfter=3 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanH2",
        fontName=font_name,
        fontSize=11,
        leading=16,
        spaceBefore=5 * mm,
        spaceAfter=2 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanH3",
        fontName=font_name,
        fontSize=10,
        leading=14,
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanBody",
        fontName=font_name,
        fontSize=10,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=2 * mm,
        firstLineIndent=5 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanCaption",
        fontName=font_name,
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        spaceBefore=2 * mm,
        spaceAfter=4 * mm,
        textColor=colors.HexColor("#333333"),
    ))

    styles.add(ParagraphStyle(
        name="KoreanReference",
        fontName=font_name,
        fontSize=8,
        leading=12,
        spaceAfter=1 * mm,
        leftIndent=5 * mm,
        firstLineIndent=-5 * mm,
    ))

    styles.add(ParagraphStyle(
        name="KoreanFootnote",
        fontName=font_name,
        fontSize=8,
        leading=11,
        leftIndent=10 * mm,
        textColor=colors.HexColor("#555555"),
    ))

    return styles


def split_paragraphs(text):
    """텍스트를 문단으로 분리한다. 빈 줄 기준."""
    if not text:
        return []
    paragraphs = re.split(r'\n\s*\n', text.strip())
    return [p.strip() for p in paragraphs if p.strip()]


def make_figure_elements(fig, figures_dir, styles):
    """Figure/Table 이미지와 캡션을 KeepTogether로 묶어 반환한다."""
    elements = []
    fig_id = fig.get("id", "")
    caption = fig.get("translated_caption", fig.get("caption", ""))
    img_path = os.path.join(figures_dir, f"{fig_id}.png")

    if os.path.exists(img_path):
        img = RLImage(img_path)
        # A4 본문 폭(160mm)에 맞게 비율 조정
        max_w = 160 * mm
        max_h = 220 * mm  # 페이지 높이 제한
        img_w = img.imageWidth
        img_h = img.imageHeight
        ratio = min(max_w / img_w, max_h / img_h, 1.0)
        img.drawWidth = img_w * ratio
        img.drawHeight = img_h * ratio
        img.hAlign = "CENTER"
        elements.append(Spacer(1, 3 * mm))
        elements.append(img)

    if caption:
        elements.append(Paragraph(xml_escape(caption), styles["KoreanCaption"]))

    if elements:
        return [KeepTogether(elements)]
    return []


def build_pdf(output_dir, output_pdf):
    """번역 결과를 조합하여 PDF를 생성한다."""

    # figures 디렉토리
    figures_dir = os.path.join(output_dir, "figures")

    # 입력 파일 로드
    structure_path = os.path.join(output_dir, "structure.json")
    meta_path = os.path.join(output_dir, "translated_meta.json")

    if not os.path.exists(structure_path):
        print(f"Error: structure.json not found at {structure_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(meta_path):
        print(f"Error: translated_meta.json not found at {meta_path}", file=sys.stderr)
        sys.exit(1)

    with open(structure_path, "r", encoding="utf-8") as f:
        structure = json.load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # 섹션별 번역 파일 로드
    sec_files = sorted(glob.glob(os.path.join(output_dir, "sec_*.json")))
    translated_sections = {}
    for sf in sec_files:
        with open(sf, "r", encoding="utf-8") as f:
            sec_data = json.load(f)
            translated_sections[sec_data["id"]] = sec_data

    print(f"Loaded {len(translated_sections)} translated sections")

    # 폰트 설정
    font_name = setup_korean_font()

    # 스타일 생성
    styles = create_styles(font_name)

    # PDF 문서 생성
    os.makedirs(os.path.dirname(output_pdf) or ".", exist_ok=True)

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
    )

    story = []

    # 1. 제목
    title_text = xml_escape(meta.get("translated_title", structure.get("title", "")))
    story.append(Paragraph(title_text, styles["KoreanTitle"]))

    # 2. 저자 정보
    authors = structure.get("authors", [])
    if authors:
        author_names = ", ".join(a.get("name", "") for a in authors)
        story.append(Paragraph(xml_escape(author_names), styles["KoreanAuthor"]))

        # 소속
        affiliations = structure.get("affiliations", [])
        if affiliations:
            for aff in affiliations:
                aff_text = f"{aff.get('id', '')}. {aff.get('name', '')}"
                story.append(Paragraph(xml_escape(aff_text), styles["KoreanAuthor"]))

    story.append(Spacer(1, 4 * mm))

    # 3. 초록
    story.append(Paragraph("초록 (Abstract)", styles["KoreanAbstractLabel"]))
    abstract_text = meta.get("translated_abstract", "")
    for para in split_paragraphs(abstract_text):
        story.append(Paragraph(xml_escape(para), styles["KoreanAbstract"]))

    # 4. 키워드
    keywords = meta.get("translated_keywords", [])
    if keywords:
        kw_text = "<b>키워드:</b> " + "; ".join(xml_escape(k) for k in keywords)
        story.append(Paragraph(kw_text, styles["KoreanKeywords"]))

    story.append(Spacer(1, 4 * mm))

    # 5. 본문 섹션
    for section in structure.get("sections", []):
        sec_id = section["id"]
        level = section.get("level", 1)
        number = section.get("number", "")

        trans = translated_sections.get(sec_id)
        if not trans:
            print(f"Warning: No translation for section {sec_id}, using original")
            sec_title = section.get("title", "")
            sec_content = section.get("content", "")
            sec_figures = section.get("figures", [])
            sec_tables = section.get("tables", [])
        else:
            sec_title = trans.get("translated_title", section.get("title", ""))
            sec_content = trans.get("translated_content", "")
            sec_figures = trans.get("translated_figures", [])
            sec_tables = trans.get("translated_tables", [])

        # 섹션 제목
        title_prefix = f"{number}. " if number else ""
        heading_text = xml_escape(f"{title_prefix}{sec_title}")

        if level == 1:
            style_name = "KoreanH1"
        elif level == 2:
            style_name = "KoreanH2"
        else:
            style_name = "KoreanH3"

        story.append(Paragraph(heading_text, styles[style_name]))

        # 본문 내용 (문단 분리)
        for para in split_paragraphs(sec_content):
            story.append(Paragraph(xml_escape(para), styles["KoreanBody"]))

        # Figure 이미지 + 캡션
        for fig in sec_figures:
            story.extend(make_figure_elements(fig, figures_dir, styles))

        # Table 이미지 + 캡션
        for tbl in sec_tables:
            story.extend(make_figure_elements(tbl, figures_dir, styles))

        # 각주 (인라인 처리)
        footnotes = trans.get("translated_footnotes", []) if trans else []
        for fn in footnotes:
            story.append(Paragraph(xml_escape(fn), styles["KoreanFootnote"]))

        # 서브섹션 처리
        subsections = section.get("subsections", [])
        for subsec in subsections:
            sub_id = subsec.get("id", "")
            sub_trans = translated_sections.get(sub_id)

            sub_title = subsec.get("title", "")
            sub_content = subsec.get("content", "")
            sub_number = subsec.get("number", "")
            sub_figures = subsec.get("figures", [])
            sub_tables = subsec.get("tables", [])

            if sub_trans:
                sub_title = sub_trans.get("translated_title", sub_title)
                sub_content = sub_trans.get("translated_content", sub_content)
                sub_figures = sub_trans.get("translated_figures", sub_figures)
                sub_tables = sub_trans.get("translated_tables", sub_tables)

            sub_prefix = f"{sub_number}. " if sub_number else ""
            story.append(Paragraph(
                xml_escape(f"{sub_prefix}{sub_title}"),
                styles["KoreanH2" if level == 1 else "KoreanH3"],
            ))

            for para in split_paragraphs(sub_content):
                story.append(Paragraph(xml_escape(para), styles["KoreanBody"]))

            # 서브섹션 Figure 이미지 + 캡션
            for fig in sub_figures:
                story.extend(make_figure_elements(fig, figures_dir, styles))

            # 서브섹션 Table 이미지 + 캡션
            for tbl in sub_tables:
                story.extend(make_figure_elements(tbl, figures_dir, styles))

    # 6. 참고문헌
    references = structure.get("references", "")
    if references:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph("참고문헌 (References)", styles["KoreanH1"]))
        for ref_line in references.strip().split("\n"):
            ref_line = ref_line.strip()
            if ref_line:
                story.append(Paragraph(xml_escape(ref_line), styles["KoreanReference"]))

    # PDF 빌드
    total_elements = len(story)
    try:
        doc.build(story)
        print(f"PDF generated: {output_pdf}")
        print(f"Total elements: {total_elements}")
    except Exception as e:
        print(f"Error building PDF: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python build_pdf.py <output_dir> <output_pdf>")
        print("Example: python build_pdf.py output/ output/translated_paper.pdf")
        sys.exit(1)

    build_pdf(sys.argv[1], sys.argv[2])
