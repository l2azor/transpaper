#!/usr/bin/env python3
"""
PDF 텍스트 추출 스크립트
pdfplumber를 사용하여 페이지별 텍스트, 좌표, 폰트 정보를 추출한다.

Usage:
    python extract_text.py <input_pdf> <output_json>

Example:
    python extract_text.py input/paper.pdf output/raw_text.json
"""

import json
import sys
import os
from datetime import datetime

import pdfplumber


def extract_page_text(page, page_num):
    """한 페이지에서 텍스트와 메타데이터를 추출한다."""
    words = page.extract_words(
        x_tolerance=3,
        y_tolerance=3,
        keep_blank_chars=False,
        extra_attrs=["fontname", "size"],
    )

    lines = []
    if words:
        current_line = {
            "text": words[0]["text"],
            "top": words[0]["top"],
            "bottom": words[0]["bottom"],
            "x0": words[0]["x0"],
            "x1": words[0]["x1"],
            "fontname": words[0].get("fontname", ""),
            "size": round(words[0].get("size", 0), 1),
        }

        for w in words[1:]:
            # 같은 줄인지 판단 (y 좌표 차이가 작으면 같은 줄)
            if abs(w["top"] - current_line["top"]) < 3:
                current_line["text"] += " " + w["text"]
                current_line["x1"] = max(current_line["x1"], w["x1"])
                # 더 큰 폰트를 대표 폰트로 사용
                if w.get("size", 0) > current_line["size"]:
                    current_line["fontname"] = w.get("fontname", "")
                    current_line["size"] = round(w.get("size", 0), 1)
            else:
                lines.append(current_line)
                current_line = {
                    "text": w["text"],
                    "top": w["top"],
                    "bottom": w["bottom"],
                    "x0": w["x0"],
                    "x1": w["x1"],
                    "fontname": w.get("fontname", ""),
                    "size": round(w.get("size", 0), 1),
                }

        lines.append(current_line)

    # 테이블 감지
    tables = []
    try:
        detected_tables = page.find_tables()
        for i, table in enumerate(detected_tables):
            table_data = table.extract()
            if table_data:
                tables.append({
                    "id": f"table_p{page_num}_{i}",
                    "bbox": list(table.bbox),
                    "data": table_data,
                })
    except Exception:
        pass  # 테이블 감지 실패 시 무시

    # 이미지/figure 영역 감지
    images = []
    try:
        for i, img in enumerate(page.images):
            images.append({
                "id": f"img_p{page_num}_{i}",
                "bbox": [img["x0"], img["top"], img["x1"], img["bottom"]],
                "width": img["x1"] - img["x0"],
                "height": img["bottom"] - img["top"],
            })
    except Exception:
        pass

    return {
        "page_number": page_num,
        "width": round(page.width, 1),
        "height": round(page.height, 1),
        "lines": lines,
        "tables": tables,
        "images": images,
        "full_text": page.extract_text() or "",
    }


def extract_pdf(input_path, output_path):
    """PDF 전체를 파싱하여 JSON으로 저장한다."""
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    print(f"Extracting text from: {input_path}")

    with pdfplumber.open(input_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")

        pages = []
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            page_data = extract_page_text(page, page_num)
            pages.append(page_data)
            if page_num % 5 == 0 or page_num == total_pages:
                print(f"  Processed page {page_num}/{total_pages}")

    result = {
        "source_file": input_path,
        "total_pages": total_pages,
        "extracted_at": datetime.now().isoformat(),
        "pages": pages,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Output saved to: {output_path}")
    print(f"Total lines extracted: {sum(len(p['lines']) for p in pages)}")
    print(f"Total tables detected: {sum(len(p['tables']) for p in pages)}")
    print(f"Total images detected: {sum(len(p['images']) for p in pages)}")

    return result


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_text.py <input_pdf> <output_json>")
        print("Example: python extract_text.py input/paper.pdf output/raw_text.json")
        sys.exit(1)

    extract_pdf(sys.argv[1], sys.argv[2])
