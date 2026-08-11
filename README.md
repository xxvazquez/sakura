# Sakura 🌸

Sakura is a personal Japanese study website that organizes my class notes into a searchable, easy-to-read reference notebook.

The goal is to make vocabulary, grammar, and other topics quick to reference without searching through notebooks, PDFs, or the internet.

## Current Content

The home page indexes the full planned scope of the notebook as seven collapsible reference categories — Writing System, Basic Communication, Numbers & Time, People, Daily Life, Places & Travel, and Grammar — with 31 lessons total. Lessons that don't have a page yet show up as a muted placeholder tagged "Soon" instead of a dead link, so the categories stay visible even when mostly unbuilt.

Seven lessons are built so far, spread across four categories. They also follow a site-wide reading order — the homepage's categories read top to bottom, real lessons within each — linked at the bottom of each lesson via Previous/Next:

1. **Hiragana** — the complete hiragana chart (46 basic + dakuten + handakuten + combination sounds), each character paired with a real N5 vocabulary word, plus notes on dakuten, small っ, long vowels, を, and ん.
2. **Likes & Dislikes** — 好き/好きじゃない/大好き/嫌い and the が・は・の・も particles used to express preferences, with model sentences, a Q&A set, grammar notes, and an example dialogue.
3. **Numbers** — cardinal numbers from 1 to 1,000,000, with kanji, furigana, romaji, and irregular readings marked.
4. **Time** — reference tables for Hours, Minutes, Time Vocabulary (今日, 朝, 午前, ～から～まで, etc.), and Counting Hours (X時間), then a Questions & Answers section of common time-related exchanges.
5. **Frequency** — adverbs of frequency (いつも, よく, ときどき, あまり～ません, ぜんぜん～ません) and the 毎～ time-period prefix, a grammar note, short Q&A cards (one per adverb), and a full daily-routine Example Dialogue combining everything.
6. **Personal Pronouns** — 私/あなた/彼/彼女 and their plurals, a grammar note on when pronouns are dropped or replaced by name+さん, then a Common Ways to Refer to People table, Questions & Answers, and an Example Dialogue.
7. **Demonstratives** — the これ/それ/あれ/どれ and この/その/あの/どの series, a grammar note contrasting the two tables, Questions & Answers, and an Example Dialogue.

More topics will be added as I progress through my classes.

## Lesson Structure

Every lesson shares the same shell, but the content sections themselves are named for their topic rather than following a fixed generic order — a page gets whatever sections its material actually needs:

