# Vantage

**Plan locations against changing conditions.**

Vantage compares candidate locations and times against the conditions a mission
needs, and shows when each one works, for how long, and what changes if the
plan moves. Conditions are layers over time at a location. The first case is
landing sites at the lunar south pole, where sunlight decides power and Earth's
position decides direct communication.

Built for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/)
challenge [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).

## Name

**Semantic.** Vantage means a position, place, or situation of strategic
advantage: a superior standing, with a commanding and comprehensive view of the
terrain and conditions around it.

**Symbolic.** Vantage represents an explorer's first step: choosing the most
favorable path before setting out on a mission, with clarity in uncertainty and
the patience to wait for the right moment.

## Status

In development during the hackathon, November 14 to 15, 2026.

## Updates

- [Day 318, November 14, 2026](docs/2026-318.md)
- [Day 319, November 15, 2026](docs/2026-319.md)

## Data

- [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), for Sun and Earth positions
  from lunar coordinates.
- [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) gridded
  elevation, for terrain horizons.

Raw elevation data is not committed. See `data/README.md` once the pipeline
lands.

## Use of AI tools

AI tools assist with this project. Where and how they were used is recorded
here as the work progresses, as the Space Apps project guidelines require.

## License

[Apache License 2.0](LICENSE).
