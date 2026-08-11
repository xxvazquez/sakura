// ==========================================================
// Sakura Study — script.js
// ==========================================================
// Shared across every page. Each init function checks for its
// own table/element by id and quietly does nothing if that page
// doesn't have it, so one script file works for every page
// without per-page includes.

// Queried at the moment a scroll/fade is about to start rather than
// cached at load, so flipping the OS setting mid-session takes effect
// without a reload.
const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

$(document).ready(function () {
    initReferenceTables();
    initPageSearch();
    initTableNav();
    initGlobalSearch();
    initSearchHighlight();
    initDisplayToggles();
    initLessonNav();
});

// --------------------------------------------------
// REFERENCE TABLES
// --------------------------------------------------
// Every study table on every page — Numbers' single table, Time's
// Hours/Minutes/Time Vocabulary — shares this init: table.ref-table,
// each living inside its own <details class="toggle-section"> so it
// can be collapsed instead of scrolled past. No per-table search box
// (layout strips topStart/topEnd/bottomStart/bottomEnd chrome); search
// is always driven by the single page-level box — see initPageSearch.
// searching stays true so the API (table.search()) still works with
// the UI removed.
//
// Every table defaults to sorting by its English column ascending via
// data-default-order="colIndex,dir" on the <table> — the index shifts
// per table (e.g. "3,asc" with a Tag column, "2,asc" without one, as
// in Time's Practice Q&A table). Falls back to authored order (order:
// []) if the attribute is missing. Click any header to sort otherwise.

function initReferenceTables() {
    $("table.ref-table").each(function () {
        const $table = $(this);

        const defaultOrder = $table.attr("data-default-order");
        let order = [];
        if (defaultOrder) {
            const [colIndex, dir] = defaultOrder.split(",");
            order = [[parseInt(colIndex, 10), dir]];
        }

        $table.DataTable({
            paging: false,
            info: false,
            ordering: true,
            searching: true,

            order: order,

            layout: {
                topStart: null,
                topEnd: null,
                bottomStart: null,
                bottomEnd: null,
            },
        });
    });
}

// --------------------------------------------------
// PAGE SEARCH
// --------------------------------------------------
// One search box (#pageSearch) filters every table.ref-table AND every
// .dialogue-card on the page at once — never an individual table's own
// box. Cards aren't a DataTable, so they're filtered separately by a
// plain text-content match. A non-empty query also force-opens every
// <details class="toggle-section"> so a match inside a collapsed
// section is still visible; an emptied query leaves toggles as the
// user last left them rather than forcing them shut.

function initPageSearch() {
    const input = document.getElementById("pageSearch");
    if (!input) return;

    // Everything the handler below needs is resolved once here instead
    // of per keystroke — the DataTable API objects, the sections to
    // force open, and each card's lowercased text, which is otherwise a
    // full subtree read per card per keypress. Card markup is static
    // (the only thing that ever edits it is markMatch's <mark>, which
    // doesn't change textContent), so the cached text can't go stale.
    const tableApis = [];
    $("table.ref-table").each(function () {
        if ($.fn.DataTable.isDataTable(this)) {
            tableApis.push($(this).DataTable());
        }
    });

    const cards = Array.from(document.querySelectorAll(".dialogue-card")).map((el) => ({
        el,
        text: el.textContent.toLowerCase(),
    }));

    // Hiragana's kana-grid tables (see KANA GRID, style.css) aren't
    // DataTables — a fixed consonant/vowel matrix has no meaningful
    // sort, and hiding a whole <tr> the way tableApis does would tear
    // a hole in the grid (a row is a consonant, not a single result).
    // A non-matching cell dims in place instead, so the grid's shape
    // stays intact and a match is still easy to spot at a glance.
    const kanaCells = Array.from(document.querySelectorAll("td.kana-cell")).map((el) => ({
        el,
        text: el.textContent.toLowerCase(),
    }));

    if (tableApis.length === 0 && cards.length === 0 && kanaCells.length === 0) return;

    const sections = document.querySelectorAll(".toggle-section");

    input.addEventListener("input", () => {
        const value = input.value;
        const query = value.trim().toLowerCase();

        tableApis.forEach((api) => {
            api.search(value).draw();
        });

        cards.forEach(({ el, text }) => {
            el.style.display = text.includes(query) ? "" : "none";
        });

        kanaCells.forEach(({ el, text }) => {
            el.classList.toggle("search-dim", query !== "" && !text.includes(query));
        });

        if (query !== "") {
            sections.forEach((el) => {
                el.open = true;
            });
        }
    });
}

