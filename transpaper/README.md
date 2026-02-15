# transpaper

영문 학술 논문 PDF를 한국어 PDF로 번역하는 Claude Code 에이전트 시스템.

## 기능

- PDF 텍스트 추출 및 논문 구조 분석
- 섹션별 한국어 번역 (용어집 기반)
- 원본 그림/표 이미지 추출 및 번역 PDF 포함
- 중단/재개 지원

## 사용법

```bash
pip install -r requirements.txt
```

`input/` 폴더에 영문 논문 PDF를 넣고 Claude Code에서:

> "input 폴더의 논문을 번역해줘"

결과물은 `output/translated_paper.pdf`로 생성됨.

## 기술 스택

- Python 3, pdfplumber, PyMuPDF, reportlab
- Claude Code (오케스트레이터 + 번역 에이전트)
