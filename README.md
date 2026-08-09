# Sakura 🌸

Sakura is a personal Japanese study website that organizes my class notes into searchable, easy-to-read reference pages.

The goal is to make vocabulary, grammar, and other topics quick to reference without searching through notebooks, PDFs, or the internet.

## Current Content

- **Frequency** — adverbs of frequency (いつも, よく, ときどき, あまり, ぜんぜん), the 毎～ time-period prefix, a grammar note, short Q&A cards, and a full daily-routine dialogue.
- **Numbers** — cardinal numbers from 1 to 1,000,000, with kanji, furigana, romaji, and irregular readings marked.
- **Time** — hours, minutes, duration (X時間), general time vocabulary (今日, 朝, 午前, ～から～まで, etc.), and dialogue cards covering common time-related exchanges.

More topics will be added as I progress through my classes.

## Features

- **Reference tables** — every table shows kanji with furigana, romaji, and an English translation; irregular readings are flagged with a `*` tag.
- **Particle highlighting** — every grammatical particle (は, を, に, で, と, も, から, まで, か…) is colored consistently across every table, note, and dialogue on the site, so sentence structure is visible at a glance.
- **Dialogue cards** — short back-and-forth exchanges rendered as chat-style cards (Speaker A / Speaker B), each line showing Japanese with furigana, romaji, and an English translation.
- **Collapsible sections** — every table/dialogue group lives in a collapsible section, closed by default, so a page with several topics doesn't turn into one long scroll.
- **Sticky section nav** — pages with more than one section get a quick-jump bar pinned to the top of the viewport; clicking a link opens that section and scrolls to it.
- **One search box per page** — a single search field filters every table and dialogue card on the page at once (not per-table search boxes).
- **Sortable tables** — click any column header to sort; number and duration columns sort numerically, not alphabetically.
- **Alphabetical site nav** — the sidebar lists every page alphabetically by title, with no manual categorization to maintain.
- **Responsive** — the sidebar becomes a horizontal top bar below 900px wide, so the site stays usable on a phone.
- **Print-friendly** — printing a page drops the sidebar, search boxes, and nav chrome, force-opens every collapsed section, and switches particle/irregular-reading colors to bold black so nothing depends on color ink.

## Built With

- HTML, CSS, and vanilla JavaScript — no build step, no framework.
- [jQuery](https://jquery.com/) + [DataTables](https://datatables.net/) for table sorting and search, with their default UI chrome fully replaced by this site's own design.

## Project Structure

```
sakura/
├── index.html            Home page — flat alphabetical index of every page
├── assets/
│   ├── style.css          All styling for every page
│   └── script.js          Table init, page search, section nav, sidebar search
├── pages/
│   ├── frequency.html
│   ├── numbers.html
│   └── time.html
└── README.md
```

Adding a new topic means: create `pages/<topic>.html` following the structure of an existing page (copy `time.html` as a starting point for a multi-section page, or `numbers.html` for a single table), then add it to the sidebar `<nav class="menu">` and the home page's `.page-index` in alphabetical order. No other markup or script changes are needed — `script.js`'s init functions look for elements by class/id and no-op on any page that doesn't have them.

## Website

https://sakura.lauramaestuv.workers.dev

## Project Status

This project is continuously updated with new Japanese class notes and improvements to the website.
