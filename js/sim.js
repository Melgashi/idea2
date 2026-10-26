// Yearly simulation: industry events, trends, production, release & box office, careers, aging.
(function (HW) {
  var clamp = HW.clamp;

  var TIER = {
    Major: { films: [7, 11], budget: 70, sd: 0.55, min: 20, max: 280, overhead: 45, floor: -500, reserve: 2000 },
    Mid:   { films: [4, 6],  budget: 26, sd: 0.55, min: 6,  max: 110, overhead: 14, floor: -160, reserve: 600 },
    Indie: { films: [2, 4],  budget: 5,  sd: 0.7,  min: 0.4, max: 30, overhead: 2,  floor: -50, reserve: 150 }
  };
  HW.TIER = TIER;

  var CAPS = { actor: 2, director: 1, writer: 2, cinematographer: 2, composer: 3 };

  HW.simulateYear = function (w) {
    var rng = new HW.RNG(w.rngState);
    var ctx = {
      year: w.year, rng: rng, films: [], booked: {}, resting: {},
      mods: { output: 1, boxOffice: 1, ancillary: 1, spectacle: 1, spectacleBO: 1, prestigeBO: 1 },
      event: null
    };
    rollEvent(w, ctx);
    updateTrends(w, ctx);
    produceFilms(w, ctx);
    releaseFilms(w, ctx);
    careerUpdates(w, ctx);
    HW.runAwards(w, ctx);
    studioYearEnd(w, ctx);
    peopleYearEnd(w, ctx);
    recordHistory(w, ctx);
    w.year++;
    w.rngState = rng.s;
    return ctx;
  };

  // ---------- events & trends ----------
  function rollEvent(w, ctx) {
    var rng = ctx.rng;
    if (!rng.chance(0.45)) return;
    var ev = rng.weighted(HW.EVENTS, function (e) { return e.weight; });
    var text = ev.text, genre = null;
    if (ev.mods.craze) {
      genre = rng.weighted(HW.GENRE_KEYS, function (g) { return w.trends[g] + 0.3; });
      w.trends[genre] = clamp(w.trends[genre] * rng.range(1.3, 1.6), 0.3, 2.4);
    } else if (ev.mods.fatigue) {
      genre = HW.GENRE_KEYS.slice().sort(function (a, b) { return w.trends[b] - w.trends[a]; })[rng.int(0, 2)];
      w.trends[genre] = clamp(w.trends[genre] * rng.range(0.6, 0.8), 0.3, 2.4);
    } else {
      for (var k in ev.mods) ctx.mods[k] = ev.mods[k];
    }
    text = text.replace('{genre}', genre);
    ctx.event = { key: ev.key, text: text, genre: genre };
    HW.addNews(w, ctx.year, text + '.', 'event');
  }

  function updateTrends(w, ctx) {
    var rng = ctx.rng, gs = w.genreStats || {};
    HW.GENRE_KEYS.forEach(function (g) {
      var t = w.trends[g];
      var target = g === 'Superhero' ? 0.75 : 1;
      t += (target - t) * 0.12 + rng.normal(0, 0.06);
      // copycat effect: last year's profitable genres get more appetite
      var s = gs[g];
      if (s && s.films >= 2 && s.budget > 0) t += clamp((s.gross / s.budget - 2.6) * 0.03, -0.07, 0.1);
      w.trends[g] = clamp(t, 0.35, 1.9);
    });
    // keep overall appetite near 1 so trends are relative
    var mean = HW.GENRE_KEYS.reduce(function (a, g) { return a + w.trends[g]; }, 0) / HW.GENRE_KEYS.length;
    HW.GENRE_KEYS.forEach(function (g) { w.trends[g] = Math.round(w.trends[g] / Math.sqrt(mean) * 100) / 100; });
  }

  // ---------- production ----------
  function capFor(p) {
    var c = CAPS[p.role];
    if (HW.has(p, 'workhorse')) c += 1;
    if (HW.has(p, 'reclusive')) c = 1;
    return c;
  }

  function produceFilms(w, ctx) {
    var rng = ctx.rng, Y = ctx.year;
    // some people sit the year out
    w.people.forEach(function (p) {
      if (p.status !== 'active') return;
      var restP = HW.has(p, 'reclusive') ? 0.5 : 0.08;
      if (rng.chance(restP)) ctx.resting[p.id] = 1;
    });

    var pools = {};
    HW.ROLE_KEYS.forEach(function (r) { pools[r] = []; });
    w.people.forEach(function (p) {
      if (p.status === 'active' && !ctx.resting[p.id] && Y - p.born >= (p.role === 'actor' ? 16 : 21)) pools[p.role].push(p);
    });
    ctx.pools = pools;
    ctx.fees = [];
    w.people.forEach(function (p) { if (p.status === 'active') ctx.fees[p.id] = HW.fee(p); });
    ctx.pools.actorM = pools.actor.filter(function (p) { return p.gender === 'M'; });
    ctx.pools.actorF = pools.actor.filter(function (p) { return p.gender === 'F'; });

    var projects = [];
    w.studios.forEach(function (s) {
      if (!s.active) return;
      var t = TIER[s.tier];
      var n = rng.int(t.films[0], t.films[1]) * ctx.mods.output;
      if (s.cash < 0) n *= 0.6;
      else if (s.cash > { Major: 1500, Mid: 450, Indie: 120 }[s.tier]) n *= 1.15;
      n = Math.max(1, Math.round(n));
      for (var i = 0; i < n; i++) projects.push(planProject(w, ctx, s));
    });
    // bigger productions get first pick of talent (with some shuffle)
    projects.sort(function (a, b) { return b.budget * rng.range(0.7, 1.3) - a.budget * rng.range(0.7, 1.3); });
    projects.forEach(function (f) { staffProject(w, ctx, f); });
    ctx.seqCount = {}; // audiences tire of too many sequels in one genre
    projects.forEach(function (f) { if (f.seqOf != null) ctx.seqCount[f.genre] = (ctx.seqCount[f.genre] || 0) + 1; });
    ctx.films = projects.filter(function (f) { return f.director != null && f.cast.length > 0; });
  }

  function findSequel(w, s, Y, rng) {
    var cands = [];
    for (var i = s.films.length - 1; i >= 0; i--) {
      var f = w.films[s.films[i]];
      if (f.year < Y - 4) break;
      if (f.hasSeq || (f.seqNum || 1) >= 5) continue;
      var dir = w.people[f.director];
      var thresh = HW.has(dir, 'franchise') ? 2.0 : 2.6;
      if (f.gross / f.budget >= thresh && f.gross >= 60 && f.audience >= 55) cands.push(f);
    }
    if (!cands.length || !rng.chance(0.35)) return null;
    return rng.pick(cands);
  }

  function planProject(w, ctx, s) {
    var rng = ctx.rng, Y = ctx.year, t = TIER[s.tier];
    var seq = findSequel(w, s, Y, rng);
    var genre;
    if (seq) { genre = seq.genre; seq.hasSeq = true; }
    else {
      genre = rng.weighted(HW.GENRE_KEYS, function (g) {
        var G = HW.GENRES[g];
        var commercialFit = s.commercial * G.appeal + (1 - s.commercial) * (1 + G.awards / 15);
        var budgetFit = s.tier === 'Indie' && G.budget > 1.3 ? 0.25 : 1;
        return s.prefs[g] * Math.pow(w.trends[g], 1.5) * commercialFit * budgetFit;
      });
    }
    var G = HW.GENRES[genre];
    var budget = t.budget * Math.exp(rng.normal(0, t.sd)) * G.budget * (0.75 + s.commercial * 0.5);
    if (seq) budget = Math.max(budget, seq.budget * rng.range(1.1, 1.5));
    budget = clamp(budget, t.min, t.max);
    budget = Math.min(budget, Math.max(t.min, s.cash * 0.4 + t.max * 0.15));
    budget = Math.round(budget * 10) / 10;
    var commercial = clamp(s.commercial + rng.normal(0, 0.15) + (G.awards > 5 ? -0.15 : 0) + (seq ? 0.2 : 0), 0, 1);
    return {
      id: null, title: null, year: Y, month: 0, studio: s.id, genre: genre, budget: budget, commercial: commercial,
      seqOf: seq ? seq.id : null, seqNum: seq ? (seq.seqNum || 1) + 1 : 1, root: seq ? (seq.root != null ? seq.root : seq.id) : null,
      director: null, writer: null, dp: null, composer: null, cast: [],
      gross: 0, profit: 0, critic: 0, audience: 0, noms: 0, wins: 0, won: [], tags: []
    };
  }

  function hire(ctx, pool, f, allowance, scoreFn) {
    var rng = ctx.rng, best = null, bestScore = -1e9, bestFee = 0, bestCut = false;
    allowance = Math.max(allowance, 0.12);
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if ((ctx.booked[p.id] || 0) >= capFor(p)) continue;
      var raw = scoreFn(p);
      if (raw < -1e8 || raw + 8.5 < bestScore) continue; // can't beat current pick even with max luck
      var fee = ctx.fees[p.id], cut = false;
      if (fee > allowance) {
        // passion projects: some talent take a pay cut for serious work
        var passion = (HW.has(p, 'indie') ? 0.5 : 0.06) * (1 - f.commercial);
        if (fee * 0.3 <= allowance && ((p.id * 7919 + f.year) % 100) / 100 < passion) { fee = fee * 0.3; cut = true; }
        else continue;
      }
      var sc = raw + (rng.next() - 0.5) * 17 - (fee / allowance) * 3;
      if (sc > bestScore) { bestScore = sc; best = p; bestFee = fee; bestCut = cut; }
    }
    if (best) {
      ctx.booked[best.id] = (ctx.booked[best.id] || 0) + 1;
      return { p: best, fee: bestFee, cut: bestCut };
    }
    return null;
  }

  function specBonus(p, genre, amt) { return p.specialty && p.specialty.indexOf(genre) >= 0 ? amt : 0; }

  function staffProject(w, ctx, f) {
    var rng = ctx.rng, c = f.commercial, genre = f.genre, Y = ctx.year;
    var prev = f.seqOf != null ? w.films[f.seqOf] : null;
    var B = f.budget;

    var d = hire(ctx, ctx.pools.director, f, B * 0.08, function (p) {
      var q = (p.stats.vision + p.stats.craft) / 2;
      return q * 0.65 + specBonus(p, genre, 8) + c * (p.stats.commercial * 0.25 + p.fame * 0.15) +
        (1 - c) * p.prestige * 0.3 + (prev && prev.director === p.id ? 30 : 0);
    });
    if (!d) return;
    f.director = d.p.id;
    var dir = d.p;
    var wr = hire(ctx, ctx.pools.writer, f, B * 0.03, function (p) {
      var q = (p.stats.originality + p.stats.dialogue + p.stats.structure) / 3;
      return q * 0.7 + specBonus(p, genre, 8) + c * p.stats.commercial * 0.25 + (1 - c) * p.prestige * 0.2 +
        (prev && prev.writer === p.id ? 20 : 0);
    });
    f.writer = wr ? wr.p.id : null;
    var dp = hire(ctx, ctx.pools.cinematographer, f, B * 0.015, function (p) {
      return HW.ovr(p) * 0.8 + p.fame * 0.1 + G_spec(genre) * p.stats.technique * 0.1;
    });
    f.dp = dp ? dp.p.id : null;
    var cm = hire(ctx, ctx.pools.composer, f, B * 0.012, function (p) { return HW.ovr(p) * 0.8 + p.fame * 0.1; });
    f.composer = cm ? cm.p.id : null;

    // roles
    var roles = [];
    var leadG = rng.chance(genre === 'Action' || genre === 'War' || genre === 'Western' ? 0.7 : 0.52) ? 'M' : 'F';
    var other = leadG === 'M' ? 'F' : 'M';
    var prevLeads = prev ? prev.cast.filter(function (x) { return x.r === 'L'; }) : [];
    var actionish = HW.GENRES[genre].apt.action >= 0.5;
    var leadAge = genre === 'Romance' ? [18, 48] : actionish ? [20, 58] : [16, 80];
    roles.push({ r: 'L', g: prevLeads[0] ? w.people[prevLeads[0].p].gender : leadG, age: leadAge, share: 0.14 });
    if (genre === 'Romance' || rng.chance(0.6)) roles.push({ r: 'L', g: prevLeads[1] ? w.people[prevLeads[1].p].gender : (genre === 'Romance' ? other : rng.chance(0.65) ? other : leadG), age: leadAge, share: 0.09 });
    roles.push({ r: 'S', g: 'M', age: [8, 95], share: 0.04 });
    roles.push({ r: 'S', g: 'F', age: [8, 95], share: 0.04 });
    var extra = rng.int(0, 2);
    for (var i = 0; i < extra; i++) roles.push({ r: 'S', g: rng.chance(0.5) ? 'M' : 'F', age: [8, 95], share: 0.025 });

    var castIds = {};
    var collab = {};
    for (var j = dir.films.length - 1, n = 0; j >= 0 && n < 8; j--, n++) w.films[dir.films[j]].cast.forEach(function (x) { collab[x.p] = 1; });
    var prevCast = {};
    if (prev) prev.cast.forEach(function (x) { prevCast[x.p] = x.r; });
    var spent = d.fee + (wr ? wr.fee : 0);
    roles.forEach(function (role, idx) {
      var pool = role.g === 'M' ? ctx.pools.actorM : ctx.pools.actorF;
      var h = hire(ctx, pool, f, B * role.share, function (p) {
        if (castIds[p.id]) return -1e9;
        var age = Y - p.born;
        if (age < role.age[0] || age > role.age[1]) return -1e9;
        var apt = HW.genreApt(p, genre);
        var q = p.stats.acting * 0.45 + apt * 0.3 + p.stats.charisma * 0.15 + p.stats.range * 0.1;
        var sc = q * (1 - 0.3 * c) + (1 - c) * p.prestige * 0.25 + c * p.fame * (role.r === 'L' ? 0.4 : 0.15);
        if (role.r === 'L' && genre !== 'Animation') sc += c * (p.stats.looks - 50) * 0.15;
        if (prevCast[p.id] === role.r) sc += 40;
        if (collab[p.id]) sc += 4;
        return sc;
      });
      if (!h) return;
      if (castIds[h.p.id]) return;
      castIds[h.p.id] = 1;
      spent += h.fee;
      f.cast.push({ p: h.p.id, r: role.r, perf: 0, fee: Math.round(h.fee * 100) / 100, cut: h.cut || undefined });
    });
    f.talentCost = Math.round(spent * 10) / 10;
  }

  function G_spec(genre) { return HW.GENRES[genre].spectacle; }

  // ---------- release & box office ----------
  function pickMonth(f, rng) {
    var G = HW.GENRES[f.genre];
    var r = rng.next();
    if (G.spectacle >= 0.6 && f.budget > 40) return r < 0.6 ? rng.pick([4, 5, 6]) : r < 0.85 ? rng.pick([10, 11]) : rng.int(0, 11);
    if (G.awards >= 3 && f.commercial < 0.55) return r < 0.6 ? rng.pick([9, 10, 11]) : rng.int(0, 11);
    if (f.genre === 'Horror') return r < 0.4 ? 9 : r < 0.6 ? rng.pick([0, 1]) : rng.int(0, 11);
    if (f.genre === 'Family' || f.genre === 'Animation') return r < 0.5 ? rng.pick([5, 6, 10, 11]) : rng.int(0, 11);
    return rng.int(0, 11);
  }
  var MONTH_BO = [0.82, 0.85, 0.95, 0.97, 1.12, 1.2, 1.22, 1.0, 0.85, 0.95, 1.08, 1.15];

  function releaseFilms(w, ctx) {
    var rng = ctx.rng, Y = ctx.year;
    ctx.films.forEach(function (f) {
      f.month = pickMonth(f, rng);
      f.title = makeTitle(w, rng, f);
    });
    ctx.films.forEach(function (f) { scoreFilm(w, ctx, f); });
    // critics and audiences judge against what they're used to: drift the reference toward this year's median
    var med = function (arr) { arr.sort(function (a, b) { return a - b; }); return arr[arr.length >> 1]; };
    if (ctx.films.length) {
      // films compete within their market segment (blockbusters vs. blockbusters, indies vs. indies)
      ctx.seg = {};
      ctx.films.forEach(function (f) {
        var t = w.studios[f.studio].tier, g = ctx.seg[t] || (ctx.seg[t] = { n: 0, aud: 0, crit: 0 });
        g.n++; g.aud += f.audience; g.crit += f.critic;
      });
      for (var t in ctx.seg) { ctx.seg[t].aud /= ctx.seg[t].n; ctx.seg[t].crit /= ctx.seg[t].n; }
      w.ref.q = w.ref.q * 0.8 + 0.2 * med(ctx.films.map(function (f) { return f.sc.q; }));
      w.ref.ent = w.ref.ent * 0.8 + 0.2 * med(ctx.films.map(function (f) { return f._ent; }));
      ctx.films.forEach(function (f) { delete f._ent; });
    }
    var byMonth = {};
    ctx.films.forEach(function (f) { (byMonth[f.month] = byMonth[f.month] || []).push(f); });

    ctx.films.forEach(function (f) {
      var G = HW.GENRES[f.genre];
      var leads = f.cast.filter(function (x) { return x.r === 'L'; }).map(function (x) { return w.people[x.p]; });
      var fames = leads.map(function (p) { return p.fame + (HW.has(p, 'magnet') ? 15 : 0); }).sort(function (a, b) { return b - a; });
      var star = (fames[0] || 0) + (fames[1] || 0) * 0.4;
      var dirFame = w.people[f.director].fame;
      var base = 2 + Math.pow(f.budget, 0.95) * 1.7 + star * 0.55 + dirFame * 0.2;
      var rivals = (byMonth[f.month] || []).filter(function (o) { return o !== f && o.budget >= f.budget * 0.6; }).length;
      var seg = ctx.seg[w.studios[f.studio].tier];
      var mult = Math.exp((f.audience - seg.aud) / 32) * Math.exp((f.critic - seg.crit) / 110) *
        Math.pow(w.trends[f.genre], 0.9) * G.appeal * MONTH_BO[f.month] * ctx.mods.boxOffice /
        (1 + 0.05 * rivals) * Math.exp(rng.normal(0, 0.38));
      if (G.spectacle >= 0.6) mult *= ctx.mods.spectacleBO;
      if (G.awards >= 3) mult *= ctx.mods.prestigeBO;
      if (f.seqOf != null) {
        var prev = w.films[f.seqOf];
        mult *= clamp(prev.audience / 65, 0.7, 1.3) * [1, 1, 1.05, 0.9, 0.78, 0.68][f.seqNum] * Math.pow(0.93, ctx.seqCount[f.genre] || 0);
        base += Math.min(prev.gross, 1200) * 0.15;
      }
      if (f.budget < 20 && f.critic >= 84 && rng.chance(0.35)) { mult *= rng.range(2.5, 7); f.tags.push('sleeper'); }
      var gross = base * mult;
      if (gross > 800) gross = 800 + (gross - 800) / (1 + (gross - 800) / 1600); // even mega-hits saturate
      f.gross = Math.round(gross * 10) / 10;
      var marketing = f.budget * 0.45 + 0.5;
      var cost = f.budget * (1 + f.overrun) + marketing;
      var revenue = f.gross * 0.5 + f.gross * 0.12 * ctx.mods.ancillary;
      f.profit = Math.round((revenue - cost) * 10) / 10;
      if (f.profit < -40 || (f.profit < 0 && f.gross < f.budget * 0.6 && f.budget > 30)) f.tags.push('flop');
      if (f.gross / f.budget > 5 && f.gross > 100) f.tags.push('smash');

      f.id = w.films.length;
      w.films.push(f);
      var s = w.studios[f.studio];
      s.films.push(f.id);
      s.cash = Math.round((s.cash + f.profit) * 10) / 10;
    });

    // headlines
    var sorted = ctx.films.slice().sort(function (a, b) { return b.gross - a.gross; });
    if (sorted[0]) {
      var top = sorted[0];
      var allTime = w.films.every(function (o) { return o === top || o.gross < top.gross; });
      HW.addNews(w, Y, (allTime ? 'RECORD! ' : '') + '"' + top.title + '" (' + w.studios[top.studio].name + ') is the year\'s #1 movie with ' +
        HW.money(top.gross) + (allTime ? ' — the biggest box office of all time.' : '.'), 'boxoffice', { f: top.id });
    }
    ctx.films.forEach(function (f) {
      if (f.tags.indexOf('sleeper') >= 0) HW.addNews(w, Y, 'Sleeper hit: tiny "' + f.title + '" turns a ' + HW.money(f.budget) + ' budget into ' + HW.money(f.gross) + '.', 'boxoffice', { f: f.id });
      if (f.tags.indexOf('flop') >= 0 && f.budget >= 120) HW.addNews(w, Y, 'Disaster: "' + f.title + '" bombs, costing ' + w.studios[f.studio].name + ' ' + HW.money(-f.profit) + '.', 'boxoffice', { f: f.id });
    });
  }

  function scoreFilm(w, ctx, f) {
    var rng = ctx.rng, G = HW.GENRES[f.genre];
    var dir = w.people[f.director];
    var wr = f.writer != null ? w.people[f.writer] : null;
    var dp = f.dp != null ? w.people[f.dp] : null;
    var cm = f.composer != null ? w.people[f.composer] : null;
    var dirHandling = (dir.stats.actorHandling - 50) * 0.12 + (HW.has(dir, 'actorsdir') ? 4 : 0);
    var dialogue = wr ? (wr.stats.dialogue - 50) * 0.06 + (HW.has(wr, 'wordsmith') ? 2 : 0) : -3;

    var actSum = 0, actW = 0, charSum = 0, charW = 0;
    f.cast.forEach(function (c) {
      var p = w.people[c.p], s = p.stats;
      var method = HW.has(p, 'method');
      var perf = s.acting * 0.5 + HW.genreApt(p, f.genre) * 0.25 + s.range * 0.1 + s.charisma * 0.15 +
        dirHandling + dialogue + (s.discipline - 50) * 0.04 + (method ? 3 : 0) + rng.normal(0, method ? 10 : 7);
      c.perf = Math.round(clamp(perf, 1, 99));
      var wgt = c.r === 'L' ? 2 : 1;
      actSum += c.perf * wgt; actW += wgt;
      if (c.r === 'L') { charSum += s.charisma + (f.genre === 'Animation' ? 0 : (s.looks - 50) * 0.2); charW++; }
    });
    var acting = actW ? actSum / actW : 40;
    var starAppeal = charW ? charSum / charW : 45;

    var script = wr ? wr.stats.originality * 0.35 + wr.stats.structure * 0.35 + wr.stats.dialogue * 0.3 + specBonus(wr, f.genre, 5) : 38;
    if (f.seqOf != null) script -= 4 + f.seqNum;
    script += rng.normal(0, 6);
    var direction = dir.stats.vision * 0.5 + dir.stats.craft * 0.5 + specBonus(dir, f.genre, 4) + rng.normal(0, 5);
    var tech = dp ? dp.stats.visuals * 0.5 + dp.stats.technique * 0.3 + dp.stats.innovation * 0.2 + rng.normal(0, 5) : 40;
    var music = cm ? cm.stats.melody * 0.4 + cm.stats.atmosphere * 0.4 + cm.stats.versatility * 0.2 + rng.normal(0, 5) : 40;
    var spectacle = G.spectacle * clamp(Math.log(f.budget + 1) / Math.log(250), 0, 1.1) * 100 * ctx.mods.spectacle +
      (dp ? (dp.stats.technique - 50) * 0.3 * G.spectacle : 0) + rng.normal(0, 6);

    var overrun = clamp(rng.normal(0.05, 0.08) + (60 - dir.stats.efficiency) * 0.003, -0.05, 0.6);
    var perfectionist = HW.has(dir, 'perfectionist') || (dp && HW.has(dp, 'perfectionist'));
    if (perfectionist) { overrun += rng.range(0.1, 0.3); direction += 3; tech += 3; }
    f.overrun = Math.round(overrun * 100) / 100;
    var friction = f.cast.some(function (c) { return HW.has(w.people[c.p], 'diva'); }) || HW.has(dir, 'diva') ? rng.normal(-2, 3) : 0;
    var chemistry = rng.normal(0, 3) + friction;

    var quality = script * 0.3 + direction * 0.28 + acting * 0.27 + tech * 0.08 + music * 0.07 + chemistry;
    var auteur = HW.has(dir, 'auteur');
    var ref = w.ref || (w.ref = { q: 62, ent: 52 });
    var critic = 52 + (quality - ref.q) * 1.8 + G.critic + (auteur ? 4 : 0) + (HW.has(dir, 'darling') ? 3 : 0) + rng.normal(0, 6);
    var ent = script * 0.24 + direction * 0.2 + starAppeal * 0.24 + acting * 0.14 + spectacle * 0.14 +
      (HW.has(dir, 'hitmaker') || (wr && HW.has(wr, 'hitmaker')) ? 4 : 0) + (dir.stats.commercial - 50) * 0.08 +
      (cm && HW.has(cm, 'hummable') ? 2 : 0) + (auteur ? -3 : 0);
    f._ent = ent;
    var audience = 56 + (ent - ref.ent) * 1.6 + (critic - 55) * 0.1 + rng.normal(0, 6);

    f.critic = Math.round(clamp(critic, 2, 99));
    f.audience = Math.round(clamp(audience, 5, 99));
    f.sc = {
      q: Math.round(quality), script: Math.round(script), dir: Math.round(direction), act: Math.round(acting),
      tech: Math.round(tech), music: Math.round(music), fx: Math.round(spectacle)
    };
  }

  function makeTitle(w, rng, f) {
    if (f.seqOf != null) {
      var root = w.films[f.root];
      var base = root.title;
      return rng.chance(0.65) ? base + ' ' + f.seqNum : base + ': ' + rng.pick(['Part ' + roman(f.seqNum), 'Reckoning', 'Resurrection', 'Legacy', 'The Return', 'Rise', 'Endgame', 'Revenge', 'Origins', 'Homecoming']);
    }
    var T = HW.TITLE, used = w.usedTitles;
    for (var i = 0; i < 20; i++) {
      var pat = rng.pick(T.patterns[f.genre]);
      var title = pat.replace('{adj}', rng.pick(T.adj)).replace('{noun}', rng.pick(T.noun)).replace('{place}', rng.pick(T.place))
        .replace('{first2}', rng.pick(rng.chance(0.5) ? HW.NAMES.male : HW.NAMES.female))
        .replace('{first}', rng.pick(rng.chance(0.5) ? HW.NAMES.male : HW.NAMES.female)).replace('{last}', rng.pick(HW.NAMES.last))
        .replace('{verbed}', rng.pick(T.verbed)).replace('{num}', String(rng.int(1, 9) * 100 + rng.int(0, 99)));
      if (!used[title]) { used[title] = f.year; return title; }
      if (i > 12 && used[title] < f.year - 15) { used[title] = f.year; return title; } // a remake
    }
    var t2 = rng.pick(T.adj) + ' ' + rng.pick(T.noun) + ' ' + rng.pick(T.place);
    used[t2] = f.year;
    return t2;
  }
  function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n); }

  // ---------- careers ----------
  function gainFame(p, d) {
    if (d > 0) d *= Math.pow(1 - p.fame / 106, 1.3);
    p.fame = clamp(p.fame + d, 0, 100);
  }
  function gainPrestige(p, d) {
    if (d > 0) d *= Math.pow(1 - p.prestige / 106, 1.3) * (HW.has(p, 'darling') ? 1.4 : 1);
    p.prestige = clamp(p.prestige + d, 0, 100);
  }
  HW.gainFame = gainFame;
  HW.gainPrestige = gainPrestige;

  function careerUpdates(w, ctx) {
    var Y = ctx.year, rng = ctx.rng;
    ctx.worked = {};
    ctx.films.forEach(function (f) {
      var boxo = clamp(Math.log2(f.gross / 60 + 0.25) * 3, -6, 13);
      var aud = (f.audience - 60) / 12, crit = (f.critic - 60) / 7;
      f.cast.forEach(function (c) {
        var p = w.people[c.p], wgt = c.r === 'L' ? 1 : 0.5;
        credit(p, f, ctx);
        p.exp += c.r === 'L' ? 1.2 : 0.8;
        p.gross += f.gross;
        gainFame(p, wgt * (boxo + aud + (c.perf - 60) / 15) + (HW.has(p, 'heartthrob') && Y - p.born < 32 ? 2 : 0));
        gainPrestige(p, wgt * (crit * 0.6 + (c.perf - 60) / 8));
        if (!p.bestPerf || c.perf > p.bestPerf.v) p.bestPerf = { v: c.perf, f: f.id };
      });
      [['director', 1], ['writer', 0.5], ['dp', 0.3], ['composer', 0.3]].forEach(function (x) {
        var id = f[x[0]];
        if (id == null) return;
        var p = w.people[id];
        credit(p, f, ctx);
        p.exp += 1;
        if (x[0] === 'director') p.gross += f.gross;
        gainFame(p, x[1] * (boxo * 0.8 + aud));
        gainPrestige(p, x[1] * crit * 1.1);
      });
    });
  }
  function credit(p, f, ctx) {
    if (p.films[p.films.length - 1] !== f.id) p.films.push(f.id);
    p.lastWorked = ctx.year;
    ctx.worked[p.id] = 1;
  }

  // ---------- studios ----------
  function studioYearEnd(w, ctx) {
    var Y = ctx.year, rng = ctx.rng;
    var active = w.studios.filter(function (s) { return s.active; });
    active.forEach(function (s) {
      var t = TIER[s.tier];
      var mine = ctx.films.filter(function (f) { return f.studio === s.id; });
      s.cash -= t.overhead;
      if (s.cash < 0) s.cash *= 1.07; // interest on debt
      var payout = s.cash > t.reserve ? (s.cash - t.reserve) * 0.35 : 0; // parent company / shareholders take profits
      s.cash -= payout;
      s.cash = Math.round(s.cash * 10) / 10;
      var gross = 0, profit = 0, crit = 0, wins = 0, noms = 0;
      mine.forEach(function (f) { gross += f.gross; profit += f.profit; crit += f.critic; wins += f.wins; noms += f.noms; });
      var avgCrit = mine.length ? crit / mine.length : 50;
      s.prestige = Math.round(clamp(s.prestige * 0.75 + 0.25 * (avgCrit + wins * 4 + noms * 0.5), 0, 100));
      s.commercial = HW.round1(clamp(s.commercial + rng.normal(0, 0.03), 0.05, 0.95) * 100) / 100;
      s.paidOut = Math.round((s.paidOut || 0) + payout);
      s.yearly.push({ y: Y, n: mine.length, g: Math.round(gross), p: Math.round(profit), c: Math.round(s.cash), w: wins, nm: noms, tier: s.tier });

      // tier movement
      if (s.tier === 'Indie' && s.cash > 260 && s.prestige > 50 && tierCount(w, 'Mid') < 11) promote(w, s, 'Mid', Y);
      else if (s.tier === 'Mid' && s.cash > 950 && tierCount(w, 'Major') < 8) promote(w, s, 'Major', Y);
      else if (s.tier === 'Major' && s.cash < -250) demote(w, s, 'Mid', Y);
      else if (s.tier === 'Mid' && s.cash < -90) demote(w, s, 'Indie', Y);

      if (s.cash < TIER[s.tier].floor) s.debtYears++; else s.debtYears = 0;
      if (s.debtYears >= 2 || s.cash < TIER[s.tier].floor * 2) collapse(w, s, ctx);
    });

    var count = w.studios.filter(function (s) { return s.active; }).length;
    var newOnes = Math.max(0, 20 - count);
    if (count < 30 && rng.chance(0.15)) newOnes++;
    for (var i = 0; i < newOnes; i++) {
      var tier = rng.chance(0.2) ? 'Mid' : 'Indie';
      var s = HW.createStudio(w, rng, tier, { founded: Y + 1 });
      HW.addNews(w, Y, 'New player in town: ' + s.name + ' opens its doors as a' + (tier === 'Mid' ? ' mid-size' : 'n independent') + ' studio.', 'studio', { s: s.id });
    }
  }
  function tierCount(w, tier) {
    return w.studios.filter(function (s) { return s.active && s.tier === tier; }).length;
  }
  function promote(w, s, tier, Y) {
    s.tier = tier;
    HW.addNews(w, Y, s.name + ' rises to ' + (tier === 'Major' ? 'major-studio status' : 'mid-size studio') + ' after a run of hits.', 'studio', { s: s.id });
  }
  function demote(w, s, tier, Y) {
    s.tier = tier;
    HW.addNews(w, Y, 'Cutbacks at ' + s.name + ': the struggling studio downsizes to ' + (tier === 'Mid' ? 'a mid-size' : 'an independent') + ' operation.', 'studio', { s: s.id });
  }
  function collapse(w, s, ctx) {
    var rng = ctx.rng, Y = ctx.year;
    var buyers = w.studios.filter(function (o) { return o.active && o !== s && o.cash > 400; });
    s.active = false;
    s.closed = Y;
    if (buyers.length && rng.chance(0.65)) {
      var b = rng.weighted(buyers, function (o) { return o.cash; });
      b.cash = Math.round(b.cash - Math.max(20, -s.cash * 0.2));
      b.prestige = Math.round(clamp(b.prestige + (s.prestige - b.prestige) * 0.15, 0, 100));
      s.fate = { type: 'acquired', by: b.id, y: Y };
      HW.addNews(w, Y, b.name + ' acquires the bankrupt ' + s.name + ', absorbing its film library.', 'studio', { s: b.id });
    } else {
      s.fate = { type: 'closed', y: Y };
      HW.addNews(w, Y, 'End of an era: ' + s.name + ' (founded ' + s.founded + ') shuts down after crippling losses.', 'studio', { s: s.id });
    }
  }

  // ---------- people: decay, scandals, aging, retirement, newcomers ----------
  function peopleYearEnd(w, ctx) {
    var Y = ctx.year, rng = ctx.rng, N = Y + 1;
    var counts = {};
    HW.ROLE_KEYS.forEach(function (r) { counts[r] = 0; });

    w.people.forEach(function (p) {
      if (p.status === 'deceased') return;
      var age = N - p.born;
      if (p.status === 'active') {
        // fame/prestige drift
        if (!ctx.worked[p.id]) { p.fame = clamp(p.fame - 1.5 - p.fame * 0.06, 0, 100); p.prestige = clamp(p.prestige - 0.6, 0, 100); }
        else p.fame = clamp(p.fame - p.fame * 0.04, 0, 100);
        p.prestige = clamp(p.prestige - Math.max(0, p.prestige - 60) * 0.05, 0, 100);
        if (HW.has(p, 'heartthrob') && age > 40) p.fame = clamp(p.fame - 2, 0, 100);

        // scandals
        if ((p.role === 'actor' || p.role === 'director') && p.fame > 30) {
          var sp = HW.has(p, 'scandal') ? 0.08 : 0.005;
          if (rng.chance(sp)) {
            var what = rng.pick(['a messy public feud', 'a tabloid exposé', 'an on-set meltdown', 'a DUI arrest', 'a leaked recording', 'a bitter divorce', 'a contract walkout']);
            if (rng.chance(0.2)) { HW.gainFame(p, rng.range(3, 8)); HW.addNews(w, Y, p.name + ' rides out ' + what + ' — any publicity is good publicity.', 'scandal', { p: p.id }); }
            else { p.fame = clamp(p.fame - rng.range(5, 18), 0, 100); p.prestige = clamp(p.prestige - rng.range(2, 8), 0, 100); HW.addNews(w, Y, 'Scandal: ' + p.name + ' embroiled in ' + what + '.', 'scandal', { p: p.id }); }
            p.scandalYear = Y;
          }
        }
        p.fame = Math.round(p.fame * 10) / 10;
        p.prestige = Math.round(p.prestige * 10) / 10;

        // retirement
        var idle = p.lastWorked == null ? N - p.debut : N - p.lastWorked;
        var retireAge = p.role === 'actor' ? 62 : 68;
        var rp = age < retireAge ? 0.004 : 0.03 + (age - retireAge) * 0.018;
        if (idle >= 5 && age > 28 && p.fame < 20) rp += 0.25;
        if (rng.chance(rp)) {
          p.status = 'retired';
          p.retired = Y;
          if (p.fame > 45 || p.wins > 0) HW.addNews(w, Y, p.name + ' (' + age + ') announces retirement after ' + p.films.length + ' films' + (p.wins ? ' and ' + p.wins + ' Golden Laurel' + (p.wins > 1 ? 's' : '') : '') + '.', 'people', { p: p.id });
        }
      }
      // mortality
      var dp = age < 60 ? 0.0007 : age < 75 ? 0.006 + (age - 60) * 0.002 : 0.04 + (age - 75) * 0.013;
      if (rng.chance(dp)) {
        var wasActive = p.status === 'active';
        p.status = 'deceased';
        p.died = Y;
        if (p.fame > 35 || p.wins > 0 || p.prestige > 60) HW.addNews(w, Y, 'Hollywood mourns ' + p.name + ', ' + (HW.ROLES[p.role].label.toLowerCase()) + ', dead at ' + (Y - p.born) + (wasActive ? '' : '') + '.', 'people', { p: p.id });
        return;
      }
      if (p.status === 'active') {
        HW.updateStats(p, N);
        counts[p.role]++;
      }
    });

    // newcomers keep the talent pool alive
    var savedYear = w.year;
    w.year = N;
    HW.ROLE_KEYS.forEach(function (role) {
      var target = HW.ROLES[role].target;
      var need = Math.max(0, target - counts[role]) + rng.int(0, Math.ceil(target * 0.006));
      for (var i = 0; i < need; i++) HW.createPerson(w, rng, role, {});
    });
    w.year = savedYear;
    // spotlight a hot newcomer now and then
    var fresh = w.people.filter(function (p) { return p.debut === N && p.role === 'actor'; });
    if (fresh.length) {
      var best = fresh.reduce(function (a, b) { return HW.potentialStars(b) * 100 + b.genes.acting > HW.potentialStars(a) * 100 + a.genes.acting ? b : a; });
      if (HW.potentialStars(best) >= 4) HW.addNews(w, Y, 'Scouts are buzzing about newcomer ' + best.name + ', ' + (N - best.born) + ', tipped as a future star.', 'people', { p: best.id });
    }
  }

  // ---------- history ----------
  function recordHistory(w, ctx) {
    var Y = ctx.year, gs = {};
    HW.GENRE_KEYS.forEach(function (g) { gs[g] = { films: 0, gross: 0, budget: 0 }; });
    var total = 0, crit = 0, top = null;
    ctx.films.forEach(function (f) {
      var s = gs[f.genre]; s.films++; s.gross += f.gross; s.budget += f.budget;
      total += f.gross; crit += f.critic;
      if (!top || f.gross > top.gross) top = f;
    });
    w.genreStats = gs;
    var aw = w.awards[Y];
    var bp = aw ? aw.cats[0] : null;
    w.history.push({
      y: Y, n: ctx.films.length, g: Math.round(total), c: ctx.films.length ? Math.round(crit / ctx.films.length) : 0,
      top: top ? top.id : null, bp: bp && bp.noms.length ? bp.noms[bp.win].f : null,
      ev: ctx.event ? ctx.event.text : null,
      studios: w.studios.filter(function (s) { return s.active; }).length,
      trends: JSON.parse(JSON.stringify(w.trends))
    });
  }

  HW.money = function (m) {
    var neg = m < 0; m = Math.abs(m);
    var s = m >= 1000 ? '$' + (m / 1000).toFixed(2) + 'B' : m >= 10 ? '$' + Math.round(m) + 'M' : '$' + m.toFixed(1) + 'M';
    return neg ? '-' + s : s;
  };
})(globalThis.HW = globalThis.HW || {});
