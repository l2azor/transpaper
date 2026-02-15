#!/usr/bin/env python3
"""
원본 PDF에서 그림(Figure)과 표(Table) 영역을 이미지로 추출하는 스크립트.
PyMuPDF(fitz)를 사용하여 캡션 위치 기반으로 영역을 크롭한다.

Usage:
    python extract_figures.py <source_pdf> <structure_json> <output_dir>

Example:
    python extract_figures.py input/paper.pdf output/structure.json output/
"""

import fitz  # PyMuPDF
import json
import os
import sys


def find_caption_rect(page, search_text):
    """페이지에서 캡션 텍스트를 검색하여 위치를 반환한다."""
    results = page.search_for(search_text)
    if results:
        return results[0]  # 첫 번째 매치의 Rect
    return None


def get_text_blocks_sorted(page):
    """페이지의 텍스트 블록을 y좌표 순으로 정렬하여 반환한다."""
    blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
    text_blocks = [b for b in blocks if b[6] == 0]  # block_type 0 = text
    text_blocks.sort(key=lambda b: b[1])  # y0 기준 정렬
    return text_blocks


def extract_figure_region(page, caption_search, page_rect, dpi=200):
    """캡션 위치를 기반으로 figure 영역을 추출한다.

    전략: 캡션 텍스트 위치를 찾고, 그 위쪽 영역에서 figure를 크롭한다.
    텍스트 블록 분석으로 figure의 시작점(상단)을 정밀 조정한다.
    """
    caption_rect = find_caption_rect(page, caption_search)
    if not caption_rect:
        return None, None

    # 캡션의 전체 영역 찾기 (여러 줄일 수 있음)
    all_caption_rects = page.search_for(caption_search)
    caption_bottom = max(r.y1 for r in all_caption_rects) if all_caption_rects else caption_rect.y1
    caption_top = caption_rect.y0

    text_blocks = get_text_blocks_sorted(page)

    # figure 영역의 상단 찾기:
    # 캡션 위의 마지막 "본문 텍스트" 블록의 하단이 figure 시작점
    # 본문 텍스트 = 첫 줄이 70자 이상인 긴 문단 (figure 내부 라벨은 짧음)
    figure_top = page_rect.y0 + 30  # 기본값: 페이지 상단 여백
    for block in text_blocks:
        block_bottom = block[3]  # y1
        block_text = block[4].strip()
        if block_bottom < caption_top - 5 and len(block_text) > 50:
            first_line = block_text.split("\n")[0].strip()
            if len(first_line) > 70:
                figure_top = block_bottom + 2

    # figure 영역: 상단 ~ 캡션 하단 (캡션 포함)
    margin_x = 25  # 좌우 여백 줄이기
    clip_rect = fitz.Rect(
        page_rect.x0 + margin_x,
        figure_top,
        page_rect.x1 - margin_x,
        caption_bottom + 5,
    )

    # 영역이 너무 작으면 페이지 넓게 잡기
    min_height = 80
    if clip_rect.height < min_height:
        clip_rect.y0 = max(page_rect.y0 + 20, caption_top - 200)

    pixmap = page.get_pixmap(clip=clip_rect, dpi=dpi)
    return pixmap, clip_rect


def extract_table_region(doc, caption_search, start_page_idx, dpi=200):
    """표 영역을 추출한다. 여러 페이지에 걸칠 수 있다."""
    images = []
    page = doc[start_page_idx]
    page_rect = page.rect

    caption_rect = find_caption_rect(page, caption_search)
    if not caption_rect:
        # 이전/다음 페이지에서 검색
        for offset in [-1, 1]:
            idx = start_page_idx + offset
            if 0 <= idx < len(doc):
                alt_page = doc[idx]
                caption_rect = find_caption_rect(alt_page, caption_search)
                if caption_rect:
                    page = alt_page
                    start_page_idx = idx
                    page_rect = page.rect
                    break

    if not caption_rect:
        return images

    # 표의 캡션은 보통 표 위에 있으므로, 캡션 아래 영역을 크롭
    caption_bottom = caption_rect.y1
    text_blocks = get_text_blocks_sorted(page)

    table_top = caption_bottom + 2
    table_bottom = page_rect.y1 - 30  # 기본값: 페이지 하단 여백

    # 표 아래의 본문 텍스트를 찾아 표 끝을 결정
    # 본문 텍스트는 긴 연속 문장으로 구성됨 (첫 줄이 80자 이상)
    # 표 셀은 짧은 줄들이 개행으로 분리됨
    for block in text_blocks:
        block_top = block[1]
        block_text = block[4].strip()
        if block_top > table_top + 30 and len(block_text) > 100:
            first_line = block_text.split("\n")[0].strip()
            if len(first_line) > 80:
                table_bottom = block_top - 5
                break

    margin_x = 20
    clip_rect = fitz.Rect(
        page_rect.x0 + margin_x,
        caption_rect.y0 - 2,  # 캡션 포함
        page_rect.x1 - margin_x,
        table_bottom,
    )

    pixmap = page.get_pixmap(clip=clip_rect, dpi=dpi)
    images.append(("main", pixmap))

    return images


