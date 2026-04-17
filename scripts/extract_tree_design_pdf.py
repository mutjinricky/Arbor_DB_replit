#!/usr/bin/env python3
"""Extract structured fields from tree-hospital design PDFs.

The extractor is intentionally domain-specific. It favors Korean tree hospital
design documents and returns empty values instead of guessing when a field is
ambiguous.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_KEYWORDS = ("설계서", "설계설명서", "시방서", "공사금액", "소요 예산", "수목", "나무병원")

WORK_TYPE_PATTERNS: list[tuple[str, str]] = [
    ("재선충 방제", r"재선충"),
    ("나무주사", r"나무\s*주사|약제\s*주사|예방나무주사"),
    ("솔수염하늘소방제", r"솔수염하늘소"),
    ("수목정비", r"수목\s*정비"),
    ("수관솎기", r"수관\s*솎기"),
    ("수관조절", r"수관\s*조절"),
    ("관목류 정비", r"관목류\s*정비|관목\s*전정"),
    ("관목류 제거", r"관목류\s*제거|관목\s*제거"),
    ("경합지 제거", r"경합지\s*제거"),
    ("지지대 설치", r"지지대\s*설치"),
    ("수목상처치료", r"수목\s*상처\s*치료|부후부\s*제거"),
    ("위험목 제거", r"위험목\s*제거|수목\s*제거"),
    ("토양개량", r"토양\s*개량|토양\s*개선"),
    ("영양공급", r"영양\s*공급|수간\s*주사"),
]

TREE_COUNT_EXCLUDE = re.compile(
    r"나무\s*주사|약제\s*주사|수관\s*솎기|수관\s*조절|경합지|상처\s*치료|"
    r"제거|방제|단가표|수량\s*산출|천공|D\s*\d|흉고직경|대상목",
)


def normalize_line(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_text(value: str) -> str:
    return "\n".join(line for line in (normalize_line(line) for line in value.splitlines()) if line)


def compact_label_text(value: str) -> str:
    return re.sub(r"\s+", "", value)


def parse_int(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d[\d,]*", value)
    if not match:
        return None
    return int(match.group(0).replace(",", ""))


def parse_money(value: str | None) -> int | None:
    if not value:
        return None
    numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", value)]
    if numbers:
        # In design documents, the desired budget is normally the largest amount
        # on the labeled line, not unit prices in later tables.
        return max(numbers)

    korean = value.replace(" ", "")
    units = [
        ("조", 1_000_000_000_000),
        ("억", 100_000_000),
        ("천만", 10_000_000),
        ("백만", 1_000_000),
        ("십만", 100_000),
        ("만", 10_000),
        ("천", 1_000),
        ("백", 100),
        ("십", 10),
    ]
    total = 0
    used = False
    for name, factor in units:
        match = re.search(rf"(\d+(?:\.\d+)?)\s*{name}", korean)
        if match:
            total += int(float(match.group(1)) * factor)
            used = True
    return total if used else None


def read_document(path: Path) -> tuple[list[str], str]:
    if path.suffix.lower() in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        pages = [text]
        return pages, text

    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required. Install with: py -m pip install pypdf") from exc

    reader = PdfReader(str(path))
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return pages, "\n".join(pages)


def find_project_name(lines: list[str], full_text: str) -> str | None:
    candidates: list[str] = []

    for line in lines[:20]:
        match = re.search(r"(?:20\d{2}\s*년도\s*)?(.{4,90}?)\s*설계서", line)
        if match:
            value = cleanup_project_name(match.group(1))
            if value:
                candidates.append(value)

    label_patterns = [
        r"공\s*사\s*명\s*[:：]\s*([^\n]+)",
        r"사\s*업\s*명\s*[:：]\s*([^\n]+)",
        r"과\s*업\s*명\s*[:：]\s*([^\n]+)",
    ]
    for pattern in label_patterns:
        for match in re.finditer(pattern, full_text):
            value = cleanup_project_name(match.group(1))
            if value:
                candidates.append(value)

    if not candidates:
        return None

    counts = Counter(candidates)
    return counts.most_common(1)[0][0]


def cleanup_project_name(value: str) -> str:
    value = normalize_line(value)
    value = re.sub(r"^[-·\d.\s]+", "", value)
    value = re.sub(r"\s*설계(?:설명)?서.*$", "", value)
    value = re.sub(r"\s*내역서.*$", "", value)
    value = re.sub(r"\s*서\s*산\s*시\s*$", "", value)
    value = re.sub(r"\s*창원시\s*진해구\s*$", "", value)
    value = value.strip(" :-")
    if len(value) < 4:
        return ""
    return value


def find_designer(lines: list[str], full_text: str) -> str | None:
    patterns = [
        r"설\s*계\s*사\s*[:：]\s*([^\n]+)",
        r"설\s*계\s*자\s*[:：]\s*([^\n]+)",
        r"작성\s*자\s*[:：]\s*([^\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, full_text)
        if match:
            value = normalize_line(match.group(1))
            value = re.split(r"\s{2,}|발\s*주\s*처|소\s*재\s*지", value)[0].strip()
            if value:
                return value

    for line in lines:
        match = re.search(r"([가-힣A-Za-z0-9㈜().\s-]*나무\s*병원[가-힣A-Za-z0-9㈜().\s-]*)", line)
        if match:
            return normalize_line(match.group(1))
    return None


def find_year(full_text: str, file_name: str) -> int | None:
    for pattern in (r"(20\d{2})\s*년도", r"(20\d{2})\s*년", r"(20\d{2})"):
        match = re.search(pattern, full_text)
        if match:
            return int(match.group(1))
    match = re.search(r"(20\d{2})", file_name)
    return int(match.group(1)) if match else None


def find_region_and_location(lines: list[str], full_text: str) -> tuple[str | None, str | None]:
    location: str | None = None

    for pattern in (
        r"위\s*치\s*[:：]\s*([^\n]+)",
        r"소\s*재\s*지\s*[:：]\s*([^\n]+)",
        r"사업\s*위치\s*[:：]\s*([^\n]+)",
        r"공사\s*위치\s*[:：]\s*([^\n]+)",
    ):
        match = re.search(pattern, full_text)
        if match:
            location = normalize_line(match.group(1))
            location = re.split(r"\s{2,}|라\s*\.", location)[0].strip()
            break

    region: str | None = None
    match = re.search(r"발\s*주\s*처\s*[:：]\s*([^\n]+)", full_text)
    if match:
        region = normalize_line(match.group(1))
        region = re.split(r"\s{2,}|설\s*계\s*사|소\s*재\s*지", region)[0].strip()

    if not region:
        match = re.search(r"([가-힣]+도\s+[가-힣]+시)", full_text)
        if match:
            region = match.group(1)

    if not region and location:
        region = derive_region(location)

    if not region:
        joined = " ".join(lines[:15])
        match = re.search(r"([가-힣]+(?:도|시)\s+[가-힣]+(?:시|군|구))", joined)
        if match:
            region = match.group(1)

    return region, location


def derive_region(location: str) -> str:
    location = normalize_line(location)
    match = re.match(r"((?:서울|부산|대구|인천|광주|대전|울산|세종)[^\s]*\s+[가-힣]+구)", location)
    if match:
        return match.group(1)
    match = re.match(r"([가-힣]+도\s+[가-힣]+시)", location)
    if match:
        return match.group(1)
    match = re.match(r"([가-힣]+시\s+[가-힣]+구)", location)
    if match:
        return match.group(1)
    parts = location.split()
    return " ".join(parts[:2]) if len(parts) >= 2 else location


def find_work_types(full_text: str) -> list[str]:
    found: list[str] = []
    compact = compact_label_text(full_text)
    for label, pattern in WORK_TYPE_PATTERNS:
        if re.search(pattern, compact):
            found.append(label)
    return found


def find_duration(full_text: str) -> tuple[str | None, int | None]:
    patterns = [
        r"(?:공\s*사\s*기\s*간|사\s*업\s*기\s*간|공사기간|사업기간)\s*[:：]?\s*([^\n]{0,80}?\d+\s*일\s*간?)",
        r"(착공\s*일?\s*로부터\s*\d+\s*일\s*간?)",
        r"(\d+\s*일\s*간)",
    ]
    for pattern in patterns:
        match = re.search(pattern, full_text)
        if match:
            value = normalize_line(match.group(1))
            days = parse_int(value)
            return value, days
    return None, None


def find_budget(full_text: str) -> int | None:
    values: list[int] = []
    for line in full_text.splitlines():
        if re.search(r"소\s*요\s*예\s*산|공\s*사\s*금\s*액|총\s*예\s*산|사업\s*비", line):
            parsed = parse_money(line)
            if parsed:
                values.append(parsed)
    if values:
        return max(values)
    return None


def find_total_tree_count(lines: list[str]) -> int | None:
    candidates: list[int] = []
    for line in lines:
        if TREE_COUNT_EXCLUDE.search(compact_label_text(line)):
            continue
        patterns = [
            r"등\s*([\d,]+)\s*주\s*가\s*(?:생장|식재|분포)",
            r"(?:전체|총)\s*(?:수목|대상\s*수목)?\s*[:：]?\s*([\d,]+)\s*주",
            r"수목\s*([\d,]+)\s*주\s*(?:가\s*)?(?:생장|식재|분포)",
            r"([\d,]+)\s*주\s*의\s*수목",
        ]
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                candidates.append(int(match.group(1).replace(",", "")))
                break
    return candidates[0] if candidates else None


def extract(path: Path) -> dict[str, Any]:
    pages, raw_text = read_document(path)
    text = normalize_text(raw_text)
    lines = text.splitlines()
    document_score = sum(1 for keyword in PROJECT_KEYWORDS if keyword in text)

    business_name = find_project_name(lines, text)
    designer = find_designer(lines, text)
    year = find_year(text, path.name)
    region, location = find_region_and_location(lines, text)
    duration_text, duration_days = find_duration(text)
    total_budget = find_budget(text)
    total_tree_count = find_total_tree_count(lines)
    business_types = find_work_types(text)

    warnings: list[str] = []
    if document_score < 2:
        warnings.append("나무병원 사업설계서로 판단할 근거가 적습니다.")
    if sum(1 for page in pages if normalize_line(page)) < max(1, len(pages) // 5):
        warnings.append("텍스트가 없는 페이지가 많습니다. 스캔 PDF면 OCR이 필요할 수 있습니다.")
    if total_tree_count is None:
        warnings.append("전체수목수는 공종별 수량과 구분되지 않아 자동 확정하지 않았습니다.")

    return {
        "ok": True,
        "fileName": path.name,
        "textLength": len(text),
        "warnings": warnings,
        "extracted": {
            "businessName": business_name,
            "designer": designer,
            "year": year,
            "region": region,
            "location": location,
            "businessTypes": business_types,
            "durationText": duration_text,
            "durationDays": duration_days,
            "totalBudget": total_budget,
            "totalTreeCount": total_tree_count,
        },
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) != 2:
        print(json.dumps({"ok": False, "error": "Usage: extract_tree_design_pdf.py <file>"}, ensure_ascii=False))
        return 2

    path = Path(sys.argv[1])
    try:
        result = extract(path)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:  # pylint: disable=broad-except
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
