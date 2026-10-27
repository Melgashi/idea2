# Hollywood Dynasty

A Hollywood industry simulator. Set up a world, press **Next Year**, and watch the film business play out: studios rise and go bankrupt, stars are born and fade, franchises boom and burn out, and every year ends with the **Golden Laurels** awards.

## Running

Open `index.html` in a browser; there is nothing to install. `hollywood-dynasty.html` is the whole game in a single file, easy to share; regenerate it with `python3 build.py` after editing the code. The game autosaves to your browser (IndexedDB) after every simulated year. `dist/artifact.html` is the build for hosting as a claude.ai artifact: there it also keeps a compressed cloud copy in the player's private per-user database (synced at most every 15 seconds and when the page closes), so a game continues across devices. Where no storage is available (for example a sandboxed in-app file preview), a warning bar points to Export save. Use the ☰ menu to start a new world (with a start year and an optional seed) or to export and import save files.

Keys: `Space` / `N` advances one year.

## What's in a world

- **22 studios** to start, in three tiers: Major, Mid and Indie. Each has cash, prestige, a lean from arthouse to commercial, and signature genres. Studios move up and down tiers, get acquired, shut down, and new ones open, so at least 20 are always active.
- **1,000 actors** plus about 180 directors, 180 writers, 110 cinematographers and 100 composers. Retirements and deaths are balanced by newcomers, so the pool stays the same size.
- **Character sheets** for everyone:
  - Actors are rated **1-10** on six core stats and five genre skills (see below); crew have role-specific attributes from 1 to 100
  - OVR and a potential rating in stars
  - Fame and prestige
  - Traits such as Method Actor, Box Office Magnet, Diva, Auteur, Late Bloomer and Scandal-Prone
  - Asking fee, filmography with graded performances, awards history and frequent collaborators
- **Aging**: each attribute has its own age curve. Presence and Physicality peak early, while Craft and Chemistry deepen with experience.

### Actor stats (1-10)

| Core stat | What it means | In the sim |
| --- | --- | --- |
| Presence | How much the camera loves them, and star power | Drives audience appeal of leads; commercial studios cast for it |
| Craft | Technique, training, consistency take after take | Biggest part of performance quality, and it reduces take-to-take variance |
| Intensity | Emotional depth and willingness to go all in | Key for Drama, Thriller, Biopic, War; raises the ceiling and the variance |
| Physicality | Stunts, action, dance, body control | Key for Action, Superhero, Fantasy, Musical; fades fastest with age |
| Chemistry | Comedic timing, improv, lifting scene partners | Key for Comedy, Romance, Animation; boosts every co-star's performance |
| Range | Versatility, playing against type | Helps every performance a little |

**Genre skills:** Comedy, Action, Romance, Drama and Thriller. Each film genre draws on one or more of them (Sci-Fi is Action + Drama + Thriller, Musical is Romance + Comedy, and so on). After every role, the relevant skills grow according to the film's critic and audience reception, its box office relative to budget, and the actor's own performance. Hits grow them faster, flops can shrink them, and gains slow down near 10, so long careers lead naturally to typecasting.

### Career stories

Every actor's and director's fame and prestige is recorded each year, so careers have shapes:

- **Arcs.** Each career is classified as *Rise and Rise*, *Rise and Fall*, *Fall and Fall*, *Comeback*, *Legend*, *One-Hit Wonder*, *Late Bloomer*, *Flame-Out*, *Rising Star*, *Steady Workhorse* or *Never Made It*. The **Stories** tab groups everyone by arc.
- **Character sheets** show a career graph (fame and prestige by year, with Laurel wins and scandals marked) and a generated bio: debut, breakout, peak, biggest hit, scandals, comebacks, awards, typecasting and how it ended.
- **Turning points** are detected as they happen (breakouts, comebacks, falling stars, new A-listers) and reported in the news and on the overview, along with a rotating "Where are they now?" look at faded stars.
- Most lead roles are written for actors under 40, so stars tend to break out young and get pushed aside as they age, unless they find a second act.

### Following

