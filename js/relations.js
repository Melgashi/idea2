// Relationships: director–actor partnerships, star duos, feuds and rivalries.
// w.rel maps "lowId-highId" to { a, b, t, since, n, end }. Ended relationships stay for history.
// w.pairs tracks raw collaboration history: key -> [films, criticSum, audienceSum, lastYear].
(function (HW) {
  HW.REL_TYPES = {
    partner: { label: 'Creative partner', desc: 'A director and actor who keep making good films together.' },
    duo:     { label: 'Screen duo', desc: 'Co-stars audiences love to see together.' },
    feud:    { label: 'Feud', desc: 'Refuse to work together.' },
    rival:   { label: 'Rival', desc: 'Competing for the same roles, the same awards and the same headlines.' }
  };

  function key(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
  HW.relKey = key;

  // The active relationship between two people, or null.
  HW.relOf = function (w, a, b) {
    var r = w.rel && w.rel[key(a, b)];
    return r && r.end == null ? r : null;
  };

  HW.relsOf = function (w, pid) {
    var out = [];
    for (var k in (w.rel || {})) {
      var r = w.rel[k];
      if (r.a === pid || r.b === pid) out.push({ r: r, other: r.a === pid ? r.b : r.a });
    }
    return out;
  };

  function start(w, a, b, t, Y, n) {
    var k = key(a, b);
    w.rel[k] = { a: Math.min(a, b), b: Math.max(a, b), t: t, since: Y, n: n || 0, end: null };
    return w.rel[k];
  }

  function leadsOf(f) { return f.cast.filter(function (c) { return c.r === 'L'; }).map(function (c) { return c.p; }); }

  // Yearly pass, after films are released and the Laurels handed out.
  HW.relationsYear = function (w, ctx) {
    var Y = ctx.year, rng = ctx.rng;
    w.rel = w.rel || {};
    w.pairs = w.pairs || {};
    var P = w.people;
    var feuds = 0;

    ctx.films.forEach(function (f) {
      var leads = leadsOf(f);
      var pairs = leads.map(function (l) { return [f.director, l, 'dir']; });
      if (leads.length >= 2) pairs.push([leads[0], leads[1], 'co']);
      pairs.forEach(function (pr) {
        var k = key(pr[0], pr[1]);
        var h = w.pairs[k] || (w.pairs[k] = [0, 0, 0, 0]);
        h[0]++; h[1] += f.critic; h[2] += f.audience; h[3] = Y;
        var r = w.rel[k];
        if (r && r.end == null && (r.t === 'partner' || r.t === 'duo')) r.n = h[0];
        // a third good outing together forms a partnership / duo
        if (h[0] >= 3 && (!r || r.end != null) && !(r && r.t === 'feud' && r.end == null)) {
          var crit = h[1] / h[0], aud = h[2] / h[0];
          if (pr[2] === 'dir' && (crit >= 58 || aud >= 62)) {
            start(w, pr[0], pr[1], 'partner', Y, h[0]);
            HW.addNews(w, Y, 'Dream team: director ' + P[pr[0]].name + ' and ' + P[pr[1]].name + ' reunite for "' + f.title + '", their ' + HW.ordinal(h[0]) + ' film together.', 'rel', { p: pr[1], p2: pr[0] });
          } else if (pr[2] === 'co' && aud >= 60) {
            start(w, pr[0], pr[1], 'duo', Y, h[0]);
            HW.addNews(w, Y, P[pr[0]].name + ' and ' + P[pr[1]].name + ' are Hollywood\'s favorite screen pairing after "' + f.title + '".', 'rel', { p: pr[0], p2: pr[1] });
          }
        }
      });

      // troubled sets breed feuds
      if (feuds >= 3) return;
      var crew = [f.director].concat(leads);
      var hot = crew.filter(function (id) { return HW.has(P[id], 'diva') || HW.has(P[id], 'scandal'); });
      var chance = 0.015 + hot.length * 0.09 + (f.tags.indexOf('flop') >= 0 || f.critic < 35 ? 0.06 : 0) + (f.overrun > 0.25 ? 0.05 : 0);
      if (crew.length < 2 || !rng.chance(chance)) return;
      var a = hot.length ? rng.pick(hot) : rng.pick(crew);
      var others = crew.filter(function (id) { return id !== a; });
      var b = rng.pick(others);
      var ex = w.rel[key(a, b)];
      if (ex && ex.end == null && ex.t === 'feud') return;
      var broke = ex && ex.end == null && (ex.t === 'partner' || ex.t === 'duo');
      if (ex && ex.end == null) ex.end = Y;
      start(w, a, b, 'feud', Y);
      feuds++;
      var cause = f.overrun > 0.25 ? 'budget blowouts' : f.tags.indexOf('flop') >= 0 ? 'the blame game over its failure' : rng.pick(['creative differences', 'billing', 'a shouting match on set', 'rewrites', 'who gets top billing', 'an explosive table read']);
      HW.addNews(w, Y, (broke ? 'Partnership over: ' : 'Feud: ') + P[a].name + ' and ' + P[b].name + ' fall out on "' + f.title + '" over ' + cause + '.', 'rel', { p: a, p2: b });
    });

    // rivalries: stars who keep meeting at the Laurels
    var aw = w.awards[Y], born = 0;
    var hasRival = function (id) { return (HW.relsOf(w, id)).some(function (x) { return x.r.t === 'rival' && x.r.end == null; }); };
    if (aw) aw.cats.forEach(function (c) {
      if (['actor', 'actress', 'supActor', 'supActress', 'director'].indexOf(c.k) < 0) return;
      var ids = c.noms.map(function (n) { return n.p; });
      var winner = c.noms[c.win].p;
      for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) {
        var x = P[ids[i]], y = P[ids[j]], r = w.rel[key(x.id, y.id)];
        if (r && r.end == null && r.t === 'rival') {
          r.n++;
          if (winner === x.id || winner === y.id) {
            var wn = winner === x.id ? x : y, ls = winner === x.id ? y : x;
            HW.gainFame(wn, 2);
            HW.addNews(w, Y, wn.name + ' edges out rival ' + ls.name + ' for ' + HW.catName(c.k) + '.', 'rel', { p: wn.id, p2: ls.id });
          }
          continue;
        }
        if (r && r.end == null) continue;
        // at most two new rivalries a year, one rival per star at a time
        if (born < 2 && x.fame >= 50 && y.fame >= 50 && Math.abs(x.born - y.born) <= 10 && rng.chance(0.2) && !hasRival(x.id) && !hasRival(y.id)) {
          born++;
          start(w, x.id, y.id, 'rival', Y, 1);
          HW.addNews(w, Y, 'A rivalry is born: ' + x.name + ' and ' + y.name + ' go head to head for ' + HW.catName(c.k) + '.', 'rel', { p: x.id, p2: y.id });
        }
      }
    });

    // relationships fade, reconcile or end
    for (var k in w.rel) {
      var r = w.rel[k];
      if (r.end != null) continue;
      var A = P[r.a], B = P[r.b];
      if (A.status === 'deceased' || B.status === 'deceased' || (A.status !== 'active' && B.status !== 'active')) { r.end = Y; continue; }
      var h = w.pairs[k];
      if (r.t === 'feud' && Y > r.since && rng.chance(0.07)) {
        r.end = Y;
        HW.addNews(w, Y, P[r.a].name + ' and ' + P[r.b].name + ' bury the hatchet after ' + (Y - r.since) + ' years of feuding.', 'rel', { p: r.a, p2: r.b });
      } else if ((r.t === 'partner' || r.t === 'duo') && h && Y - h[3] >= 10) r.end = Y;
      else if (r.t === 'rival') {
        HW.gainFame(A, 0.5); HW.gainFame(B, 0.5); // the press loves a rivalry
        if (Y - r.since >= 15 || A.status !== 'active' || B.status !== 'active') r.end = Y;
      }
    }

    // forget one-off collaborations that went nowhere
    if (Y % 5 === 0) for (var pk in w.pairs) if (w.pairs[pk][0] === 1 && Y - w.pairs[pk][3] > 8) delete w.pairs[pk];
  };
})(globalThis.HW = globalThis.HW || {});
