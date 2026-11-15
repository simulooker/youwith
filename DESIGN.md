---
name: YouWith
description: A quiet Sage Green & Greige workspace for learning and growing together.
colors:
  bg: "#e2e4df"
  surface: "#fafbf9"
  text: "#1f2923"
  muted: "#566159"
  green: "#3d7a5d"
  green-text: "#315f49"
  green-hover: "#315f49"
  mint: "#e2e4df"
  accent: "#b2b8a3"
  line: "#d5d9d0"
  heading-bg: "#e2e4df"
  desk-surface: "#fafbf9f5"
  sidebar-surface: "#fafbf9d9"
  header-surface: "#fafbf9ed"
  soft-surface: "#e2e4dff5"
  photo-tint: "#ffffff"
  on-primary: "#ffffff"
  inverse-muted: "#c1e6cc"
  selection: "#d7e1d7"
  scrollbar: "#bbc8c0"
  apple: "#bd4f3c"
  apple-symbol: "#d7654e"
  contest-bg: "#dce7f5"
  contest-text: "#294a76"
  supporter-bg: "#eee2f4"
  supporter-text: "#633775"
  grant-bg: "#e0eee3"
  grant-text: "#28583e"
  education-bg: "#f5e7cc"
  education-text: "#654716"
  career-bg: "#d8eced"
  career-text: "#28565a"
  program-bg: "#f2e1df"
  program-text: "#743f3b"
  selection-fill: "#1f292312"
  valid-selection-fill: "#3d7a5d26"
  switcher-bg: "#26392e"
  toast-bg: "#25372d"
  toast-text: "#ffffff"
  dark-bg: "#17201b"
  dark-surface: "#222d26"
  dark-text: "#edf2e9"
  dark-muted: "#b9c5b8"
  dark-green: "#3d7a5d"
  dark-green-text: "#b0d8bc"
  dark-green-hover: "#427a5c"
  dark-mint: "#303d33"
  dark-accent: "#435344"
  dark-line: "#3a483d"
  dark-heading-bg: "#344337"
  dark-desk-surface: "#222d26f5"
  dark-sidebar-surface: "#1d2821f5"
  dark-header-surface: "#1d2821f5"
  dark-soft-surface: "#2b382ff5"
  dark-photo-tint: "#344438"
  dark-selection: "#425c48"
  dark-scrollbar: "#556b59"
  dark-apple-symbol: "#e49882"
  dark-selection-fill: "#edf2e91a"
  dark-valid-selection-fill: "#b0d8bc33"
  dark-toast-bg: "#d8e7d9"
  dark-toast-text: "#1f2923"
typography:
  headline:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-.035em"
  title:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
    letterSpacing: "-.025em"
  label:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
  timer:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "43px"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-.035em"
rounded:
  tag: "5px"
  pill: "6px"
  field: "8px"
  button: "10px"
  nav: "12px"
  panel: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "12px"
  md: "18px"
  stack: "24px"
  panel: "26px"
  wide: "44px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-text:
    textColor: "{colors.muted}"
    padding: "7px 0"
  panel:
    backgroundColor: "{colors.desk-surface}"
    rounded: "{rounded.panel}"
    padding: "26px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  tag:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.green-text}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  nav-active:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.green-text}"
    rounded: "{rounded.nav}"
    padding: "14px 18px"
  heading:
    backgroundColor: "{colors.heading-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
  filter-selected:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.field}"
    padding: "8px 15px"
  settings-switch-off:
    backgroundColor: "{colors.mint}"
    rounded: "{rounded.panel}"
    width: "48px"
    height: "28px"
  settings-switch-on:
    backgroundColor: "{colors.green}"
    rounded: "{rounded.panel}"
    width: "48px"
    height: "28px"
---
# Design System: YouWith

## Overview

**Creative North Star: "Together, One Step at a Time"**

YouWith is a quiet, practical workspace for approved university club members. The supplied clover remains its identity anchor; the user-selected Sage Green & Greige palette and pale photographic desk ground give it a calm study atmosphere. Concise Korean copy, clear study actions, and readable project rows express the user’s Toss-like preference.

This system documents the local HTML/CSS/JavaScript prototype in frontend/. It governs app screens, while PRODUCT.md owns product scope. Home A is the confirmed balanced layout. Comparison controls and B/C-specific code have been removed.

