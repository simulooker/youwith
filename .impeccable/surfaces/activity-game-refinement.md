# Activity simplification and game feedback

THESIS: Reduce redundant navigation/copy and make successful play and remaining time visible.
OWN-WORLD: Preserve approved sage-greige photographic app. Recruitment title option1 (green/white) is explicitly chosen to coordinate with icons; user explicitly requests red score with black outline and falling apples.
STORY: Use recruitment or contests, navigate months through chevrons beside the heading; play drag-sum10, watch selected apples fall and remaining green bar shorten.
FIRST VIEWPORT: Two activity tabs, no redundant Whole tab; recruitment icons/title treatment. Home shortcut card removed.
FORM: seed: none (pinned). Targeted user comments and follow-up game requirements, no new comp/world.

Requirements: remove prior Today/text month controls, keep accessible previous/next labels; remove recruitment sample paragraph/home shortcut card; preserve46px recruitment icons withgreen/white stroke; titlegreenwhite; selected applesfall620ms then clean up, no shift in remaining grid; reducedmotion skip;10px greenprogress/remaining60; bigred48/40px scorewith2pxblackstroke. Original sum10/144-cell rules unchanged. Reference official FruitBox:https://en.gamesaien.com/game/fruit_box/.
Required captures: preview/recruitment-green-desktop.jpg, recruitment-green-mobile.jpg (recruitment titles/icons); calendar-chevrons-desktop.jpg, calendar-chevrons-mobile.jpg (scrolled month header); home-simplified-desktop.jpg (home without shortcutcard); game-feedback-desktop.jpg (game, may include falling transient clones), game-feedback-mobile.jpg (header/progress +partialboard). Scope/scrolled images, not full-page claims; native export slightly smaller than CSS viewport.
QA: two tabs, next→December/previous→November; homequick-grid0; native drag score2/falling2→0 with144data cells; progress60→43, scaleX.716667, phonefits375. Node tests include progress decrement, hidden pause and zero-time finish. Inspect screens.js/app.js/notice-calendar.js/notice-board.js/game.js/style.css. Keep original theme, clover and existing other features.