Star (☆) any actor, director or studio on their page or in the Talent and Studios tables. Each year the overview opens with **Your people**, a digest of what happened to everyone you follow: films and grosses, performance grades, nominations and wins, scandals, new partnerships or feuds, turning points, retirements, and for studios their rank, profit, biggest hit and any bombs. The **★ Following** tab shows past years' digests too.

### The Golden Laurels ceremony

After each single-year advance, the ceremony plays as an event: minor awards first and Best Picture last, opening each envelope in turn. Nominees are shown with their record ("4 previous nominations, never won", "facing rival…", "★ you follow"). Skip to Best Picture, skip straight to the winners, or replay any year from the Golden Laurels tab. Turn it off in the ☰ menu. It never plays during Auto or multi-year jumps.

### Relationships

- **Creative partners**: a director and actor who make three good films together. The director keeps casting them, and they perform better together.
- **Screen duos**: co-leads audiences love, who get cast together again.
- **Feuds**: they break out on troubled productions (divas, flops, blown budgets) and can end a partnership. Feuding people refuse to work together until they reconcile.
- **Rivalries**: stars of a similar age who keep meeting in the same Laurel category. The press loves them, and beating your rival makes headlines.

Relationships appear on character sheets, in bios, in the news and in your digest.

### Box office reports

Every film page explains its result. It shows a verdict (*Smash hit*, *Hit*, *Solid earner*, *Broke even*, *Disappointment*, *Flop*, *Box office disaster*) and what the film needed to break even, then ranks the factors behind the result, both for and against: audience reaction compared with similar films, reviews, the genre's appetite that year, the genre's natural audience size, release month, competition, sequel goodwill or fatigue, buzz and marketing, star power, budget overruns and industry events. Big flops in the news name what insiders blame, and your digest says why a followed studio's film bombed.

### Film titles

Each genre has its own vocabulary and title patterns, plus hand-written titles: Westerns get *Showdown at Silver Creek*, sci-fi gets *Last Light on Callisto*, comedies get *Who Invited Virginia?*. Recently used words and patterns are avoided, and an old title that comes back is marked as a remake.

## Career Mode

The **🎬 Career Mode** tab at the far right starts a separate single-player game in which you run a talent agency. A career has **its own world and its own save**, so your sandbox world is never touched. A banner at the top shows you're in Career Mode, and **Back to sandbox** returns you to your sandbox world.

- **Open auditions:** pick up to three founding clients for free from a dozen hopefuls and journeymen.
- **Offers:** each year every client gets role offers, each showing the studio and its tier, genre, budget, lead or supporting role, director, fee (flagged when it's under their asking price), script buzz and genre fit. Sequel offers come in when a client led a hit. Accept up to two per client (one for Reclusive actors, three for Workhorses), then advance the year. Accepted offers become real productions in the simulation. Clients only work through offers you accept.
- **Money:** you earn 10% of your clients' fees and pay a small yearly overhead. If the agency runs out of money, it folds.
- **Investments:** coaching raises a core stat or genre skill (once a year per client), a publicity push raises fame, and a For Your Consideration campaign helps a client's performance with Golden Laurel voters.
- **Loyalty:** it rises with lead roles, hits, nominations and wins, and falls with idle years, flops, underpaid roles and supporting parts for established stars. Clients below 30 loyalty may fire you, and big stars can be poached by rival agencies when your reputation lags behind them.
- **Reputation:** built from your top clients' fame and awards. It decides who will sign with you (fame up to reputation + 25) and how many clients you can hold.
- **Agency screens:** this year's offers, client management, scouting (every actor in town, with signing costs), milestones, the agency log, year-by-year finances and former clients. Your clients are followed automatically, so they appear in the yearly digest and are flagged at the ceremony.
- Career Mode advances one year at a time.

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
| `js/stories.js` | Career history, arcs, bios, turning points |
| `js/relations.js` | Partnerships, duos, feuds, rivalries |
| `js/career.js` | Career Mode game logic (agency, offers, clients) |
| `js/career-ui.js` | Career Mode screens |
| `js/ui.js` | Hash-routed pages, follow digest, ceremony |
| `js/main.js` | Boot, saving, input |
