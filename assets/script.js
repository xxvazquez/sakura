// ==========================================================
// Sakura Study — script.js
// ==========================================================
// Shared across every page. Each init function checks for its
// own table/element by id and quietly does nothing if that page
// doesn't have it, so one script file works for every page
// without per-page includes.

$(document).ready(function () {
    initReferenceTables();
    initPageSearch();
    initTableNav();
    initGlobalSearch();
    initSearchHighlight();
    initDisplayToggles();
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

    const tables = $("table.ref-table").filter(function () {
        return $.fn.DataTable.isDataTable(this);
    });
    const cards = document.querySelectorAll(".dialogue-card");
    if (tables.length === 0 && cards.length === 0) return;

    input.addEventListener("input", () => {
        const value = input.value;
        const query = value.trim().toLowerCase();

        tables.each(function () {
            $(this).DataTable().search(value).draw();
        });

        cards.forEach((card) => {
            const matches = card.textContent.toLowerCase().includes(query);
            card.style.display = matches ? "" : "none";
        });

        if (value.trim() !== "") {
            document.querySelectorAll(".toggle-section").forEach((el) => {
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

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

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
                behavior: reduceMotion ? "auto" : "smooth",
            });
        });
    });
}

// --------------------------------------------------
// DISPLAY TOGGLES (Furigana / Romaji / English)
// --------------------------------------------------
// Three checkboxes (#toggleFurigana/#toggleRomaji/#toggleEnglish),
// present on every lesson page, on by default. Each one's state is
// read from and written to the same localStorage key regardless of
// which page you're on, so turning romaji off on Time and then
// navigating to Frequency keeps it off there too — one shared
// preference, not a per-page setting. Unchecking a box adds a
// body.hide-* class; style.css does the actual hiding with
// visibility: hidden so the layout doesn't reflow.

function initDisplayToggles() {
    const layers = [
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
// section, sectionTitle, text} records generated from the lesson
// pages by assets/build-search-index.py (see assets/search-index.js;
// regenerate that file after editing lesson content).
//
// Results render as a dropdown under the input instead of filtering
// anything in place, since a match can be on a different page. Each
// result links to `${page}?q=${query}#${section}` — the query string
// is what initSearchHighlight (below) reads on the destination page to
// scroll to and briefly flash the specific row/card that matched,
// after the #section hash has already opened that toggle.

function initGlobalSearch() {
    const input = document.getElementById("sidebarSearch");
    const results = document.getElementById("searchResults");
    const index = window.SAKURA_SEARCH_INDEX;

    if (!input || !results || !index) return;

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

    // A row's full text can run well past what two lines of a result
    // fits — clamping to the first two lines regardless of where the
    // match falls means a hit later in the text (e.g. inside the
    // example sentence rather than the vocab word itself) can scroll
    // off before you ever see why it matched. Window the snippet
    // around the match instead, so what's shown is always centered on
    // the highlighted term.
    const snippetAround = (text, query, contextChars) => {
        const i = text.toLowerCase().indexOf(query.toLowerCase());
        if (i === -1) return text;

        const start = Math.max(0, i - contextChars);
        const end = Math.min(text.length, i + query.length + contextChars);

        let snippet = text.slice(start, end);
        if (start > 0) snippet = "…" + snippet;
        if (end < text.length) snippet = snippet + "…";
        return snippet;
    };

    const highlight = (text, query) => {
        const i = text.toLowerCase().indexOf(query.toLowerCase());
        if (i === -1) return escapeHtml(text);
        return (
            escapeHtml(text.slice(0, i)) +
            "<mark>" +
            escapeHtml(text.slice(i, i + query.length)) +
            "</mark>" +
            escapeHtml(text.slice(i + query.length))
        );
    };

    // Latin queries need at least 2 characters to cut down on noise
    // ("a" would match nearly every row), but that same floor would
    // silently swallow every single-character Japanese search — か,
    // に, は, を, で, と, へ, も, の, が are each a complete, meaningful
    // query on their own (particles above all), unlike a single Latin
    // letter. Hiragana/katakana/kanji ranges get a floor of 1 instead.
    const hasJapanese = (s) =>
        /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);

    const render = (query) => {
        const minLength = hasJapanese(query) ? 1 : 2;
        if (query.length < minLength) {
            results.hidden = true;
            results.innerHTML = "";
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches = index
            .filter((entry) => entry.text.toLowerCase().includes(lowerQuery))
            .slice(0, 20);

        if (matches.length === 0) {
            results.innerHTML = '<p class="search-results-empty">No matches.</p>';
        } else {
            results.innerHTML = matches
                .map((entry) => {
                    const href =
                        prefix +
                        entry.page +
                        "?q=" +
                        encodeURIComponent(query) +
                        "#" +
                        entry.section;
                    return (
                        '<a class="search-result" href="' +
                        href +
                        '"><span class="search-result-meta">' +
                        escapeHtml(entry.pageTitle) +
                        " › " +
                        escapeHtml(entry.sectionTitle) +
                        '</span><span class="search-result-snippet">' +
                        highlight(snippetAround(entry.text, query, 45), query) +
                        "</span></a>"
                    );
                })
                .join("");
        }

        results.hidden = false;
    };

    input.addEventListener("input", () => render(input.value.trim()));

    input.addEventListener("focus", () => {
        if (input.value.trim().length >= 2) results.hidden = false;
    });

    document.addEventListener("click", (e) => {
        if (!results.contains(e.target) && e.target !== input) {
            results.hidden = true;
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            results.hidden = true;
            input.blur();
        }
    });
}

// --------------------------------------------------
// SEARCH RESULT HIGHLIGHT
// --------------------------------------------------
// Runs on every page load. If the URL has a ?q= from a search result
// (see initGlobalSearch above), find the first row/card/note in the
// already-hash-opened section whose text contains that query, scroll
// to it, and flash it via .search-highlight (style.css) — otherwise a
// search result just dumps you at the top of a big opened section
// with no indication of what actually matched.

function initSearchHighlight() {
    const params = new URLSearchParams(location.search);
    const query = params.get("q");
    if (!query) return;

    const target = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;
    if (target && target.tagName === "DETAILS") {
        target.open = true;
    }

    const scope = target || document;
    const lowerQuery = query.toLowerCase();
    const candidates = scope.querySelectorAll(
        "tbody tr, .dialogue-card, .grammar-note"
    );

    let hit = null;
    for (const el of candidates) {
        if (el.textContent.toLowerCase().includes(lowerQuery)) {
            hit = el;
            break;
        }
    }

    const scrollTarget = hit || target;
    if (scrollTarget) {
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (hit) {
        hit.classList.add("search-highlight");

        // Stays lit rather than fading on a timer — landing from a
        // search result and having the answer disappear in ~2s before
        // you've finished reading it defeats the point of highlighting
        // it. Cleared on the next real interaction instead, so it
        // doesn't stay yellow forever once you've moved on.
        const clear = () => {
            hit.classList.remove("search-highlight");
            document.removeEventListener("click", clear);
            document.removeEventListener("keydown", clear);
        };
        document.addEventListener("click", clear, { once: true });
        document.addEventListener("keydown", clear, { once: true });
    }

    // Strip ?q= so refreshing or bookmarking the page doesn't replay
    // the scroll/highlight on every visit.
    history.replaceState(null, "", location.pathname + location.hash);
}