**Key Characteristics:**
- Sage green for primary actions and selected states.
- Readable Korean hierarchy with restrained supporting copy.
- Pale desk photography, translucent off-white panels, and solid heading backplates with direct, labeled actions.
- Five internal destinations (홈, 공부, 놀이터, 활동, 내 정보) plus the requested external Instagram link; settings opens from the header or profile.

## Colors

Sage green anchors greige and off-white materials, with muted olive accents. The apple retains its warm game-specific fill.

### Primary
- **Sage green** (`green`): primary study/project actions and selected filters. Color primitives live in frontend/theme.css; layout and component styles live in frontend/style.css.
- **Deep sage text** (`green-text`, with `green-deep` as a CSS alias): timer units, tags, member chips, active navigation, personal ranking, pills, focus outlines, and text-action hover. Primary-button hover uses the independent `green-hover` token, so dark-mode supporting text does not become a button fill.
- **Greige wash** (`mint`): active desktop navigation and status labels; the focus panel uses the translucent `soft-surface` greige material.

### Secondary
- **Muted olive** (`accent`): focus-heading background, chart bars, and field borders.
- **Apple game** (`soft-surface`, `apple`): greige game invitation and warm apple board. The apple fill remains shared between modes; its invitation icon uses the mode-aware `apple-symbol` token.

### Neutral
- **Greige workspace** (`bg`): app canvas, fields, and segmented-control track.
- **Off-white surface** (`surface`): title backplates, mobile navigation, selected tabs, and unselected filters. **Desk surface** (`desk-surface`): translucent panel and supporting-copy backplates. Sidebar uses `sidebar-surface`; the header uses `header-surface`. **Inverse** (`on-primary`): primary-action text.
- **Ink** (`text`): headings and main content.
- **Quiet sage gray** (`muted`): descriptions and supporting labels.
- **Soft divider** (`line`): navigation boundaries and list separators; `accent` supplies the stronger form stroke.

### Theme modes
Light remains the default Sage Green & Greige system. Dark mode uses forest surfaces and pale sage text while retaining the same clover identity, typography, spacing, and green primary-action fill. `dark-*` frontmatter primitives record the overrides in `:root[data-theme="dark"]`; `.impeccable/design.json` maps the semantic mode roles to these primitives. Tokens without an override inherit the light value. Background tint, logo filter/blend, toast, headings, supporting text, and game selection feedback follow the selected mode.

**The Semantic Theme Rule.** Change color roles in theme.css; keep text green (`green-text`), button fill (`green`), and button hover (`green-hover`) separate. New screens consume these roles rather than adding local light-only fills.

**The Clover Action Rule.** Use sage green for the main action and selected state; keep the warm apple accent attached to the game context.

## Typography

**Display and Body Font:** Pretendard, with -apple-system, BlinkMacSystemFont, Segoe UI, and sans-serif fallback. The stylesheet imports Pretendard from the CDN; an offline environment uses the fallback stack.

**Character:** Compact and friendly Korean sans serif. Weight and scale provide hierarchy; no separate ornamental display face or mono family exists.

### Hierarchy
- **Headline:** Home heading uses the frontmatter headline role; mobile reduces it to (26px), then (23px) below the smallest breakpoint. Other screen titles use (28px).
- **Title:** Section headings use the title role, reducing to (16px) on mobile and (15px) on the smallest screens; focus headings use (18px) desktop and (16px) mobile; recruiting row titles use (14px, 650).
- **Body:** Base text uses the body role. Introductions use (14px); supporting descriptions commonly use (12px).
- **Label:** Small status labels and mobile navigation use (11px). These compact metadata sizes are not a model for instructional or main content text.
- **Timer:** Home uses the timer role with smaller (18px) units. Study uses (64px), reduced to (54px) on mobile. Numeric records use tabular numerals.

Observed type sizes are (11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 23, 24, 26, 28, 30, 38, 43, 54, 64px): compact metadata and controls occupy the lower steps; profile titles use (20px), dialog titles (21px), the mobile brand (24px), and the smallest timer (38px). These are existing component roles rather than permission to shrink functional text below (11px).

**The Readable Record Rule.** Keep study numerals tabular and pair project titles with short role or recruiting descriptions.

