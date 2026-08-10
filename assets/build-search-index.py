#!/usr/bin/env python3
"""Regenerate assets/search-index.js from the lesson pages in pages/.

Sakura has no build step for the site itself — this script is the one
exception, and it's a manual one: run it by hand after adding or
editing lesson content, then commit the regenerated search-index.js
alongside your content change. There's no watcher or CI step wiring
this in on purpose, to keep the rest of the project dependency-free.

    python3 assets/build-search-index.py

Extracts one search entry per table row, per dialogue card, and per
grammar-note block, tagged with the page and toggle-section it came
from — that's the (page, section) pair initGlobalSearch (script.js)
uses to build a result's link and to know which <details> to open.
"""

import html as htmllib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PAGES = [
    ("pages/numbers.html", "numbers.html", "Numbers"),
    ("pages/time.html", "time.html", "Time"),
    ("pages/frequency.html", "frequency.html", "Frequency"),
    ("pages/pronouns.html", "pronouns.html", "Personal Pronouns"),
    ("pages/demonstratives.html", "demonstratives.html", "Demonstratives"),
    ("pages/likes-dislikes.html", "likes-dislikes.html", "Likes & Dislikes"),
    ("pages/hiragana.html", "hiragana.html", "Hiragana"),
]

SECTION_RE = re.compile(
    r'<details class="toggle-section" id="([^"]+)">\s*'
    r'<summary><h2>(.*?)</h2></summary>(.*?)</details>',
    re.S,
)
ROW_RE = re.compile(r'<tr(?:\s+class="[^"]*")?>(.*?)</tr>', re.S)
CARD_RE = re.compile(r'<article class="dialogue-card">(.*?)</article>', re.S)
NOTE_RE = re.compile(r'<div class="grammar-note">(.*?)</div>', re.S)


def strip_tags(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    text = htmllib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract(path, url, page_title):
    content = Path(path).read_text(encoding="utf-8")
    entries = []

    for match in SECTION_RE.finditer(content):
        section_id, section_title_raw, body = match.groups()
        if section_id == "practice":
            continue  # placeholder section, nothing to search

        section_title = strip_tags(section_title_raw)

        for row in ROW_RE.finditer(body):
            row_html = row.group(1)
            if "<th" in row_html:
                continue
            text = strip_tags(row_html)
            if text:
                entries.append((url, page_title, section_id, section_title, text))

        for card in CARD_RE.finditer(body):
            text = strip_tags(card.group(1))
            if text:
                entries.append((url, page_title, section_id, section_title, text))

        for note in NOTE_RE.finditer(body):
            text = strip_tags(note.group(1))
            if text:
                entries.append((url, page_title, section_id, section_title, text))

    return entries


def main():
    entries = []
    for path, url, page_title in PAGES:
        entries.extend(extract(ROOT / path, url, page_title))

    records = [
        {
            "page": page,
            "pageTitle": page_title,
            "section": section_id,
            "sectionTitle": section_title,
            "text": text,
        }
        for page, page_title, section_id, section_title, text in entries
    ]

    out_path = ROOT / "assets" / "search-index.js"
    js = (
        "// Auto-generated search index — see assets/build-search-index.py.\n"
        "// Regenerate after editing lesson content: python3 assets/build-search-index.py\n"
        "window.SAKURA_SEARCH_INDEX = "
        + json.dumps(records, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    out_path.write_text(js, encoding="utf-8")
    print(f"wrote {out_path} ({len(records)} entries)")


if __name__ == "__main__":
    main()
