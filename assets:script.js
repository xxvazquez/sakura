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
// The nav is a flat list of alternating .menu-group headings and
// <a> links (see index.html); a heading hides itself once none
// of the links under it still match.

function initSidebarSearch() {
    const input = document.getElementById("sidebarSearch");
    const nav = document.getElementById("sidebarMenu");
    const emptyState = document.getElementById("sidebarEmpty");

    if (!input || !nav) return;

    const groups = nav.querySelectorAll(".menu-group");

    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        let anyVisible = false;

        groups.forEach((group) => {
            let groupHasMatch = false;
            let node = group.nextElementSibling;

            while (node && !node.classList.contains("menu-group")) {
                const matches = node.textContent.toLowerCase().includes(query);
                node.style.display = matches ? "" : "none";
                if (matches) groupHasMatch = true;
                node = node.nextElementSibling;
            }

            group.style.display = groupHasMatch ? "" : "none";
            if (groupHasMatch) anyVisible = true;
        });

        if (emptyState) emptyState.hidden = anyVisible;
    });
}