## Layout

Desktop uses a fixed left sidebar (240px), header (89px), and centered main area capped at (1180px), with (38px 44px 20px) main padding. The main two-column grid is (1.55fr / minmax(280px, 1fr)) with (24px) gaps. Panels start at (26px) padding; repeated stack spacing is (24px).

At (1150px) and below the sidebar becomes (200px), main horizontal padding (28px), gaps (18px), and panels (22px). At (850px) and below the sidebar disappears, the header becomes (72px), and navigation moves to the fixed bottom edge with safe-area padding. Main content is capped at (700px), uses (28px 24px 10px) padding, and becomes one column. Mobile panels use (22px) padding and stack gaps (20px). Focus panels use (24px) mobile padding and (22px) on the smallest screens. At (380px) and below horizontal main padding is (18px), panels (20px). At (1500px) and above main top padding grows to (48px).

Home A is fixed as the balanced grid. The home title and supporting sentence share one desk-surface panel (20px 24px padding desktop, 18px 20px mobile), with no separate fills on either text line. The footer slogan and comparison controls are removed.

The 144-cell apple board uses sixteen desktop columns and nine mobile columns. Game cells are approximately 35px on the verified desktop and 31px on the verified phone, with inset apple shapes and larger digits; this user-requested dense game uses pointer dragging only. Standard navigation and form targets retain their usual sizes. Main bottom padding reserves space for fixed mobile navigation; no footer or comparison control is present.

## Elevation & Depth

Ordinary panels are flat, with translucent off-white fills and quiet separators over a pale desk photograph. The fixed, decorative background uses `frontend/assets/desk-background.png`, an imagegen edit of the supplied reference with palettes and text removed, retaining the laptop, notebook, pencil, and clovers. It covers the desktop viewport from the top left; mobile uses auto width at 100vh and an 18% horizontal position. Header and sidebar translucency lets the image remain atmospheric while content stays readable. Selected segmented tabs have a faint shadow; dialogs carry floating shadows. The toast uses `toast-bg` and `toast-text`, switching to a pale surface with dark text in dark mode. The decorative photograph can be hidden; dark mode adds a forest tint through `photo-tint`. There are no routine lifted card shadows.

### Shadow Vocabulary
- **Selected tab:** `0 2px 6px #23372c0a`.
- **Dialog:** `0 20px 80px #152e252b`, with backdrop `#192b2455`.

**The Flat Surface Rule.** Separate everyday content with off-white or greige fills and quiet dividers; reserve shadows for selected tabs and overlays.

## Shapes

Panels use the shared panel radius. Buttons and navigation use smaller rounded rectangles, fields and filters use a compact radius, and status tags use the smallest corners. Avatars are circular. Quick-action icons use (17px) corners, project icons (13px), and activity icons (11px). The apple’s asymmetric rounded silhouette belongs to the game.

## Components

### Buttons
Direct, labeled actions. Primary buttons use sage green, `on-primary` text, (650) weight, and minimum height (46px); hover becomes deep green. Text actions are muted, turn deep sage on hover, and retain minimum height (44px). Buttons scale to (.98) while pressed; disabled controls use opacity (.55). Buttons and links transition background, color, and transform over (.16s).

### Chips and filters
Tags use greige and deep sage with compact metadata type. Filters have minimum height (44px); their selected state uses solid green and white. Period tabs use a greige track and an off-white selected segment with the selected-tab shadow. State is carried by aria-pressed as well as color.

### Cards / Containers
Translucent off-white panels use the shared panel radius and responsive padding described in Layout. The focus panel uses translucent greige with the supplied clover image, reduced to (110px) on mobile and (92px) on the smallest screens; the image uses reduced saturation (.65). Keep the image clear of the timer and action. Projects are full-width rows with icon, title, supporting roles, status tag, and SVG chevron; dividers distinguish rows.

### Heading backplates
Main page titles sit on off-white rounded backplates (10px radius, 10px 16px padding; mobile 9px 12px). Supporting introductions use translucent off-white strips (6px radius, 5px 12px padding). All main-content and detail-dialog second-level headings sit on greige backplates (8px radius, 7px 11px padding, 1.45 line height); focus headings use muted olive and game-invitation headings use off-white. Preserve these backgrounds for readability over the photograph.

