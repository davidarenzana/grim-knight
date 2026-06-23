# Memory index

One line per file. Read this first; open only what you need. Keeping it in sync is mandatory.

- [progress.md](./progress.md) — what is done, in progress and next (update every session).
- [architecture.md](./architecture.md) — stable architecture decisions and the why of the core/engine/ui split.
- [conventions.md](./conventions.md) — code/test conventions and known gotchas.
- [glossary.md](./glossary.md) — game domain terms (armor, double loop, etc.).
- [decisions/](./decisions/) — numbered ADRs (architecture decision records).
  - [0001-engine-core-ui-split.md](./decisions/0001-engine-core-ui-split.md) — why pure core + Phaser + Vue.
  - [0002-fixed-timestep-sim.md](./decisions/0002-fixed-timestep-sim.md) — fixed-timestep simulation + interpolation.
  - [0003-one-way-platforms.md](./decisions/0003-one-way-platforms.md) — semi-solid platforms (pass up, land on top).
  - [0004-level-themes.md](./decisions/0004-level-themes.md) — per-level visual themes (ground tile + backdrop).
  - [0005-hazards-and-pits.md](./decisions/0005-hazards-and-pits.md) — fall-out (pits) and contact hazards.
  - [0006-hexagonal-application-layer.md](./decisions/0006-hexagonal-application-layer.md) — pure `core/app` use case (`stepMatch`) + effects as data; thin Phaser adapter.
  - [0007-module-decomposition-and-named-constants.md](./decisions/0007-module-decomposition-and-named-constants.md) — split GameScene/match.ts into layers; constants in tuning.ts / theme.ts / style.css tokens.