// --------------------------------------------------
// TABLE NAV
// --------------------------------------------------
// Sticky quick-jump bar (#tableNav) for pages with more than one
// table — see .table-nav in style.css for the position: sticky. Since
// every table.toggle-section is collapsed by default, clicking a link
// here does two things instead of just the browser's default anchor
// jump: opens that section's <details> and scrolls to it, offset by
// the nav's own height so the sticky bar doesn't cover the heading.

function initTableNav() {
    const nav = document.getElementById("tableNav");
    if (!nav) return;

    nav.querySelectorAll("a[href^='#']").forEach((link) => {
        link.addEventListener("click", (e) => {
            const target = document.getElementById(
                link.getAttribute("href").slice(1)
            );
            if (!target) return;

            e.preventDefault();

            if (target.tagName === "DETAILS") {
                target.open = true;
            }

            const navBottom = nav.getBoundingClientRect().bottom;
            const targetTop = target.getBoundingClientRect().top;
            const scrollBy = targetTop - navBottom - 16;

            window.scrollBy({
                top: scrollBy,
                behavior: prefersReducedMotion() ? "auto" : "smooth",
            });
        });
    });
}

// --------------------------------------------------
// LESSON NAV (letter + popover)
// --------------------------------------------------
// The sidebar's page list (#sidebarMenu) shows only a compact letter
// button per starting letter — see .menu-letter-group/.menu-popover in
// style.css — and reveals that letter's lesson name(s) in a popover on
// hover, click/tap, or keyboard focus, instead of spelling every lesson
// name out inline at all times. Built as a plain disclosure widget
// rather than a library: each popover's visibility: hidden (not
// [hidden]) already keeps its links out of the tab order and
// unclickable while closed, so there's no separate tabindex
// bookkeeping to keep in sync with the open/closed state.

function initLessonNav() {
    const nav = document.getElementById("sidebarMenu");
    if (!nav) return;

    const groups = Array.from(nav.querySelectorAll(".menu-letter-group"));
    if (groups.length === 0) return;

    let closeTimer = null;

    // Escape closes the popover and returns focus to its button — but
    // returning focus there fires the same focusin that open()s a
    // popover on Tab-in, which would instantly reopen the one Escape
    // just closed. Set right before that programmatic focus() call and
    // cleared by the very focusin it's meant to suppress, so it never
    // affects a later, real Tab-in.
    let suppressFocusOpen = false;

    const setOpen = (group, open) => {
        group.querySelector(".menu-letter-btn").setAttribute("aria-expanded", open ? "true" : "false");
        group.querySelector(".menu-popover").classList.toggle("is-open", open);
    };

    const closeAll = (except) => {
        groups.forEach((group) => {
            if (group !== except) setOpen(group, false);
        });
    };

    // A popover that would overflow past the right edge of the
    // viewport (a letter near the end of the row, on a narrow screen)
    // flips to hang from the button's right edge instead — measured
    // fresh each time since the same popover can end up on either side
    // depending on where its group lands after the nav reflows.
    const position = (group) => {
        const pop = group.querySelector(".menu-popover");
        pop.style.left = "";
        pop.style.right = "";
        if (pop.getBoundingClientRect().right > window.innerWidth - 8) {
            pop.style.left = "auto";
            pop.style.right = "0";
        }
    };

    const open = (group) => {
        clearTimeout(closeTimer);
        closeAll(group);
        position(group);
        setOpen(group, true);
    };

    // visibility: hidden (unlike display: none) still leaves a popover
    // in normal layout — a group near the right edge of the row (e.g.
    // "T" on a narrow phone width) would otherwise sit at its default
    // left: 0 and stick out past the viewport's right edge even while
    // fully invisible, forcing the whole page to horizontal-scroll to
    // reach nothing. Positioning every popover up front, not only the
    // one being opened, keeps every closed popover's box inside the
    // viewport from first paint.
    const positionAll = () => groups.forEach(position);
    positionAll();
    window.addEventListener("resize", positionAll);

    // A short delay rather than closing immediately on mouseleave/
    // focusout — moving the pointer from the letter button down into
    // its own popover briefly leaves both elements, and an instant
    // close would slam the popover shut before the pointer arrives.
    const scheduleClose = (group) => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => setOpen(group, false), 150);
    };

    groups.forEach((group) => {
        const btn = group.querySelector(".menu-letter-btn");
        const pop = group.querySelector(".menu-popover");

        group.addEventListener("mouseenter", () => open(group));
        group.addEventListener("mouseleave", () => scheduleClose(group));

        btn.addEventListener("click", () => {
            if (btn.getAttribute("aria-expanded") === "true") {
                setOpen(group, false);
            } else {
                open(group);
            }
        });

        // focusin/focusout (not focus/blur) so moving focus from the
        // button to a link inside its own popover — still inside
        // `group` — doesn't read as leaving it.
        group.addEventListener("focusin", () => {
            if (suppressFocusOpen) {
                suppressFocusOpen = false;
                return;
            }
            open(group);
        });
        group.addEventListener("focusout", (e) => {
            if (!group.contains(e.relatedTarget)) {
                setOpen(group, false);
            }
        });

        btn.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                setOpen(group, false);
            } else if (e.key === "ArrowDown" && btn.getAttribute("aria-expanded") !== "true") {
                e.preventDefault();
                open(group);
                const first = pop.querySelector("a");
                if (first) first.focus();
            }
        });

        // Escape from inside the popover itself also returns focus to
        // the button that opened it, rather than dropping focus
        // wherever the now-hidden link happened to sit.
        pop.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                setOpen(group, false);
                suppressFocusOpen = true;
                btn.focus();
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!nav.contains(e.target)) closeAll();
    });
}

