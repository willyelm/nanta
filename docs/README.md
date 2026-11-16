# Nanta: Product Design Specification

Nanta shows the Sun and the Earth against the horizon for a place and a date
window. The planner reads the numbers and decides what to keep. The software
does not score the place.

## Goals

A planner, or a member of the public can judge a landing place and a date
without learning Horizons, Moon Trek, or Quickmap.

The final goal is one reading, held on one screen:

- Where the Sun is against the horizon, so power is visible: elevation, how long
  the light lasts, and how long until sunset.
- Where the Earth is against the horizon, so a direct link is visible:
  elevation, how long the link lasts, and how long until Earthset.
- Several places and dates at once, so a slipped launch or a moved site can be
  judged without starting over. The comparison stays on the screen. The person
  does not have to hold it in memory.
- The same view for a specialist and a newcomer. A south-pole place next to a
  familiar Earth day shows why a small move of place or date changes the
  mission.

## Scope

Browsing bodies, sites, and date windows to summarize conditions: the Sun above
the horizon, which is power, and the Earth above the horizon, which is a direct
radio link home.

A review groups the sites for a date window by those conditions, so the useful
ones and the poor ones are visible together.

The Moon is `301`, Mars is `499`, and Earth is `399` in Horizons.

It does not score a place, rank places, or show the ground. Hills, slopes, and
dust are a separate study.

## 1. Product foundations

The human interaction and design language follows operational standards based on
WCAG 2.2[^wcag2], the ARIA Authoring Practices Guide[^apg], and NASA-STD-3001
Volume 2[^nasa3001]. These apply as relevant, favoring the spaceflight
guideline. The system is built with modularity and lower abstraction, so the
result stays precise at the runtime.

### 1.1 Identity

Nanta is the Quechua _ñanta_, "the path", the one you take. _Ñan_ is the road.
_-ta_ marks it as the one chosen. It is the word in Qhapaq Ñan, the Inca road
across the Andes. It is written without the ñ so it reads in English.

That is the product. Browsing bodies, sites, and date windows is how a path gets
chosen. The summary, Sun and Earth above or below the horizon, is what makes one
path favorable and another poor.

### 1.2 Colors and schemes

The scheme choice is System, Light, or Dark (`auto`, `light`, `dark`), stored as
`scheme`; `auto` is the default, stored as no value, and follows the system
live. Density is Regular or Compact, stored as `density`; Regular is the default
and Compact tightens the spacing tokens. Both are set on `<html>` before the
first paint. The resolved
`light` or `dark` is set on `<html data-scheme>` before the first paint.

| Token                              | Use                                       |
| ---------------------------------- | ----------------------------------------- |
| `--background-color-neutral`       | Page, and buttons and inputs at rest      |
| `--background-color-neutralHover`  | Hover on a neutral item                   |
| `--background-color-neutralActive` | Pressed or current neutral item           |
| `--background-color-accent`        | The accent button: the text color, filled |
| `--text-color-default`             | Text                                      |
| `--text-color-secondary`           | Secondary text                            |
| `--text-color-onAccent`            | Text on the accent: the page color        |
| `--border-color-control`           | Buttons and links that act as controls    |
| `--border-color-input`             | Text inputs                               |
| `--border-color-divider`           | Panels and page dividers                  |
| `--outline-color-focus`            | The focus ring, cochineal, inside         |
| `--chart-color-sun`, `-earth`      | Sun and Earth lines and curves, fixed     |
| `--chart-color-horizon`            | Horizon, orbits, and the ground, fixed    |
| `--chart-color-select`             | Cochineal: selection and focus rings      |
| `--body-color-*`                   | Each body's sphere in the model           |

Cochineal, the Andean dye behind the crimson and magenta of Paracas and Inca
textiles and quipu cords, is the ring color: the selection rings in the model and
the focus ring, drawn inside the edge. It is never a fill, so the focus ring
always shows. The accent button is the text color filled, lettered in the page
color. Blue only means the Earth. Panels sit over the model as `bg-neutral/75`
with a blur, so the scene shows through.

The chart colors are hex, because WebGL reads hex and rgb only, and are the same
in both schemes: each sits at mid luminance, 3:1 on every neutral step, light
and dark. The body colors are a picture rather than a cue, so they are not held
to 3:1, and the dark scheme lightens them.

