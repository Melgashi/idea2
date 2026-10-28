// Career mode screens: create your actor, then each quarter read three pitches and sign on to one.
(function (HW) {
  var UI = HW.UI, C = HW.Career;
  function W() { return HW.world; }
  function inCareer() { var w = W(); return w.mode === 'career' && w.career && w.career.kind === 'actor'; }
  function qLabel(qi) { var c = W().career; return C.QUARTERS[qi % 4] + ' ' + (c.started + Math.floor(qi / 4)); }
  var REP_LABELS = [[70, 'A-list'], [50, 'Star'], [35, 'Rising name'], [20, 'Working actor'], [8, 'Bit-part regular'], [0, 'Unknown']];
  function repLabel(r) { for (var i = 0; i < REP_LABELS.length; i++) if (r >= REP_LABELS[i][0]) return REP_LABELS[i][1]; return 'Unknown'; }
  function starsOf(n) { return '<span class="stars" title="' + n + '-star studio">' + '★★★★★'.slice(0, n) + '<span class="off">' + '★★★★★'.slice(n) + '</span></span>'; }
  function verdictTone(v) { return /Smash|Hit|Solid/.test(v) ? 'good' : /Broke/.test(v) ? 'even' : 'bad'; }

  UI.addRoute('career', function () {
    var H = UI.h;
    if (!inCareer()) return startScreen(H);
    var c = W().career;
    if (c.over) return overScreen(H);
    return careerHome(H);
  });

  // ---------- start ----------
  function startScreen(H) {
    var meta = HW.careerMeta && HW.careerMeta.kind === 'actor' ? HW.careerMeta : null;
    var x = '<section class="hero career-hero"><h1>🎬 Career Mode</h1>' +
      '<p>You are an 18-year-old actor with a headshot and a dream, in a town of 20 studios and 20 directors. Every quarter the studios start new productions and you get pitches for three of them. Pick one, or none.</p>' +
      '<p>Every choice has weight. Directors you turn down stop calling. Old partners feel snubbed. Co-stars who can\'t stand you can wreck a shoot. A flop knocks a quarter off your reputation and makes people wary of hiring you, and reputation is slow to earn back.</p>' +
      '<p class="muted">Career Mode has its own world and its own save. Your sandbox world stays as it is, and you can switch back at any time.</p></section>';
    x += '<div class="grid two">';
    if (meta) x += H.card('Continue', '<p><b>' + H.esc(meta.name) + '</b>, ' + (meta.q != null ? C.QUARTERS[meta.q] + ' ' : '') + meta.year + (meta.over ? ' <span class="muted">(retired)</span>' : '') + '</p><button class="btn primary" data-action="toCareer">Continue career</button>');
    var focusOpts = Object.keys(C.FOCUS).map(function (k) {
      return '<label class="focus-opt"><input type="radio" name="cFocus" value="' + k + '"' + (k === 'presence' ? ' checked' : '') + '><span><b>' + C.FOCUS[k].label + '</b><span class="muted small">' + HW.STAT_LABELS[k] + ': ' + H.esc(HW.STAT_DESC[k]) + '</span></span></label>';
    }).join('');
    x += H.card(meta ? 'Start a new career' : 'Create your actor',
      '<div class="form"><label>Name <input type="text" id="cName" maxlength="40" placeholder="Your stage name"></label>' +
      '<label>Gender <select id="cGender"><option value="F">Female</option><option value="M">Male</option></select></label>' +
      '<div class="focus-list"><span class="muted small">What stands out about you?</span>' + focusOpts + '</div>' +
      '<label>Start year <input type="number" id="cStart" value="1980" min="1920" max="2030"></label>' +
      '<label>Seed <input type="text" id="cSeed" placeholder="random"></label>' +
      '<button class="btn primary" data-career="start">Step off the bus</button>' +
      (meta ? '<p class="muted small">Starting a new career replaces ' + H.esc(meta.name) + '\'s.</p>' : '') + '</div>');
    x += '</div>';
    return x;
  }

  function overScreen(H) {
    var w = W(), c = w.career, p = C.player(w);
    return '<section class="hero career-hero"><h1>' + H.esc(p.name) + '</h1><p>' + H.esc(c.over.why) + '</p>' +
      '<p>' + p.films.length + ' films · peak reputation ' + Math.round(c.peak) + ' · ' + H.money(c.earnings) + ' earned · ' + p.wins + ' Golden Laurel' + (p.wins === 1 ? '' : 's') + '</p>' +
      '<p><a class="btn" href="#/person/' + p.id + '">Read your career story</a> <button class="btn primary" data-career="new">Start a new career</button></p></section>';
  }

  // ---------- home ----------
  function careerHome(H) {
    var w = W(), c = w.career, p = C.player(w), rep = C.rep(w);
    var x = '<div class="pagehead"><h1>' + H.esc(p.name) + '</h1><span class="muted">' + C.age(w) + ' · ' + C.label(w) + '</span></div>';
    x += '<div class="stats-row">' +
      H.stat('Reputation', rep + ' <span class="small muted">/ 100</span>', repLabel(rep)) +
      H.stat('Overall', H.ovrText(p), 'Best genre: ' + HW.STAT_LABELS[H.topGenre(p)]) +
      H.stat('Films', p.films.length, p.wins ? '🏆 ' + p.wins + ' Golden Laurel' + (p.wins > 1 ? 's' : '') : p.noms ? p.noms + ' nomination' + (p.noms > 1 ? 's' : '') : 'No awards yet') +
      H.stat('Earned', H.money(c.earnings), 'Peak reputation ' + Math.round(c.peak)) + '</div>';
    var last = c.reports[c.reports.length - 1];
    if (last && c.reportSeen !== c.qi) x += reportCard(H, last);
    var tab = UI.filters.careerTab || 'pitches';
    x += '<div class="toolbar">' + H.seg('careerTab', tab, [['pitches', 'Pitches · ' + C.label(w)], ['people', 'Relationships'], ['history', 'Your career'], ['log', 'Log']]) + '</div>';
    if (tab === 'pitches') x += pitchesTab(H);
    else if (tab === 'people') x += peopleTab(H);
    else if (tab === 'history') x += historyTab(H);
    else x += logTab(H);
    return x;
  }

  function reportCard(H, r) {
    var w = W(), x = '<section class="card report"><div class="story-head"><h3>' + C.QUARTERS[r.q] + ' ' + r.y + ' report</h3><button class="btn small ghost" data-career="seen">Dismiss</button></div>';
    if (r.film) {
      var f = w.films[r.film.id];
      var pct = r.film.repBefore >= 5 ? Math.round((r.film.repAfter - r.film.repBefore) / r.film.repBefore * 100) : 0;
      x += '<div class="rep-film"><div>' + H.fLink(f.id) + ' <span class="verdict v-' + verdictTone(r.film.verdict) + '">' + r.film.verdict + '</span>' +
        '<div class="sub">' + (r.film.r === 'L' ? 'Lead' : 'Supporting') + ' · performance <span class="grade ' + H.scoreCls(r.film.perf) + '">' + H.grade(r.film.perf) + '</span> · ' + H.money(f.gross) + ' gross · paid ' + H.money(r.film.fee) + '</div></div>' +
        '<div class="rep-delta ' + (r.film.repAfter >= r.film.repBefore ? 'pos' : 'neg') + '">Reputation ' + Math.round(r.film.repBefore) + ' → ' + Math.round(r.film.repAfter) +
        (pct <= -15 ? ' <b>(' + pct + '%)</b>' : '') + '</div></div>';
      if (r.film.clash != null) x += '<p class="neg small">Trouble on set with ' + H.pLink(r.film.clash) + ' dragged the film down.</p>';
    } else x += '<p class="muted">You sat this quarter out.</p>';
    if (r.changes.length) x += '<ul class="reasons">' + r.changes.map(function (ch) {
      return '<li class="' + (ch.good ? 'up' : ch.bad ? 'down' : '') + '"><span class="ic">' + (ch.good ? '▲' : ch.bad ? '▼' : '•') + '</span>' + H.esc(ch.t) + '</li>';
    }).join('') + '</ul>';
    if (r.passed.length) x += '<h4>The ones you passed on</h4><ul class="reasons">' + r.passed.map(function (pz) {
      var f = w.films[pz.id], tone = verdictTone(pz.verdict);
      var note = tone === 'good' ? ' It worked out for ' + w.people[pz.alt].name + '.' : tone === 'bad' ? ' You dodged that one.' : '';
      return '<li><span class="ic">↩</span><span>' + H.fLink(f.id) + ' <span class="verdict v-' + tone + '">' + pz.verdict + '</span> <span class="muted small">' + H.esc(note) + '</span></span></li>';
    }).join('') + '</ul>';
    if (r.yearEnded) x += '<p class="small"><a class="lnk" href="#/awards/' + r.yearEnded + '">See the ' + r.yearEnded + ' Golden Laurels →</a></p>';
    return x + '</section>';
  }

  // ---------- pitches ----------
  function pitchesTab(H) {
    var w = W(), c = w.career;
    if (!c.pitches.length) return H.card('No calls this quarter', '<p>Nobody pitched you this quarter. Too many bridges burned, or too little buzz. Sit it out and try again next quarter.</p><button class="btn primary" data-career="pass">Wait for next quarter</button>');
    var x = '<p class="muted">Pick one film for this quarter. Click the director and the cast to find out more about them; that\'s where the hidden rewards and risks are.</p>';
    x += '<div class="grid pitches">' + c.pitches.map(function (pt, i) { return pitchCard(H, pt, i); }).join('') + '</div>';
    x += '<p class="center"><button class="btn ghost" data-career="passAll">Pass on all ' + c.pitches.length + '</button></p>';
    return x;
  }

  function pitchCard(H, pt, i) {
    var w = W(), c = w.career, f = c.slate[pt.f], s = w.studios[f.studio], d = w.people[f.director], p = C.player(w);
    var a = C.analyze(w, pt), others = f.cast.filter(function (k) { return k.p !== pt.alt; });
    var fit = Math.round(HW.genreApt(p, f.genre));
    var x = '<section class="card pitch"><div class="pitch-head"><div class="pitch-title">' + H.esc(f.title) + '</div>' +
      '<div class="sub">' + f.genre + (f.seqOf != null ? ' · sequel' : '') + ' · ' + H.money(f.budget) + ' budget</div>' +
      '<div class="pitch-studio">' + H.sLink(s.id) + ' ' + starsOf(s.stars) + '</div></div>';
    x += '<div class="pitch-deal"><span class="role ' + (pt.r === 'L' ? 'lead' : '') + '">' + (pt.r === 'L' ? 'Lead role' : 'Supporting role') + '</span>' +
      '<span>Fee <b>' + H.money(pt.fee) + '</b></span><span title="How well this genre suits your skills">Fit ' + H.meter(fit) + ' ' + fit + '</span></div>';
    if (pt.seq) x += '<p class="tag gold">They want you back for the sequel</p>';
    if (pt.desperate) x += '<p class="muted small">The only call this quarter.</p>';
    // director & cast: click to look into them
    x += '<h4>Director</h4>' + personChip(H, d.id, f, true);
    x += '<h4>Cast</h4><div class="chips">' + others.map(function (k) { return personChip(H, k.p, f, false, k.r); }).join('') + '</div>';
    x += others.map(function (k) { return C.seen(w, k.p) ? scoutPanel(H, k.p, f) : ''; }).join('');
    // what we know
    x += list('Rewards', 'up', '✓', a.rewards, H) + (a.unexplored ? '<p class="muted small hint">🔍 ' + a.unexplored + ' ' + (a.unexplored === 1 ? 'person' : 'people') + ' you haven\'t looked into.</p>' : '');
    x += list('Risks', 'down', '⚠', a.risks, H);
    x += list('If you pass', 'pass', '↩', a.pass, H);
    x += '<button class="btn primary sign" data-career="sign:' + i + '">Sign on</button></section>';
    return x;
  }
  function list(title, cls, icon, items, H) {
    if (!items.length) return '<h4>' + title + '</h4><p class="muted small">' + (cls === 'up' ? 'Nothing obvious yet.' : 'None known.') + '</p>';
    return '<h4>' + title + '</h4><ul class="reasons ' + cls + '">' + items.map(function (it) {
      return '<li class="' + (cls === 'up' ? 'up' : cls === 'down' ? 'down' : '') + (it.found ? ' found' : '') + '"><span class="ic">' + icon + '</span><span>' + H.esc(it.t) + (it.found ? ' <span class="tag">found</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  function personChip(H, id, f, isDir, role) {
    var w = W(), o = w.people[id], seen = C.seen(w, id);
    var chip = '<button class="pchip' + (seen ? ' seen' : '') + '" data-career="inv:' + id + '" title="' + (seen ? 'Looked into' : 'Click to look into them') + '">' +
      (seen ? '' : '🔍 ') + H.esc(o.name) + (role ? ' <span class="muted small">' + (role === 'L' ? 'lead' : 'supp.') + '</span>' : '') + '</button>';
    return isDir ? chip + (seen ? scoutPanel(H, id, f) : '') : chip;
  }
  // What looking into someone tells you.
  function scoutPanel(H, id, f) {
    var w = W(), o = w.people[id], t = C.tie(w, id);
    var x = '<div class="scout"><div class="scout-head">' + H.pLink(id) + ' <span class="muted small">' + HW.ROLES[o.role].label + ', ' + (w.year - o.born) + ' · fame ' + Math.round(o.fame) + '</span></div>';
    if (o.role === 'director') {
      var form = C.form(w, id);
      x += '<div class="kvline"><span>Form</span><b class="' + (form.roll ? 'pos' : form.cold ? 'neg' : '') + '">' + form.label + '</b></div>';
      if (form.films.length) x += '<div class="scout-films">' + form.films.map(function (ff, j) {
        return '<span>' + H.esc(ff.title) + ' <span class="verdict v-' + verdictTone(form.verdicts[j].verdict) + '">' + form.verdicts[j].verdict + '</span></span>';
      }).join('') + '</div>';
    } else {
      var apt = Math.round(HW.genreApt(o, f.genre));
      x += '<div class="kvline"><span>Fit for this film</span><b class="' + (apt >= 65 ? 'pos' : apt < 35 ? 'neg' : '') + '">' + apt + (apt >= 65 ? ' · perfect' : apt < 35 ? ' · miscast' : '') + '</b></div>';
    }
    x += '<div class="kvline"><span>Toward you</span><b class="' + (t.aff >= 30 ? 'pos' : t.aff < -30 ? 'neg' : '') + '">' + C.attitude(t.aff) + '</b></div>';
    if (t.films) x += '<div class="kvline"><span>Work</span><b class="' + (t.work >= 20 ? 'pos' : t.work < 0 ? 'neg' : '') + '">' + C.stance(t.work) + ' · ' + t.films + ' film' + (t.films > 1 ? 's' : '') + ' together</b></div>';
    return x + '</div>';
  }

  // ---------- relationships ----------
  function peopleTab(H) {
    var w = W(), c = w.career;
    var dirs = w.people.filter(function (p) { return p.role === 'director' && p.status === 'active'; });
    var x = H.card('Directors', '<p class="muted small">Directors you\'ve turned down stop pitching to you for a while; proud and famous ones hold a grudge longer. After a flop, even friends get careful.</p>' +
      H.table('c-dirs', [
        { h: 'Director', v: function (d) { return d.name; }, html: function (d) { return H.pLink(d.id); } },
        { h: 'Form', v: function (d) { return C.form(w, d.id).label; } },
        { h: 'Toward you', v: function (d) { var t = C.tie(w, d.id); return t.known ? t.aff : -999; }, html: function (d) { var t = C.tie(w, d.id); return t.known ? '<span class="' + (t.aff >= 30 ? 'pos' : t.aff < -30 ? 'neg' : '') + '">' + C.attitude(t.aff) + '</span>' : '<span class="muted">Unknown</span>'; } },
        { h: 'Work', v: function (d) { return C.tie(w, d.id).work; }, html: function (d) { var t = C.tie(w, d.id); return t.films || t.work ? '<span class="' + (t.work >= 20 ? 'pos' : t.work < 0 ? 'neg' : '') + '">' + C.stance(t.work) + '</span>' : '<span class="muted">—</span>'; } },
        { h: 'Films', cls: 'num', v: function (d) { return C.tie(w, d.id).films; } },
        { h: 'Calling you?', v: function (d) { return C.tie(w, d.id).snub; }, html: function (d) {
          var t = C.tie(w, d.id);
          if (t.work <= -35) return '<span class="neg">No, until things improve</span>';
          return t.snub > c.qi ? '<span class="neg">Not until ' + qLabel(t.snub) + '</span>' : (C.isPartner(t) ? '<span class="pos">Partner</span>' : 'Yes');
        } }
      ], dirs, { sort: [4, -1] }));
    var costars = Object.keys(c.ties).map(Number).filter(function (id) { return w.people[id].role === 'actor' && c.ties[id].known; }).map(function (id) { return w.people[id]; });
    x += H.card('Actors you know', costars.length ? H.table('c-act', [
      { h: 'Actor', v: function (o) { return o.name; }, html: function (o) { return H.pLink(o.id); } },
      { h: 'Toward you', v: function (o) { return C.tie(w, o.id).aff; }, html: function (o) { var t = C.tie(w, o.id); return '<span class="' + (t.aff >= 30 ? 'pos' : t.aff < -30 ? 'neg' : '') + '">' + C.attitude(t.aff) + '</span>'; } },
      { h: 'Work', v: function (o) { return C.tie(w, o.id).work; }, html: function (o) { var t = C.tie(w, o.id); return t.films ? C.stance(t.work) : '<span class="muted">—</span>'; } },
      { h: 'Films', cls: 'num', v: function (o) { return C.tie(w, o.id).films; } },
      { h: 'Fame', cls: 'num', v: function (o) { return o.fame; }, html: function (o) { return Math.round(o.fame); } }
    ], costars, { sort: [3, -1], per: 15 }) : H.empty('Look into co-stars on your pitches, or work with them, to learn how they feel about you.'));
    var studios = w.studios.filter(function (s) { return s.active; });
    x += H.card('Studios', H.table('c-st', [
      { h: 'Studio', v: function (s) { return s.name; }, html: function (s) { return H.sLink(s.id); } },
      { h: 'Rating', v: function (s) { return s.stars; }, html: function (s) { return starsOf(s.stars); } },
      { h: 'Your standing', v: function (s) { return C.stand(w, s.id).stand; }, html: function (s) { var st = C.stand(w, s.id); return '<span class="' + (st.stand >= 15 ? 'pos' : st.stand < 0 ? 'neg' : '') + '">' + Math.round(st.stand) + '</span>' + (st.until > c.qi ? ' <span class="neg small">won\'t hire you until ' + qLabel(st.until) + '</span>' : ''); } },
      { h: 'Cash', cls: 'num', v: function (s) { return s.cash; }, html: function (s) { return H.money(s.cash); } }
    ], studios, { sort: [1, -1] }));
    return x;
  }

  // ---------- history ----------
  function historyTab(H) {
    var w = W(), c = w.career, p = C.player(w);
    var films = p.films.map(function (id) { return w.films[id]; }).reverse();
    var x = '<div class="grid two">';
    x += H.card('Milestones', '<ul class="milestones">' + C.MILESTONES.map(function (m) {
      var got = c.milestones && c.milestones[m[0]];
      return '<li class="' + (got ? 'got' : '') + '"><span>' + (got ? '🏅' : '○') + '</span>' + m[1] + (got ? ' <span class="muted small">' + got.y + '</span>' : '') + '</li>';
    }).join('') + '</ul>');
    x += H.card('Year by year', c.history.length ? H.table('c-hist', [
      { h: 'Year', cls: 'num', v: function (r) { return r.y; } },
      { h: 'Reputation', cls: 'num', v: function (r) { return r.rep; } },
      { h: 'Films', cls: 'num', v: function (r) { return r.films; } },
      { h: 'Laurels', cls: 'num', v: function (r) { return r.wins * 100 + r.noms; }, html: function (r) { return r.noms ? (r.wins ? '🏆' + r.wins + ' ' : '') + r.noms + 'n' : ''; } },
      { h: 'Earned', cls: 'num', v: function (r) { return r.earned; }, html: function (r) { return H.money(r.earned); } }
    ], c.history.slice().reverse(), { per: 12 }) : H.empty('Your first year isn\'t over yet.'));
    x += '</div>';
    x += H.card('Your films', H.table('c-films', [
      { h: 'Year', cls: 'num', v: function (f) { return f.year * 12 + f.month; }, html: function (f) { return HW.MONTHS[f.month] + ' ' + f.year; } },
      { h: 'Title', v: function (f) { return f.title; }, html: function (f) { return H.fLink(f.id); } },
      { h: 'Studio', html: function (f) { var s = w.studios[f.studio]; return H.sLink(s.id); } },
      { h: 'Role', v: function (f) { return castOf(f).r; }, html: function (f) { return castOf(f).r === 'L' ? 'Lead' : 'Supporting'; } },
      { h: 'Result', v: function (f) { return f.gross / ((f.why && f.why.be) || 1); }, html: function (f) { var v = HW.postMortem(w, f).verdict; return '<span class="verdict v-' + verdictTone(v) + '">' + v + '</span>'; } },
      { h: 'Perf.', cls: 'num', v: function (f) { return castOf(f).perf; }, html: function (f) { var k = castOf(f); return '<span class="grade ' + H.scoreCls(k.perf) + '">' + H.grade(k.perf) + '</span>'; } },
      { h: 'Fee', cls: 'num', v: function (f) { return castOf(f).fee; }, html: function (f) { return H.money(castOf(f).fee); } }
    ], films, { per: 20 }));
    x += '<p><a class="btn" href="#/person/' + p.id + '">Your character sheet and career story</a> <button class="btn ghost" data-career="retire">Retire</button></p>';
    return x;
    function castOf(f) { return f.cast.filter(function (k) { return k.p === p.id; })[0]; }
  }

  function logTab(H) {
    var c = W().career;
    return H.card('Career log', '<ul class="news">' + c.log.slice(-60).reverse().map(function (l) {
      var t = H.esc(l.t);
      if (l.r && l.r.f != null) t = '<a href="#/film/' + l.r.f + '" class="lnk plain">' + t + '</a>';
      else if (l.r && l.r.p != null) t = '<a href="#/person/' + l.r.p + '" class="lnk plain">' + t + '</a>';
      return '<li class="nk-' + ({ good: 'boxoffice', bad: 'scandal', milestone: 'awards' }[l.k] || 'people') + '"><span class="ny">' + C.QUARTERS[l.q].slice(0, 3) + ' ' + l.y + '</span> ' + t + '</li>';
    }).join('') + '</ul>');
  }

  // ---------- actions ----------
  function after(report) {
    var w = W();
    HW.save();
    UI.filters.careerTab = 'pitches';
    UI.render();
    window.scrollTo(0, 0);
    if (report && report.film) HW.toast('"' + w.films[report.film.id].title + '": ' + report.film.verdict + '. Reputation ' + Math.round(report.film.repBefore) + ' → ' + Math.round(report.film.repAfter) + '.');
    if (report && report.yearEnded && HW.ceremonyWanted()) UI.startCeremony(report.yearEnded);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-career]');
    if (!t) return;
    var a = t.dataset.career.split(':'), w = W();
    switch (a[0]) {
      case 'start':
        var seedTxt = document.getElementById('cSeed').value.trim();
        var focus = document.querySelector('input[name="cFocus"]:checked');
        HW.startCareer({
          name: document.getElementById('cName').value,
          gender: document.getElementById('cGender').value,
          focus: focus ? focus.value : 'presence',
          startYear: parseInt(document.getElementById('cStart').value, 10) || 1980,
          seed: seedTxt ? (/^\d+$/.test(seedTxt) ? +seedTxt : Array.from(seedTxt).reduce(function (h, ch) { return Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; }, 2166136261)) : undefined
        });
        return;
      case 'new':
        HW.ask('Start over with a new actor? This career\'s save will be deleted.', 'Start over').then(function (ok) { if (ok) HW.abandonCareer(); });
        return;
      case 'inv': C.investigate(w, +a[1]); HW.save(); UI.render(); return;
      case 'seen': w.career.reportSeen = w.career.qi; HW.save(); UI.render(); return;
      case 'sign': after(C.choose(w, +a[1])); return;
      case 'pass': after(C.choose(w, -1)); return;
      case 'passAll':
        HW.ask('Pass on all three? Every director here will stop calling for a while, and you\'ll spend the quarter out of work.', 'Pass on all').then(function (ok) { if (ok) after(C.choose(w, -1)); });
        return;
      case 'retire':
        HW.ask('Retire from acting? Your career ends here.', 'Retire').then(function (ok) { if (ok) { C.retire(w); HW.save(); UI.render(); } });
        return;
    }
  });
})(globalThis.HW = globalThis.HW || {});
