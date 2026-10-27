// The Golden Laurels: Hollywood's annual awards, honoring the films of each year.
(function (HW) {
  var clamp = HW.clamp;

  HW.AWARD_CATS = [
    { key: 'picture',    name: 'Best Picture',            type: 'film' },
    { key: 'director',   name: 'Best Director',           type: 'crew', field: 'director', sc: 'dir' },
    { key: 'actor',      name: 'Best Actor',              type: 'perf', g: 'M', r: 'L' },
    { key: 'actress',    name: 'Best Actress',            type: 'perf', g: 'F', r: 'L' },
    { key: 'supActor',   name: 'Best Supporting Actor',   type: 'perf', g: 'M', r: 'S' },
    { key: 'supActress', name: 'Best Supporting Actress', type: 'perf', g: 'F', r: 'S' },
    { key: 'screenplay', name: 'Best Screenplay',         type: 'crew', field: 'writer', sc: 'script' },
    { key: 'cinema',     name: 'Best Cinematography',     type: 'crew', field: 'dp', sc: 'tech' },
    { key: 'score',      name: 'Best Original Score',     type: 'crew', field: 'composer', sc: 'music' },
    { key: 'vfx',        name: 'Best Visual Effects',     type: 'fx' },
    { key: 'animated',   name: 'Best Animated Feature',   type: 'anim' }
  ];

  var MONTH_BONUS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 6];

  function academy(w, f, rng) {
    var G = HW.GENRES[f.genre], s = w.studios[f.studio];
    var v = f.critic * 0.75 + G.awards * 1.6 + s.prestige * 0.08 + Math.log(f.budget + 1) * 0.6 +
      MONTH_BONUS[f.month] + f.audience * 0.08 + rng.normal(0, 4);
    if (f.genre === 'Animation') v -= 8;
    if (f.seqOf != null) v -= 6;
    return v;
  }

  function narrative(w, p, Y) {
    var v = Math.min(5, p.noms - p.wins) * 1.4 - Math.min(8, p.wins) * 1.3; // voters like to spread the love
    if (Y - p.born > 60) v += 2;
    if (HW.has(p, 'campaigner')) v += 3;
    if (p.campaign === Y) v += 6; // career mode: the agency paid for a For Your Consideration push
    if (HW.has(p, 'darling')) v += 2;
    if (p.scandalYear != null && Y - p.scandalYear <= 1) v -= 6;
    return v + p.prestige * 0.05 + p.fame * 0.03;
  }

  function pickWinner(noms, rng) {
    var top = noms[0].s;
    var i = noms.indexOf(rng.weighted(noms, function (n) { return Math.exp((n.s - top) / 2.5); }));
    return i < 0 ? 0 : i;
  }

  HW.runAwards = function (w, ctx) {
    var Y = ctx.year, rng = ctx.rng, films = ctx.films;
    if (!films.length) return;
    var acad = {};
    films.forEach(function (f) { acad[f.id] = academy(w, f, rng); });
    var ceremony = { y: Y, cats: [], lifetime: null };

    HW.AWARD_CATS.forEach(function (cat) {
      var cands = [];
      if (cat.type === 'film') {
        films.forEach(function (f) { cands.push({ f: f.id, p: null, s: acad[f.id] }); });
      } else if (cat.type === 'anim') {
        var anim = films.filter(function (f) { return f.genre === 'Animation'; });
        if (anim.length < 3) return;
        anim.forEach(function (f) { cands.push({ f: f.id, p: null, s: f.critic * 0.8 + f.audience * 0.2 + rng.normal(0, 4) }); });
      } else if (cat.type === 'fx') {
        films.forEach(function (f) {
          if (HW.GENRES[f.genre].spectacle < 0.3) return;
          cands.push({ f: f.id, p: null, s: f.sc.fx * 0.7 + f.critic * 0.2 + Math.log(f.budget + 1) * 2 + rng.normal(0, 4) });
        });
      } else if (cat.type === 'crew') {
        var best = {};
        films.forEach(function (f) {
          var id = f[cat.field];
          if (id == null) return;
          var p = w.people[id];
          var s = f.sc[cat.sc] * 0.55 + acad[f.id] * 0.45 + narrative(w, p, Y) + rng.normal(0, 3);
          if (!best[id] || best[id].s < s) best[id] = { f: f.id, p: id, s: s };
        });
        for (var k in best) cands.push(best[k]);
      } else if (cat.type === 'perf') {
        var bestP = {};
        films.forEach(function (f) {
          f.cast.forEach(function (c) {
            var p = w.people[c.p];
            if (c.r !== cat.r || p.gender !== cat.g) return;
            var s = c.perf * 0.7 + acad[f.id] * 0.3 + narrative(w, p, Y) + (f.genre === 'Biopic' && c.r === 'L' ? 4 : 0) + rng.normal(0, 3);
            if (!bestP[p.id] || bestP[p.id].s < s) bestP[p.id] = { f: f.id, p: p.id, s: s };
          });
        });
        for (var k2 in bestP) cands.push(bestP[k2]);
      }
      if (!cands.length) return;
      cands.sort(function (a, b) { return b.s - a.s; });
      var noms = cands.slice(0, 5);
      var win = pickWinner(noms, rng);
      noms.forEach(function (n) { n.s = Math.round(n.s * 10) / 10; });
      ceremony.cats.push({ k: cat.key, noms: noms, win: win });

      noms.forEach(function (n, i) {
        var won = i === win;
        var f = w.films[n.f], s = w.studios[f.studio];
        f.noms++; s.noms++;
        if (won) { f.wins++; f.won.push(cat.key); s.wins++; if (cat.key === 'picture') s.bestPictures++; }
        if (n.p != null) {
          var p = w.people[n.p];
          p.noms++;
          HW.gainPrestige(p, won ? 10 : 3);
          HW.gainFame(p, won ? 8 : 2);
          if (won) p.wins++;
        }
        if (cat.key === 'picture' && n.p == null) {
          // a Best Picture nomination lifts the director & cast a bit
          var lift = won ? 3 : 1;
          HW.gainPrestige(w.people[f.director], lift);
          f.cast.forEach(function (c) { if (c.r === 'L') HW.gainPrestige(w.people[c.p], lift); });
        }
      });
    });

    // Lifetime achievement: a revered veteran, preferably one never honored
    var vets = w.people.filter(function (p) {
      return p.status !== 'deceased' && Y - p.born >= 65 && p.films.length >= 12 && !p.lifetime;
    });
    if (vets.length && rng.chance(0.75)) {
      vets.sort(function (a, b) { return (b.prestige + b.noms * 3 - b.wins * 4) - (a.prestige + a.noms * 3 - a.wins * 4); });
      var honoree = vets[0];
      if (honoree.prestige > 40) {
        honoree.lifetime = Y;
        ceremony.lifetime = honoree.id;
      }
    }

    w.awards[Y] = ceremony;
    headline(w, ceremony, Y);
  };

  function headline(w, c, Y) {
    var bp = c.cats[0];
    if (!bp) return;
    var f = w.films[bp.noms[bp.win].f];
    var bits = ['"' + f.title + '" wins Best Picture at the ' + ordinal(Y - w.startYear + 1) + ' Golden Laurels'];
    if (f.wins >= 5) bits.push('sweeping ' + f.wins + ' awards');
    HW.addNews(w, Y, bits.join(', ') + '.', 'awards', { f: f.id });
    ['actor', 'actress', 'director'].forEach(function (k) {
      var cat = c.cats.filter(function (x) { return x.k === k; })[0];
      if (!cat) return;
      var n = cat.noms[cat.win], p = w.people[n.p];
      var first = p.wins === 1 && p.noms >= 4 ? ' — finally, on nomination #' + p.noms : '';
      HW.addNews(w, Y, p.name + ' takes ' + HW.catName(k) + ' for "' + w.films[n.f].title + '"' + first + '.', 'awards', { p: p.id });
    });
    if (c.lifetime != null) {
      var h = w.people[c.lifetime];
      HW.addNews(w, Y, h.name + ' receives the Lifetime Achievement Laurel.', 'awards', { p: h.id });
    }
  }

  HW.catName = function (k) {
    for (var i = 0; i < HW.AWARD_CATS.length; i++) if (HW.AWARD_CATS[i].key === k) return HW.AWARD_CATS[i].name;
    return k;
  };

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  HW.ordinal = ordinal;

  // All nominations for a person, newest first.
  HW.personAwards = function (w, pid) {
    var out = [];
    Object.keys(w.awards).forEach(function (y) {
      w.awards[y].cats.forEach(function (c) {
        c.noms.forEach(function (n, i) { if (n.p === pid) out.push({ y: +y, k: c.k, f: n.f, won: i === c.win }); });
      });
    });
    return out.sort(function (a, b) { return b.y - a.y; });
  };

  HW.filmAwards = function (w, fid) {
    var f = w.films[fid], c = w.awards[f.year], out = [];
    if (!c) return out;
    c.cats.forEach(function (cat) {
      cat.noms.forEach(function (n, i) { if (n.f === fid) out.push({ k: cat.k, p: n.p, won: i === cat.win }); });
    });
    return out;
  };
})(globalThis.HW = globalThis.HW || {});
