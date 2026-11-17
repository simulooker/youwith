# Tech MOSFET
Mode: Experience for the 3D article; Operate for the Tech catalogue.
Primary target: frontend/tech/mosfet.html
Related targets: frontend/tech/mosfet.js, frontend/tech/mosfet.css, frontend/blog.js, frontend/blog.css
User-pinned direction: three square covers per desktop row; MOSFET label on first cover; hover/focus crossfades site background to an actual render of this model. Open a separate trusted HTML article with a cosmic background and draggable 3D MOSFET. Keep existing Sage Green & Greige on the catalogue. No electron flow or exploded views yet.
The article uses deep navy, sparse static stars, a large central planar NMOS cutaway and restrained gold/cyan/violet component colors. Controls are explicit; model labels can be hidden; keyboard and touch rotation/zoom are supported. No default auto rotation; reduced motion respects OS and site preference. A simplified structure, not a physical simulation or accurate fabrication scale.
Implementation: local Three.js 0.187.0 with OrbitControls; no runtime CDN. Static articles are code-owned HTML entries, never arbitrary executable user uploads. Existing database Tech posts and their permissions remain intact as additional covers.
Verification: render PC and mobile; test hover exit, keyboard focus, rotations, zoom bounds, reset, resize, reduced motion, authentication and unchanged Blog tabs.

User refinement: hover/focus now uses supplied MOSFET illustration with a 48% dark overlay. The 3D viewer has an all-direction static nebula shader and brighter 1,500 stars. No default ambient movement.

Latest user direction: replace cosmic background with an enclosed 3D grid room. Floor y=-4, ceiling y=20, four walls x/z=±20, 2-unit cells; distance fog softens distant lines. Preserve supplied darkened cover on Tech hover.

Layout refinement: model on the left and a separate model-settings panel on the right. Existing controls move to this panel. Electron-motion button is explicitly disabled and marked 준비 중. On phones the panel follows the scene.
