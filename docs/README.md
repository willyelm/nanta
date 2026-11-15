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

The scheme is `light` or `dark`, stored as `scheme` and set on
`<html data-scheme>` before the first paint. With nothing stored, the first
visit follows the system once.

| Token                   | Use                                  |
| ----------------------- | ------------------------------------ |
| `--bgColor-canvas`      | Page                                 |
| `--bgColor-panel`       | Cards, chart field                   |
| `--fgColor-body`        | Text                                 |
| `--fgColor-secondary`   | Secondary text, Earth line           |
| `--bgColor-control`     | Fields and buttons                   |
| `--bgColor-interactive` | Hover and the current choice         |
| `--bdColor-line`        | Structural lines                     |
| `--bdColor-interactive` | The current choice and button border |

Operational text on its background is 6:1, the NASA-STD-3001[^nasa3001] contrast
for text that an operator reads. Borders, the focus outline, and other non-text
cues are 3:1 against the surface they sit on.

Color repeats a selection. It does not carry the reading. The table does. Focus
is a 2px outline in the text color. Controls are at least 44px (`--control`),
with space between them.

### 1.3 Typography

Nanta Mono is a manual subset of Commit Mono Regular. Weight 400, upright, 16px.
CSS only names the family. The file holds the rest.

`0` uses `cv07`, `l` uses `cv10`, and `1` uses `cv11`, so `0`/`O` and
`1`/`l`/`I` stay distinct. Digits are equal width. Word spacing is a required
feature (`rclt`) in the file. 16px sits above the about-14px body size for a 60
cm console. Confirmation is on the real display.

## 2. Workspace, layout, and elements

### 2.1 Application shell

A header and a main region. The header carries the name, one line of purpose,
and the scheme switch (Light, Dark). The matched page renders in `main`. The
page may scroll. There is no second frame.

The header, the body cards, and the place list come from the server. The horizon
chart is drawn in the browser after the samples arrive.

### 2.2 Navigation

The URL is the state.

- `/` is the body list.
- `/{code}/sites?site=&from=&to=` is one place on that body, in one window.

A link moves among these. Back, refresh, and a shared link restore the same
reading. An unknown path is "Page not found." The server answers 404.

## 3. User flows

Each view is one step. The URL changes. The reading updates in place.

### 3.1 Body selector

`/` is three cards. One card opens `/{code}/sites`.

| IAU name | Latin | Horizons | Air                      | Solar day       | Radius   |
| -------- | ----- | -------- | ------------------------ | --------------- | -------- |
| Moon     | Luna  | `301`    | None. Airless horizon.   | 29.5 Earth days | 1,737 km |
| Mars     | —     | `499`    | Thin. Refracted horizon. | 24 h 40 min     | 3,390 km |
| Earth    | Terra | `399`    | Yes. Refracted horizon.  | 24 h            | 6,371 km |

The whole card is the link. The air line is why elevation `0°` is not the same
fact on every body.

### 3.2 Sites

The catalog is a fixed list of coordinates. The south pole is the selection when
`site` is absent. Another place updates the coordinates. A chosen window stays.

The windows in this version are 2027 Mar 1–3 and 2027 Jun 1–3. A window is what
starts the fetch. The place stays when the window changes.

The current place is named, with latitude and longitude. `aria-current` marks
the place and the window. The same coordinates on Earth or Mars are a stand-in.
The catalog was written for the Moon.

### 3.3 Horizon lines

Time runs across. Elevation runs up, in degrees. The flat line is the horizon at
`0°`. The bright line is the Sun. The dim line is the Earth. Above the line is
up. Below the line is set.

The chart is a picture of the table. It draws once when the numbers arrive. It
does not animate.

### 3.4 Detail

The table under the chart is the reading: time in UTC, Sun elevation, Earth
elevation. Units sit on the number. A missing sample is a dash. This is the text
a planner can quote. The chart does not replace it.

## 4. System

### 4.1 Loading and rendering

The server renders the frame, the body cards, and the place list. The horizon
chart is drawn in the browser with Three.js after the samples arrive. The table
is rendered with those same samples.

| State        | What triggers it           | What the user sees                                                           |
| ------------ | -------------------------- | ---------------------------------------------------------------------------- |
| Body list    | `/` loads                  | Three body cards, with the reference facts.                                  |
| No window    | `/{code}/sites` loads      | The place list, south pole selected, and "Choose a window."                  |
| Loading      | Horizons request in flight | "Loading horizon…" The rest of the page stays.                               |
| Ready        | Samples arrive             | The lines and the table.                                                     |
| Error        | A request fails            | "Couldn't load sites." or "Couldn't load the horizon." The other parts stay. |
| Unknown path | No route matches           | "Page not found." The server answers 404.                                    |

### 4.2 URL

`/{code}/sites?site=&from=&to=` restores the body, the place, and the window.
`code` is the Horizons center. Back, refresh, and a shared link show the same
reading.

### 4.3 Data and limits

A window is one Sun request and one Earth request, step `6h`, at most 31 days.
This app calls JPL Horizons. The chart does not. Repeat requests for the same
place and window are cached.

The Moon is requested airless. Earth and Mars use refraction. Neither request
includes terrain. Moon Trek images and LOLA heights are not used.

There is no success percentage, no dust, no slope limit, and no hidden rank.

[^wcag2]:
    [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/).

[^apg]: [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/).

[^nasa3001]:
    [NASA-STD-3001 Volume 2, Human Factors, Habitability, and Environmental Health](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2).
