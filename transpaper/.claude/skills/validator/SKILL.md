# Validator Skill

`structure.json`의 스키마와 내용을 검증하는 스킬.

## Trigger
- structure.json 검증이 필요할 때
- 파싱 완료 후 검증 단계

## Instructions

1. 검증 스크립트 경로: `.claude/skills/validator/scripts/validate_structure.py`
2. 실행 명령:
   ```bash
   python3 .claude/skills/validator/scripts/validate_structure.py output/structure.json
   ```
3. exit code 0이면 성공, 1이면 실패.
4. 실패 시 에러 메시지를 확인하고 structure.json을 수정한다.

## Tools
- Bash (스크립트 실행용)

## Validation Rules
- 필수 키: `source_file`, `title`, `abstract`, `sections`, `metadata`
- `sections`는 비어있지 않아야 함
- 각 섹션에 `id`, `level`, `title`, `content` 필수
- `figures`, `tables`는 리스트여야 함
