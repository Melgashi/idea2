// World generation, people, studios, and per-person derived values (age, OVR, fee).
(function (HW) {
  var clamp = HW.clamp;

  HW.newWorld = function (opts) {
    opts = opts || {};
    var seed = opts.seed || Math.floor(Math.random() * 1e9);
    var rng = new HW.RNG(seed);
    var w = {
      version: 2,
      seed: seed,
      startYear: opts.startYear || 1980,
      year: opts.startYear || 1980, // next year to simulate
      people: [],
      studios: [],
      films: [],
      awards: {},
      history: [],
      news: [],
      trends: {},
      usedNames: {},
      usedTitles: {},
      rngState: 0
    };
    HW.GENRE_KEYS.forEach(function (g) { w.trends[g] = clamp(rng.normal(1, 0.12), 0.7, 1.3); });
    w.trends['Superhero'] = 0.45; // a niche genre... for now

    // opts.targets / opts.tiers build a smaller world (career mode); the defaults are the sandbox
    if (opts.targets) w.targets = opts.targets;
    HW.ROLE_KEYS.forEach(function (role) {
      var n = (w.targets && w.targets[role]) || HW.ROLES[role].target;
      for (var i = 0; i < n; i++) createPerson(w, rng, role, { initial: true });
    });

    var names = rng.shuffle(HW.STUDIO_NAMES.slice());
    var tiers = opts.tiers ? opts.tiers.slice() : [];
    var i;
    if (!opts.tiers) {
      for (i = 0; i < 6; i++) tiers.push('Major');
      for (i = 0; i < 8; i++) tiers.push('Mid');
      for (i = 0; i < 8; i++) tiers.push('Indie');
    }
    tiers.forEach(function (tier, idx) {
      createStudio(w, rng, tier, { name: names[idx], founded: w.startYear - rng.int(tier === 'Major' ? 40 : 2, tier === 'Major' ? 70 : 30) });
    });

    w.rngState = rng.s;
    HW.addNews(w, w.startYear, 'The curtain rises on ' + w.startYear + ' Hollywood: ' + w.studios.length + ' studios and ' +
      w.people.length + ' artists chase fame and glory.', 'event');
    return w;
  };

  function uniqueName(w, rng, gender) {
    for (var tries = 0; tries < 50; tries++) {
      var n = rng.pick(gender === 'M' ? HW.NAMES.male : HW.NAMES.female) + ' ' + rng.pick(HW.NAMES.last);
      if (!w.usedNames[n]) { w.usedNames[n] = 1; return n; }
    }
    var base = rng.pick(gender === 'M' ? HW.NAMES.male : HW.NAMES.female) + ' ' + rng.pick(HW.NAMES.last);
    var k = 2;
    while (w.usedNames[base + ' ' + roman(k)]) k++;
    w.usedNames[base + ' ' + roman(k)] = 1;
    return base + ' ' + roman(k);
  }
  function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || ('#' + n); }

  function rollTraits(rng, role) {
    var pool = Object.keys(HW.TRAITS).filter(function (k) { return HW.TRAITS[k].roles.indexOf(role) >= 0; });
    var n = rng.chance(0.45) ? (rng.chance(0.3) ? 2 : 1) : 0;
    var out = [];
    while (out.length < n) {
      var t = rng.pick(pool);
      if (out.indexOf(t) < 0) out.push(t);
    }
    return out;
  }

  // Create a person. Genes are the stat ceilings; current stats are derived from genes + age + experience.
  function createPerson(w, rng, role, o) {
    o = o || {};
    var gender = o.gender || (role === 'actor' ? (rng.chance(0.5) ? 'M' : 'F') : (rng.chance(0.72) ? 'M' : 'F'));
    var age;
    if (o.initial) {
      age = role === 'actor' ? Math.round(clamp(rng.normal(36, 13), 17, 82)) : Math.round(clamp(rng.normal(46, 12), 24, 82));
    } else {
      age = role === 'actor' ? rng.int(17, 26) : rng.int(24, 34);
    }
    var star = rng.normal(0, 1); // shared talent factor, correlates stats
    var genius = rng.chance(0.012);
    var genes = {};
    var actor = role === 'actor';
    HW.ROLES[role].stats.forEach(function (s) {
      // actors use a 1-10 scale, crew 1-100
      if (actor) genes[s] = HW.round1(clamp(rng.normal(5.4 + star * 0.9, 1.2) + (genius ? 1.8 : 0), 1, 10));
      else genes[s] = Math.round(clamp(rng.normal(54 + star * 9, 12) + (genius ? 18 : 0), 15, 99));
    });
    var traits = rollTraits(rng, role);
    if (actor) {
      var boost = { chameleon: 'range', heartthrob: 'presence', stuntman: 'physicality', improv: 'chemistry', method: 'intensity' };
      traits.forEach(function (t) { if (boost[t]) genes[boost[t]] = Math.min(10, HW.round1(genes[boost[t]] + 1.8)); });
    }
    var peakAge = Math.round(clamp(rng.normal(role === 'actor' ? 38 : 47, 5), 28, 60));
    if (traits.indexOf('bloomer') >= 0) peakAge += 10;

    var p = {
      id: w.people.length,
      name: uniqueName(w, rng, gender),
      gender: gender,
      role: role,
      born: w.year - age,
      debut: o.initial ? w.year - Math.max(0, rng.int(0, Math.max(0, age - (role === 'actor' ? 18 : 25)))) : w.year,
      status: 'active',
      genes: genes,
      stats: {},
      peakAge: peakAge,
      traits: traits,
      specialty: role === 'actor' ? null : [rng.pick(HW.GENRE_KEYS.slice(0, 15)), rng.pick(HW.GENRE_KEYS.slice(0, 15))],
      exp: 0,
      fame: 0,
      prestige: 0,
      films: [],
      gross: 0,
      noms: 0,
      wins: 0,
      lastWorked: null,
      scandalYear: null,
      scandals: [],
      bestPerf: null
    };
    if (p.specialty && p.specialty[0] === p.specialty[1]) p.specialty.pop();
    if (o.initial) p.exp = clamp(Math.round((w.year - p.debut) * rng.range(0.3, 1.1)), 0, 30);
    if (actor) {
      // genre skills: everyone leans into one genre; veterans start with more seasoning
      p.genre = {};
      p.gLast = null;
      var lean = rng.pick(HW.ACTOR_GENRES);
      HW.ACTOR_GENRES.forEach(function (g) {
        var v = rng.normal(o.initial ? 3.6 : 2.6, 1.1) + p.exp * 0.07 + star * 0.4 + (g === lean ? rng.range(1.5, 3) : 0);
        p.genre[g] = HW.round1(clamp(v, 1, 9));
      });
    }
    HW.updateStats(p, w.year);
    var ovr = HW.ovr(p);
    var yearsIn = w.year - p.debut;
    if (o.initial) {
      p.fame = Math.round(clamp((ovr - 45) * 1.3 + yearsIn * 1.1 + rng.normal(0, 12) + (actor ? (p.stats.presence - 5) * 2.5 : -8), 0, 95));
      p.prestige = Math.round(clamp((ovr - 45) * 1.4 + yearsIn * 0.9 + rng.normal(0, 10), 0, 90));
    } else {
      p.fame = Math.round(clamp(rng.normal(4, 4), 0, 20));
      p.prestige = Math.round(clamp(rng.normal(4, 4), 0, 20));
    }
    w.people.push(p);
    return p;
  }
  HW.createPerson = createPerson;

  function createStudio(w, rng, tier, o) {
    o = o || {};
    var name = o.name;
    if (!name) {
      var taken = {};
      w.studios.forEach(function (s) { taken[s.name] = 1; });
      for (var t = 0; t < 40 && (!name || taken[name]); t++) {
        name = rng.chance(0.3) && HW.STUDIO_NAMES.some(function (n) { return !taken[n]; })
          ? rng.pick(HW.STUDIO_NAMES.filter(function (n) { return !taken[n]; }))
          : rng.pick(HW.STUDIO_PREFIX) + ' ' + rng.pick(HW.STUDIO_SUFFIX);
      }
    }
    var prefs = {};
    HW.GENRE_KEYS.forEach(function (g) { prefs[g] = HW.round1(clamp(rng.normal(1, 0.35), 0.2, 2.2)); });
    // each studio has a couple of signature genres
    for (var i = 0; i < 2; i++) prefs[rng.pick(HW.GENRE_KEYS.slice(0, 15))] += 1.2;
    var cash = { Major: rng.int(700, 1100), Mid: rng.int(180, 320), Indie: rng.int(30, 80) }[tier];
    var s = {
      id: w.studios.length,
      name: name,
      tier: tier,
      founded: o.founded || w.year,
      active: true,
      cash: cash,
      prestige: Math.round(clamp(rng.normal(tier === 'Indie' ? 45 : 50, 14), 10, 90)),
      // 0 = arthouse, 1 = pure commercial
      commercial: HW.round1(clamp(rng.normal(tier === 'Major' ? 0.7 : tier === 'Mid' ? 0.55 : 0.35, 0.18), 0.05, 0.95)),
      prefs: prefs,
      hue: rng.int(0, 359),
      films: [],
      wins: 0,
      noms: 0,
      bestPictures: 0,
      yearly: [],
      debtYears: 0,
      fate: null
    };
    w.studios.push(s);
    return s;
  }
  HW.createStudio = createStudio;

  HW.age = function (p, year) { return year - p.born; };

  // Current stats from genes, age curve and accumulated experience.
  HW.updateStats = function (p, year) {
    var age = year - p.born;
    var actor = p.role === 'actor';
    var expBonus = Math.min(10, p.exp * 0.45) * (actor ? 0.1 : 1);
    HW.ROLES[p.role].stats.forEach(function (s) {
      var a = HW.STAT_AGING[s] || { peak: p.peakAge, plateau: 12, decline: 0.009, young: 0.72 };
      var peak = HW.STAT_AGING[s] ? a.peak : p.peakAge;
      var startAge = p.role === 'actor' ? 16 : 22;
      var f;
      if (age < peak) f = a.young + (1 - a.young) * clamp((age - startAge) / (peak - startAge), 0, 1);
      else if (age <= peak + a.plateau) f = 1;
      else f = Math.max(0.35, 1 - (age - peak - a.plateau) * a.decline);
      var bonus = (s === 'presence' || s === 'physicality') ? 0 : expBonus * (age < peak + a.plateau ? 1 : 0.7);
      p.stats[s] = actor ? HW.round1(clamp(p.genes[s] * f + bonus, 1, 10)) : Math.round(clamp(p.genes[s] * f + bonus, 1, 99));
    });
  };

  HW.ovr = function (p) {
    var s = p.stats;
    switch (p.role) {
      case 'actor': // 0-100 for sorting; shown to players as 1-10
        var best = Math.max.apply(null, HW.ACTOR_GENRES.map(function (g) { return p.genre[g]; }));
        return Math.round((s.presence * 0.2 + s.craft * 0.22 + s.intensity * 0.18 + s.physicality * 0.08 + s.chemistry * 0.14 + s.range * 0.08 + best * 0.1) * 10);
      case 'director':
        return Math.round(s.vision * 0.32 + s.craft * 0.32 + s.actorHandling * 0.16 + s.commercial * 0.12 + s.efficiency * 0.08);
      case 'writer':
        return Math.round(s.originality * 0.3 + s.dialogue * 0.28 + s.structure * 0.3 + s.commercial * 0.12);
      case 'cinematographer':
        return Math.round(s.visuals * 0.45 + s.technique * 0.35 + s.innovation * 0.2);
      case 'composer':
        return Math.round(s.melody * 0.4 + s.atmosphere * 0.4 + s.versatility * 0.2);
    }
    return 50;
  };

  // Potential shown as 1-5 stars, based on gene ceiling (scouts can't see exact genes).
  HW.potentialStars = function (p) {
    var keys = HW.ROLES[p.role].stats, sum = 0;
    keys.forEach(function (k) { sum += p.genes[k]; });
    var avg = sum / keys.length * (p.role === 'actor' ? 10 : 1);
    return clamp(Math.round((avg - 30) / 12), 1, 5);
  };

  // Asking fee in $M.
  HW.fee = function (p) {
    var f = p.fame / 100, pr = p.prestige / 100, base;
    switch (p.role) {
      case 'actor': base = 0.05 + Math.pow(f, 2.3) * 22 + pr * 2; break;
      case 'director': base = 0.1 + Math.pow(f, 2) * 12 + pr * 3; break;
      case 'writer': base = 0.05 + Math.pow(f, 2) * 4 + pr * 1; break;
      default: base = 0.04 + Math.pow(f, 2) * 2 + pr * 0.6;
    }
    if (p.traits.indexOf('diva') >= 0) base *= 1.5;
    return Math.round(base * 100) / 100;
  };

  // How well an actor fits a genre, 0-100: mostly their genre skill, partly the genre's key core stats.
  HW.genreApt = function (p, genre) {
    var G = HW.GENRES[genre], skill = 0, core = 0, k;
    for (k in G.apt) skill += p.genre[k] * G.apt[k];
    for (k in G.core) core += p.stats[k] * G.core[k];
    return (skill * 0.6 + core * 0.4) * 10;
  };

  // Genre skills move with how each film turns out. Returns the change applied.
  HW.growGenres = function (p, f, perf, lead) {
    var G = HW.GENRES[f.genre];
    var reception = ((f.critic + f.audience) / 2 - 55) / 30;           // roughly -1.5..+1.5
    var boxOffice = clamp(Math.log2(f.gross / Math.max(1, f.budget)) / 3, -1, 1);
    var own = (perf - 60) / 25;
    var x = 0.18 + 0.22 * reception + 0.12 * boxOffice + 0.2 * own;   // a typical film nudges skills up a little
    var out = {};
    for (var g in G.apt) {
      var d = x * G.apt[g] * (lead ? 1 : 0.6);
      d *= d > 0 ? Math.max(0.1, (10 - p.genre[g]) / 6) : 0.6;         // harder to improve near the top
      p.genre[g] = Math.round(clamp(p.genre[g] + d, 1, 10) * 100) / 100;
      out[g] = d;
    }
    return out;
  };

  HW.has = function (p, trait) { return p.traits.indexOf(trait) >= 0; };

  HW.addNews = function (w, year, text, type, ref) {
    w.news.push({ y: year, t: text, k: type || 'misc', r: ref || null });
    if (w.news.length > 4000) w.news.splice(0, w.news.length - 4000);
  };
})(globalThis.HW = globalThis.HW || {});
