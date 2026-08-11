#!/usr/bin/env python3
"""Regenerate assets/search-index.js from the lesson pages in pages/.

Sakura has no build step for the site itself — this script is the one
exception, and it's a manual one: run it by hand after adding or
editing lesson content, then commit the regenerated search-index.js
alongside your content change. There's no watcher or CI step wiring
this in on purpose, to keep the rest of the project dependency-free.

    python3 assets/build-search-index.py

Unlike the old version of this script, entries are built by walking a
real parsed DOM tree (see Node/TreeBuilder below) instead of running
regexes over raw HTML. That matters because it lets us separate a
row/card/note's Japanese text, its furigana readings, its romaji and
its English into distinct fields — driven by the same CSS classes the
page already uses to style them (td.jp / .example-jp / .message-jp for
Japanese, td.romaji / .example / .message-romaji for romaji, td.english
/ .example-en / .message-en for English) — rather than one flat blob of
"whatever text was in this tag". That per-field split is what lets
script.js rank an exact Japanese match above a partial English one
instead of treating every hit the same way.

Two Japanese sub-fields come out of this: "jp" is the word/sentence as
written (kanji + okurigana, <rt> furigana excluded), "reading" is the
furigana alone. Keeping them separate means a kanji search like 好き and
a reading-only search like ひとり both land cleanly on the same row,
instead of the furigana text gumming up the middle of the kanji string.

Extracts one entry per table row, per dialogue message/statement, per
grammar-note bullet or example, plus one per lesson overview and one
per section heading (so an exact "Grammar Notes" search can jump
straight to that section) — each tagged with the page and
toggle-section it came from, same (page, section) pair initGlobalSearch
(script.js) uses to build a result's link and to know which <details>
to open.
"""

import json
import re
from html.parser import HTMLParser
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

SKIP_SECTIONS = {"practice"}  # placeholder section, nothing to search

VOID_TAGS = {"br", "img", "hr", "meta", "link", "input"}

JP_CLASSES = {"jp", "example-jp", "message-jp"}
ROMAJI_CLASSES = {"romaji", "example", "message-romaji"}
EN_CLASSES = {"english", "example-en", "message-en"}

JP_CHAR_RE = re.compile(r"[぀-ヿ㐀-鿿ｦ-ﾟ]")

# Decorative emoji (section-heading icons, dialogue-card flavor icons
# like ❤️/💔/🍜) — stripped from every text node before it's bucketed,
# so the index never depends on them the way it must never depend on
# ruby/highlight/toggle markup. ️/‍ are the variation
# selector and zero-width joiner emoji sequences use, not visible
# characters on their own.
EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF️‍]+"
)
ICON_PREFIX_RE = re.compile(
    r"^[\U0001F000-\U0001FFFF←-⇿⌀-➿️\s]+"
)
WHITESPACE_RE = re.compile(r"\s+")


# --------------------------------------------------
# MINI DOM
# --------------------------------------------------
# Just enough of a tree to run tag/class lookups and text extraction
# over — not a general HTML parser, tuned to how these pages are
# actually written (well-formed, void tags used correctly).


class Node:
    __slots__ = ("tag", "attrs", "children")

    def __init__(self, tag, attrs):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []  # list[Node | str]

    def classes(self):
        return set(self.attrs.get("class", "").split())


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root", {})
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse(html_src):
    builder = TreeBuilder()
    builder.feed(html_src)
    return builder.root


def find_all(node, tag=None, cls=None):
    for child in node.children:
        if isinstance(child, Node):
            if (tag is None or child.tag == tag) and (
                cls is None or cls in child.classes()
            ):
                yield child
            yield from find_all(child, tag, cls)


def find_first(node, tag=None, cls=None):
    for match in find_all(node, tag, cls):
        return match
    return None


def plain_text(node):
    if isinstance(node, str):
        return node
    return "".join(plain_text(c) for c in node.children)


def collapse(s):
    return WHITESPACE_RE.sub(" ", s).strip()


def strip_leading_icon(s):
    return ICON_PREFIX_RE.sub("", s).strip()


# --------------------------------------------------
# FIELD EXTRACTION
# --------------------------------------------------
# Walks a subtree bucketing every text run into "natural" (Japanese as
# written — kanji/kana, no furigana), "reading" (furigana from <rt>
# only), "romaji" or "en", based on the nearest ancestor's class. Text
# with no such ancestor (grammar-note bullets, headings) is bucketed
# character-by-character: a run of Japanese-range characters goes to
# "natural", everything else to "en" — good enough for prose that mixes
# a Japanese term into an English sentence.
#
# Deliberately no artificial spaces are inserted between "natural" runs
# that sit inside the same inline markup — real Japanese doesn't use
# word spacing, and this is what lets a kanji+okurigana word like 好き
# stay searchable as one contiguous string instead of getting split
# around its own furigana. Block-level boundaries are the one exception,
# for a reason spelled out at BLOCK_TAGS below.


def split_runs(text):
    runs = []
    cur = []
    cur_is_jp = None
    for ch in text:
        is_jp = bool(JP_CHAR_RE.match(ch))
        if cur_is_jp is None or is_jp == cur_is_jp:
            cur.append(ch)
            cur_is_jp = is_jp
        else:
            runs.append(("".join(cur), cur_is_jp))
            cur = [ch]
            cur_is_jp = is_jp
    if cur:
        runs.append(("".join(cur), cur_is_jp))
    return runs


