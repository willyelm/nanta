<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/nanta-logo-white.svg">
  <img src="public/nanta-logo.svg" alt="Nanta logo, a woven N" width="96">
</picture>

# Nanta

**Choose the path under the Sun and the Earth.**

Live at [nanta.us](https://nanta.us/).

Nanta compares candidate locations and times against the conditions a mission
needs, and shows when each one works, for how long, and what changes if the plan
moves. Conditions are layers over time at a location. The first case is landing
sites at the lunar south pole, where sunlight decides power and Earth's position
decides direct communication. Earth, Mars, and Mercury sites work the same
way.

- **Sites and windows.** Pick a site, or add your own coordinates, and a window
  of dates up to 31 days.
- **Sun and Earth against the horizon.** A compass from the site, the elevation
  now, hours above the horizon, and time to the next sunset or Earthset.
- **Compare.** Pin a site and a window as a candidate, then compare any
  candidate against the reading in view, as a diff: a launch slip or a moved
  landing reads as a change.
- **A true model.** Space as it is now, and the sky from the site, matched to
  Horizons within a few tenths of a degree.
- **Imagery.** NASA pictures of the site, ringed at its point.

<a href="https://www.spaceappschallenge.org/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/space-apps-white.svg">
    <img src="public/space-apps.svg" alt="NASA Space Apps Challenge" width="160">
  </picture>
</a>

Built for the
[NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/) challenge
[Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).
Project page: [Nanta on Space Apps](https://www.spaceappschallenge.org/) (TODO:
the team's project URL).

## Demo

<video src="docs/media/navigating.mp4" controls muted playsinline width="100%"></video>

[Navigating](docs/media/navigating.mp4): pick a site and fly down to its
horizon.

<video src="docs/media/create-site-window.mp4" controls muted playsinline width="100%"></video>

[Creating a site and a window](docs/media/create-site-window.mp4): add your own
coordinates and dates.

<video src="docs/media/comparing.mp4" controls muted playsinline width="100%"></video>

[Comparing](docs/media/comparing.mp4): pin candidates and read the change as a
diff.

## Name

**Semantic.** Nanta comes from the Quechua _ñanta_, "the path", as the one you
take: _ñan_ is the road, and _-ta_ marks it as what you choose. It's the word in
Qhapaq Ñan, the Inca road network across the Andes. It's written without the ñ
so it reads and types easily in English.

**Symbolic.** Nanta represents an explorer's choice: taking the most favorable
path through hard terrain, with clarity in uncertainty and the patience to wait
for the right moment.

## Status

Built during the hackathon, November 14 to 15, 2026.

## Run

```sh
npm install
npm run dev
```

## Specification

[Specification](docs/README.md)

## Logs

- [Day 318, November 14, 2026](docs/2026-318.md)
- [Day 319, November 15, 2026](docs/2026-319.md)

## Data

- [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), for Sun and Earth
  positions from a site on any body, and each body's place in space.
  Ephemerides: NASA/JPL-Caltech Solar System Dynamics.
- [Moon Trek](https://trek.nasa.gov/moon/), NASA, for lunar imagery: the LRO
  wide-angle camera mosaic and LOLA color relief, as map tiles. Imagery:
  NASA/GSFC/Arizona State University (LROC).
- [Mars Trek](https://trek.nasa.gov/mars/) and
  [Mercury Trek](https://trek.nasa.gov/mercury/), NASA, for Viking, MOLA, and
  MESSENGER mosaics. Imagery: NASA/JPL-Caltech, and NASA/JHU-APL/Carnegie
  Institution of Washington (MESSENGER).
- [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api),
  for Earth: Blue Marble, and the day's VIIRS picture from NOAA-20. We
  acknowledge the use of imagery provided by services from NASA's Global
  Imagery Browse Services (GIBS), part of NASA's Earth Science Data and
  Information System (ESDIS).

This project is not endorsed by NASA. Data and imagery courtesy of NASA.

## Use of AI tools

AI tools assisted with this project, as the Space Apps project guidelines ask to
record. Claude Code (Anthropic) helped write and review code, check the model
against Horizons, and edit the specification and logs. The idea, the design,
and every decision are mine.

## License

[Apache License 2.0](LICENSE).
