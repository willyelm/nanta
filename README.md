# Nanta

**Plan locations against changing conditions.**

Nanta compares candidate locations and times against the conditions a mission
needs, and shows when each one works, for how long, and what changes if the plan
moves. Conditions are layers over time at a location. The first case is landing
sites at the lunar south pole, where sunlight decides power and Earth's position
decides direct communication.

Built for the
[NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/) challenge
[Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).

## Name

**Semantic.** Nanta comes from the Quechua _ñanta_, "the path", as the one you
take: _ñan_ is the road, and _-ta_ marks it as what you choose. It's the word in
Qhapaq Ñan, the Inca road network across the Andes. It's written without the ñ
so it reads and types easily in English.

**Symbolic.** Nanta represents an explorer's choice: taking the most favorable
path through hard terrain, with clarity in uncertainty and the patience to wait
for the right moment.

## Status

In development during the hackathon, November 14 to 15, 2026.

## Product design

[Product Design Language](docs/README.md)

## Logs

- [Day 318, November 14, 2026](docs/2026-318.md)
- [Day 319, November 15, 2026](docs/2026-319.md)

## Data

- [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), for Sun and Earth
  positions from lunar coordinates.
- [Moon Trek](https://trek.nasa.gov/moon/), NASA, for lunar imagery: the LRO
  wide-angle camera mosaic as map tiles, including south pole projections.
  Imagery: NASA/GSFC/Arizona State University (LROC).

## Use of AI tools

AI tools assist with this project. Where and how they were used is recorded here
as the work progresses, as the Space Apps project guidelines require.

## License

[Apache License 2.0](LICENSE).
