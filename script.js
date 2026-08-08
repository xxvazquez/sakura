// ==========================================================
// Sakura Study — script.js
// ==========================================================

$(document).ready(function () {
    initNumbersTable();
    initSidebarSearch();
});

// --------------------------------------------------
// NUMBERS TABLE
// --------------------------------------------------
// DataTables handles per-column sort and instant search *within this
// page's table*. The sidebar search box is separate and only matches
// page titles — see initSidebarSearch below.
//
// Pagination/info/length are switched off in style.css (this
// page's whole point is seeing every entry on one screen) —
// if a future page runs long, re-enable paging there rather
// than passing it here per-table.
//
// Column order is Tag(0) / Japanese(1) / Romaji(2) / English(3).
// Default sort is English ascending — adjust the index here if
// columns are ever reordered.

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
