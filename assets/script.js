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
    initSidebarSearch();
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
// One search box (#pageSearch) filters every table.ref-table on the
// page at once — never an individual table's own box. A non-empty
// query also force-opens every <details class="toggle-section"> so a
// match inside a collapsed section is still visible; an emptied query
// leaves toggles as the user last left them rather than forcing them
// shut.

function initPageSearch() {
    const input = document.getElementById("pageSearch");
    if (!input) return;

    const tables = $("table.ref-table").filter(function () {
        return $.fn.DataTable.isDataTable(this);
    });
    if (tables.length === 0) return;

    input.addEventListener("input", () => {
        const value = input.value;

        tables.each(function () {
            $(this).DataTable().search(value).draw();
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
// SIDEBAR SEARCH
// --------------------------------------------------
// Filters the page list by matching each link's visible text.
// The nav is a flat sibling list, two heading levels deep:
// .menu-category (Vocabulary, Grammar…) > .menu-letter (N, T…) > <a>.
// A letter hides itself once none of its links match; a category
// hides itself once none of its letters have any matches left.

function initSidebarSearch() {
    const input = document.getElementById("sidebarSearch");
    const nav = document.getElementById("sidebarMenu");
    const emptyState = document.getElementById("sidebarEmpty");

    if (!input || !nav) return;

    const categories = nav.querySelectorAll(".menu-category");

    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        let anyVisible = false;

        categories.forEach((category) => {
            let categoryHasMatch = false;
            let currentLetter = null;
            let letterHasMatch = false;
            let node = category.nextElementSibling;

            const closeLetter = () => {
                if (currentLetter) {
                    currentLetter.style.display = letterHasMatch ? "" : "none";
                }
            };

            while (node && !node.classList.contains("menu-category")) {
                if (node.classList.contains("menu-letter")) {
                    closeLetter();
                    currentLetter = node;
                    letterHasMatch = false;
                } else {
                    const matches = node.textContent.toLowerCase().includes(query);
                    node.style.display = matches ? "" : "none";
                    if (matches) {
                        letterHasMatch = true;
                        categoryHasMatch = true;
                    }
                }
                node = node.nextElementSibling;
            }
            closeLetter();

            category.style.display = categoryHasMatch ? "" : "none";
            if (categoryHasMatch) anyVisible = true;
        });

        if (emptyState) emptyState.hidden = anyVisible;
    });
}