Operational text on its background is 6:1, the NASA-STD-3001[^nasa3001] contrast
for text that an operator reads. Control and input borders, the focus outline,
and other non-text cues are 3:1 against the surface they sit on. Dividers are
decorative.

### 1.3 Typography

Nanta Mono is a manual subset of Commit Mono Regular. Weight 400, upright, 16px.
CSS only names the family. The file holds the rest.

`0` uses `cv07`, `l` uses `cv10`, and `1` uses `cv11`, so `0`/`O` and
`1`/`l`/`I` stay distinct. Digits are equal width. Word spacing is a required
feature (`rclt`) in the file. 16px sits above the about-14px body size for a 60
cm console. Confirmation is on the real display.

### 1.4 Model

Three ideas, kept apart so they mix and match:

- A site is a place: a body, a point on it (latitude, longitude), and the
  conditions it is judged on.
- A window is a time: a range of UTC dates with its own code, not tied to a
  site. At most 31 days, Horizons' limit.
- A candidate is a plan: one site and one window, saved by name.

The same site in another window is a launch slip. The same window at another
site is a moved landing. Candidates are what get compared, side by side in the
bottom bar.

## 2. Workspace, layout, and elements

### 2.1 Application shell

The model fills the screen behind everything. Over it, a header and a stable
shape that does not change between pages:

- The header: the name, the camera readout at the center, the UTC clock, and the
  appearance menu. The menu holds the scheme (System, Light, Dark) and the
  density (Regular, Compact). Its trigger shows a short code, `S/R` or `D/C`,
  next to a swatch of the accent over the page color.
- A row of side panels: the Site Navigator (or bodies) on the left, Window
  Selection on the right. Each panel is as tall as its content, up to the row,
  then scrolls.
- The Reading across the bottom: time, and with a site the horizon and numbers.
  It expands to fill the screen; while expanded, a strip keeps the site and
  window in view.

Pages only fill the panels. Empty space passes the pointer to the model, so it
can be turned anywhere it shows. On narrow screens the panels stack below the
model.

The camera readout names the frame and the camera's angle around what it looks
at: azimuth and elevation in the body's frame at a site, or longitude and
latitude on the ecliptic in space, then the distance.

### 2.2 Navigation

The URL is the state.

- `/` is the body list.
- `/{code}/sites` is that body's sites.
- `/{code}/sites/{site}?window=` is one place on that body, in one window.

A link moves among these. Back, refresh, and a shared link restore the same
reading. An unknown path is "Page not found." The server answers 404.

## 3. User flows

Each view is one step. The URL changes. The reading updates in place.

### 3.1 Body selector

`/` lists the bodies a site can stand on. Pointing at or focusing one moves the
model to it. A body opens `/{code}/sites`.

| Name  | NAIF ID | Air | Horizon   | Solar day     | Radius     |
| ----- | ------- | --- | --------- | ------------- | ---------- |
| Moon  | `301`   | No  | Geometric | `29d 12h 44m` | 1,737.4 km |
| Earth | `399`   | Yes | Refracted | `01d 00h 00m` | 6,371.0 km |
| Mars  | `499`   | Yes | Geometric | `01d 00h 40m` | 3,389.5 km |

The whole card is the link. The air line is why elevation `0°` is not the same
fact on every body. The Sun and the reference stars are in the model, never in
the list: they are references, not places.

### 3.2 Sites and windows

Each body has its own sites, predefined and your own. A site has a short code
name (`APL11`, `CY3`, `SCR`), a description, its coordinates, and two flags:

- `sunlight`: the Sun above the horizon, which is power.
- `earth_visibility`: the Earth above the horizon, a direct link home.

Moon sites have both; Earth and Mars sites have sunlight only. The flags decide
which bodies Horizons is asked about and what is drawn. A site is a point: the
outline in the model is a fixed marker, since Horizons answers for a point.

Windows are their own list, predefined (`MAR27`, `JUN27`) and your own, picked
by code. Changing the site keeps the window, and changing the window keeps the
site. Your sites and windows are kept in this browser; the server holds only
the predefined ones.

A site and a window are paired into a candidate with Compare, the link button in
the Reading. Candidates sit as boxes in the bottom bar, site over window, on
every page, even before a site is open. A box opens its pair and keeps the
camera; the × on hover unlinks it. Candidates are kept in this browser.

### 3.3 The model

One scene, built once, never swapped. A selection moves only the camera.

