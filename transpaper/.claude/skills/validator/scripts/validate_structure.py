#!/usr/bin/env python3
"""
structure.json 검증 스크립트
파싱된 논문 구조 데이터의 스키마와 내용을 검증한다.

Usage:
    python validate_structure.py <structure_json>

Example:
    python validate_structure.py output/structure.json

Exit codes:
    0 - 검증 성공
    1 - 검증 실패
"""

import json
import sys
import os


def validate(path):
    """structure.json을 검증한다."""
    if not os.path.exists(path):
        print(f"FAIL: File not found: {path}")
        return False

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON: {e}")
        return False

    errors = []
    warnings = []

    # 필수 최상위 키 검증
    required_keys = ["source_file", "title", "abstract", "sections", "metadata"]
    for key in required_keys:
        if key not in data:
            errors.append(f"Missing required key: '{key}'")

    # title 검증
    if "title" in data:
        if not data["title"] or not isinstance(data["title"], str):
            errors.append("'title' must be a non-empty string")

    # abstract 검증
    if "abstract" in data:
        if not data["abstract"] or not isinstance(data["abstract"], str):
            errors.append("'abstract' must be a non-empty string")
        elif len(data["abstract"]) < 50:
            warnings.append(f"'abstract' seems too short ({len(data['abstract'])} chars)")

    # sections 검증
    if "sections" in data:
        sections = data["sections"]
        if not isinstance(sections, list):
            errors.append("'sections' must be a list")
        elif len(sections) == 0:
            errors.append("'sections' must not be empty")
        else:
            for i, sec in enumerate(sections):
                sec_id = sec.get("id", f"index_{i}")

                # 필수 섹션 키
                for key in ["id", "level", "title", "content"]:
                    if key not in sec:
                        errors.append(f"Section '{sec_id}': missing key '{key}'")

                # content가 비어있는지 체크
                if "content" in sec and not sec["content"]:
                    warnings.append(f"Section '{sec_id}': content is empty")

                # level 검증
                if "level" in sec:
                    if not isinstance(sec["level"], int) or sec["level"] < 1:
                        errors.append(f"Section '{sec_id}': 'level' must be a positive integer")

                # figures 검증
                if "figures" in sec:
                    if not isinstance(sec["figures"], list):
                        errors.append(f"Section '{sec_id}': 'figures' must be a list")
                    else:
                        for fig in sec["figures"]:
                            if "id" not in fig or "caption" not in fig:
                                errors.append(f"Section '{sec_id}': figure missing 'id' or 'caption'")

                # tables 검증
                if "tables" in sec:
                    if not isinstance(sec["tables"], list):
                        errors.append(f"Section '{sec_id}': 'tables' must be a list")

                # subsections 검증
                if "subsections" in sec and not isinstance(sec["subsections"], list):
                    errors.append(f"Section '{sec_id}': 'subsections' must be a list")

    # metadata 검증
    if "metadata" in data:
        meta = data["metadata"]
        if not isinstance(meta, dict):
            errors.append("'metadata' must be an object")
        elif "total_pages" not in meta:
            warnings.append("'metadata' missing 'total_pages'")

    # references 검증
    if "references" in data:
        if not isinstance(data["references"], str):
            errors.append("'references' must be a string")
    else:
        warnings.append("Missing 'references' key")

    # keywords 검증
    if "keywords" in data:
        if not isinstance(data["keywords"], list):
            errors.append("'keywords' must be a list")

    # 결과 출력
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  ⚠ {w}")

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  ✗ {e}")
        print(f"\nValidation FAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        return False
    else:
        # 요약 정보 출력
        sections = data.get("sections", [])
        total_chars = sum(len(s.get("content", "")) for s in sections)
        total_figs = sum(len(s.get("figures", [])) for s in sections)
        total_tables = sum(len(s.get("tables", [])) for s in sections)

        print("Validation PASSED")
        print(f"  Title: {data.get('title', 'N/A')[:60]}...")
        print(f"  Sections: {len(sections)}")
        print(f"  Total content chars: {total_chars:,}")
        print(f"  Figures: {total_figs}, Tables: {total_tables}")
        if warnings:
            print(f"  Warnings: {len(warnings)}")
        return True


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_structure.py <structure_json>")
        sys.exit(1)

    success = validate(sys.argv[1])
    sys.exit(0 if success else 1)
