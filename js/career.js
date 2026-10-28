// Career mode: you are an 18-year-old actor in a small Hollywood of 20 studios (1-5 stars) and 20 directors.
// Every quarter each studio aims to start a production. When you're free, you get pitches for three of them.
// Signing on books you for a year. The game is about reading opportunities: is the director right for this film
// and in form, will you have chemistry with this cast, did past collaborations work, does the studio cast and
// hire well? Those are what decide how a film turns out.
// State lives in w.career; the year's running context in w.yc so a save can resume between quarters.
(function (HW) {
  var clamp = HW.clamp, Sim = HW.Sim;
  var C = HW.Career = {};

  C.QUARTERS = ['Winter', 'Spring', 'Summer', 'Fall'];
  var STAR_SLOTS = [5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];
  var TIER_OF = { 1: 'Indie', 2: 'Indie', 3: 'Mid', 4: 'Major', 5: 'Major' };
  var ACCESS = [0, 0, 5, 14, 26, 42];          // reputation a studio of N stars expects before it calls
  var TARGETS = { actor: 160, director: 20, writer: 30, cinematographer: 24, composer: 20 };
  var BOOKED_QUARTERS = 4;                     // a film takes a year of your life
  var FOCUS = {
    presence: { label: 'Camera magnet' }, craft: { label: 'Trained actor' }, intensity: { label: 'Intense' },
    physicality: { label: 'Physical' }, chemistry: { label: 'Natural chemistry' }, range: { label: 'Chameleon' }
  };
  C.FOCUS = FOCUS;
  // Reputation after a release, by verdict: [lead, supporting]. Numbers are added; strings ('x0.75') multiply.
  var REP = {
    'Smash hit': [24, 14], 'Hit': [16, 9], 'Solid earner': [8, 4], 'Broke even': [2, 1],
    'Disappointment': [-3, -1], 'Flop': ['x0.75', 'x0.85'], 'Box office disaster': ['x0.75', 'x0.8']
  };
  // How a result changes people's willingness to work with you again (career reasons, not personal ones)
  var WORK = { 'Smash hit': 25, 'Hit': 15, 'Solid earner': 8, 'Broke even': 2, 'Disappointment': -10, 'Flop': -30, 'Box office disaster': -40 };
  var STAND = { 'Smash hit': 20, 'Hit': 12, 'Solid earner': 5, 'Broke even': 0, 'Disappointment': -8, 'Flop': -25, 'Box office disaster': -35 };

  function r2(v) { return Math.round(v * 100) / 100; }
  function rngOf(w) { return new HW.RNG(w.rngState); }
  function player(w) { return w.people[w.career.pid]; }
  C.player = player;
  C.rep = function (w) { return Math.round(player(w).fame); };
  C.age = function (w) { return w.year - player(w).born; };
  C.label = function (w) { return C.QUARTERS[w.career.q] + ' ' + w.year; };
  C.qLabel = function (w, qi) { return C.QUARTERS[qi % 4] + ' ' + (w.career.started + Math.floor(qi / 4)); };
  function log(w, t, k, ref) {
    var c = w.career;
    c.log.push({ y: w.year, q: c.q, t: t, k: k || 'info', r: ref || null });
    if (c.log.length > 500) c.log.splice(0, c.log.length - 500);
  }
  C.log = log;
  function isGood(v) { return /Smash|Hit|Solid/.test(v); }
  function isBad(v) { return /Flop|disaster/.test(v); }

  // ---------- setup ----------
  C.newCareer = function (o) {
    var tiers = STAR_SLOTS.map(function (s) { return TIER_OF[s]; });
    // the world starts three years before you arrive, so studios and directors already have track records
    var arrival = o.startYear || 1980, WARMUP = 3;
    var w = HW.newWorld({ startYear: arrival - WARMUP, seed: o.seed, targets: TARGETS, tiers: tiers });
    w.mode = 'career';
    w.studioCount = 20;
    var rng = rngOf(w);
    w.studios.forEach(function (s, i) { s.stars = STAR_SLOTS[i]; s.judgment = judgment(rng); });
    var p = HW.createPerson(w, rng, 'actor', {});
    // shape the player: an unknown 18-year-old, equally at home in every genre, with one standout quality
    var name = (o.name || '').trim();
    if (name && !w.usedNames[name]) { delete w.usedNames[p.name]; p.name = name; w.usedNames[name] = 1; }
    p.gender = o.gender === 'M' ? 'M' : 'F';
    p.born = arrival - 18;
    p.debut = arrival;
    p.traits = [];
    p.exp = 0;
    HW.ROLES.actor.stats.forEach(function (k) { p.genes[k] = HW.round1(clamp(rng.normal(5.8, 0.5), 4.5, 7)); });
    var focus = FOCUS[o.focus] ? o.focus : 'craft';
    p.genes[focus] = HW.round1(clamp(p.genes[focus] + 1.8, 1, 9.5));
    HW.ACTOR_GENRES.forEach(function (g) { p.genre[g] = 5.5; });
    p.peakAge = 36;
    p.fame = 2; p.prestige = 2;
    HW.updateStats(p, w.year);
    w.rngState = rng.s;
    w.playerId = p.id;
    w.follows = { p: {}, s: {} };
    w.follows.p[p.id] = 1;
    w.career = {
      kind: 'actor', pid: p.id, name: p.name, focus: focus, started: w.year, q: 0, qi: 0, busyUntil: WARMUP * 4,
      ties: {}, studios: {}, seen: { qi: 0, ids: {} }, log: [], reports: [], history: [],
      earnings: 0, peak: 2, slate: [], pitches: [], over: null, seed: (w.seed ^ 0x9e3779b9) >>> 0
    };
    beginYear(w);
    prepareQuarter(w);
    while (w.career.qi < WARMUP * 4) resolveQuarter(w, -1);   // Hollywood carries on before you get there
    log(w, p.name + ' arrives in Hollywood at 18 with nothing but a headshot.', 'milestone', { p: p.id });
    return w;
  };
  // A studio's hidden eye for casting and hiring directors (0-100). Players read it from the studio's track record.
  function judgment(rng) { return Math.round(clamp(rng.normal(50, 16), 10, 95)); }

  // ---------- year & quarter plumbing ----------
  function freshMods() { return { output: 1, boxOffice: 1, ancillary: 1, spectacle: 1, spectacleBO: 1, prestigeBO: 1 }; }
  function ctxOf(w) {
    var yc = w.yc;
    return {
      year: yc.year, rng: rngOf(w), films: [], booked: {}, resting: yc.resting, mods: yc.mods, event: yc.event,
      worked: yc.worked, capOne: true, refDrift: 0.08
    };
  }
  function exclude(w) { var e = {}; e[w.career.pid] = 1; return e; }

  function beginYear(w) {
    var ctx = { year: w.year, rng: rngOf(w), films: [], booked: {}, resting: {}, mods: freshMods(), event: null, worked: {} };
    Sim.rollEvent(w, ctx);
    Sim.updateTrends(w, ctx);
    Sim.restRoll(w, ctx, exclude(w));
    w.yc = { year: w.year, mods: ctx.mods, event: ctx.event, resting: ctx.resting, worked: {}, ids: [] };
    w.rngState = ctx.rng.s;
  }

  function endYear(w) {
    var ctx = ctxOf(w), Y = w.year, p = player(w);
    ctx.films = w.yc.ids.map(function (id) { return w.films[id]; });
    if (ctx.films.length) {
      HW.runAwards(w, ctx);
      HW.relationsYear(w, ctx);
    }
    Sim.studioYearEnd(w, ctx);
    Sim.peopleYearEnd(w, ctx);
    HW.detectStories(w, ctx);
    Sim.recordHistory(w, ctx);
    restar(w, Y, ctx.rng);
    var c = w.career;
    var mine = ctx.films.filter(function (f) { return f.cast.some(function (x) { return x.p === p.id; }); });
    var aw = HW.personAwards(w, p.id).filter(function (a) { return a.y === Y; });
    c.history.push({ y: Y, rep: Math.round(p.fame), films: mine.length, noms: aw.length, wins: aw.filter(function (a) { return a.won; }).length, earned: r2(c.earnedYear || 0) });
    c.earnedYear = 0;
    aw.forEach(function (a) { log(w, (a.won ? '🏆 You won ' : 'You were nominated for ') + HW.catName(a.k) + ' for "' + w.films[a.f].title + '".', a.won ? 'milestone' : 'good', { f: a.f }); });
    w.rngState = ctx.rng.s;
    w.year++;
    c.q = 0;
    beginYear(w);
    if (C.age(w) >= 80) retire(w, 'At 80, you take your final bow.');
  }

  // Re-rank studios into 1-5 stars by prestige and money; new studios get their own judgment.
  function restar(w, Y, rng) {
    var act = w.studios.filter(function (s) { return s.active; });
    act.forEach(function (s) { if (s.judgment == null) s.judgment = judgment(rng); });
    act.sort(function (a, b) { return score(b) - score(a); });
    act.forEach(function (s, i) {
      var st = STAR_SLOTS[Math.min(i, STAR_SLOTS.length - 1)], was = s.stars;
      s.stars = st;
      s.tier = TIER_OF[st];
      if (was && was !== st && w.follows && w.follows.s[s.id]) HW.addNews(w, Y, s.name + ' is now a ' + st + '-star studio.', 'studio', { s: s.id });
    });
    function score(s) { return s.prestige + clamp(s.cash, -300, 2500) / 40 + (s.yearly.length ? s.yearly[s.yearly.length - 1].w * 3 : 0); }
  }

  // ---------- ties ----------
  // Personal fondness (aff) decides on-screen chemistry; most people are friendly, very few dislike you.
  // Professional willingness (work) follows results.
  C.tie = function (w, id) {
    var c = w.career, t = c.ties[id];
    if (t) return t;
    var o = w.people[id], rng = new HW.RNG((c.seed ^ Math.imul(id + 1, 2654435761)) >>> 0);
    var aff = rng.normal(14, 20);
    if (HW.has(o, 'diva')) aff -= 10;
    if (HW.has(o, 'actorsdir')) aff += 10;
    if (o.role === 'actor') aff += (o.stats.chemistry - 5) * 3;
    t = c.ties[id] = { aff: Math.round(clamp(aff, -80, 90)), work: 0, films: 0, good: 0, bad: 0, snub: 0, known: false, last: null };
    return t;
  };
  C.stand = function (w, sid) { return w.career.studios[sid] || (w.career.studios[sid] = { stand: 0, until: 0 }); };
  C.attitude = function (aff) { return aff >= 30 ? 'Great chemistry with you' : aff >= -10 ? 'Gets along with you' : aff >= -30 ? 'Lukewarm toward you' : 'Can\'t stand you'; };
  C.stance = function (work) { return work >= 20 ? 'Wants to work with you again' : work >= 0 ? 'Open to working with you' : work >= -25 ? 'Wary of you after a bad result' : 'Won\'t hire you right now'; };
  C.isPartner = function (t) { return t.films >= 2 && t.good > t.bad && t.aff >= 20; };
  // How long a director you turned down (for another film) stops calling, in quarters. Bigger egos, longer grudges.
  C.snubLength = function (d) {
    var n = 4;
    if (d.fame >= 50) n += 4;
    if (HW.has(d, 'diva') || HW.has(d, 'auteur')) n += 4;
    return n;
  };
  C.years = function (q) { var y = Math.round(q / 4); return y <= 1 ? 'a year' : y + ' years'; };
  // Investigation: people by numeric id, studios as 's<id>'
  C.seen = function (w, key) {
    var c = w.career;
    if (c.seen.qi !== c.qi) c.seen = { qi: c.qi, ids: {} };
    return !!c.seen.ids[key];
  };
  C.investigate = function (w, key) {
    var c = w.career;
    C.seen(w, key);
    c.seen.ids[key] = 1;
    if (typeof key === 'number') C.tie(w, key).known = true;
  };

  // A director's recent form.
  C.form = function (w, did) {
    var d = w.people[did], last = d.films.slice(-3).map(function (id) { return w.films[id]; });
    var v = last.map(function (f) { return HW.postMortem(w, f).verdict; });
    var good = v.filter(isGood).length, bad = v.filter(isBad).length;
    var label = last.length < 2 ? 'Untested' : good >= 2 && !bad ? 'On a roll' : bad >= 2 ? 'Cold streak' : 'Mixed record';
    return { films: last, verdicts: v, good: good, bad: bad, label: label, roll: label === 'On a roll', cold: label === 'Cold streak' };
  };
  // Is this director right for this genre? Their specialties, plus how their films in it have done.
  C.dirFit = function (w, did, genre) {
    var d = w.people[did], spec = (d.specialty || []).indexOf(genre) >= 0;
    var mine = d.films.map(function (id) { return w.films[id]; }).filter(function (f) { return f.genre === genre; }).slice(-4);
    var v = mine.map(function (f) { return HW.postMortem(w, f).verdict; });
    var good = v.filter(isGood).length, bad = v.filter(isBad).length;
    var score = (spec ? 2 : 0) + good - bad;
    var label = score >= 2 ? 'Right at home' : score <= -1 ? 'Out of their depth' : mine.length || spec ? 'Capable' : 'Untried in ' + genre.toLowerCase();
    return { spec: spec, films: mine.length, good: good, bad: bad, score: score, label: label };
  };
  // How a studio's recent films have done: the visible trace of its judgment.
  C.studioRecord = function (w, sid) {
    var s = w.studios[sid], last = s.films.slice(-8).map(function (id) { return w.films[id]; });
    var v = last.map(function (f) { return HW.postMortem(w, f).verdict; });
    var good = v.filter(isGood).length, bad = v.filter(isBad).length, net = good - bad;
    var label = last.length < 3 ? 'Too new to judge' : net >= 3 ? 'Sharp eye for talent' : net <= -3 ? 'Poor judgment lately' : net >= 0 ? 'Solid track record' : 'Hit and miss';
    return { films: last, verdicts: v, good: good, bad: bad, label: label };
  };

  // ---------- the quarter's slate and pitches ----------
  function prepareQuarter(w) {
    var c = w.career, ctx = ctxOf(w), rng = ctx.rng, p = player(w), rep = p.fame, q = c.q;
    Sim.buildPools(w, ctx, exclude(w));
    var slate = [];
    w.studios.forEach(function (s) {
      if (!s.active) return;
      // each studio aims to start one production a quarter; struggling ones sometimes can't
      if (!rng.chance(s.cash < 0 ? 0.55 : 0.88)) return;
      var f = Sim.planProject(w, ctx, s);
      f.month = q * 3 + rng.int(0, 2);
      slate.push(f);
    });
    slate.sort(function (a, b) { return b.budget * rng.range(0.7, 1.3) - a.budget * rng.range(0.7, 1.3); });
    slate.forEach(function (f) { Sim.staffProject(w, ctx, f); });
    slate = slate.filter(function (f) { return f.director != null && f.cast.length > 1; });
    slate.forEach(function (f) { f.title = Sim.makeTitle(w, rng, f); });
    c.slate = slate;
    c.pitches = [];
    if (c.qi >= (c.busyUntil || 0) && !c.over) c.pitches = pitchesFor(w, slate, rng, p, rep);
    w.rngState = rng.s;
  }

  function pitchesFor(w, slate, rng, p, rep) {
    var c = w.career, cands = [];
    slate.forEach(function (f, i) {
      var s = w.studios[f.studio], st = C.stand(w, s.id), d = w.people[f.director], t = C.tie(w, d.id);
      var sequelOfMine = f.seqOf != null && w.films[f.seqOf].cast.some(function (x) { return x.p === p.id && x.r === 'L'; });
      var access = ACCESS[s.stars] - st.stand / 4;
      var open = sequelOfMine || (rep >= access - 6 && st.until <= c.qi && t.snub <= c.qi && t.work > -35);
      if (!open) return;
      var leadP = sequelOfMine ? 1 : clamp((rep - ACCESS[s.stars]) / 18 + (s.stars <= 2 ? 0.3 : 0) + (t.work >= 20 ? 0.15 : 0), 0.08, 0.9);
      var want = rng.chance(leadP) ? 'L' : 'S';
      var slot = pickSlot(w, f, want, p.gender) || pickSlot(w, f, want === 'L' ? 'S' : 'L', p.gender);
      if (!slot) return;
      var target = clamp(Math.round(rep / 15) + 1, 1, 5);
      var wgt = Math.exp(-Math.abs(s.stars - target)) + (t.work >= 20 ? 1.5 : 0) + (sequelOfMine ? 5 : 0);
      cands.push({ i: i, slot: slot, wgt: wgt, seq: sequelOfMine });
    });
    if (cands.length < 3) slate.forEach(function (f, i) {
      if (cands.some(function (x) { return x.i === i; })) return;
      var s = w.studios[f.studio], t = C.tie(w, f.director), st = C.stand(w, s.id);
      if (t.snub > c.qi || t.work <= -35 || st.until > c.qi || s.stars > 3) return; // grudges still hold
      var slot = pickSlot(w, f, 'S', p.gender);
      if (slot) cands.push({ i: i, slot: slot, wgt: 0.3 });
    });
    var picks = [];
    while (picks.length < 3 && cands.length) {
      var pick = rng.weighted(cands, function (x) { return x.wgt; });
      cands.splice(cands.indexOf(pick), 1);
      picks.push(pick);
    }
    return picks.map(function (x) {
      var f = slate[x.i], role = x.slot.r, ask = HW.fee(p);
      var fee = role === 'L' ? clamp(ask * rng.range(1, 1.4) + f.budget * 0.012, 0.03, Math.max(0.05, f.budget * 0.14))
        : clamp(ask * rng.range(0.7, 1.1) + f.budget * 0.004, 0.02, Math.max(0.03, f.budget * 0.04));
      return { f: x.i, r: role, alt: x.slot.p, fee: r2(fee), seq: !!x.seq };
    });
  }
  // The cast member whose part the player would take (they keep it if the player goes elsewhere).
  function pickSlot(w, f, role, gender) {
    for (var i = 0; i < f.cast.length; i++) {
      var k = f.cast[i];
      if (k.r === role && w.people[k.p].gender === gender) return k; // the part is written for the player's gender
    }
    return null;
  }

  // ---------- reading a pitch ----------
  // What it costs to take another film instead, what's public knowledge, and what you find by looking closer.
  C.analyze = function (w, pitch) {
    var c = w.career, f = c.slate[pitch.f], d = w.people[f.director], s = w.studios[f.studio];
    var td = C.tie(w, d.id), out = { pass: [], risks: [], rewards: [] };
    var alt = w.people[pitch.alt], others = f.cast.filter(function (k) { return k.p !== pitch.alt; });
    // if you sign on to a different film
    var len = C.snubLength(d);
    if (C.isPartner(td)) out.pass.push({ t: d.name + ' counts on you: choosing another film will strain your partnership, and they won\'t call for about ' + C.years(len) + '.', ref: d.id });
    else out.pass.push({ t: d.name + ' won\'t pitch to you for about ' + C.years(len) + '.', ref: d.id });
    out.pass.push({ t: s.name + ' will be ' + (s.stars >= 4 ? 'noticeably' : 'a little') + ' cooler toward you.' });
    if (pitch.seq) out.pass.push({ t: 'They will recast your role in the sequel.' });
    out.pass.push({ t: 'The part goes to ' + alt.name + '.', ref: alt.id });

    // public knowledge: your history with these people, and headlines
    if (td.films) {
      if (C.isPartner(td)) out.rewards.push({ t: 'You and ' + d.name + ' work well together: ' + td.good + ' of your ' + td.films + ' films worked.', ref: d.id });
      else if (td.bad > td.good) out.risks.push({ t: 'Your last collaborations with ' + d.name + ' didn\'t go well (' + td.bad + ' of ' + td.films + ' flopped).', ref: d.id });
    }
    others.forEach(function (k) {
      var t = C.tie(w, k.p), o = w.people[k.p];
      if (t.films && t.aff >= 30 && t.good >= t.bad) out.rewards.push({ t: 'Proven chemistry with ' + o.name + ' (' + t.films + ' film' + (t.films > 1 ? 's' : '') + ' together).', ref: o.id });
      else if (t.known && t.aff < -30) out.risks.push({ t: 'You and ' + o.name + ' don\'t get along. A tense set could sink the film.', ref: o.id });
      if (o.fame >= 60) out.rewards.push({ t: o.name + ' is a box-office draw.', ref: o.id });
    });
    var lastD = d.films.length ? w.films[d.films[d.films.length - 1]] : null;
    if (lastD && lastD.tags.indexOf('flop') >= 0) out.risks.push({ t: d.name + '\'s last film, "' + lastD.title + '", flopped.', ref: d.id });
    if (s.cash < 0) out.risks.push({ t: s.name + ' is losing money; budgets get squeezed.' });
    if (pitch.r === 'L' && f.budget >= 60) out.risks.push({ t: 'Leading a ' + HW.money(f.budget) + ' film puts your name on the poster: a flop would hit you hardest.' });
    if (f.seqNum >= 4) out.risks.push({ t: 'Part ' + f.seqNum + ' of a franchise: audiences may be tiring of it.' });

    // found by looking into the director
    if (C.seen(w, d.id)) {
      var form = C.form(w, d.id), fit = C.dirFit(w, d.id, f.genre);
      if (form.roll) out.rewards.push({ t: d.name + ' is on a roll: ' + form.good + ' of their last ' + form.films.length + ' films worked.', ref: d.id, found: true });
      if (form.cold) out.risks.push({ t: d.name + ' is on a cold streak.', ref: d.id, found: true });
      if (fit.score >= 2) out.rewards.push({ t: f.genre + ' is ' + d.name + '\'s territory' + (fit.spec ? ' (a specialty)' : '') + '.', ref: d.id, found: true });
      else if (fit.score <= -1) out.risks.push({ t: d.name + '\'s ' + f.genre.toLowerCase() + ' films have struggled.', ref: d.id, found: true });
      else if (!fit.films && !fit.spec) out.risks.push({ t: d.name + ' has never made a ' + f.genre.toLowerCase() + ' film.', ref: d.id, found: true });
      if (!td.films && td.aff >= 30) out.rewards.push({ t: d.name + ' is a fan of yours.', ref: d.id, found: true });
    }
    // found by looking into the cast
    others.forEach(function (k) {
      if (!C.seen(w, k.p)) return;
      var o = w.people[k.p], t = C.tie(w, k.p);
      if (!t.films && t.aff >= 30) out.rewards.push({ t: 'You and ' + o.name + ' hit it off: expect real chemistry.', ref: o.id, found: true });
      if (t.aff < -30 && !out.risks.some(function (r) { return r.ref === o.id; })) out.risks.push({ t: o.name + ' can\'t stand you.', ref: o.id, found: true });
    });
    // found by looking into the studio
    if (C.seen(w, 's' + s.id)) {
      var rec = C.studioRecord(w, s.id);
      if (rec.label === 'Sharp eye for talent') out.rewards.push({ t: s.name + ' casts and hires well: ' + rec.good + ' of its last ' + rec.films.length + ' films worked.', found: true });
      else if (rec.label === 'Poor judgment lately') out.risks.push({ t: s.name + '\'s recent choices keep missing: ' + rec.bad + ' of its last ' + rec.films.length + ' films flopped.', found: true });
    }
    var keys = [d.id, 's' + s.id].concat(others.map(function (k) { return k.p; }));
    out.unexplored = keys.filter(function (k) { return !C.seen(w, k); }).length;
    return out;
  };

  // ---------- what decides how a film turns out (applied to every film in the career world) ----------
  function filmMods(w, f, rng) {
    var s = w.studios[f.studio], mods = { perf: {}, q: 0 };
    mods.q += ((s.judgment == null ? 50 : s.judgment) - 50) / 3.5; // a studio's eye for casting and directors
    var fit = C.dirFit(w, f.director, f.genre), form = C.form(w, f.director);
    mods.q += clamp(fit.score, -2, 3) * 1.2;                         // the right director for the material
    if (form.roll) mods.q += 2; else if (form.cold) mods.q -= 1.5;   // confidence and momentum
    return mods;
  }

  // ---------- choosing ----------
  // pick: index into c.pitches, or -1 to wait for the next quarter. Waiting upsets nobody.
  C.choose = function (w, pick) {
    var c = w.career;
    if (c.over) return null;
    var report = resolveQuarter(w, pick >= 0 ? pick : -1);
    // a film books you for a year: the next quarters play out without you
    while (!c.over && c.qi < (c.busyUntil || 0)) {
      var r = resolveQuarter(w, -1);
      if (r.yearEnded) report.yearEnded = r.yearEnded;
    }
    report.nextPitches = C.label(w);
    return report;
  };

  function resolveQuarter(w, pick) {
    var c = w.career, p = player(w), ctx = ctxOf(w), rng = ctx.rng, Y = w.year;
    var slate = c.slate, chosen = pick >= 0 ? c.pitches[pick] : null, report = { y: Y, q: c.q, film: null, passed: [], changes: [] };
    var repBefore = p.fame;
    slate.forEach(function (f) { f.mods = filmMods(w, f, rng); });

    if (chosen) {
      // the pitches you turned down for this one
      c.pitches.forEach(function (pt, i) {
        if (i === pick) return;
        var f = slate[pt.f], d = w.people[f.director], td = C.tie(w, d.id), st = C.stand(w, f.studio), s = w.studios[f.studio];
        var partner = C.isPartner(td);
        td.snub = c.qi + 1 + C.snubLength(d);
        td.work -= partner ? 12 : 5;
        if (partner) { td.aff -= 15; report.changes.push({ t: d.name + ' is hurt that you chose another film.', ref: d.id, bad: true }); }
        else report.changes.push({ t: d.name + ' won\'t call for about ' + C.years(C.snubLength(d)) + '.', ref: d.id, bad: true });
        st.stand -= s.stars >= 4 ? 6 : 3;
        report.passed.push({ f: f, alt: pt.alt, r: pt.r });
      });
    }

    var mine = null;
    if (chosen) {
      mine = slate[chosen.f];
      var entry = mine.cast.filter(function (k) { return k.p === chosen.alt; })[0];
      entry.p = p.id; entry.fee = chosen.fee; entry.cut = undefined;
      // on set: chemistry lifts performances, a proven partnership lifts the film, bad blood can wreck it
      var mods = mine.mods;
      var d = w.people[mine.director], td = C.tie(w, d.id);
      if (td.aff >= 30) mods.perf[p.id] = (mods.perf[p.id] || 0) + 3;
      if (C.isPartner(td)) { mods.q += 2; mods.perf[p.id] = (mods.perf[p.id] || 0) + 2; }
      if (td.aff < -30 && rng.chance(0.4)) { mods.q -= 3; mods.perf[p.id] = (mods.perf[p.id] || 0) - 5; mine.clash = d.id; }
      mine.cast.forEach(function (k) {
        if (k.p === p.id) return;
        var t = C.tie(w, k.p), o = w.people[k.p];
        if (t.aff >= 30) { mods.perf[p.id] = (mods.perf[p.id] || 0) + 3; mods.perf[k.p] = (mods.perf[k.p] || 0) + 3; mods.q += 1.5; }
        else if (t.aff < -30 && rng.chance(0.35 + (HW.has(o, 'diva') ? 0.2 : 0))) {
          mods.perf[p.id] = (mods.perf[p.id] || 0) - 8; mods.perf[k.p] = (mods.perf[k.p] || 0) - 6; mods.q -= 4;
          mine.clash = mine.clash || k.p;
        }
      });
    }

    // release the whole quarter
    ctx.seqCount = {};
    slate.forEach(function (f) { if (f.seqOf != null) ctx.seqCount[f.genre] = (ctx.seqCount[f.genre] || 0) + 1; });
    Sim.releaseFilms(w, ctx, slate);
    Sim.careerUpdates(w, ctx, slate);
    slate.forEach(function (f) { w.yc.ids.push(f.id); delete f.mods; });
    w.yc.worked = ctx.worked;

    if (mine) {
      var pm = HW.postMortem(w, mine), x = mine.cast.filter(function (k) { return k.p === p.id; })[0], lead = x.r === 'L' ? 0 : 1;
      // reputation: hits lift you quickly, a flop costs a quarter of it
      var delta = REP[pm.verdict][lead], before = repBefore, after;
      if (typeof delta === 'string') after = before * parseFloat(delta.slice(1));
      else after = before + (delta > 0 ? delta * (1 - before / 140) : delta);
      var shine = x.perf >= 65 ? clamp((x.perf - 65) / 6, 0, 4) * (lead ? 0.7 : 1) : x.perf < 50 ? clamp((x.perf - 50) / 8, -2, 0) : 0;
      after += shine > 0 ? shine * (1 - before / 130) : shine;
      if (before < 25 && !isBad(pm.verdict)) after += 1.5; // an unknown gains from simply being seen
      p.fame = Math.round(clamp(after, 0, 100) * 10) / 10;
      c.earnings = r2(c.earnings + x.fee);
      c.earnedYear = r2((c.earnedYear || 0) + x.fee);
      c.peak = Math.max(c.peak, p.fame);
      report.film = { id: mine.id, verdict: pm.verdict, good: pm.good, perf: x.perf, r: x.r, fee: x.fee, repBefore: Math.round(before * 10) / 10, repAfter: p.fame, clash: mine.clash != null ? mine.clash : null };
      // the people and the studio react, for career reasons
      var good = isGood(pm.verdict), bad = isBad(pm.verdict);
      var wk = WORK[pm.verdict] * (lead ? 0.6 : 1), sd = STAND[pm.verdict] * (lead ? 0.6 : 1);
      var d2 = w.people[mine.director], td2 = C.tie(w, d2.id), wasPartner = C.isPartner(td2);
      td2.films++; td2.last = mine.id; td2.known = true;
      if (good) td2.good++; if (bad) td2.bad++;
      td2.work = clamp(td2.work + wk, -100, 100);
      td2.aff = clamp(td2.aff + 5 + (x.perf >= 80 ? 4 : 0) - (mine.clash === d2.id ? 15 : 0), -100, 100);
      if (!wasPartner && C.isPartner(td2)) report.changes.push({ t: 'You and ' + d2.name + ' are now regular collaborators.', ref: d2.id, good: true });
      else if (wk <= -25) report.changes.push({ t: d2.name + ' will think twice before casting you again. Nothing personal: the flop hurt them too.', ref: d2.id, bad: true });
      else if (wk >= 15) report.changes.push({ t: d2.name + ' wants to work with you again.', ref: d2.id, good: true });
      mine.cast.forEach(function (k) {
        if (k.p === p.id) return;
        var t = C.tie(w, k.p), o = w.people[k.p];
        t.films++; t.known = true; t.last = mine.id;
        if (good) t.good++; if (bad) t.bad++;
        t.work = clamp(t.work + wk * 0.5, -100, 100);
        if (mine.clash === k.p) { t.aff = clamp(t.aff - 15, -100, 100); report.changes.push({ t: 'You clashed with ' + o.name + ' on set.', ref: o.id, bad: true }); }
        else {
          t.aff = clamp(t.aff + 4, -100, 100);
          if (t.aff >= 30 && t.films === 1) report.changes.push({ t: 'You and ' + o.name + ' had real chemistry.', ref: o.id, good: true });
        }
      });
      var st2 = C.stand(w, mine.studio), s2 = w.studios[mine.studio];
      st2.stand = clamp(st2.stand + sd, -100, 100);
      if (st2.stand < -30) { st2.until = c.qi + 4; report.changes.push({ t: s2.name + ' won\'t hire you for about a year.', bad: true }); }
      else if (sd >= 12) report.changes.push({ t: s2.name + ' will remember this hit.', good: true });
      log(w, '"' + mine.title + '": ' + pm.verdict + (x.r === 'L' ? ' (lead)' : ' (supporting)') + '. Reputation ' + Math.round(before) + ' → ' + Math.round(p.fame) + '.', good ? 'good' : bad ? 'bad' : 'info', { f: mine.id });
      milestones(w, mine, x, pm);
      c.busyUntil = c.qi + BOOKED_QUARTERS;
    } else if (pick === -1 && c.pitches.length) {
      log(w, 'You waited for better offers this quarter.', 'info');
    }
    report.passed = report.passed.map(function (z) {
      var pm = HW.postMortem(w, z.f);
      return { id: z.f.id, verdict: pm.verdict, good: pm.good, alt: z.alt, r: z.r };
    });
    report.passed.forEach(function (z) { if (/Smash/.test(z.verdict)) log(w, 'You passed on "' + w.films[z.id].title + '". It became a smash for ' + w.people[z.alt].name + '.', 'bad', { f: z.id }); });

    // grudges and standing slowly fade
    Object.keys(c.ties).forEach(function (id) { var t = c.ties[id]; if (t.work < 0) t.work = Math.min(0, t.work + 2.5); });
    Object.keys(c.studios).forEach(function (id) { var st = c.studios[id]; if (st.stand < 0) st.stand = Math.min(0, st.stand + 2); });

    w.rngState = rng.s;
    report.repNow = p.fame;
    if (chosen || c.pitches.length) { c.reports.push(report); if (c.reports.length > 40) c.reports.shift(); }
    c.qi++;
    c.q++;
    if (c.q === 4) { report.yearEnded = Y; endYear(w); }
    if (!c.over) prepareQuarter(w);
    return report;
  }

  function milestones(w, f, x, pm) {
    var c = w.career, m = c.milestones || (c.milestones = {});
    var hit = function (k, cond, t) { if (cond && !m[k]) { m[k] = { y: w.year, q: c.q }; log(w, '🏅 ' + t, 'milestone', { f: f.id }); } };
    hit('lead', x.r === 'L', 'Your first leading role: "' + f.title + '".');
    hit('hit', pm.good, 'Your first hit: "' + f.title + '".');
    hit('hundred', f.gross >= 100, 'Your first $100M movie.');
    hit('fiveStar', w.studios[f.studio].stars === 5, 'You worked for a 5-star studio.');
    hit('billion', f.gross >= 1000, 'A billion-dollar movie.');
    hit('aList', player(w).fame >= 70, 'You are on the A-list.');
  }
  C.MILESTONES = [['lead', 'First leading role'], ['hit', 'First hit'], ['hundred', 'A $100M movie'], ['fiveStar', 'Work for a 5-star studio'], ['billion', 'A billion-dollar movie'], ['aList', 'Reputation 70: the A-list']];

  function retire(w, why) {
    var c = w.career, p = player(w);
    c.over = { y: w.year, why: why };
    p.status = 'retired';
    p.retired = w.year;
    log(w, why, 'milestone');
  }
  C.retire = function (w) { retire(w, player(w).name + ' retires from acting at ' + C.age(w) + '.'); };
})(globalThis.HW = globalThis.HW || {});
