// Career mode screens: start / continue, open auditions, and the agency office.
(function (HW) {
  var UI = HW.UI, C = HW.Career;
  var h = function () { return UI.h; };
  function W() { return HW.world; }
  function inCareer() { return W().mode === 'career' && W().career; }

  UI.addRoute('career', function () {
    var H = h();
    if (!inCareer()) return startScreen(H);
    var car = W().career;
    if (!car.auditionsDone && car.clients.length + car.alumni.length < 3 && !car.over) return auditions(H);
    return office(H);
  });

  // ---------- start ----------
  function startScreen(H) {
    var meta = HW.careerMeta;
    var x = '<section class="hero career-hero"><h1>🎬 Career Mode</h1>' +
      '<p>Run your own talent agency in a brand-new Hollywood. Sign unknown actors at open auditions, choose which roles they take, coach them, ' +
      'buy publicity and awards campaigns, and keep them loyal, or watch them walk out to a rival agency. You earn ' + Math.round(10) + '% of every fee they make.</p>' +
      '<p class="muted">Career Mode has its own world and its own save. Your sandbox world stays exactly as it is, and you can switch back at any time.</p></section>';
    x += '<div class="grid two">';
    if (meta) {
      x += H.card('Continue', '<p><b>' + H.esc(meta.agency) + '</b>, ' + meta.year + (meta.over ? ' <span class="neg">(folded)</span>' : '') + '</p>' +
        '<button class="btn primary" data-action="toCareer">Continue career</button>');
    }
    x += H.card(meta ? 'Start a new career' : 'Start your agency',
      '<div class="form"><label>Agency name <input type="text" id="cAgency" maxlength="40" placeholder="Starmaker Agency"></label>' +
      '<label>Start year <input type="number" id="cStart" value="1980" min="1920" max="2030"></label>' +
      '<label>Seed <input type="text" id="cSeed" placeholder="random"></label>' +
      '<button class="btn primary" data-career="start">Open the agency</button>' +
      (meta ? '<p class="muted small">Starting a new career replaces ' + H.esc(meta.agency) + '.</p>' : '') + '</div>');
    x += '</div>';
    x += H.card('How it plays', '<ol class="howto">' +
      '<li><b>Sign clients.</b> Pick your first three actors at open auditions for free. Bigger names only sign once your reputation is high enough.</li>' +
      '<li><b>Answer offers.</b> Every year each client gets role offers: studio, genre, budget, lead or supporting, director, fee, script buzz and genre fit. Accept up to two per client.</li>' +
      '<li><b>Advance the year.</b> Accepted offers become real films in the simulation. Clients you don\'t place sit idle and get restless.</li>' +
      '<li><b>Invest.</b> Coaching raises a stat or genre skill, a publicity push raises fame, and a For Your Consideration campaign gives a client\'s performance a boost with Golden Laurel voters.</li>' +
      '<li><b>Keep them happy.</b> Loyalty rises with good roles, hits and awards, and falls with idle years, flops and supporting parts for stars. Unhappy clients leave, and stars can be poached by bigger agencies.</li>' +
      '<li><b>Grow.</b> Your reputation comes from your clients\' fame and awards. It decides who will sign and how big your roster can be. Run out of money and the agency folds.</li></ol>');
    return x;
  }

  // ---------- auditions ----------
  function auditions(H) {
    var w = W(), car = w.career;
    var x = '<div class="pagehead"><h1>Open auditions</h1><span class="muted">' + H.esc(car.agency) + ' · ' + w.year + '</span></div>';
    var n = car.clients.length;
    x += '<div class="toolbar"><p>Pick up to three founding clients; they sign for free. You start with ' + H.money(car.cash) + '. <b>' + n + ' / 3 signed.</b></p>' +
      (n ? '<button class="btn primary" data-career="openOffice">Open the office with ' + n + ' client' + (n > 1 ? 's' : '') + ' ›</button>' : '') + '</div>';
    var list = car.auditions.map(function (id) { return w.people[id]; }).filter(function (p) { return p.status === 'active'; });
    x += '<div class="grid audition">' + list.map(function (p) {
      var signed = !!C.client(w, p.id);
      return actorCard(H, p, signed ? '<button class="btn small" disabled>✓ Signed</button>' : '<button class="btn primary small" data-career="sign:' + p.id + '">Sign</button>');
    }).join('') + '</div>';
    return x;
  }

  function actorCard(H, p, actions) {
    var w = W(), g = H.topGenre(p);
    return '<section class="card actor-card"><div class="ac-head"><div>' + H.pLink(p.id) + '<div class="sub">' + (p.gender === 'M' ? 'Male' : 'Female') + ', ' + (w.year - p.born) +
      (p.traits.length ? ' · ' + p.traits.map(function (t) { return HW.TRAITS[t].name; }).join(', ') : '') + '</div></div>' +
      '<div class="ac-ovr"><span class="score ' + H.scoreCls(HW.ovr(p)) + '">' + H.ovrText(p) + '</span>' + H.stars(HW.potentialStars(p)) + '</div></div>' +
      '<div class="ac-stats">' + HW.ROLES.actor.stats.map(function (k) {
        return '<span title="' + H.esc(HW.STAT_DESC[k]) + '">' + HW.STAT_LABELS[k].slice(0, 4) + ' <b>' + Math.round(p.stats[k]) + '</b></span>';
      }).join('') + '</div>' +
      '<div class="sub">Best genre: ' + HW.STAT_LABELS[g] + ' ' + Math.round(p.genre[g]) + ' · Fame ' + Math.round(p.fame) + ' · Asks ' + H.money(HW.fee(p)) + '</div>' +
      '<div class="ac-actions">' + actions + '</div></section>';
  }

  // ---------- office ----------
  function office(H) {
    var w = W(), car = w.career, last = car.history[car.history.length - 1];
    var x = '<div class="pagehead"><h1>' + H.esc(car.agency) + '</h1><span class="muted">founded ' + car.founded + ' · planning ' + w.year + '</span></div>';
    if (car.over) x += '<section class="card over"><h3>The agency has folded</h3><p>' + H.esc(car.over.why) + ' ' + H.esc(car.agency) + ' closed its doors in ' + car.over.y + ' after ' + (car.over.y - car.founded + 1) + ' years.</p><button class="btn primary" data-career="new">Start a new career</button></section>';
    x += '<div class="stats-row">' + H.stat('Cash', H.money(car.cash)) + H.stat('Reputation', car.rep, repHint(car.rep)) +
      H.stat('Clients', car.clients.length + ' / ' + C.maxRoster(w)) + H.stat('Agency value', H.money(C.value(w))) +
      H.stat('Last year', last ? H.money(last.com) : '—', last ? 'commission, ' + H.money(last.up) + ' overhead' : 'no films yet') + '</div>';

    var tabs = [['offers', 'Offers ' + w.year], ['clients', 'Clients'], ['scout', 'Scouting'], ['agency', 'Agency']];
    var tab = UI.filters.careerTab || 'offers';
    x += '<div class="toolbar">' + H.seg('careerTab', tab, tabs) + '</div>';
    if (tab === 'offers') x += offersTab(H);
    else if (tab === 'clients') x += clientsTab(H);
    else if (tab === 'scout') x += scoutTab(H);
    else x += agencyTab(H);
    return x;
  }
  function repHint(r) { return r < 20 ? 'Unknowns only' : r < 40 ? 'Rising names will talk' : r < 60 ? 'A serious agency' : r < 80 ? 'Stars take your calls' : 'The town\'s power agency'; }

  function offersTab(H) {
    var w = W(), car = w.career;
    if (car.over) return H.empty('No more offers.');
    if (!car.clients.length) return H.empty('No clients. Head to Scouting to sign someone.');
    var x = '<p class="muted">Accept up to two roles per client (one for Reclusive, three for Workhorse), then press <b>Next Year</b>. Fees are what the studio pays; you take 10%.</p>';
    car.clients.forEach(function (c) {
      var p = w.people[c.id], offers = car.offers[c.id] || [], acc = car.accepted[c.id] || [];
      x += '<section class="card client-offers"><div class="co-head">' + H.pLink(p.id) + '<span class="muted small">' + (w.year - p.born) + ' · OVR ' + H.ovrText(p) + ' · fame ' + Math.round(p.fame) + '</span>' +
        loyalty(H, c.loyalty) + '<span class="right small ' + (acc.length ? 'pos' : 'muted') + '">' + acc.length + ' / ' + C.capFor(p) + ' roles</span></div>';
      if (!offers.length) x += H.empty(p.status === 'active' ? 'No offers this year.' : 'No longer working.');
      else x += '<div class="offers">' + offers.map(function (o) { return offerRow(H, p, o, acc.indexOf(o.id) >= 0); }).join('') + '</div>';
      x += '</section>';
    });
    return x;
  }

  function offerRow(H, p, o, on) {
    var w = W(), s = w.studios[o.studio], d = w.people[o.dir];
    var under = o.fee < o.asking * 0.8;
    return '<div class="offer' + (on ? ' on' : '') + '">' +
      '<div class="of-main"><span class="role ' + (o.role === 'L' ? 'lead' : '') + '">' + (o.role === 'L' ? 'Lead' : 'Supporting') + '</span> ' +
      '<b>' + o.genre + '</b>' + (o.seqOf != null ? ' <span class="tag gold">Sequel to ' + H.esc(w.films[o.seqOf].title) + '</span>' : '') +
      '<div class="sub">' + H.sLink(s.id) + ' ' + H.tierBadge(s.tier) + ' · ' + H.money(o.budget) + ' budget · dir. ' + H.pLink(d.id) + '</div></div>' +
      '<div class="of-facts"><span title="Script buzz: a rough read on how good the film will be">Buzz ' + H.stars(o.buzz) + '</span>' +
      '<span title="How well the role suits this actor\'s genre skills and core stats">Fit ' + H.meter(o.fit) + ' ' + o.fit + '</span>' +
      '<span>Fee <b>' + H.money(o.fee) + '</b>' + (under ? ' <span class="tag red" title="Below their asking price of ' + H.money(o.asking) + '; they\'ll grumble">under asking</span>' : '') + '</span></div>' +
      '<button class="btn small ' + (on ? 'primary' : '') + '" data-career="offer:' + p.id + ':' + o.id + '">' + (on ? '✓ Accepted' : 'Accept') + '</button></div>';
  }

  function loyalty(H, v) {
    var cls = v >= 60 ? 'good' : v >= 35 ? 'ok' : 'bad';
    return '<span class="loyal loyal-' + cls + '" title="Loyalty: below 30 they may leave">♥ ' + v + '</span>';
  }

  function clientsTab(H) {
    var w = W(), car = w.career;
    if (!car.clients.length) return H.empty('No clients yet.');
    var coachOpts = HW.ROLES.actor.stats.concat(HW.ACTOR_GENRES).map(function (k) { return '<option value="' + k + '">' + HW.STAT_LABELS[k] + '</option>'; }).join('');
    return '<div class="grid two">' + car.clients.map(function (c) {
      var p = w.people[c.id], used = c.acts && c.acts.y === w.year ? c.acts : {};
      var acts = '<div class="ca-row"><select id="coach-' + p.id + '">' + coachOpts + '</select><button class="btn small" data-career="coach:' + p.id + '"' + (used.coach ? ' disabled' : '') + '>Coach ' + H.money(C.coachCost(w, p)) + '</button></div>' +
        '<div class="ca-row"><button class="btn small" data-career="pr:' + p.id + '"' + (used.pr ? ' disabled' : '') + '>Publicity push ' + H.money(C.publicityCost(w, p)) + '</button>' +
        '<button class="btn small" data-career="campaign:' + p.id + '"' + (p.campaign === w.year ? ' disabled' : '') + '>Laurel campaign ' + H.money(C.campaignCost(w, p)) + '</button></div>' +
        '<div class="ca-row"><span class="muted small">Signed ' + c.signed + ' · earned you ' + H.money(c.earned) + ' · ' + loyalty(H, c.loyalty) + '</span><button class="btn small ghost" data-career="release:' + p.id + '">Release</button></div>';
      return actorCard(H, p, acts) + '';
    }).join('') + '</div>';
  }

  function scoutTab(H) {
    var w = W(), car = w.career, mine = C.clientSet(w);
    var q = (UI.filters.scoutQ || '').toLowerCase();
    var list = w.people.filter(function (p) { return p.role === 'actor' && p.status === 'active' && !mine[p.id] && (!q || p.name.toLowerCase().indexOf(q) >= 0); });
    var full = car.clients.length >= C.maxRoster(w);
    var x = '<p class="muted">Free agents and actors at other agencies. Actors sign only if their fame is no more than 25 above your reputation (' + car.rep + '). Roster ' + car.clients.length + ' / ' + C.maxRoster(w) + '.</p>' +
      '<div class="toolbar"><input type="search" id="scoutSearch" placeholder="Search name…" value="' + H.esc(UI.filters.scoutQ || '') + '"></div>';
    x += H.table('scout', [
      { h: 'Name', v: function (p) { return p.name; }, html: function (p) { return H.pLink(p.id) + (p.traits.length ? '<div class="sub">' + p.traits.map(function (t) { return HW.TRAITS[t].name; }).join(' · ') + '</div>' : ''); } },
      { h: 'Age', cls: 'num', v: function (p) { return w.year - p.born; } },
      { h: 'OVR', cls: 'num', v: function (p) { return HW.ovr(p); }, html: function (p) { return '<span class="score ' + H.scoreCls(HW.ovr(p)) + '">' + H.ovrText(p) + '</span>'; } },
      { h: 'Pot.', cls: 'num', v: function (p) { return HW.potentialStars(p); }, html: function (p) { return H.stars(HW.potentialStars(p)); } },
      { h: 'Best genre', v: function (p) { return p.genre[H.topGenre(p)]; }, html: function (p) { var g = H.topGenre(p); return HW.STAT_LABELS[g] + ' <span class="muted">' + Math.round(p.genre[g]) + '</span>'; } },
      { h: 'Fame', cls: 'num', v: function (p) { return p.fame; }, html: function (p) { return Math.round(p.fame); } },
      { h: 'Sign', cls: 'num', v: function (p) { return C.willSign(w, p) ? C.signCost(w, p) : 1e9; }, html: function (p) {
        if (!C.willSign(w, p)) return '<span class="muted small">needs rep ' + Math.ceil(p.fame - 25) + '</span>';
        return '<button class="btn small" data-career="sign:' + p.id + '"' + (full || car.over ? ' disabled' : '') + '>Sign ' + H.money(C.signCost(w, p)) + '</button>';
      } }
    ], list, { per: 25, sort: [3, -1] });
    return x;
  }

  function agencyTab(H) {
    var w = W(), car = w.career;
    var x = '<div class="grid two">';
    x += H.card('Milestones', '<ul class="milestones">' + C.MILESTONES.map(function (m) {
      var got = car.milestones[m[0]];
      return '<li class="' + (got ? 'got' : '') + '"><span>' + (got ? '🏅' : '○') + '</span>' + m[1] + (got ? ' <span class="muted small">' + got.y + '</span>' : '') + '</li>';
    }).join('') + '</ul>');
    x += H.card('Agency log', '<ul class="news">' + car.log.slice(-40).reverse().map(function (l) {
      var t = H.esc(l.t);
      if (l.p != null) t = '<a href="#/person/' + l.p + '" class="lnk plain">' + t + '</a>';
      return '<li class="nk-' + ({ good: 'boxoffice', bad: 'scandal', milestone: 'awards', year: 'event' }[l.k] || 'people') + '"><span class="ny">' + l.y + '</span> ' + t + '</li>';
    }).join('') + '</ul>');
    x += '</div>';
    if (car.history.length) {
      x += H.card('Year by year', H.table('car-hist', [
        { h: 'Year', cls: 'num', v: function (r) { return r.y; } },
        { h: 'Commission', cls: 'num', v: function (r) { return r.com; }, html: function (r) { return H.money(r.com); } },
        { h: 'Overhead', cls: 'num', v: function (r) { return r.up; }, html: function (r) { return H.money(r.up); } },
        { h: 'Cash', cls: 'num', v: function (r) { return r.cash; }, html: function (r) { return H.money(r.cash); } },
        { h: 'Reputation', cls: 'num', v: function (r) { return r.rep; } },
        { h: 'Clients', cls: 'num', v: function (r) { return r.n; } }
      ], car.history.slice().reverse(), { per: 15 }));
    }
    if (car.alumni.length) {
      var WHY = { released: 'Released', left: 'Fired the agency', poached: 'Poached', retired: 'Retired', died: 'Died' };
      x += H.card('Former clients', '<ul class="plist">' + car.alumni.slice().reverse().map(function (a) {
        return '<li>' + H.pLink(a.id) + ' <span class="muted small">' + a.from + '–' + a.to + ' · ' + WHY[a.why] + (a.rival ? ' (to ' + H.esc(a.rival) + ')' : '') + '</span><span class="right">earned you ' + H.money(a.earned) + '</span></li>';
      }).join('') + '</ul>');
    }
    x += '<p><button class="btn ghost small" data-career="new">Abandon this career and start over</button></p>';
    return x;
  }

  // ---------- actions ----------
  function done(res) {
    if (res && res.msg) HW.toast(res.msg);
    HW.save();
    UI.render();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-career]');
    if (!t) return;
    var a = t.dataset.career.split(':'), w = W(), pid = +a[1];
    switch (a[0]) {
      case 'start':
        var seedTxt = document.getElementById('cSeed').value.trim();
        HW.startCareer({
          agency: document.getElementById('cAgency').value,
          startYear: parseInt(document.getElementById('cStart').value, 10) || 1980,
          seed: seedTxt ? (/^\d+$/.test(seedTxt) ? +seedTxt : Array.from(seedTxt).reduce(function (h, ch) { return Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; }, 2166136261)) : undefined
        });
        return;
      case 'new':
        if (!confirm('Abandon ' + w.career.agency + ' and start over?')) return;
        HW.abandonCareer();
        return;
      case 'sign': return done(C.sign(w, pid));
      case 'openOffice': w.career.auditionsDone = true; return done(null);
      case 'release': if (confirm('Release ' + w.people[pid].name + '?')) done(C.release(w, pid)); return;
      case 'offer': var r = C.toggleOffer(w, pid, a[2]); if (!r.ok) HW.toast(r.msg); HW.save(); UI.render(); return;
      case 'coach': return done(C.coach(w, pid, document.getElementById('coach-' + pid).value));
      case 'pr': return done(C.publicity(w, pid));
      case 'campaign': return done(C.campaign(w, pid));
    }
  });
  var timer;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'scoutSearch') return;
    clearTimeout(timer);
    var v = e.target.value;
    timer = setTimeout(function () {
      UI.filters.scoutQ = v; UI.pages.scout = 0; UI.render();
      var el = document.getElementById('scoutSearch');
      if (el) { el.focus(); el.setSelectionRange(v.length, v.length); }
    }, 200);
  });
})(globalThis.HW = globalThis.HW || {});
