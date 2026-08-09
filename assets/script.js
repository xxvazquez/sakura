// ==========================================================
// Sakura Study — script.js
// ==========================================================
// Shared across every page. Each init function checks for its
// own table/element by id and quietly does nothing if that page
// doesn't have it, so one script file works for every page
// without per-page includes.

$(document).ready(function () {
    initNumbersTable();
    initTimeTables();
    initSidebarSearch();
});

// --------------------------------------------------
// NUMBERS TABLE
// --------------------------------------------------
// DataTables handles per-column sort and instant search *within this
// page's table*. The sidebar search box is separate and only matches
// page titles — see initSidebarSearch below.
//
// Column order is Tag(0) / Japanese(1) / Romaji(2) / English(3).
// Default sort is English ascending, since English here holds the
// actual numeric value (1, 2, 3…) — adjust the index if columns are
// ever reordered.

function initNumbersTable() {
    const $table = $("#numbersTable");
    if ($table.length === 0) return;

    $table.DataTable({
        paging: false,
        info: false,
        ordering: true,
        searching: true,

        order: [[3, "asc"]],

        language: {
            search: "",
            searchPlaceholder: "Search…",
        },
    });
}

// --------------------------------------------------
// TIME TABLES (Hours / Minutes)
// --------------------------------------------------
// Same Tag/Japanese/Romaji/English shape as the Numbers table, but
// English here is descriptive text ("1 o'clock"), not a sortable
// value — so order: [] keeps each table in its authored (chronological)
// order on load instead of DataTables' own default of sorting column 0.
// Columns stay fully sortable by click either way.

function initTimeTables() {
    ["#hoursTable", "#minutesTable"].forEach((selector) => {
        const $table = $(selector);
        if ($table.length === 0) return;

        $table.DataTable({
            paging: false,
            info: false,
            ordering: true,
            searching: true,

            order: [],

            language: {
                search: "",
                searchPlaceholder: "Search…",
            },
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