// --------------------------------------------------
// DISPLAY TOGGLES (Japanese / Furigana / Romaji / English)
// --------------------------------------------------
// Four checkboxes (#toggleJapanese/#toggleFurigana/#toggleRomaji/
// #toggleEnglish), present on every lesson page, on by default. Each
// one's state is read from and written to the same localStorage key
// regardless of which page you're on, so turning romaji off on Time
// and then navigating to Frequency keeps it off there too — one shared
// preference, not a per-page setting. Unchecking a box adds a
// body.hide-* class; style.css does the actual hiding with
// visibility: hidden so the layout doesn't reflow.

function initDisplayToggles() {
    const layers = [
        { id: "toggleJapanese", key: "sakura-show-japanese", bodyClass: "hide-japanese" },
        { id: "toggleFurigana", key: "sakura-show-furigana", bodyClass: "hide-furigana" },
        { id: "toggleRomaji", key: "sakura-show-romaji", bodyClass: "hide-romaji" },
        { id: "toggleEnglish", key: "sakura-show-english", bodyClass: "hide-english" },
    ];

    layers.forEach(({ id, key, bodyClass }) => {
        const checkbox = document.getElementById(id);
        if (!checkbox) return;

        const stored = localStorage.getItem(key);
        const visible = stored === null ? true : stored === "true";

        checkbox.checked = visible;
        document.body.classList.toggle(bodyClass, !visible);

        checkbox.addEventListener("change", () => {
            localStorage.setItem(key, checkbox.checked);
            document.body.classList.toggle(bodyClass, !checkbox.checked);
        });
    });
}

// --------------------------------------------------
// GLOBAL SEARCH
// --------------------------------------------------
// The one search box in the sidebar (#sidebarSearch), present on every
// page, searches every lesson's actual content — not just page titles
// the way it used to. The content it searches is
// window.SAKURA_SEARCH_INDEX, a flat list of {page, pageTitle,
// section, sectionTitle, jp, reading, romaji, en, text} records
// generated from the lesson pages by assets/build-search-index.py (see
// assets/search-index.js; regenerate that file after editing lesson
// content). jp/reading/romaji/en come from a real parse of each page's
// markup (see the build script), keyed off the same classes the page
// already uses to style Japanese/romaji/English text — never off
// ruby/highlight/toggle markup — so furigana, romaji and English are
// all searchable and toggling any of them on/off never changes a
// result.
//
// Results render as a dropdown under the input instead of filtering
// anything in place, since a match can be on a different page.

