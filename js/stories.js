// Career stories: yearly fame history, career-arc classification, generated bios, and story headlines.
(function (HW) {
  var clamp = HW.clamp;

  // Called once per year for every active person (after fame/prestige drift).
  HW.recordCareer = function (p, Y) {
    if (!p.hf) { p.h0 = Y; p.hf = []; p.hp = []; }
    p.hf.push(Math.round(p.fame));
    p.hp.push(Math.round(p.prestige));
  };

  function mark(p, Y, k, f) { (p.marks = p.marks || []).push([Y, k, f == null ? null : f]); }

  function bestFilmOfYear(w, p, Y) {
    var best = null;
    for (var i = p.films.length - 1; i >= 0; i--) {
      var f = w.films[p.films[i]];
      if (f.year !== Y) { if (f.year < Y) break; continue; }
      if (!best || f.gross > best.gross) best = f;
    }
    return best;
  }

  // Spot breakouts, comebacks and falls as they happen; feed the news and the person's milestones.
  HW.detectStories = function (w, ctx) {
    var Y = ctx.year, found = [];
    w.people.forEach(function (p) {
      if (p.status !== 'active' || !p.hf || p.hf.length < 2 || (p.role !== 'actor' && p.role !== 'director')) return;
      var f = p.hf, n = f.length, cur = f[n - 1], prev = f[n - 2], age = Y - p.born;
      var prior = f.slice(0, n - 1), peakPrior = Math.max.apply(null, prior);
      var film = bestFilmOfYear(w, p, Y);
      var already = function (k) { return (p.marks || []).some(function (m) { return m[1] === k && Y - m[0] < 6; }); };
      var recent = f.slice(Math.max(0, n - 4), n - 1);           // the three years before this one
      var recentMax = Math.max.apply(null, recent);
      // breakout: first time crossing into real fame while young
      if (cur >= 35 && peakPrior < 30 && age < 36 && film && !already('breakout')) {
        found.push({ p: p, k: 'breakout', s: cur - prev + 10, f: film,
          t: 'Breakout: ' + p.name + ' (' + age + ') becomes the name on everyone\'s lips after "' + film.title + '".' });
        return;
      }
      // comeback: a former star who fell far, now climbing back fast
      if (peakPrior >= 45 && n >= 7 && film && !already('comeback')) {
        var peakIdx = prior.indexOf(peakPrior);
        var low = Math.min.apply(null, f.slice(peakIdx, n - 1));
        var lowIdx = f.lastIndexOf(low, n - 2);
        if (low <= peakPrior - 20 && cur >= low + 12 && cur >= Math.min.apply(null, recent) + 6 && n - 1 - lowIdx <= 5) {
          found.push({ p: p, k: 'comeback', s: cur - low + 15, f: film,
            t: 'Comeback of the year: ' + p.name + ' is back on top with "' + film.title + '", years after fading from view.' });
          return;
        }
      }
      if (recentMax >= 55 && cur <= recentMax - 20 && !already('fall')) {
        var why = p.scandalYear === Y ? 'a scandal' : film && film.tags.indexOf('flop') >= 0 ? 'the flop "' + film.title + '"' :
          !film ? 'a year without work' : age >= 45 ? 'shrinking offers' : 'a run of disappointments';
        found.push({ p: p, k: 'fall', s: prev - cur, f: film,
          t: 'Falling star: ' + p.name + '\'s fame slides after ' + why + '.' });
      }
      if (cur >= 80 && peakPrior < 80) found.push({ p: p, k: 'summit', s: cur - 70, f: film, t: p.name + ' joins Hollywood\'s A-list.' });
    });
    found.sort(function (a, b) { return b.s - a.s; });
    // keep the best few, and at most two A-list announcements
    var kept = [], summits = 0;
    found.forEach(function (x) { if (kept.length < 6 && (x.k !== 'summit' || summits++ < 1)) kept.push(x); });
    kept.forEach(function (x) {
      mark(x.p, Y, x.k, x.f ? x.f.id : null);
      HW.addNews(w, Y, x.t, 'story', { p: x.p.id });
    });
    (w.stories = w.stories || {})[Y] = kept.map(function (x) { return { p: x.p.id, k: x.k, f: x.f ? x.f.id : null }; });
  };

  // ---------- arcs ----------
  HW.ARCS = {
    legend:    { label: 'Legend',          desc: 'A towering career: sustained stardom and the trophies to prove it.' },
    riseRise:  { label: 'Rise and Rise',   desc: 'Climbed steadily and is still at or near the top.' },
    riseFall:  { label: 'Rise and Fall',   desc: 'Rose to stardom, then lost it.' },
    fallFall:  { label: 'Fall and Fall',   desc: 'Started out famous and never stopped sliding.' },
    comeback:  { label: 'Comeback',        desc: 'Fell from the top, then fought their way back.' },
    oneHit:    { label: 'One-Hit Wonder',  desc: 'One moment in the spotlight, then gone.' },
    bloomer:   { label: 'Late Bloomer',    desc: 'Found fame later than almost anyone.' },
    flameOut:  { label: 'Flame-Out',       desc: 'Burned bright and left the business young.' },
    workhorse: { label: 'Steady Workhorse',desc: 'Never a superstar, always working.' },
    rising:    { label: 'Rising Star',     desc: 'On the way up.' },
    neverMade: { label: 'Never Made It',   desc: 'Chased the dream, never caught it.' },
    steady:    { label: 'Holding Steady',  desc: 'No dramatic swings, yet.' },
    newFace:   { label: 'New Face',        desc: 'Too early to tell.' }
  };

  HW.careerArc = function (p) {
    var f = p.hf || [], n = f.length;
    var A = function (k) { return { k: k, label: HW.ARCS[k].label, desc: HW.ARCS[k].desc }; };
    if (n < 4) return A('newFace');
    var peak = 0, peakIdx = 0, i;
    for (i = 0; i < n; i++) if (f[i] > peak) { peak = f[i]; peakIdx = i; }
    var cur = f[n - 1], start = f[0];
    var early = (f[0] + f[1] + f[2]) / 3;
    var minAfter = peak, minIdx = peakIdx;
    for (i = peakIdx; i < n; i++) if (f[i] < minAfter) { minAfter = f[i]; minIdx = i; }
    var recovered = 0;
    for (i = minIdx; i < n; i++) recovered = Math.max(recovered, f[i]);
    var near = 0, high = 0;
    for (i = 0; i < n; i++) { if (f[i] >= peak - 10) near++; if (f[i] >= 70) high++; }
    var ageAtPeak = p.h0 + peakIdx - p.born, age = (p.died || p.retired || (p.h0 + n)) - p.born;

    if (p.wins >= 3 || (peak >= 80 && high >= 12)) return A('legend');
    if ((p.marks || []).some(function (m) { return m[1] === 'comeback'; }) && cur >= minAfter + 10) return A('comeback');
    if (peak >= 45 && minAfter <= peak - 25 && recovered >= minAfter + 18 && recovered >= peak - 25) return A('comeback');
    if (start >= 45 && peakIdx <= 2 && cur <= start - 30) return A('fallFall');
    if (peak >= 40 && near <= 2 && cur <= peak - 30 && n >= 6 && start <= peak - 20) return A('oneHit');
    // late bloomer: tracked from early in their career, obscure at first, famous only in middle age
    if (peak >= 50 && early < 20 && p.h0 - p.born < 35 && ageAtPeak >= (p.role === 'actor' ? 45 : 55)) return A('bloomer');
    if (peak >= 50 && cur >= peak - 12 && start <= peak - 25) return A('riseRise');
    if (peak >= 45 && start <= peak - 20 && cur <= peak - 30) {
      if (p.status !== 'active' && age < 40) return A('flameOut');
      return A('riseFall');
    }
    if (p.films.length >= 20 && peak < 50) return A('workhorse');
    if (p.status === 'active' && age < 32 && cur >= early + 15) return A('rising');
    if (peak < 20 && n >= 8) return A('neverMade');
    return A('steady');
  };

  // Which of the actor genre skills (or film genres, for crew) dominates a filmography.
  HW.typecast = function (w, p) {
    if (p.films.length < 10) return null;
    var count = {};
    p.films.forEach(function (id) {
      var g = w.films[id].genre;
      var key = p.role === 'actor' ? Object.keys(HW.GENRES[g].apt).reduce(function (a, b) { return HW.GENRES[g].apt[b] > HW.GENRES[g].apt[a] ? b : a; }) : g;
      count[key] = (count[key] || 0) + 1;
    });
    var top = Object.keys(count).reduce(function (a, b) { return count[b] > count[a] ? b : a; });
    var share = count[top] / p.films.length;
    return share >= 0.6 ? { genre: HW.STAT_LABELS[top] || top, share: share } : null;
  };

  // ---------- bio ----------
  // Returns sentences; [[f:ID]] marks a film link, the UI renders it.
  HW.careerBio = function (w, p) {
    var he = p.gender === 'M' ? 'he' : 'she', He = p.gender === 'M' ? 'He' : 'She', his = p.gender === 'M' ? 'his' : 'her';
    var actor = p.role === 'actor', verb = actor ? 'starred in' : p.role === 'director' ? 'directed' : 'worked on';
    var films = p.films.map(function (id) { return w.films[id]; });
    var F = function (f) { return '[[f:' + f.id + ']] (' + f.year + ')'; };
    var out = [], first = films[0];
    var leadOf = function (f) { if (!actor) return f.director === p.id; return f.cast.some(function (c) { return c.p === p.id && c.r === 'L'; }); };
    var perfOf = function (f) { for (var i = 0; i < f.cast.length; i++) if (f.cast[i].p === p.id) return f.cast[i].perf; return 0; };

    if (p.debut < w.startYear) out.push(p.name + ' was already a working ' + HW.ROLES[p.role].label.toLowerCase() + ' when our records begin in ' + w.startYear + '.');
    else if (first) out.push(p.name + ' arrived in Hollywood in ' + p.debut + ' and first ' + verb + ' ' + F(first) + '.');
    else out.push(p.name + ' arrived in Hollywood in ' + p.debut + '.');
    if (!films.length) { out.push(He + ' is still waiting for a first big break.'); return out; }

    var marks = p.marks || [];
    var bo = marks.filter(function (m) { return m[1] === 'breakout'; })[0];
    if (bo && bo[2] != null) out.push(He + ' broke out in ' + bo[0] + ' with ' + F(w.films[bo[2]]) + '.');
    else {
      var big = films.filter(function (f) { return leadOf(f) && (f.gross >= 300 || (actor && perfOf(f) >= 82)); })[0];
      var alreadyFamous = p.hf && p.hf[0] >= 40 && p.debut < w.startYear;
      if (big && big !== first && !alreadyFamous) out.push('The big break came with ' + F(big) + '.');
    }

    var f = p.hf || [];
    if (f.length) {
      var peak = Math.max.apply(null, f), peakY = p.h0 + f.indexOf(peak);
      var around = films.filter(function (x) { return Math.abs(x.year - peakY) <= 3; });
      var gc = {};
      around.forEach(function (x) { gc[x.genre] = (gc[x.genre] || 0) + 1; });
      var g = Object.keys(gc).sort(function (a, b) { return gc[b] - gc[a]; })[0];
      if (peak >= 75) out.push('Around ' + peakY + ' ' + he + ' was one of the biggest names in the business' + (g ? ', above all in ' + g.toLowerCase() + ' pictures' : '') + '.');
      else if (peak >= 45) out.push(He + ' peaked around ' + peakY + ' as a familiar face' + (g ? ' in ' + g.toLowerCase() + ' films' : '') + '.');
      else if (films.length >= 10) out.push(He + ' never became a star, but kept working.');
    }

    var hit = films.reduce(function (a, b) { return b.gross > a.gross ? b : a; });
    if (hit.gross >= 100) out.push(His(his) + ' biggest hit, ' + F(hit) + ', took ' + HW.money(hit.gross) + ' worldwide.');
    if (actor && p.bestPerf && p.bestPerf.v >= 80 && p.bestPerf.f !== hit.id) out.push('Critics single out ' + F(w.films[p.bestPerf.f]) + ' as ' + his + ' finest work.');

    (p.scandals || []).slice(0, 2).forEach(function (y) {
      var i = y - p.h0, drop = f[i - 1] != null && f[i] != null ? f[i - 1] - f[i] : 0;
      out.push(drop >= 8 ? 'A ' + y + ' scandal badly dented ' + his + ' standing.' : He + ' weathered a scandal in ' + y + '.');
    });
    marks.filter(function (m) { return m[1] === 'fall'; }).slice(0, 1).forEach(function (m) { out.push('The tide turned in ' + m[0] + ', when ' + his + ' fame began to slide.'); });
    marks.filter(function (m) { return m[1] === 'comeback'; }).forEach(function (m) {
      out.push('After years in the wilderness, ' + he + ' staged a comeback in ' + m[0] + (m[2] != null ? ' with ' + F(w.films[m[2]]) : '') + '.');
    });

    var aw = HW.personAwards(w, p.id).slice().reverse();
    var wins = aw.filter(function (a) { return a.won; });
    if (wins.length) {
      out.push(He + ' won ' + (wins.length === 1 ? 'a Golden Laurel' : wins.length + ' Golden Laurels') + (wins.length === 1 ? ', ' + HW.catName(wins[0].k) + ' for ' + F(w.films[wins[0].f]) : ', the first in ' + wins[0].y + ' for ' + F(w.films[wins[0].f])) +
        (aw.indexOf(wins[0]) >= 3 ? ', after ' + aw.indexOf(wins[0]) + ' nominations without a win' : '') + '.');
    } else if (aw.length >= 3) out.push(He + ' has been nominated for ' + aw.length + ' Golden Laurels without ever winning.');
    if (p.lifetime) out.push('The Academy honored ' + his + ' career with a Lifetime Achievement Laurel in ' + p.lifetime + '.');

    if (HW.relsOf) {
      var rels = HW.relsOf(w, p.id), P = w.people;
      var best = rels.filter(function (x) { return x.r.t === 'partner' || x.r.t === 'duo'; }).sort(function (a, b) { return b.r.n - a.r.n; })[0];
      if (best) {
        var o = P[best.other];
        out.push(best.r.t === 'partner'
          ? (o.role === 'director' ? 'Director ' + o.name + ' became ' + his + ' great creative partner' : He + ' became the favorite actor of ' + o.name) + ' (' + best.r.n + ' films together).'
          : He + ' and ' + o.name + ' became one of the screen\'s great pairings (' + best.r.n + ' films together).');
      }
      rels.filter(function (x) { return x.r.t === 'feud'; }).slice(0, 1).forEach(function (x) {
        out.push('A bitter feud with ' + P[x.other].name + ' began in ' + x.r.since + (x.r.end != null ? ' and lasted until ' + x.r.end : ' and has never healed') + '.');
      });
      rels.filter(function (x) { return x.r.t === 'rival'; }).slice(0, 1).forEach(function (x) {
        out.push('The press made much of ' + his + ' rivalry with ' + P[x.other].name + '.');
      });
    }
    var tc = HW.typecast(w, p);
    if (tc) out.push(Math.round(tc.share * 100) + '% of ' + his + ' films were ' + tc.genre.toLowerCase() + (actor ? ' roles' : '') + '. Hollywood rarely let ' + (p.gender === 'M' ? 'him' : 'her') + ' play anything else.');

    var last = films[films.length - 1];
    if (p.status === 'deceased') out.push(He + ' died in ' + p.died + ' at ' + (p.died - p.born) + ', after ' + films.length + ' films.');
    else if (p.status === 'retired') out.push(He + ' retired in ' + p.retired + ' after ' + films.length + ' films' + (p.retired - p.born < 40 ? ', aged just ' + (p.retired - p.born) : '') + '.');
    else if (w.year - 1 - last.year >= 4) out.push(He + ' hasn\'t worked since ' + last.year + '.');
    else out.push('At ' + (w.year - p.born) + ', ' + he + ' is still working.');
    return out;
  };
  function His(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // ---------- box office post-mortem ----------
  // Explains a film's result from the factors stored at release (f.why).
  // Each reason: { good, impact (log of its effect), phrase (for summaries), text (full sentence) }.
  HW.postMortem = function (w, f) {
    var y = f.why, G = HW.GENRES[f.genre], g = f.genre.toLowerCase();
    var verdict = f.tags.indexOf('flop') >= 0 ? (f.profit < -100 ? 'Box office disaster' : 'Flop') : null;
    var ratio = y ? f.gross / y.be : 0;
    if (!verdict) verdict = ratio >= 3 ? 'Smash hit' : ratio >= 1.6 ? 'Hit' : ratio >= 1.1 ? 'Solid earner' : ratio >= 0.9 ? 'Broke even' : ratio >= 0.45 ? 'Disappointment' : 'Flop';
    var good = ratio >= 1.1 && f.tags.indexOf('flop') < 0;
    var out = { verdict: verdict, good: good, ratio: ratio, reasons: [], breakEven: y ? y.be : null };
    if (!y) return out;
    var R = function (mult, pos, neg, posPhrase, negPhrase) {
      var imp = Math.log(mult);
      if (Math.abs(imp) < 0.1) return;
      out.reasons.push(imp > 0 ? { good: true, impact: imp, text: pos, phrase: posPhrase } : { good: false, impact: imp, text: neg, phrase: negPhrase });
    };
    var monthName = HW.MONTHS[f.month];
    var ev = (w.history.filter(function (h) { return h.y === f.year; })[0] || {}).ev;
    R(y.aud, 'Audiences loved it: an audience score of ' + f.audience + ', against ' + y.sa + ' for comparable films.',
      'Audiences didn\'t connect: an audience score of ' + f.audience + ', against ' + y.sa + ' for comparable films.', 'audience love', 'poor word of mouth');
    R(y.crit, 'Strong reviews (critics ' + f.critic + ') brought in extra viewers.', 'Bad reviews (critics ' + f.critic + ') kept people away.', 'rave reviews', 'bad reviews');
    R(y.tr, cap(g) + ' films were in demand that year (appetite ' + y.tr.toFixed(2) + '×).', cap(g) + ' films were out of fashion that year (appetite ' + y.tr.toFixed(2) + '×).',
      'the ' + g + ' boom', 'a tired genre');
    R(G.appeal, cap(g) + ' films reliably draw big crowds.', cap(g) + ' films have a smaller natural audience.', 'a crowd-pleasing genre', 'a niche genre');
    R(y.mo, 'It opened in ' + monthName + ', peak moviegoing season.', 'It opened in ' + monthName + ', one of the slowest months of the year.', 'a prime release date', 'a weak release date');
    if (y.rv >= 3) R(y.rvm, '', 'It opened against ' + y.rv + ' other releases of similar size in ' + monthName + '.', '', 'crowded competition');
    if (f.seqOf != null) R(y.sq, 'Fans of the earlier films turned out again.', 'Sequel fatigue: fewer fans came back this time.', 'returning fans', 'sequel fatigue');
    // the random part of box office reads, in practice, as buzz: marketing, timing in the culture, word on the street
    R(y.lk, 'Great buzz: the marketing landed and it played bigger than its quality alone suggested.',
      'The marketing never landed: it played smaller than its quality alone suggested.', 'great buzz', 'marketing that missed');
    if (ev) R(y.ev, 'The market was on its side that year (' + ev.toLowerCase() + ').', 'The whole industry suffered that year (' + ev.toLowerCase() + ').', 'a strong market', 'a weak market');
    if (y.sl > 1) R(y.sl, 'Word of mouth turned it into a sleeper hit.', '', 'word of mouth', '');
    // star power and costs aren't multipliers, so they get a fixed weight
    var lead = f.cast.filter(function (c) { return c.r === 'L'; }).map(function (c) { return w.people[c.p]; }).sort(function (a, b) { return b.fame - a.fame; })[0];
    if (y.st >= 0.3 && lead) out.reasons.push({ good: true, impact: 0.3 + y.st * 0.5, text: 'Star power: ' + lead.name + ' alone was worth a big share of the gross.', phrase: 'star power' });
    else if (y.st < 0.08 && f.budget >= 50) out.reasons.push({ good: false, impact: -0.25, text: 'No bankable stars to sell a ' + HW.money(f.budget) + ' production.', phrase: 'a lack of stars' });
    if (f.overrun >= 0.15) out.reasons.push({ good: false, impact: -f.overrun * 1.5, text: 'The production went ' + Math.round(f.overrun * 100) + '% over budget.', phrase: 'a blown budget' });
    if (y.cap) out.reasons.push({ good: false, impact: -0.05, text: 'Even blockbusters hit a ceiling: the market was close to saturated.', phrase: 'a saturated market' });
    out.reasons.sort(function (a, b) {
      // the reasons that match the outcome come first
      var am = a.good === good ? 1 : 0, bm = b.good === good ? 1 : 0;
      return bm - am || Math.abs(b.impact) - Math.abs(a.impact);
    });
    return out;
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
})(globalThis.HW = globalThis.HW || {});
