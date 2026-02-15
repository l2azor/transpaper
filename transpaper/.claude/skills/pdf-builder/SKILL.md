# PDF Builder Skill

번역된 논문 데이터를 조합하여 한국어 PDF를 생성하는 스킬.

## Trigger
- 번역 완료 후 PDF 생성이 필요할 때
- `build_pdf` 키워드가 포함된 요청

## Instructions

1. `reportlab`을 사용하여 A4 PDF를 생성한다.
2. 빌드 스크립트 경로: `.claude/skills/pdf-builder/scripts/build_pdf.py`
3. 실행 명령:
   ```bash
   python3 .claude/skills/pdf-builder/scripts/build_pdf.py output/ output/translated_paper.pdf
   ```
4. 필요 입력 파일:
   - `output/structure.json` — 원문 구조
   - `output/translated_meta.json` — 번역된 제목/초록/키워드
   - `output/sec_*.json` — 섹션별 번역 결과

## Tools
- Bash (스크립트 실행용)

## Layout Reference
레이아웃 사양은 `references/layout_spec.md` 참조.

## Font Fallback
1. `fonts/NotoSansKR-Regular.ttf` (프로젝트 로컬)
2. `/System/Library/Fonts/AppleSDGothicNeo.ttc` (macOS 시스템)
3. Helvetica (한국어 미지원, 최후 수단)