function initGlobalSearch() {
    const input = document.getElementById("sidebarSearch");
    const results = document.getElementById("searchResults");
    const rawIndex = window.SAKURA_SEARCH_INDEX;

    if (!input || !results || !rawIndex) return;

    // Standard combobox/listbox pattern (same one Algolia DocSearch,
    // GitHub's search, etc. use): the input keeps real DOM focus the
    // whole time, arrow keys move a "virtual" selection announced via
    // aria-activedescendant, and each option is tabindex="-1" (set in
    // resultCard below) so Tab moves past the whole widget in one hop
    // instead of stopping at every result.
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "searchResults");
    input.setAttribute("aria-label", "Search lessons");
    results.setAttribute("role", "listbox");
    results.setAttribute("aria-label", "Search results");

    // Pages live one folder deeper than index.html, but link to each
    // other from that same folder — so the right prefix depends on
    // where *this* page is, not where the result is.
    const prefix = location.pathname.includes("/pages/") ? "" : "pages/";

    const escapeHtml = (s) =>
        s.replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[c]);

    // --------------------------------------------------
    // Romaji macron folding — "kohi"/"kouhii" both need to reach a
    // field spelled "kōhī". Two ASCII variants are enough: macrons
    // stripped to a bare vowel, and macrons expanded to the doubled
    // vowel wāpuro typing normally uses (ō → ou, not oo — that's the
    // form the common kana this project romanizes as ō actually take).
    const MACRONS = { ā: "a", ī: "i", ū: "u", ē: "e", ō: "o" };
    const foldMacrons = (s) => s.replace(/[āīūēō]/g, (c) => MACRONS[c]);
    const expandMacrons = (s) =>
        s
            .replace(/ā/g, "aa")
            .replace(/ī/g, "ii")
            .replace(/ū/g, "uu")
            .replace(/ē/g, "ee")
            .replace(/ō/g, "ou");

    // --------------------------------------------------
    // Precompute once at load, not per keystroke: lowercase copies of
    // every field plus the romaji macron variants, and one combined
    // "haystack" per entry used as a cheap first-pass filter so the
    // (slightly pricier) per-field tier lookup below only runs on
    // entries that already contain the query somewhere.
    const index = rawIndex.map((entry) => {
        const pt = entry.pageTitle.toLowerCase();
        const st = entry.sectionTitle.toLowerCase();
        const jp = entry.jp.toLowerCase();
        const reading = entry.reading.toLowerCase();
        const romaji = entry.romaji.toLowerCase();
        const romajiFolded = foldMacrons(romaji);
        const romajiExpanded = expandMacrons(romaji);
        const en = entry.en.toLowerCase();
        const text = entry.text.toLowerCase();
        return {
            entry,
            pt,
            st,
            jp,
            reading,
            romaji,
            romajiFolded,
            romajiExpanded,
            en,
            text,
            haystack: [pt, st, jp, reading, romaji, romajiFolded, romajiExpanded, en, text].join(
                "   "
            ),
        };
    });

    // --------------------------------------------------
    // Ranking — predictable over clever. Exact matches on the things a
    // user recognizes by name (the lesson, the section) always beat
    // content matches; among content matches, Japanese beats romaji
    // beats English, and an exact match beats a partial one within
    // each of those. See the README-style rundown in the redesign
    // notes for the full 11-tier list this encodes.
    const classify = (row, q) => {
        if (row.pt === q) return 1;
        if (row.st === q) return 2;
        if (row.jp === q || row.reading === q) return 3;
        if (row.romaji === q || row.romajiFolded === q || row.romajiExpanded === q) return 4;
        if (row.en === q) return 5;
        if (row.pt.includes(q)) return 6;
        if (row.st.includes(q)) return 7;
        if (row.jp.includes(q) || row.reading.includes(q)) return 8;
        if (
            row.romaji.includes(q) ||
            row.romajiFolded.includes(q) ||
            row.romajiExpanded.includes(q)
        )
            return 9;
        if (row.en.includes(q)) return 10;
        return 11;
    };

    // The field a tier was decided on is also the field most likely to
    // literally contain the match on the destination page — used to
    // build the "m" locator param initSearchHighlight uses to find the
    // right row/card/message there, and as a snippet fallback when the
    // combined display text doesn't contain the query verbatim (e.g. a
    // macron-folded romaji match).
    const locatorFor = (row, q) => {
        if (row.jp.includes(q)) return row.entry.jp;
        if (row.reading.includes(q)) return row.entry.reading;
        if (row.romaji.includes(q) || row.romajiFolded.includes(q) || row.romajiExpanded.includes(q))
            return row.entry.romaji;
        if (row.en.includes(q)) return row.entry.en;
        return row.entry.text;
    };

    // A row's full text can run well past what two lines of a result
    // fits — clamping to the first two lines regardless of where the
    // match falls means a hit later in the text (e.g. inside the
    // example sentence rather than the vocab word itself) can scroll
    // off before you ever see why it matched. Window the snippet
    // around the match instead, so what's shown is always centered on
    // the highlighted term.
    //
    // The window's edges are then nudged out to the nearest space
    // (within a few characters) so a truncated snippet reads "…wa
    // gakkō e ikimasu…" rather than lopping into the middle of a word
    // on either side. Only worth doing for the Latin half of an entry
    // — Japanese has no spaces to nudge to, and the fields here mostly
    // aren't so long that clipping mid-run is even visible.
    const nudgeToSpace = (text, start, end) => {
        const LOOKAROUND = 12;
        if (start > 0) {
            const ahead = text.slice(start, start + LOOKAROUND);
            const sp = ahead.indexOf(" ");
            if (sp !== -1 && sp < LOOKAROUND - 1) start += sp + 1;
        }
        if (end < text.length) {
            const behind = text.slice(Math.max(start, end - LOOKAROUND), end);
            const sp = behind.lastIndexOf(" ");
            if (sp !== -1) end = Math.max(start, end - LOOKAROUND) + sp;
        }
        return [start, end];
    };

    const snippetAround = (text, query, contextChars) => {
        const i = text.toLowerCase().indexOf(query.toLowerCase());
        if (i === -1) {
            return text.length > contextChars * 2
                ? text.slice(0, contextChars * 2) + "…"
                : text;
        }

        let start = Math.max(0, i - contextChars);
        let end = Math.min(text.length, i + query.length + contextChars);
        [start, end] = nudgeToSpace(text, start, end);

        let snippet = text.slice(start, end);
        if (start > 0) snippet = "…" + snippet;
        if (end < text.length) snippet = snippet + "…";
        return snippet;
    };

    // Wraps every non-overlapping occurrence of `query` in `text`, not
    // just the first — a snippet often carries the term more than once
    // (an example sentence and its own gloss both saying "ramen"), and
    // a documentation search that only lights up one instance reads as
    // half-finished. Plain indexOf scanning, never a RegExp built from
    // user input, so nothing in the query can be interpreted as a
    // pattern.
    const highlightAll = (text, query) => {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        if (!lowerQuery) return escapeHtml(text);

        let html = "";
        let pos = 0;
        let i;
        while ((i = lowerText.indexOf(lowerQuery, pos)) !== -1) {
            html += escapeHtml(text.slice(pos, i));
            html +=
                '<mark class="search-mark">' +
                escapeHtml(text.slice(i, i + query.length)) +
                "</mark>";
            pos = i + query.length;
        }
        html += escapeHtml(text.slice(pos));
        return html;
    };

    // Latin queries need at least 2 characters to cut down on noise
    // ("a" would match nearly every row), but that same floor would
    // silently swallow every single-character Japanese search — か,
    // に, は, を, で, と, へ, も, の, が are each a complete, meaningful
    // query on their own (particles above all), unlike a single Latin
    // letter. Hiragana/katakana/kanji ranges get a floor of 1 instead.
    const hasJapanese = (s) =>
        /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);

    // The 2-character floor above blocks を and へ — の, に, で, と, か,
    // が, も, は all romanize to 2+ letters, but hepburn romanizes を as
    // "o" and へ as "e" (as a particle; "he" is the kana's own name),
    // both a single letter. These two are the only single-letter romaji
    // that are a complete, real word rather than "a" or "n" fragments.
    const SINGLE_LETTER_PARTICLES = new Set(["o", "e"]);

    // Tells "suki" landing on the actual word "suki" apart from "suki"
    // landing mid-word inside "maitsuki" (毎月, unrelated) — both are a
    // partial match on the same tier, but only one of them is the word
    // someone typed. No such signal exists for Japanese (no spaces to
    // check against), so this only ever adjusts romaji/English matches;
    // Japanese fields always score as if already at a boundary.
    const isWordChar = (ch) => /[a-zA-Z0-9]/.test(ch);
    const boundaryScore = (field, q) => {
        if (hasJapanese(field)) return 0;
        const i = field.toLowerCase().indexOf(q);
        if (i === -1) return 0;
        const before = i > 0 ? field[i - 1] : "";
        const after = i + q.length < field.length ? field[i + q.length] : "";
        const leftOk = !before || !isWordChar(before);
        const rightOk = !after || !isWordChar(after);
        if (leftOk && rightOk) return 0;
        if (leftOk || rightOk) return 1;
        return 2;
    };

    const INITIAL_LIMIT = 8;
    const MAX_CONSIDERED = 500;

    let expanded = false;
    let currentMatches = []; // [{ row, tier, locator, boundary }]
    let currentQuery = "";
    let activeIndex = -1; // virtual selection — see the combobox note above

    const openResults = () => {
        results.hidden = false;
        input.setAttribute("aria-expanded", "true");
    };

    // Dropping the virtual selection has to drop the pointer to it as
    // well: a leftover aria-activedescendant leaves a screen reader
    // announcing an option that nothing on screen is selecting anymore
    // (the ids are reused across renders, so it would still resolve).
    const clearActive = () => {
        activeIndex = -1;
        input.removeAttribute("aria-activedescendant");
    };

    const closeResults = () => {
        results.hidden = true;
        input.setAttribute("aria-expanded", "false");
        clearActive();
    };

    // Every write to the dropdown goes through here so the cached item
    // list below can never outlive the DOM it was read from.
    let navItemsCache = null;
    const setResultsHtml = (html) => {
        results.innerHTML = html;
        navItemsCache = null;
    };

    // Cached between renders because mouseover would otherwise re-run
    // this query for every pointer move across the list, just to look
    // up an index.
    const navItems = () => {
        if (!navItemsCache) {
            navItemsCache = Array.from(
                results.querySelectorAll(".search-result, .search-results-more")
            );
        }
        return navItemsCache;
    };

    // Paints the current activeIndex onto whichever elements exist
    // right now — called after every arrow key/hover. A fresh render
    // doesn't need it: the markup is emitted with aria-selected="false"
    // already and clearActive() resets the index alongside it.
    const applyActive = () => {
        const els = navItems();
        els.forEach((el, i) => {
            el.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
        });
        const activeEl = els[activeIndex];
        if (activeEl) {
            input.setAttribute("aria-activedescendant", activeEl.id);
            activeEl.scrollIntoView({ block: "nearest" });
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    };

    const moveActive = (delta) => {
        const count = navItems().length;
        if (count === 0) return;
        activeIndex =
            activeIndex === -1
                ? delta > 0
                    ? 0
                    : count - 1
                : (activeIndex + delta + count) % count;
        applyActive();
    };

    const resultCard = (item, id) => {
        const { entry } = item.row;
        const locator = item.locator;
        let href = prefix + entry.page;
        const params = new URLSearchParams();
        params.set("q", currentQuery);
        if (locator && locator !== entry.text) params.set("m", locator);
        href += "?" + params.toString();
        if (entry.section) href += "#" + entry.section;

        // Prefer a snippet drawn from the entry's own display text; if
        // the query only matched through a macron-folded romaji
        // variant (see foldMacrons/expandMacrons above), that text
        // never literally contains what was typed, so fall back to
        // whichever field actually did match — still relevant, even
        // without a highlighted term inside it.
        const snippetSource = entry.text.toLowerCase().includes(currentQuery.toLowerCase())
            ? entry.text
            : locator;
        const snippet = highlightAll(snippetAround(snippetSource, currentQuery, 45), currentQuery);

        return (
            '<a class="search-result" id="' +
            id +
            '" role="option" aria-selected="false" tabindex="-1" href="' +
            href +
            '"><span class="search-result-lesson">' +
            escapeHtml(entry.pageTitle) +
            '</span><span class="search-result-section">' +
            escapeHtml(entry.sectionTitle) +
            '</span><span class="search-result-snippet">' +
            snippet +
            "</span></a>"
        );
    };

    const renderList = () => {
        const shown = expanded ? currentMatches : currentMatches.slice(0, INITIAL_LIMIT);
        let html = shown.map((item, i) => resultCard(item, "search-item-" + i)).join("");

        if (!expanded && currentMatches.length > INITIAL_LIMIT) {
            html +=
                '<button type="button" class="search-results-more" id="search-item-more" role="option" aria-selected="false" tabindex="-1">Show all results (' +
                currentMatches.length +
                ")</button>";
        }

        setResultsHtml(html);
        clearActive();
        openResults();
    };

    const render = (query) => {
        const minLength =
            hasJapanese(query) || SINGLE_LETTER_PARTICLES.has(query.toLowerCase()) ? 1 : 2;
        if (query.length < minLength) {
            closeResults();
            setResultsHtml("");
            currentMatches = [];
            currentQuery = "";
            return;
        }

        const lowerQuery = query.toLowerCase();
        const tiered = [];
        for (const row of index) {
            if (!row.haystack.includes(lowerQuery)) continue;
            const tier = classify(row, lowerQuery);
            const locator = locatorFor(row, lowerQuery);
            const boundary = boundaryScore(locator, lowerQuery);
            tiered.push({ row, tier, locator, boundary });
            if (tiered.length >= MAX_CONSIDERED) break;
        }

        // Stable sort by tier, then by whether the match landed on a
        // real word or just inside one, then by how specific the
        // matched field is — a standalone vocab row's whole field
        // equalling the query beats a full sentence that merely
        // contains it somewhere, even inside the same tier.
        tiered.sort(
            (a, b) =>
                a.tier - b.tier ||
                a.boundary - b.boundary ||
                a.locator.length - b.locator.length
        );

        // A handful of example sentences are deliberately reused
        // across sections (a Core Patterns card and a Q&A card can
        // share the exact same line) — showing the identical sentence
        // twice in one results list reads as noise, not as two
        // different answers, so keep only the first (best-ranked) copy
        // of each (page, text) pair.
        const seen = new Set();
        currentMatches = tiered.filter((item) => {
            const key = item.row.entry.page + "|" + item.row.entry.text;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        currentQuery = query;
        expanded = false;

        if (currentMatches.length === 0) {
            setResultsHtml(
                '<p class="search-results-empty">No results for “' + escapeHtml(query) + '”.</p>'
            );
            clearActive();
            openResults();
            return;
        }

        renderList();
    };

    // Coalesce to one render per frame — typing faster than a frame
    // (fast typists, paste) shouldn't trigger a redundant scan+sort
    // for every keystroke that arrives before the next repaint.
    let scheduled = false;
    const scheduleRender = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            render(input.value.trim());
        });
    };

    // While an IME is composing (typing kana via romaji input, the
    // normal way to enter Japanese on a non-JIS keyboard), the input
    // event fires repeatedly with not-yet-final text — searching on
    // every one of those intermediate states means the result list
    // flickers through nonsense until composition settles. Wait for
    // compositionend instead.
    let composing = false;
    input.addEventListener("compositionstart", () => {
        composing = true;
    });
    input.addEventListener("compositionend", () => {
        composing = false;
        scheduleRender();
    });
    input.addEventListener("input", () => {
        if (composing) return;
        scheduleRender();
    });

    results.addEventListener("click", (e) => {
        if (e.target.closest(".search-results-more")) {
            expanded = true;
            renderList();
        }
    });

    // Keeps mouse and keyboard in sync: hovering a result moves the
    // same virtual selection arrow keys use, so switching between
    // pointer and keyboard mid-search never leaves two different
    // "current" items on screen at once.
    results.addEventListener("mouseover", (e) => {
        const item = e.target.closest(".search-result, .search-results-more");
        if (!item) return;
        const idx = navItems().indexOf(item);
        if (idx !== -1 && idx !== activeIndex) {
            activeIndex = idx;
            applyActive();
        }
    });

    input.addEventListener("focus", () => {
        if (currentMatches.length > 0) openResults();
    });

    document.addEventListener("click", (e) => {
        if (!results.contains(e.target) && e.target !== input) {
            closeResults();
        }
    });

    input.addEventListener("keydown", (e) => {
        // Two-stage, like a command palette: the first Escape only
        // dismisses the suggestion list and leaves the cursor in place
        // (standard combobox behavior — the field itself wasn't what
        // the user was trying to leave), a second Escape with nothing
        // left to dismiss blurs the field itself.
        if (e.key === "Escape") {
            if (!results.hidden) {
                closeResults();
            } else {
                input.blur();
            }
            return;
        }

        if (results.hidden) {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && currentMatches.length > 0) {
                e.preventDefault();
                openResults();
                moveActive(e.key === "ArrowDown" ? 1 : -1);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            moveActive(1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveActive(-1);
        } else if (e.key === "Enter") {
            const els = navItems();
            if (els.length === 0) return;
            e.preventDefault();
            const target = activeIndex === -1 ? els[0] : els[activeIndex];
            target.click();
        }
    });
}

