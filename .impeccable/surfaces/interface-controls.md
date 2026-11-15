# Scoped controls refinement

THESIS: Direct drag-only play, predictable menu-order transitions and compact, category-aware opportunity filtering.
OWN-WORLD: Preserve approved sage/greige photo-backed app, existing category tokens and 144-cell game. User's attached image identifies the home '새로운 도전이 기다려요' card for deletion; retain global background.
STORY: Expand institution/category filters, select checkboxes, then choose list/calendar. Desktop agenda is on the right; mobile agenda remains below. Play only by dragging with no status text beneath the game title.
FIRST VIEWPORT: Collapsible institution and colored category panels side by side on desktop, stacked on phone; list/calendar buttons below filters.
FORM: seed: none (pinned). User specifies exact refinement and existing visual world. No new comp.

Requirements: remove sum/status text, two-corner mode and clear button; reverse transition when moving upward in menu; maintain reduced-motion bypass; six category colors match calendar, filters affect list and calendar; caption exactly 매일 09:00 업데이트; remove specified home card and profile settings/push rows while preserving settings screen.
Required scoped captures: preview/refinement-filters-desktop.jpg (1440px controls), preview/refinement-calendar-desktop.jpg (1440px scrolled calendar + right agenda), preview/refinement-calendar-mobile.jpg (375px scrolled month, stacked agenda), preview/refinement-game-desktop.jpg (1440px silent drag game). These are scoped/scrolled, not full-page claims.
Evidence: browser verified category off hides its bars, institution collapse works, native drag sum10 clears2 and scores2 with no status element, backward/forward direction attributes follow menu ordering, profile rows/home card absent, mobile width fits375 and calendar uses single column. Tests exercise scoring without status DOM, type filtering and menu direction. Source: game.js, app.js, screens.js, notice-board.js, notice-calendar.js and style.css.