### Inputs / Fields
Fields have greige backgrounds, a quiet solid border (1px), shared field radius, and minimum height (46px). Labels are (14px, 600); form gaps are (18px). Visible keyboard focus uses the common (3px) `green-text` outline with (4px) offset. No bespoke error treatment exists yet; do not invent a documented error pattern.

### Navigation
Desktop destinations combine stroke SVG icons and text; active items use greige and deep sage. Hover uses the workspace fill. Mobile destinations stack icons over labels, remove the active fill, and use deep sage text for selection. Desktop navigation keeps five internal destinations plus Instagram. Mobile navigation has only the five internal destinations, with minimum height (54px); Instagram is available only in Settings on mobile. The desktop profile link remains visible. Settings uses a labeled gear SVG in the header and keeps the profile destination visually active. The mobile header hides the prototype chip and uses action gaps (4px). Both desktop and mobile wordmarks pair YouWith with one filled clover on its right, with no green dot. The role finder is nested under activity rather than becoming another internal destination.

### Settings
Full-width rows pair a (15px, 650) title with (12px) supporting text. Rows have minimum height (86px), (18px 0) padding, and quiet bottom dividers. Switches use a native checkbox with `role="switch"`; the enclosing label makes the entire row an activation target exceeding (44px), despite the visual track being (48 × 28px). OFF uses a muted border and thumb over greige; ON uses green with an `on-primary` thumb translated (20px). Keyboard focus uses the shared visible outline; checked state is exposed by the native input.

The settings layout uses (1.15fr / 1fr) columns and (24px) gaps, becoming one column with (20px) gaps at the mobile breakpoint. Dark mode defaults OFF, background photography ON, and reduced motion OFF. Changes apply immediately and persist under `youwith.preferences` in localStorage. If storage is unavailable, changes still apply in the current page and feedback explains the limitation. The head loads settings.js before the stylesheets to apply the saved theme before first paint. An explicit reduced-motion setting and the operating-system preference each disable animation and transitions; switching the app preference OFF does not override the operating system. Reset confirms before returning these three preferences to their defaults.

Help and data-storage disclosures use the existing dialog pattern. Site links, icons, menu entries, and example records live in config.js; screen templates live in screens.js, the game in game.js, and shared navigation/study events in app.js. The supplied clover is frontend/assets/clover.png. Add settings through DEFAULT_SETTINGS, settingsScreen, and theme.css, preserving a single source for each role.

### Source notice board

The introduction contains its heading only. Seven currently verified daily-refresh sources have native square checkboxes, with all-on/off actions; five restricted sources have original links marked `(미지원)` and no input. A solid fieldset surface protects label contrast over the photograph. Search and status filters remain native fields. List and agenda date metadata align right on desktop and mobile.

The month calendar draws inclusive start-to-end bars, split at week boundaries and clipped to the month. Overlaps occupy separate lanes; unknown starts appear only as a deadline segment. Each bar exposes the original title and date range to assistive technology and opens the original notice. Six category colors match a labeled legend: contest blue, supporter violet, grant sage, education amber, career teal and general program rose. Use semantic `--<category>-bg` and `--<category>-text` pairs from theme.css, with explicit dark overrides. Bar text is 12px, height 26px; day buttons remain at least 44px high. Day selection updates the agenda beside the calendar on desktop, below it on mobile. The calendar caption reads 매일 09:00 업데이트. Collapsible institution and category filter panels precede the list/calendar view switch; category checkboxes share the calendar color tokens and filter both views. Institution filtering applies to both lists and bars. Unknown/conflicting dates stay outside the calendar.

### Apple-game selection behavior
The board contains 144 apples: 16 columns × 9 rows on desktop and 9 columns × 16 rows below 850px. Apple shapes are inset 3px inside their cells, with 24px digits on desktop and 22px on mobile. The board uses a rectangle dragged with Pointer Events (mouse/touch). All surviving apple centres inside the rectangle count. The outline is neutral while selecting and green when the sum is 10. Per the explicit user request, no sum/status/instruction text appears beneath the game title. On release only a sum of 10 removes apples, leaving empty cells in place. There is no two-corner mode or clear-selection button. Selection cancels on pointer cancellation; only a drag can remove apples.