// --------------------------------------------------
// SEARCH RESULT HIGHLIGHT
// --------------------------------------------------
// Runs on every page load. If the URL has a ?q= from a search result
// (see initGlobalSearch above), locate the specific row/message/note
// the result card was actually about, scroll to it, and wrap the
// matched term in the same .search-mark used in the results dropdown
// — otherwise a search result just dumps you at the top of a big
// opened section with no indication of what actually matched.
//
// Two params do different jobs: "m" (locator) is the exact field value
// that made this entry match — used only to pick the right element out
// of everything in the opened section — and "q" (query) is what the
// user actually typed, which is what gets wrapped in <mark>. They're
// often the same text, but not always (a macron-folded romaji match,
// for instance, has a "q" that never appears verbatim on the page).

function initSearchHighlight() {
    const params = new URLSearchParams(location.search);
    const query = params.get("q");
    if (!query) return;
    const locator = params.get("m") || query;

    const target = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;
    if (target && target.tagName === "DETAILS") {
        target.open = true;
    }

    const reduceMotion = prefersReducedMotion();

    const scope = target || document;
    const lowerLocator = locator.toLowerCase();
    const candidates = scope.querySelectorAll(
        "td.kana-cell, tbody tr, .message-bubble, .dialogue-card, .grammar-note li, .grammar-note p.notes, .grammar-note h3, .lesson-overview"
    );

    // Several candidate selectors can legitimately contain the same
    // text (a dialogue-card wraps its own message-bubbles), so the
    // first match in document order isn't necessarily the right one —
    // the smallest element that still contains the full locator is,
    // since that's the innermost, most specific match.
    let hit = null;
    let hitLength = Infinity;
    candidates.forEach((el) => {
        const text = el.textContent.toLowerCase();
        if (text.includes(lowerLocator) && text.length < hitLength) {
            hit = el;
            hitLength = text.length;
        }
    });

    const scrollTarget = hit || target;
    if (scrollTarget) {
        scrollTarget.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
        });
    }

    if (hit) {
        markMatch(hit, query, reduceMotion);
    }

    // Strip ?q=/?m= so refreshing or bookmarking the page doesn't
    // replay the scroll/highlight on every visit.
    history.replaceState(null, "", location.pathname + location.hash);
}