- **Overview** — one concise summary sentence or two, styled as a pale accent-tinted card, answering only "what will I learn here."
- **Sticky quick-jump nav** — links to every section on the page (e.g. Time's Hours / Minutes / Time Vocabulary / Counting Hours / Questions & Answers).
- **Content sections** — one collapsible section per topic-specific table, each with a small icon in its heading (📋 reference, 📚 vocabulary, 🧩 grammar, 💬 Q&A, 🗨️ example dialogue, 💡 notes) so the page's shape is scannable at a glance. Grammar explanations either sit inline within a table's section or, when a lesson has several distinct grammar points (like Likes & Dislikes), get their own dedicated Grammar Notes section instead.
- **Questions & Answers** — short Q&A cards practising material already introduced earlier on the page, where the lesson has one.
- **Example Dialogue** — a natural back-and-forth exchange combining everything on the page, where the lesson has one.
- **Previous / Next** — footer nav to the neighboring lesson in the site-wide reading order.

## Features

- **Reference tables** — every table shows kanji with furigana, romaji, and an English translation; irregular readings are flagged with a small `irr.` tag instead of a bare symbol, so what it means is legible without a separate legend.
- **Particle highlighting** — every grammatical particle (は, を, に, で, と, も, から, まで, か…) is colored consistently across every table, note, and dialogue on the site, in both Japanese script and romaji, so sentence structure is visible at a glance.
- **Furigana / Romaji / English toggle** — three checkboxes at the top of every lesson, on by default, let you hide any of those three layers to practice reading without the crutches. The preference is shared across the whole site via `localStorage`, and hiding a layer never reflows a table or a dialogue card — the space stays reserved.
- **Dialogue cards** — back-and-forth exchanges rendered as chat-style cards (Speaker A / Speaker B), each line showing Japanese with furigana, romaji, and an English translation, three lines per turn everywhere on the site.
- **Notes** — a vocabulary table's per-row usage note follows the same three-line shape as everything else: Japanese (with furigana), romaji, English, after a short explanation.
- **Collapsible sections** — every section lives in a collapsible `<details>`, closed by default, so a page with several topics doesn't turn into one long scroll.
- **Sticky section nav** — pages with more than one section get a quick-jump bar pinned to the top of the viewport; clicking a link opens that section and scrolls to it.
- **Global search** — one search box in the sidebar, on every page, searches every lesson's actual content (not just page titles). Results show the page and matching section and link straight to it; landing on that page opens the right section, scrolls to the specific row/card that matched, and briefly highlights it.
- **Previous / Next lesson nav** — a footer link on every lesson to the next one in the site-wide reading order (the homepage's categories, top to bottom), so studying doesn't require a trip back to the home page.
- **Sortable tables** — click any column header to sort; number and duration columns sort numerically, not alphabetically.
- **Section icons + heading accent** — every section heading gets one consistent small icon (📋 reference, 📚 vocabulary, 🧩 grammar, 💬 Q&A, 🗨️ example dialogue, 💡 notes) and a shared muted accent color, so a page's shape is scannable without reading every label.
- **Category index (home page)** — every planned lesson is grouped into one of seven fixed reference categories (Writing System, Basic Communication, Numbers & Time, People, Daily Life, Places & Travel, Grammar), each a collapsible section so a 31-lesson notebook stays scannable instead of dumping every lesson at once. Lessons without a page yet render as a muted "Soon" placeholder in their category rather than a link, so the full planned scope is visible without ever producing a dead link.
- **Alphabetical site nav** — the sidebar, separately from the home page's categories, lists every *built* page alphabetically by title, with no manual categorization to maintain.
- **Responsive** — the sidebar becomes a horizontal top bar below 900px wide, so the site stays usable on a phone.
- **Print-friendly** — printing a page drops all interactive chrome (search, toggles, nav), force-opens every collapsed section, force-shows every display-toggle layer regardless of its on-screen state, and switches particle/irregular-reading colors to bold black so nothing depends on color ink.

## Built With

- HTML, CSS, and vanilla JavaScript — no build step for the site itself, no framework.
- [jQuery](https://jquery.com/) + [DataTables](https://datatables.net/) for table sorting, with their default UI chrome fully replaced by this site's own design.
- One small Python script (`assets/build-search-index.py`) that's the one exception to "no build step" — see below.

## Project Structure

```
sakura/
├── index.html                    Home page — lessons grouped into collapsible reference categories
├── assets/
│   ├── style.css                  All styling for every page
│   ├── script.js                  Tables, search, toggles, section/lesson nav
│   ├── search-index.js            Generated search index (see below) — don't hand-edit
│   ├── build-search-index.py      Regenerates search-index.js from pages/*.html
│   └── favicon.svg                Site icon, referenced by every page's <head>
├── pages/
│   ├── demonstratives.html
│   ├── frequency.html
│   ├── hiragana.html
│   ├── likes-dislikes.html
│   ├── numbers.html
│   ├── pronouns.html
│   └── time.html
└── README.md
```

Adding a new topic means: create `pages/<topic>.html` following an existing page's structure (see "Lesson Structure" above), add it to the sidebar `<nav class="menu">` in alphabetical order, swap its `<span class="lesson-placeholder">` for a `<a class="lesson-link">` in its category on the home page, wire up its Previous/Next links and its neighbors', then regenerate the search index:

```bash
python3 assets/build-search-index.py
```

No other markup or script changes are needed — `script.js`'s init functions look for elements by class/id and no-op on any page that doesn't have them.

## Website

https://sakura.lauramaestuv.workers.dev

## Project Status

This project is continuously updated with new Japanese class notes and improvements to the website.