### Dialogs and feedback
The native dialog is capped at (440px) and (90vw), with (30px) padding and the panel radius. It closes with its labeled action, Escape, or backdrop click. Toasts use role=status, last (3200ms), and animate opacity and vertical position over (.2s). Menu navigation follows menu order: moving downward slides outgoing content left and incoming content from the right; moving upward reverses both directions over (440ms) with `cubic-bezier(.22,1,.36,1)`; only main content transitions, and same-page updates do not animate. Native View Transitions are progressively enhanced with an entry animation fallback; the app or operating-system reduced-motion preference disables animations and transitions.

## Do's and Don'ts

### Do:
- **Do** preserve the supplied clover, five labeled internal destinations, and Instagram in the correct desktop/settings locations.
- **Do** use the Sage Green & Greige light tokens, forest dark overrides, semantic color roles, and the shared Pretendard stack.
- **Do** preserve solid heading backplates and translucent reading surfaces over the decorative desk photograph.
- **Do** keep primary study and project actions explicit in Korean.
- **Do** preserve keyboard focus, pressed/current states, reduced-motion support, and mobile safe-area spacing.
- **Do** label fictional records and prototype-only workflows as examples.

### Don't:
- **Don't** promote one home composition into a requirement for every screen.
- **Don't** introduce decorative gradients, dense ornamental surfaces, or extra brand accents without a new design decision.
- **Don't** turn prototype comparison controls or simulated notifications into production requirements.
- **Don't** present system font fallback as a separate display-font identity.

Functional text, including mobile navigation, sample-status chips, and tags, has a minimum size of 11px.

Home refinement: the live home timer includes zero-padded seconds (43px desktop, 32px phone; phone unit labels 14px) without colliding with the clover. The two home project rows use primary sage fill, white stroke icons/text and 1px white borders; other screens' project rows retain their existing style. Institution result groups use native details/summary with a chevron, count and chromatic pale-sage heading backplate (`grant-bg`/`grant-text` tokens, including their dark overrides). They start open and preserve collapsed state through searches and filter updates. The notice intro heading has a transparent backplate while its off-white panel remains.

Filter refinement: a single off-white shell holds two adjacent greige buttons with chevrons (공지 기관, 유형) on desktop and mobile. Each button reveals its matching full-width checkbox drawer below; opening one closes the other. Both start closed and retain state while filtering. Type options use neutral text with no colored background, as explicitly revised by the user; semantic colors remain on calendar bars and legend.

Latest targeted refinement: remove the home quick-action panel; activity has only team recruitment and contests, defaulting to recruitment when no contest deep link is provided. The removed prototype recruitment note is not displayed. Recruitment icons retain their 46px dimensions and geometry, with primary green fill and white stroke; recruitment titles use primary green/white backplates (chosen over black outlines to match the club identity). Month navigation uses two accessible chevron buttons immediately beside the month/year; no Today control.

Game feedback: selected successful apples spawn noninteractive visual clones that rotate and accelerate downward over620ms, clipped to the board; originals clear immediately and other cells never shift. Clones have no data-apple attribute and remove themselves on completion/cancellation. Reduced motion skips the clones. A10px green time bar scales from1 to0 with remaining/60 and exposes a progressbar value. Score uses the theme text token (dark charcoal in light mode), no stroke, 32px desktop/28px phone. Header order is title left, countdown at the true center, score at the right edge. Game mechanics remain sum10,144cells,drag-only. Reference: https://en.gamesaien.com/game/fruit_box/ (rules/interaction reference, no copied art or code).

Current user refinement: home project rows match the supplied reference with neutral row surfaces, green 46px icon tiles/white strokes, green title backplates and neutral metadata. Settings share one compact surface, max width 680px, grouped single-column sections, at least 56px rows and no appearance-toggle descriptions. Weekly study bars expose h:mm values and explicitly retain the illustrative-data label. The notice-intro panel is removed and the filter label is 게시글 유형.

Current targeted addition: three adjacent filter controls (공지 기관, 게시글 유형, 전공 선택), one expanded drawer at a time. Major checkboxes use neutral typography with explanatory keyword text. Recruitment owner controls provide edit and confirmed delete beside applicant access; preserve the existing Sage Green & Greige identity and mobile touch targets.
