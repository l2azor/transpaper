# PDF Parser Skill

PDF 논문에서 텍스트, 좌표, 폰트 정보를 추출하는 스킬.

## Trigger
- 사용자가 PDF 파싱/추출을 요청할 때
- `extract_text` 키워드가 포함된 요청

## Instructions

1. `pdfplumber`를 사용하여 PDF에서 페이지별 텍스트를 추출한다.
2. 추출 스크립트 경로: `.claude/skills/pdf-parser/scripts/extract_text.py`
3. 실행 명령:
   ```bash
   python3 .claude/skills/pdf-parser/scripts/extract_text.py <input_pdf> <output_json>
   ```
4. 출력: `output/raw_text.json` — 페이지별 라인, 좌표, 폰트, 테이블, 이미지 정보 포함.

## Tools
- Bash (스크립트 실행용)

## Output Format
JSON 파일 (`raw_text.json`):
```json
{
  "source_file": "input/paper.pdf",
  "total_pages": 18,
  "extracted_at": "ISO datetime",
  "pages": [
    {
      "page_number": 1,
      "width": 595.0,
      "height": 842.0,
      "lines": [{"text": "...", "top": 0, "fontname": "...", "size": 12.0}],
      "tables": [],
      "images": [],
      "full_text": "..."
    }
  ]
}
```
