# 논문 번역 에이전트 (Paper Translation Agent)

이 프로젝트는 영문 학술 논문 PDF를 한국어 PDF로 번역하는 Claude Code 에이전트 시스템이다.

## 프로젝트 구조

```
transpaper/
├── CLAUDE.md              ← 현재 파일 (오케스트레이터 지침)
├── input/                 ← 입력 PDF 파일
├── output/                ← 출력 파일 (자동 생성)
│   ├── raw_text.json      ← PDF 텍스트 추출 결과
│   ├── structure.json     ← 논문 구조 메타데이터
│   ├── term_map.json      ← 논문별 용어 맵
│   ├── translated_meta.json ← 번역된 제목/초록/키워드
│   ├── sec_*.json         ← 섹션별 번역 결과
│   ├── state.json         ← 진행 상태
│   └── translated_paper.pdf ← 최종 한국어 PDF
├── docs/
│   └── translation_glossary.md ← 전역 용어집
├── fonts/                 ← 한글 폰트
└── .claude/
    ├── agents/
    │   └── translator.md  ← 번역 서브에이전트
    └── skills/
        ├── pdf-parser/    ← PDF 파싱 스킬
        ├── pdf-builder/   ← PDF 생성 스킬
        └── validator/     ← 구조 검증 스킬
```

## 워크플로우

사용자가 "input 폴더의 논문을 번역해줘"라고 요청하면, 아래 단계를 순서대로 실행한다.

### Step 1: PDF 파싱 (PARSING)

1. `input/` 폴더에서 PDF 파일을 찾는다 (하나만 있어야 함).
2. 텍스트 추출 스크립트를 실행한다:
   ```bash
   python3 .claude/skills/pdf-parser/scripts/extract_text.py input/<파일명>.pdf output/raw_text.json
   ```
3. `output/raw_text.json`을 읽고, 논문의 구조를 분석하여 `output/structure.json`을 생성한다:
   - 제목, 저자, 소속 기관 식별
   - 초록(Abstract) 추출
   - 키워드 추출
   - 본문 섹션 계층 구조 파악 (Introduction, Literature Review, Methodology 등)
   - 각 섹션의 본문, 그림 캡션, 표 캡션, 각주 분류
   - 참고문헌(References) 분리
   - 제외할 섹션 식별 (Acknowledgments, Appendix 등)
4. 구조 검증 스크립트를 실행한다:
   ```bash
   python3 .claude/skills/validator/scripts/validate_structure.py output/structure.json
   ```
5. 논문 전체를 스캔하여 주요 학술 용어를 식별하고, 전역 용어집(`docs/translation_glossary.md`)과 대조하여 `output/term_map.json`을 생성한다.
6. `output/state.json`을 업데이트한다:
   ```json
   {"current_state": "PARSING_COMPLETE", "completed_steps": ["PARSING"], ...}
   ```
7. 사용자에게 보고한다:
   > "PDF 파싱 완료: N개 섹션, 그림 N개, 표 N개 식별됨. 번역을 시작합니다."

### Step 2: 번역 (TRANSLATING)

1. `state.json`을 `TRANSLATING`으로 업데이트한다.
2. **translator 에이전트**를 호출하여 번역을 실행한다:
   - 에이전트가 `structure.json`을 읽고 섹션별로 순차 번역
   - 각 섹션 완료 시 `output/sec_{id}.json`으로 저장
   - 메타데이터(제목/초록/키워드)는 `output/translated_meta.json`으로 저장
3. 이미 존재하는 `sec_*.json`은 건너뛴다 (재개 지원).
4. `state.json`을 업데이트한다:
   ```json
   {"current_state": "TRANSLATION_COMPLETE", "completed_steps": ["PARSING", "TRANSLATING"], ...}
   ```
5. 사용자에게 보고한다:
   > "번역 완료: N개 섹션 번역됨. PDF를 생성합니다."

### Step 3: PDF 생성 (BUILDING)

1. `state.json`을 `BUILDING`으로 업데이트한다.
2. PDF 생성 스크립트를 실행한다:
   ```bash
   python3 .claude/skills/pdf-builder/scripts/build_pdf.py output/ output/translated_paper.pdf
   ```
3. `state.json`을 `COMPLETE`로 업데이트한다.
4. 사용자에게 보고한다:
   > "번역 완료! 결과 파일: output/translated_paper.pdf"

## 상태 관리 (state.json)

```json
{
  "current_state": "IDLE|PARSING|PARSING_COMPLETE|TRANSLATING|TRANSLATION_COMPLETE|BUILDING|COMPLETE",
  "completed_steps": [],
  "step_details": {
    "parsing": {"started_at": "", "completed_at": "", "total_pages": 0},
    "translating": {
      "started_at": "", "completed_at": "",
      "total_sections": 0, "completed_sections": [],
      "current_section": ""
    },
    "building": {"started_at": "", "completed_at": ""}
  },
  "source_file": "",
  "started_at": "",
  "last_updated": ""
}
```

- 각 단계 시작/완료 시 `state.json`을 업데이트한다.
- 번역 중에는 섹션 단위로 진행상황을 기록한다.
- 에러 발생 시 `current_state`에 `ERROR_`접두사를 붙이고 `error` 필드를 추가한다.

## 중단/재개 규칙

1. 재개 시 `output/state.json`을 확인한다.
2. `current_state`에 따라 적절한 단계부터 재개한다:
   - `PARSING_COMPLETE` → Step 2부터 시작
   - `TRANSLATING` → 미번역 섹션부터 계속
   - `TRANSLATION_COMPLETE` → Step 3부터 시작
3. 이미 존재하는 출력 파일은 재사용한다.

## structure.json 스키마

```json
{
  "source_file": "input/paper.pdf",
  "title": "English Title",
  "authors": [{"name": "Author", "affiliations": ["1"]}],
  "affiliations": [{"id": "1", "name": "University"}],
  "abstract": "Abstract text...",
  "keywords": ["keyword1", "keyword2"],
  "sections": [
    {
      "id": "sec_1",
      "level": 1,
      "number": "1",
      "title": "Introduction",
      "content": "Body text...",
      "footnotes": [],
      "subsections": [],
      "figures": [{"id": "fig_1", "caption": "Figure 1. ...", "page": 3}],
      "tables": []
    }
  ],
  "references": "1. Smith (2023)...",
  "excluded_sections": ["Appendix A", "Acknowledgments"],
  "metadata": {
    "total_pages": 18,
    "parsed_at": "ISO datetime"
  }
}
```

## 진행 보고 규칙

- **각 Step 전환 시에만** 사용자에게 보고한다.
- 중간 과정(도구 선택, 파일 읽기 등)은 보고하지 않는다.
- 에러 발생 시 즉시 보고하고 대기한다.
- 보고 형식: 간결한 1-2줄 요약 + 다음 단계 예고.

## 에러 처리

1. **PDF 파싱 실패**: 에러 메시지와 함께 사용자에게 보고.
2. **구조 검증 실패**: 검증 에러를 확인하고 structure.json을 수정 후 재검증.
3. **번역 실패**: 실패한 섹션을 기록하고 나머지 섹션은 계속 번역.
4. **PDF 생성 실패**: 에러 메시지 보고. 주로 폰트 문제이므로 폰트 확인 안내.
