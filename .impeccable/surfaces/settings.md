# Settings extension

Mode: Operate. Existing app surface, code-led.

## Confirmed brief

User: "설정창에 대부분의 프로그램에 들어가는 기능을 넣으려하는데 일단 다크모드 on/off 넣을거야".
User: "메뉴탭에 인스타 아이콘을 넣어서 클릭하면 유위드 인스타그램 사이트로 가게 해줘".
User: "파일,코드 구조를 최대한 간단하게 직관적으로 만들어줘".

## Direction contract

THESIS: Make the existing member app comfortable to read and straightforward to maintain.
OWN-WORLD: Inherit the user-pinned Sage Green & Greige desk-photo world and solid heading backplates.
STORY: Open settings from the header/profile, choose display preferences, find help, and return to the club app. Instagram is a direct external destination in both menus.
FIRST VIEWPORT: Clearly labeled display switches with descriptions; help and app information beside them on desktop, below them on mobile.
FORM: seed: none (inherited, user-pinned). No new visual-world decision; this extension preserves the approved Sage Green & Greige theme and adds its forest dark counterpart.

## Quality bar

- Dark mode, background visibility and motion reduction apply immediately and persist across reloads.
- Invalid or unavailable browser storage cannot stop the app from opening.
- Reset affects only this app's display preferences.
- Titles, text, controls, dialogs and game remain readable in light/dark modes.
- Settings and six menu items fit 375px and 1280px widths without horizontal overflow.
- Instagram opens the supplied club URL in a new tab; settings are reachable from the header and profile.
- No production account, push or policy behavior is falsely represented.
- New features have one obvious home file; site colors and the Instagram address have a single source of truth. No build/runtime dependency is introduced.

## Evidence

Browser: persistence after reload, background hidden, animation disabled, reset defaults, actual Instagram tab with the correct club title, study controls and game render after file separation.
Checks: settings storage and rectangle-selection tests, JavaScript syntax checks.
Captures: preview/settings-light-mobile.jpg, settings-dark-mobile.jpg, settings-light-desktop.jpg, settings-dark-desktop.jpg, home-dark-mobile.jpg, game-dark-mobile.jpg.
