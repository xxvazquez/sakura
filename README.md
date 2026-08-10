# Sakura 🌸

Sakura is a personal Japanese study website that organizes my class notes into a searchable, easy-to-read reference notebook.

The goal is to make vocabulary, grammar, and other topics quick to reference without searching through notebooks, PDFs, or the internet.

## Current Content

Lessons follow Sakura's learning order (linked at the bottom of each lesson via Previous/Next):

1. **Numbers** — cardinal numbers from 1 to 1,000,000, with kanji, furigana, romaji, and irregular readings marked.
2. **Time** — Vocabulary (今日, 朝, 午前, ～から～まで, etc.), then Reference tables for Hours, Minutes, and Duration (X時間), then Dialogue Cards covering common time-related exchanges.
3. **Frequency** — adverbs of frequency (いつも, よく, ときどき, あまり～ません, ぜんぜん～ません) and the 毎～ time-period prefix, a grammar note, short Q&A cards (one per adverb), and a full daily-routine dialogue combining everything.

More topics will be added as I progress through my classes.

## Lesson Structure

Every lesson follows the same shape, in the same order, though not every lesson needs every section:

- **Vocabulary** — introduces new words only.
- **Grammar** — explains usage (as a grammar note, or as per-row notes on a vocabulary table).
- **Reference** — topic-specific systems that don't belong in Vocabulary or Grammar (Numbers' counting table, Time's Hours/Minutes/Duration tables).
- **Questions & Answers** — practises material already introduced earlier on the page.
- **Dialogue** — a natural exchange combining everything on the page.
- **Practice** — placeholder for exercises, coming later.

## Features

- **Reference tables** — every table shows kanji with furigana, romaji, and an English translation; irregular readings are flagged with a small `irr.` tag instead of a bare symbol, so what it means is legible without a separate legend.
- **Particle highlighting** — every grammatical particle (は, を, に, で, と, も, から, まで, か…) is colored consistently across every table, note, and dialogue on the site, in both Japanese script and romaji, so sentence structure is visible at a glance.
- **Furigana / Romaji / English toggle** — three checkboxes at the top of every lesson, on by default, let you hide any of those three layers to practice reading without the crutches. The preference is shared across the whole site via `localStorage`, and hiding a layer never reflows a table or a dialogue card — the space stays reserved.
- **Dialogue cards** — back-and-forth exchanges rendered as chat-style cards (Speaker A / Speaker B), each line showing Japanese with furigana, romaji, and an English translation, three lines per turn everywhere on the site.
- **Notes** — a vocabulary table's per-row usage note follows the same three-line shape as everything else: Japanese (with furigana), romaji, English, after a short explanation.
- **Collapsible sections** — every section lives in a collapsible `<details>`, closed by default, so a page with several topics doesn't turn into one long scroll.
- **Sticky section nav** — pages with more than one section get a quick-jump bar pinned to the top of the viewport; clicking a link opens that section and scrolls to it.
- **Global search** — one search box in the sidebar, on every page, searches every lesson's actual content (not just page titles). Results show the page and matching section and link straight to it; landing on that page opens the right section, scrolls to the specific row/card that matched, and briefly highlights it.
- **Previous / Next lesson nav** — a footer link on every lesson to the next one in Sakura's learning order, so studying doesn't require a trip back to the home page.
- **Sortable tables** — click any column header to sort; number and duration columns sort numerically, not alphabetically.
- **Alphabetical site nav** — the sidebar lists every page alphabetically by title, with no manual categorization to maintain.
- **Responsive** — the sidebar becomes a horizontal top bar below 900px wide, so the site stays usable on a phone.
- **Print-friendly** — printing a page drops all interactive chrome (search, toggles, nav), force-opens every collapsed section, force-shows every display-toggle layer regardless of its on-screen state, and switches particle/irregular-reading colors to bold black so nothing depends on color ink.

## Built With

- HTML, CSS, and vanilla JavaScript — no build step for the site itself, no framework.
- [jQuery](https://jquery.com/) + [DataTables](https://datatables.net/) for table sorting, with their default UI chrome fully replaced by this site's own design.
- One small Python script (`assets/build-search-index.py`) that's the one exception to "no build step" — see below.

## Project Structure

```
sakura/
├── index.html                    Home page — flat alphabetical index of every page
├── assets/
│   ├── style.css                  All styling for every page
│   ├── script.js                  Tables, search, toggles, section/lesson nav
│   ├── search-index.js            Generated search index (see below) — don't hand-edit
│   └── build-search-index.py      Regenerates search-index.js from pages/*.html
├── pages/
│   ├── numbers.html
│   ├── time.html
│   └── frequency.html
└── README.md
```

Adding a new topic means: create `pages/<topic>.html` following an existing page's structure (see "Lesson Structure" above), add it to the sidebar `<nav class="menu">` and the home page's `.page-index` in alphabetical order, wire up its Previous/Next links and its neighbors', then regenerate the search index:

```bash
python3 assets/build-search-index.py
```

No other markup or script changes are needed — `script.js`'s init functions look for elements by class/id and no-op on any page that doesn't have them.

## Website

https://sakura.lauramaestuv.workers.dev

## Project Status

This project is continuously updated with new Japanese class notes and improvements to the website.
