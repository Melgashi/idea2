# Hollywood Dynasty

A Hollywood industry simulator. Set up a world, press **Next Year**, and watch the film business play out: studios rise and go bankrupt, stars are born and fade, franchises boom and burn out, and every year ends with the **Golden Laurels** awards.

## Running

Open `index.html` in a browser. There's no build step and nothing to install. The game autosaves to your browser (IndexedDB) after every simulated year. Use the ☰ menu to start a new world (with a start year and an optional seed) or to export and import save files.

Keys: `Space` / `N` advances one year.

## What's in a world

- **22 studios** to start, in three tiers: Major, Mid and Indie. Each has cash, prestige, a lean from arthouse to commercial, and signature genres. Studios move up and down tiers, get acquired, shut down, and new ones open, so at least 20 are always active.
- **1,000 actors** plus about 180 directors, 180 writers, 110 cinematographers and 100 composers. Retirements and deaths are balanced by newcomers, so the pool stays the same size.
- **Character sheets** for everyone:
  - Role-specific attributes (actors: Acting, Range, Charisma, Looks, Comedy, Drama, Action, Discipline)
  - OVR and a potential rating in stars
  - Fame and prestige
  - Traits such as Method Actor, Box Office Magnet, Diva, Auteur, Late Bloomer and Scandal-Prone
  - Asking fee, filmography with graded performances, awards history and frequent collaborators
- **Aging**: each attribute has its own age curve. Looks and action skills peak early, while craft keeps improving with experience until the person's peak age.

## How a year plays out

1. **Industry events** may fire: strikes, recessions, booms, a craze for one genre or fatigue with another, VFX breakthroughs. Genre appetite drifts, and copies whatever made money last year.
2. **Production.** Each studio greenlights films based on its tier, its cash, its taste and current trends. Successful films can get sequels. Bigger productions get first pick of directors, writers, cinematographers, composers and cast, within the budget for fees. Some talent take pay cuts for passion projects.
3. **Release.** Quality comes from the script, direction, performances, visuals and score. That produces a critics' score and an audience score. Box office then depends on audience reaction, star power, genre trend, release month, competition, sequel pull and luck. Expect sleeper hits and bombs.
4. **Careers.** Fame and prestige move with each film's results, experience improves attributes, and scandals happen.
5. **The Golden Laurels.** Eleven categories: Picture, Director, Actor, Actress, the two Supporting categories, Screenplay, Cinematography, Score, Visual Effects and Animated Feature, plus a Lifetime Achievement honor. Voters favor prestige genres, late-year releases, overdue veterans and good campaigners.
6. **Studio finances.** Overhead and interest on debt are paid, profits go to the parent company, and studios change tier or collapse.

## Code layout

| File | Purpose |
| --- | --- |
| `js/rng.js` | Seeded RNG; the same seed gives the same history |
| `js/data.js` | Names, genres, traits, studio names, title patterns, events |
| `js/world.js` | World and person generation, aging, OVR, fees |
| `js/sim.js` | The yearly simulation |
| `js/awards.js` | The Golden Laurels |
| `js/ui.js` | Hash-routed pages |
| `js/main.js` | Boot, saving, input |