def extract_appendix_table(doc, start_page, end_page, dpi=200):
    """Appendix의 상세 표 영역을 페이지별로 추출한다."""
    images = []
    for page_idx in range(start_page, min(end_page + 1, len(doc))):
        page = doc[page_idx]
        page_rect = page.rect

        # 페이지 전체를 약간의 여백과 함께 크롭
        margin_x = 20
        margin_top = 30
        margin_bottom = 30
        clip_rect = fitz.Rect(
            page_rect.x0 + margin_x,
            page_rect.y0 + margin_top,
            page_rect.x1 - margin_x,
            page_rect.y1 - margin_bottom,
        )
        pixmap = page.get_pixmap(clip=clip_rect, dpi=dpi)
        images.append((f"page_{page_idx + 1}", pixmap))

    return images


def extract_figures(source_pdf, structure_json, output_dir):
    """structure.json 기반으로 원본 PDF에서 그림/표를 추출한다."""

    with open(structure_json, "r", encoding="utf-8") as f:
        structure = json.load(f)

    doc = fitz.open(source_pdf)
    figures_dir = os.path.join(output_dir, "figures")
    os.makedirs(figures_dir, exist_ok=True)

    extracted = []

    # 모든 섹션에서 figures, tables 수집
    all_figures = []
    all_tables = []

    def collect_from_section(section):
        for fig in section.get("figures", []):
            all_figures.append(fig)
        for tbl in section.get("tables", []):
            all_tables.append(tbl)
        for subsec in section.get("subsections", []):
            collect_from_section(subsec)

    for section in structure.get("sections", []):
        collect_from_section(section)

    print(f"Found {len(all_figures)} figures and {len(all_tables)} tables to extract")

    # Figure 추출
    for fig in all_figures:
        fig_id = fig["id"]
        page_num = fig.get("page", 1)
        page_idx = page_num - 1  # 0-indexed
        caption = fig.get("caption", "")

        if page_idx < 0 or page_idx >= len(doc):
            print(f"  Warning: Page {page_num} out of range for {fig_id}")
            continue

        page = doc[page_idx]
        page_rect = page.rect

        # "Figure N." 패턴으로 검색
        fig_number = fig_id.replace("fig_", "")
        search_text = f"Figure {fig_number}."

        print(f"  Extracting {fig_id} from page {page_num} (search: '{search_text}')")

        pixmap, clip_rect = extract_figure_region(page, search_text, page_rect, dpi=200)

        if pixmap:
            out_path = os.path.join(figures_dir, f"{fig_id}.png")
            pixmap.save(out_path)
            print(f"    Saved: {out_path} ({pixmap.width}x{pixmap.height})")
            extracted.append(fig_id)
        else:
            print(f"    Warning: Could not find caption '{search_text}' on page {page_num}")
            # 폴백: 페이지의 상단 60%를 크롭
            fallback_rect = fitz.Rect(
                page_rect.x0 + 25,
                page_rect.y0 + 30,
                page_rect.x1 - 25,
                page_rect.y0 + page_rect.height * 0.6,
            )
            pixmap = page.get_pixmap(clip=fallback_rect, dpi=200)
            out_path = os.path.join(figures_dir, f"{fig_id}.png")
            pixmap.save(out_path)
            print(f"    Saved (fallback): {out_path} ({pixmap.width}x{pixmap.height})")
            extracted.append(fig_id)

    # Table 추출
    for tbl in all_tables:
        tbl_id = tbl["id"]
        page_num = tbl.get("page", 1)
        page_idx = page_num - 1

        if page_idx < 0 or page_idx >= len(doc):
            print(f"  Warning: Page {page_num} out of range for {tbl_id}")
            continue

        tbl_number = tbl_id.replace("tbl_", "")
        search_text = f"Table {tbl_number}."

        print(f"  Extracting {tbl_id} from page {page_num} (search: '{search_text}')")

        images = extract_table_region(doc, search_text, page_idx, dpi=200)

        if images:
            for suffix, pixmap in images:
                if suffix == "main":
                    out_path = os.path.join(figures_dir, f"{tbl_id}.png")
                else:
                    out_path = os.path.join(figures_dir, f"{tbl_id}_{suffix}.png")
                pixmap.save(out_path)
                print(f"    Saved: {out_path} ({pixmap.width}x{pixmap.height})")
            extracted.append(tbl_id)
        else:
            print(f"    Warning: Could not extract table '{search_text}'")

    # Appendix A 표 추출 (pages 13-17, 0-indexed: 12-16)
    if len(doc) >= 17:
        print("  Extracting Appendix A table pages (13-17)")
        appendix_images = extract_appendix_table(doc, 12, 16, dpi=200)
        for suffix, pixmap in appendix_images:
            out_path = os.path.join(figures_dir, f"tbl_appendix_{suffix}.png")
            pixmap.save(out_path)
            print(f"    Saved: {out_path} ({pixmap.width}x{pixmap.height})")

    doc.close()

    print(f"\nExtraction complete: {len(extracted)} items extracted to {figures_dir}/")
    return extracted


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python extract_figures.py <source_pdf> <structure_json> <output_dir>")
        print("Example: python extract_figures.py input/paper.pdf output/structure.json output/")
        sys.exit(1)

    extract_figures(sys.argv[1], sys.argv[2], sys.argv[3])