# Block-level tags get a space inserted before and after their content
# in every bucket. Without this, two separate <td> cells (or two
# <br>-separated lines within the same cell) that both land in the
# same bucket — e.g. a vocab row's own td.romaji plus a worked example
# elsewhere in that row, both "romaji" — would run together with no
# separator ("ashitaAshita wa…"). Inline tags (span, ruby, strong…)
# are deliberately left alone: a kanji word and its trailing okurigana
# must NOT get a space forced between them (that's the whole reason
# 好き stays searchable as one word — see the module docstring).
BLOCK_TAGS = {
    "td", "tr", "li", "p", "div", "h1", "h2", "h3", "h4", "h5",
    "article", "summary", "details",
}


def add_separator(buckets):
    buckets["natural"].append(" ")
    buckets["reading"].append(" ")
    buckets["romaji"].append(" ")
    buckets["en"].append(" ")


def walk(node, ctx, buckets):
    if isinstance(node, str):
        text = EMOJI_RE.sub("", node)
        if ctx == "jp":
            buckets["natural"].append(text)
        elif ctx == "romaji":
            buckets["romaji"].append(text)
        elif ctx == "en":
            buckets["en"].append(text)
        else:
            for run, is_jp in split_runs(text):
                buckets["natural" if is_jp else "en"].append(run)
        return

    if node.tag in ("script", "style"):
        return

    if node.tag == "br":
        add_separator(buckets)
        return

    if node.tag == "rt":
        reading = plain_text(node)
        if reading.strip():
            buckets["reading"].append(reading)
            buckets["reading"].append(" ")
        return

    new_ctx = ctx
    classes = node.classes()
    if node.tag == "ruby":
        new_ctx = "jp"
    elif classes & JP_CLASSES:
        new_ctx = "jp"
    elif classes & ROMAJI_CLASSES:
        new_ctx = "romaji"
    elif classes & EN_CLASSES:
        new_ctx = "en"

    is_block = node.tag in BLOCK_TAGS
    if is_block:
        add_separator(buckets)
    for child in node.children:
        walk(child, new_ctx, buckets)
    if is_block:
        add_separator(buckets)


def extract_fields(node):
    buckets = {"natural": [], "reading": [], "romaji": [], "en": []}
    walk(node, None, buckets)
    return {
        "jp": collapse("".join(buckets["natural"])),
        "reading": collapse("".join(buckets["reading"])),
        "romaji": collapse("".join(buckets["romaji"])),
        "en": collapse("".join(buckets["en"])),
    }


def make_entry(url, page_title, section_id, section_title, fields):
    parts = [fields["jp"], fields["reading"], fields["romaji"], fields["en"]]
    text = " ".join(p for p in parts if p)
    if not text:
        return None
    return {
        "page": url,
        "pageTitle": page_title,
        "section": section_id,
        "sectionTitle": section_title,
        "jp": fields["jp"],
        "reading": fields["reading"],
        "romaji": fields["romaji"],
        "en": fields["en"],
        "text": text,
    }


# --------------------------------------------------
# PER-PAGE EXTRACTION
# --------------------------------------------------


def extract(path, url, default_title):
    tree = parse(Path(path).read_text(encoding="utf-8"))
    entries = []

    h1 = find_first(tree, tag="h1")
    page_title = collapse(plain_text(h1)) if h1 is not None else default_title

    def add(node, section_id, section_title):
        """Index one node, unless it turned out to hold no text at all."""
        entry = make_entry(
            url, page_title, section_id, section_title, extract_fields(node)
        )
        if entry:
            entries.append(entry)

    overview = find_first(tree, tag="p", cls="lesson-overview")
    if overview is not None:
        add(overview, "", "Overview")

    for details in find_all(tree, tag="details", cls="toggle-section"):
        section_id = details.attrs.get("id", "")
        if section_id in SKIP_SECTIONS:
            continue

        h2 = find_first(details, tag="h2")
        raw_title = collapse(plain_text(h2)) if h2 is not None else section_id
        section_title = strip_leading_icon(raw_title) or raw_title

        entries.append(
            {
                "page": url,
                "pageTitle": page_title,
                "section": section_id,
                "sectionTitle": section_title,
                "jp": "",
                "reading": "",
                "romaji": "",
                "en": section_title,
                "text": section_title,
            }
        )

        for row in find_all(details, tag="tr"):
            if find_first(row, tag="th") is not None:
                continue
            add(row, section_id, section_title)

        for card in find_all(details, tag="article", cls="dialogue-card"):
            messages = find_first(card, tag="div", cls="dialogue-messages")
            if messages is not None:
                for bubble in find_all(messages, tag="div", cls="message-bubble"):
                    add(bubble, section_id, section_title)
            else:
                add(card, section_id, section_title)

        for note in find_all(details, tag="div", cls="grammar-note"):
            h3 = find_first(note, tag="h3")
            if h3 is not None:
                add(h3, section_id, section_title)

            for li in find_all(note, tag="li"):
                add(li, section_id, section_title)

            for para in find_all(note, tag="p", cls="notes"):
                add(para, section_id, section_title)

    return entries


def main():
    entries = []
    for path, url, page_title in PAGES:
        entries.extend(extract(ROOT / path, url, page_title))

    out_path = ROOT / "assets" / "search-index.js"
    js = (
        "// Auto-generated search index — see assets/build-search-index.py.\n"
        "// Regenerate after editing lesson content: python3 assets/build-search-index.py\n"
        "window.SAKURA_SEARCH_INDEX = "
        + json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    out_path.write_text(js, encoding="utf-8")
    print(f"wrote {out_path} ({len(entries)} entries)")


if __name__ == "__main__":
    main()