// Both the <mark> path and the whole-element fallback below hold the
// highlight, then fade it, on the same clock — HOLD is the "long enough
// to register, short enough not to become page furniture" delay, FADE
// matches the 0.3s background-color transition .search-mark and
// .search-highlight-fallback declare in style.css, so the cleanup only
// runs once the fade has actually finished.
const HIGHLIGHT_HOLD_MS = 4500;
const HIGHLIGHT_FADE_MS = 300;

// Wraps the first occurrence of `query` inside `root` in a
// <mark class="search-mark"> — the exact same class the results
// dropdown uses, so a match looks identical whether you're still
// reading the list or have already landed on the page. Fades out
// automatically after ~4.5s: long enough to register without lingering
// as page furniture once you've read it.
//
// A TreeWalker only ever sees whole text nodes, so this can only
// highlight a match that falls entirely within one (true of virtually
// every case here, since ruby/particle spans keep related text inside
// a single node) — a match straddling a tag boundary falls back to
// tinting the whole element instead of not highlighting anything.
function markMatch(root, query, reduceMotion) {
    const lowerQuery = query.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        const i = node.nodeValue.toLowerCase().indexOf(lowerQuery);
        if (i === -1) continue;

        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + query.length);

        const mark = document.createElement("mark");
        mark.className = "search-mark";
        range.surroundContents(mark);

        fadeThenUnwrap(mark, reduceMotion);
        return;
    }

    // No single text node held the whole query — tint the element
    // instead of highlighting nothing.
    root.classList.add("search-highlight-fallback");
    if (reduceMotion) {
        setTimeout(() => root.classList.remove("search-highlight-fallback"), HIGHLIGHT_HOLD_MS);
    } else {
        setTimeout(() => root.classList.add("search-mark--fade"), HIGHLIGHT_HOLD_MS);
        setTimeout(
            () => root.classList.remove("search-highlight-fallback", "search-mark--fade"),
            HIGHLIGHT_HOLD_MS + HIGHLIGHT_FADE_MS
        );
    }
}

function fadeThenUnwrap(mark, reduceMotion) {
    const unwrap = () => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    };

    if (reduceMotion) {
        setTimeout(unwrap, HIGHLIGHT_HOLD_MS);
        return;
    }

    setTimeout(() => mark.classList.add("search-mark--fade"), HIGHLIGHT_HOLD_MS);
    setTimeout(unwrap, HIGHLIGHT_HOLD_MS + HIGHLIGHT_FADE_MS);
}