- Space, before a site: the Sun at the center, and the bodies where they are
  now, from one Horizons state each, advanced by the clock. Directions and
  distances from the Sun are true; sizes are enlarged so each body can be seen,
  with Earth, Moon, and Mars in their true ratio.
- A site: the body at the center and the site on it, with its horizon and an
  outline. The camera stands on the skyline with the site's zenith as up,
  looking toward the Earth's bearing, or the Sun's. The other bodies sit along
  their true directions from the site; distance is drawn on a log scale.
- The Sun lights every body from where it is, so day, night, and the line
  between them show. Sight lines run from the site to the Sun and the Earth.
- The brightest stars, and the four on the ecliptic, are placed in their true
  directions, over a faint filler.

The chart and the model are pictures of the numbers. The panels hold the
reading.

### 3.4 Detail

The right panel holds each condition at the chosen time: hours above the horizon
in the window, and the next rise or set. Under it, the table: time in UTC and
each condition's elevation. Units sit on the number. A missing sample is a dash.
This is the text a planner can quote.

The bottom panel holds the time slider and one curve per condition, like a
forecast. The slider moves the model, the table row, and the curves together.

## 4. System

### 4.1 Loading and rendering

The server renders the shell and the panels. The model is drawn in the browser
with Three.js, on demand, only while something moves. It loads one body at a
time and says so in a status line.

| State        | What triggers it            | What the user sees                                           |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| Space        | `/` loads                   | The bodies where they are now, and the body list.            |
| No site      | `/{code}/sites` loads       | The body in space, its sites, and "Choose a site."           |
| No window    | A site is chosen            | The site's skyline, the other bodies, and "Choose a window." |
| Loading      | Horizons requests in flight | A panel of the same shape says what is loading.              |
| Ready        | Samples arrive              | Conditions, the table, the curves, and exact directions.     |
| Error        | A request fails             | A panel says what failed. The other panels stay.             |
| Unknown path | No route matches            | "Page not found." The server answers 404.                    |

### 4.2 URL

- `/{body}/sites`: the body's sites.
- `/{body}/sites/{site}?window={window}`: a site, read in a window.

Sites and windows you add are edited inline in their panels, so the other
panels stay up; only the place or the window in the URL changes.

Back, refresh, and a shared link restore the reading, the camera angle
included. The window defaults to `TODAY`. The tab title is `Nanta - ` and the
place: the body (`Moon 301`), the site (`SCR`), or the site and window
(`SCR/JUN27`). A site or window added in another browser is not there yet.

### 4.3 Data and limits

A window is one request per condition's body, step `1h`, at most 31 days, made
one at a time: Horizons refuses parallel requests from one client. Space is one
state per body for the current hour. Repeat requests are cached; dev starts with
an empty cache.

Horizons refracts only for sites on Earth, so Earth is requested refracted, and
the Moon and Mars airless: their horizons are geometric. No request
includes terrain, so the horizon is the smooth sphere. Moon Trek images and LOLA
heights are not used yet. The camera angle is kept in the URL.

There is no success percentage, no dust, no slope limit, and no hidden rank.

## 5. Screens and flows

Screenshots and short recordings of each step. Placeholders until the final
captures.

### 5.1 Screenshots

| Screen               | File                               |
| -------------------- | ---------------------------------- |
| Space, the bodies    | `docs/media/space.png` (TODO)      |
| A body and its sites | `docs/media/sites.png` (TODO)      |
| A site in a window   | `docs/media/reading.png` (TODO)    |
| Reading, expanded    | `docs/media/expanded.png` (TODO)   |
| Candidates compared  | `docs/media/candidates.png` (TODO) |
| Light and Compact    | `docs/media/appearance.png` (TODO) |

### 5.2 Flows

| Flow                                    | File                            |
| --------------------------------------- | ------------------------------- |
| Pick a body, then a site, then a window | `docs/media/pick.mp4` (TODO)    |
| Add your own site and window            | `docs/media/add.mp4` (TODO)     |
| Scrub time on the horizon               | `docs/media/scrub.mp4` (TODO)   |
| Compare a launch slip and a moved site  | `docs/media/compare.mp4` (TODO) |

[^wcag2]:

[Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/).

[^apg]: [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/).

[^nasa3001]:

[NASA-STD-3001 Volume 2, Human Factors, Habitability, and Environmental Health](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2).
