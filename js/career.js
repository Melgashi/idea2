// Career mode: you run a talent agency inside your own world.
// Sign actors, pick which role offers they take, coach them, campaign for awards, keep them loyal.
// All state lives in w.career; the simulation only reads it through the hooks below.
(function (HW) {
  var clamp = HW.clamp;
  var C = HW.Career = {};

  var COMMISSION = 0.1;
  var RIVAL_AGENCIES = ['Apex Talent', 'Silverline Artists', 'Meridian Management', 'Crown & Quill', 'Northlight Talent', 'Marquee Partners', 'Bel Air Artists'];

  function money2(v) { return Math.round(v * 100) / 100; }
  function rngFor(w) { return new HW.RNG((w.career.seed = (w.career.seed * 1103515245 + 12345) >>> 0) || 1); }

  // ---------- setup ----------
  C.newCareer = function (opts) {
    var w = HW.newWorld({ startYear: opts.startYear, seed: opts.seed });
    w.mode = 'career';
    w.career = {
      agency: (opts.agency || '').trim() || 'Starmaker Agency',
      founded: w.year, cash: 1.5, rep: 10, seed: w.seed ^ 0x5bd1e995,
      clients: [], alumni: [], offers: {}, offersFor: w.year, accepted: {},
      log: [], history: [], milestones: {}, over: null, auditions: []
    };
    var rng = rngFor(w);
    // open auditions: hungry unknowns, plus a couple of journeymen
    var pool = w.people.filter(function (p) { return p.role === 'actor' && p.status === 'active'; });
    var young = rng.shuffle(pool.filter(function (p) { return w.year - p.born <= 27 && p.fame <= 12; })).slice(0, 9);
    var vets = rng.shuffle(pool.filter(function (p) { return w.year - p.born >= 30 && p.fame >= 10 && p.fame <= 30; })).slice(0, 3);
    w.career.auditions = young.concat(vets).map(function (p) { return p.id; });
    return w;
  };

  // ---------- queries ----------
  C.clientSet = function (w) {
    var s = {};
    (w.career ? w.career.clients : []).forEach(function (c) { s[c.id] = 1; });
    return s;
  };
  C.client = function (w, id) { return w.career.clients.filter(function (c) { return c.id === id; })[0] || null; };
  C.maxRoster = function (w) { return Math.min(10, 4 + Math.floor(w.career.rep / 12)); };
  C.capFor = function (p) { return HW.has(p, 'reclusive') ? 1 : HW.has(p, 'workhorse') ? 3 : 2; };
  // stars won't sign with an agency far below their level
  C.willSign = function (w, p) { return p.fame <= w.career.rep + 25; };
  C.signCost = function (w, p) {
    var first = w.career.clients.length + w.career.alumni.length < 3; // the founding clients sign for free
    return first ? 0 : money2(0.03 + HW.fee(p) * 0.25);
  };
  C.coachCost = function (w, p) { return money2(0.06 + HW.fee(p) * 0.03 + HW.ovr(p) / 1000); };
  C.campaignCost = function (w, p) { return money2(0.15 + p.fame * 0.008); };
  C.publicityCost = function (w, p) { return money2(0.08 + p.fame * 0.004); };
  C.value = function (w) {
    var v = w.career.cash;
    w.career.clients.forEach(function (c) { v += HW.fee(w.people[c.id]) * COMMISSION * 3; });
    return money2(v);
  };

  function log(w, text, kind, pid) {
    w.career.log.push({ y: w.year, t: text, k: kind || 'info', p: pid == null ? null : pid });
    if (w.career.log.length > 600) w.career.log.splice(0, w.career.log.length - 600);
  }
  C.log = log;

  // ---------- offers ----------
  function pickStudio(w, rng, p) {
    var f = p.fame / 100, studios = w.studios.filter(function (s) { return s.active; });
    return rng.weighted(studios, function (s) {
      return s.tier === 'Major' ? Math.pow(f, 1.3) * 3 + 0.05 : s.tier === 'Mid' ? 0.6 + f : 1.6 * (1 - f) + 0.15;
    });
  }
  function pickDirector(w, rng, s) {
    var target = { Major: 60, Mid: 35, Indie: 12 }[s.tier];
    var dirs = w.people.filter(function (d) { return d.role === 'director' && d.status === 'active'; });
    return rng.weighted(dirs, function (d) { return Math.exp(-Math.abs(d.fame - target) / 15); });
  }

  // A few offers per client for the coming year. Better-known clients get more and bigger ones.
  C.generateOffers = function (w, onlyId) {
    var car = w.career, rng = rngFor(w), Y = w.year;
    if (onlyId == null) { car.offers = {}; car.accepted = {}; car.offersFor = Y; }
    car.clients.forEach(function (c) {
      if (onlyId != null && c.id !== onlyId) return;
      var p = w.people[c.id];
      if (p.status !== 'active') return;
      var list = [];
      // a hit they led earns a sequel offer from the same studio
      p.films.slice(-6).forEach(function (fid) {
        var f = w.films[fid];
        var led = f.cast.some(function (x) { return x.p === p.id && x.r === 'L'; });
        if (led && !f.hasSeq && (f.seqNum || 1) < 5 && Y - f.year <= 3 && f.gross / f.budget >= 2.4 && f.audience >= 55 && w.studios[f.studio].active && list.length < 1) {
          list.push(makeOffer(w, rng, p, w.studios[f.studio], f));
        }
      });
      var n = clamp(1 + Math.floor(p.fame / 22) + rng.int(0, 2), 1, 5);
      while (list.length < n) list.push(makeOffer(w, rng, p, pickStudio(w, rng, p), null));
      car.offers[c.id] = list;
      car.accepted[c.id] = [];
    });
  };

  function makeOffer(w, rng, p, s, seqOf) {
    var genre = seqOf ? seqOf.genre : rng.weighted(HW.GENRE_KEYS, function (g) {
      return Math.pow(HW.genreApt(p, g) / 50, 2) * w.trends[g] * s.prefs[g];
    });
    var t = HW.TIER[s.tier], G = HW.GENRES[genre];
    var budget = clamp(t.budget * Math.exp(rng.normal(0, t.sd)) * G.budget, t.min, t.max);
    if (seqOf) budget = Math.max(budget, seqOf.budget * rng.range(1.1, 1.4));
    budget = Math.round(budget * 10) / 10;
    var ovr = HW.ovr(p);
    var leadP = seqOf ? 1 : clamp((p.fame - 10) / 55 + (ovr - 50) / 120 + (s.tier === 'Indie' ? 0.25 : s.tier === 'Major' ? -0.15 : 0), 0.05, 0.92);
    var role = rng.chance(leadP) ? 'L' : 'S';
    var dir = seqOf && w.people[seqOf.director].status === 'active' ? w.people[seqOf.director] : pickDirector(w, rng, s);
    var asking = HW.fee(p) * (seqOf ? 1.3 : 1);
    var cap = budget * (role === 'L' ? 0.14 : 0.04);
    var fee = money2(Math.max(0.03, Math.min(asking, cap)));
    // script buzz: a noisy read on the director's quality and the studio's taste
    var q = (dir.stats.vision + dir.stats.craft) / 2 + rng.normal(0, 8);
    var buzz = clamp(Math.round((q - 28) / 10), 1, 5);
    return {
      id: 'o' + Math.floor(rng.next() * 1e9).toString(36), studio: s.id, genre: genre, budget: budget, role: role,
      dir: dir.id, fee: fee, asking: money2(asking), buzz: buzz, fit: Math.round(HW.genreApt(p, genre)),
      seqOf: seqOf ? seqOf.id : null
    };
  }

  C.toggleOffer = function (w, pid, oid) {
    var car = w.career, acc = car.accepted[pid] || (car.accepted[pid] = []);
    var i = acc.indexOf(oid);
    if (i >= 0) { acc.splice(i, 1); return { ok: true, on: false }; }
    var p = w.people[pid];
    if (acc.length >= C.capFor(p)) return { ok: false, msg: p.name + ' can only take ' + C.capFor(p) + ' role' + (C.capFor(p) > 1 ? 's' : '') + ' a year.' };
    acc.push(oid);
    return { ok: true, on: true };
  };

  // ---------- simulation hook: projects built from accepted offers ----------
  C.forcedProjects = function (w, ctx) {
    var car = w.career, out = [];
    if (car.offersFor !== ctx.year) return out;
    Object.keys(car.accepted).forEach(function (pid) {
      var p = w.people[pid];
      if (!p || p.status !== 'active') return;
      car.accepted[pid].forEach(function (oid) {
        var o = (car.offers[pid] || []).filter(function (x) { return x.id === oid; })[0];
        if (!o) return;
        var s = w.studios[o.studio];
        if (!s.active) { log(w, s.name + ' collapsed and the ' + o.genre.toLowerCase() + ' project with ' + p.name + ' was cancelled.', 'bad', p.id); return; }
        var seq = o.seqOf != null ? w.films[o.seqOf] : null;
        if (seq && seq.hasSeq) seq = null; // the studio already made it without us
        if (seq) seq.hasSeq = true;
        out.push({
          id: null, title: null, year: ctx.year, month: 0, studio: s.id, genre: o.genre, budget: o.budget,
          commercial: clamp(s.commercial + ctx.rng.normal(0, 0.15) + (seq ? 0.2 : 0), 0, 1),
          seqOf: seq ? seq.id : null, seqNum: seq ? (seq.seqNum || 1) + 1 : 1, root: seq ? (seq.root != null ? seq.root : seq.id) : null,
          director: null, writer: null, dp: null, composer: null, cast: [],
          gross: 0, profit: 0, critic: 0, audience: 0, noms: 0, wins: 0, won: [], tags: [],
          forced: { p: p.id, r: o.role, dir: o.dir, fee: o.fee, o: o.id }
        });
      });
    });
    return out;
  };

  // ---------- player actions ----------
  function spend(w, amt) {
    if (w.career.cash < amt) return false;
    w.career.cash = money2(w.career.cash - amt);
    return true;
  }
  function usedThisYear(w, c, what) {
    if (!c.acts || c.acts.y !== w.year) c.acts = { y: w.year };
    return !!c.acts[what];
  }

  C.sign = function (w, pid) {
    var p = w.people[pid], car = w.career;
    if (C.client(w, pid)) return { ok: false, msg: p.name + ' is already your client.' };
    if (p.status !== 'active' || p.role !== 'actor') return { ok: false, msg: 'Only active actors can be signed.' };
    if (car.clients.length >= C.maxRoster(w)) return { ok: false, msg: 'Your roster is full. Grow your reputation to take on more clients.' };
    if (!C.willSign(w, p)) return { ok: false, msg: p.name + ' won\'t sign with an agency of your standing yet.' };
    var cost = C.signCost(w, p);
    if (!spend(w, cost)) return { ok: false, msg: 'Signing ' + p.name + ' costs ' + HW.money(cost) + '.' };
    car.clients.push({ id: pid, signed: w.year, loyalty: 70, earned: 0, startFame: Math.round(p.fame) });
    w.follows = w.follows || { p: {}, s: {} };
    w.follows.p[pid] = 1;
    log(w, 'Signed ' + p.name + (cost ? ' for ' + HW.money(cost) : '') + '.', 'good', pid);
    if (car.offersFor === w.year) C.generateOffers(w, pid);
    return { ok: true, msg: p.name + ' signs with ' + car.agency + '!' };
  };

  C.release = function (w, pid) {
    var car = w.career, c = C.client(w, pid);
    if (!c) return { ok: false };
    car.clients.splice(car.clients.indexOf(c), 1);
    car.alumni.push({ id: pid, from: c.signed, to: w.year, why: 'released', earned: c.earned });
    delete car.offers[pid]; delete car.accepted[pid];
    log(w, 'Released ' + w.people[pid].name + ' from the agency.', 'info', pid);
    return { ok: true, msg: w.people[pid].name + ' is no longer your client.' };
  };

  C.coach = function (w, pid, stat) {
    var p = w.people[pid], c = C.client(w, pid);
    if (!c) return { ok: false };
    if (usedThisYear(w, c, 'coach')) return { ok: false, msg: p.name + ' already trained this year.' };
    var cost = C.coachCost(w, p);
    if (!spend(w, cost)) return { ok: false, msg: 'Coaching costs ' + HW.money(cost) + '.' };
    c.acts.coach = stat;
    var before, after;
    if (HW.ACTOR_GENRES.indexOf(stat) >= 0) {
      before = p.genre[stat];
      p.genre[stat] = Math.round(clamp(before + 0.8 * Math.max(0.2, (10 - before) / 6), 1, 10) * 100) / 100;
      after = p.genre[stat];
    } else {
      before = p.stats[stat];
      p.genes[stat] = HW.round1(clamp(p.genes[stat] + 0.5 * Math.max(0.2, (10 - p.genes[stat]) / 5), 1, 10));
      HW.updateStats(p, w.year);
      after = p.stats[stat];
    }
    var label = HW.STAT_LABELS[stat];
    log(w, p.name + ' trained ' + label + ' (' + before.toFixed(1) + ' → ' + after.toFixed(1) + ').', 'info', pid);
    c.loyalty = clamp(c.loyalty + 2, 0, 100);
    return { ok: true, msg: p.name + '\'s ' + label + ' improved to ' + after.toFixed(1) + '.' };
  };

  C.campaign = function (w, pid) {
    var p = w.people[pid], c = C.client(w, pid);
    if (!c) return { ok: false };
    if (p.campaign === w.year) return { ok: false, msg: 'Already campaigning for ' + p.name + ' this year.' };
    var hasRole = (w.career.accepted[pid] || []).length > 0;
    if (!hasRole) return { ok: false, msg: p.name + ' needs a role this year for a campaign to matter.' };
    var cost = C.campaignCost(w, p);
    if (!spend(w, cost)) return { ok: false, msg: 'An awards campaign costs ' + HW.money(cost) + '.' };
    p.campaign = w.year;
    log(w, 'Launched a "For Your Consideration" campaign for ' + p.name + '.', 'info', pid);
    return { ok: true, msg: 'The campaign for ' + p.name + ' is on: voters will hear about this year\'s performance.' };
  };

  C.publicity = function (w, pid) {
    var p = w.people[pid], c = C.client(w, pid);
    if (!c) return { ok: false };
    if (usedThisYear(w, c, 'pr')) return { ok: false, msg: 'One publicity push per client per year.' };
    var cost = C.publicityCost(w, p);
    if (!spend(w, cost)) return { ok: false, msg: 'A publicity push costs ' + HW.money(cost) + '.' };
    c.acts.pr = 1;
    var before = p.fame;
    HW.gainFame(p, 5);
    p.fame = Math.round(p.fame * 10) / 10;
    c.loyalty = clamp(c.loyalty + 2, 0, 100);
    log(w, 'Publicity push for ' + p.name + ': talk shows, magazine covers, premieres.', 'info', pid);
    return { ok: true, msg: p.name + '\'s fame: ' + Math.round(before) + ' → ' + Math.round(p.fame) + '.' };
  };

  // ---------- simulation hook: end of year ----------
  C.afterYear = function (w, ctx) {
    var car = w.career, Y = ctx.year, rng = rngFor(w);
    if (car.over) return;
    var commission = 0, winsY = 0, nomsY = 0;
    var aw = w.awards[Y];
    car.clients.slice().forEach(function (c) {
      var p = w.people[c.id];
      var films = ctx.films.filter(function (f) { return f.cast.some(function (x) { return x.p === p.id; }); });
      var earned = 0, led = false;
      var dl = -3 - p.fame / 25; // every client wants a little more each year, stars most of all
      films.forEach(function (f) {
        var x = f.cast.filter(function (k) { return k.p === p.id; })[0];
        earned += x.fee * COMMISSION;
        dl += 1;
        if (x.r === 'L') { dl += 2; led = true; }
        if (f.forced && f.forced.dirSwap && f.forced.p === p.id) log(w, 'The promised director dropped out of "' + f.title + '"; ' + w.people[f.director].name + ' stepped in.', 'info', p.id);
        if (f.tags.indexOf('smash') >= 0) dl += 5;
        if (f.tags.indexOf('flop') >= 0) dl -= 4;
        if (x.fee < HW.fee(p) * 0.8) dl -= 2; // took less than their asking price
        milestone(w, 'firstLead', x.r === 'L', 'First leading role: ' + p.name + ' in "' + f.title + '".', p.id);
        milestone(w, 'hundred', f.gross >= 100, 'First $100M film: "' + f.title + '".', p.id);
        milestone(w, 'billion', f.gross >= 1000, 'A client in a billion-dollar movie: "' + f.title + '".', p.id);
      });
      if (!films.length && p.status === 'active') dl -= 10; // an idle client gets restless
      else if (p.fame >= 40 && !led) dl -= 4;                // an established name wants leading roles
      if (aw) aw.cats.forEach(function (cat) {
        cat.noms.forEach(function (n, i) {
          if (n.p !== p.id) return;
          var won = i === cat.win;
          nomsY++; dl += won ? 10 : 4;
          if (won) winsY++;
          milestone(w, 'nom', true, 'First Golden Laurel nomination: ' + p.name + ' for ' + HW.catName(cat.k) + '.', p.id);
          if (won) milestone(w, 'win', true, 'First Golden Laurel win: ' + p.name + ', ' + HW.catName(cat.k) + '!', p.id);
        });
        var bp = cat.k === 'picture' ? w.films[cat.noms[cat.win].f] : null;
        if (bp && bp.cast.some(function (x) { return x.p === p.id; })) milestone(w, 'bestPicture', true, 'A client starred in Best Picture winner "' + bp.title + '".', p.id);
      });
      var i = p.hf ? p.hf.length - 1 : -1;
      if (i >= 1 && p.hf[i] - p.hf[i - 1] >= 5) dl += 3;
      c.loyalty = Math.round(clamp(c.loyalty + dl, 0, 100));
      c.earned = money2(c.earned + earned);
      commission += earned;

      // leaving the agency
      var why = null;
      if (p.status === 'deceased') why = 'died';
      else if (p.status === 'retired') why = 'retired';
      else if (c.loyalty < 30 && rng.chance((30 - c.loyalty) / 40 + 0.1)) why = 'left';
      else if (p.fame >= 65 && car.rep < p.fame - 30 && rng.chance(0.2)) why = 'poached';
      else if (p.fame >= 60 && c.loyalty < 90 && rng.chance((p.fame - 50) / 400)) why = 'poached'; // rivals circle every star
      if (why) {
        car.clients.splice(car.clients.indexOf(c), 1);
        var rival = rng.pick(RIVAL_AGENCIES);
        car.alumni.push({ id: p.id, from: c.signed, to: Y, why: why, earned: c.earned, rival: why === 'left' || why === 'poached' ? rival : null });
        var msg = why === 'died' ? 'Your client ' + p.name + ' has died, aged ' + (Y - p.born) + '.' :
          why === 'retired' ? p.name + ' retired from acting.' :
          why === 'poached' ? p.name + ' was poached by ' + rival + ', a bigger agency.' :
          p.name + ' fired the agency and signed with ' + rival + '.';
        log(w, msg, why === 'retired' ? 'info' : 'bad', p.id);
        if (why === 'left' || why === 'poached') HW.addNews(w, Y, p.name + ' leaves ' + car.agency + ' for ' + rival + '.', 'people', { p: p.id });
      }
    });

    var upkeep = money2(0.05 + 0.012 * car.clients.length);
    car.cash = money2(car.cash + commission - upkeep);
    var top = car.clients.map(function (c) { return w.people[c.id].fame; }).sort(function (a, b) { return b - a; }).slice(0, 3);
    var topAvg = top.length ? top.reduce(function (a, b) { return a + b; }, 0) / top.length : 0;
    car.rep = Math.round(clamp(car.rep * 0.75 + 0.25 * Math.min(100, topAvg + winsY * 8 + nomsY * 2), 0, 100));
    var stars = w.people.filter(function (p) { return p.role === 'actor' && p.status === 'active'; }).sort(function (a, b) { return b.fame - a.fame; }).slice(0, 10);
    stars.forEach(function (p) { if (C.client(w, p.id)) milestone(w, 'topTen', true, p.name + ' is one of Hollywood\'s ten biggest stars.', p.id); });
    milestone(w, 'tenM', car.cash >= 10, 'The agency has $10M in the bank.');
    milestone(w, 'fullHouse', car.clients.length >= 8, 'Eight clients on the roster.');
    car.history.push({ y: Y, cash: car.cash, rep: car.rep, com: money2(commission), up: upkeep, n: car.clients.length, value: C.value(w) });
    log(w, Y + ' closed: ' + HW.money(commission) + ' in commission, ' + HW.money(upkeep) + ' overhead.', 'year');
    if (car.cash < 0) {
      car.over = { y: Y, why: 'The agency ran out of money.' };
      log(w, car.agency + ' has folded.', 'bad');
      return;
    }
    // next year's offers arrive as soon as the year ends
    w.year = Y + 1; C.generateOffers(w); w.year = Y;
  };

  function milestone(w, key, cond, text, pid) {
    var m = w.career.milestones;
    if (!cond || m[key]) return;
    m[key] = { y: w.year, t: text };
    log(w, '🏅 ' + text, 'milestone', pid);
  }
  C.MILESTONES = [
    ['firstLead', 'First leading role'], ['hundred', 'A $100M movie'], ['nom', 'First Laurel nomination'], ['win', 'First Laurel win'],
    ['topTen', 'A top-10 star'], ['billion', 'A billion-dollar movie'], ['bestPicture', 'Star of a Best Picture winner'],
    ['fullHouse', 'Eight clients'], ['tenM', '$10M in the bank']
  ];
})(globalThis.HW = globalThis.HW || {});
