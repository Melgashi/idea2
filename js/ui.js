// Rendering: hash-routed pages built from HTML strings.
(function (HW) {
  var UI = HW.UI = { sorts: {}, pages: {}, filters: {} };

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function W() { return HW.world; }
  function lastYear() { return W().year - 1; }
  function simulated() { return W().history.length > 0; }
  function money(m) { return HW.money(m); }
  function pLink(id) {
    if (id == null) return '<span class="muted">—</span>';
    var p = W().people[id];
    return '<a href="#/person/' + id + '" class="lnk ' + (p.status !== 'active' ? 'inactive' : '') + '">' + esc(p.name) + '</a>';
  }
  function fLink(id) { var f = W().films[id]; return '<a href="#/film/' + id + '" class="lnk film">' + esc(f.title) + '</a>'; }
  function sLink(id) {
    var s = W().studios[id];
    return '<a href="#/studio/' + id + '" class="lnk studio"><i class="dot" style="background:hsl(' + s.hue + ',60%,55%)"></i>' + esc(s.name) + '</a>';
  }
  function yLink(y) { return '<a href="#/awards/' + y + '" class="lnk">' + y + '</a>'; }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(v) { return Math.round(v) + '%'; }
  function scoreCls(v) { return v >= 80 ? 's-elite' : v >= 65 ? 's-good' : v >= 50 ? 's-ok' : v >= 35 ? 's-weak' : 's-bad'; }
  function scoreBadge(v) { return '<span class="score ' + scoreCls(v) + '">' + v + '</span>'; }
  function grade(v) { return v >= 90 ? 'A+' : v >= 82 ? 'A' : v >= 75 ? 'B+' : v >= 68 ? 'B' : v >= 60 ? 'C+' : v >= 52 ? 'C' : v >= 44 ? 'D' : 'F'; }
  function stars(n) { return '<span class="stars">' + '★★★★★'.slice(0, n) + '<span class="off">' + '★★★★★'.slice(n) + '</span></span>'; }
  function meter(v, cls) { return '<span class="meter ' + (cls || '') + '"><span style="width:' + Math.max(0, Math.min(100, v)) + '%"></span></span>'; }
  function tierBadge(t) { return '<span class="tier tier-' + t + '">' + t + '</span>'; }
  function statusBadge(p) {
    if (p.status === 'active') return '<span class="status active">Active</span>';
    if (p.status === 'retired') return '<span class="status retired">Retired ' + p.retired + '</span>';
    return '<span class="status deceased">† ' + p.died + '</span>';
  }
  function ageOf(p) { return (p.status === 'deceased' ? p.died : W().year) - p.born; }
  function laurels(n) { return n ? '<span class="laurel" title="Golden Laurel wins">🏆 ' + n + '</span>' : ''; }
  function card(title, body, extra) { return '<section class="card ' + (extra || '') + '"><h3>' + title + '</h3>' + body + '</section>'; }
  function empty(msg) { return '<p class="muted empty">' + msg + '</p>'; }

  // Sortable table. cols: [{h, v(row)->sortable, html(row)->cell, cls}]
  function table(key, cols, rows, opts) {
    opts = opts || {};
    var st = UI.sorts[key] || (opts.sort ? { c: opts.sort[0], d: opts.sort[1] } : null);
    if (st) {
      var col = cols[st.c];
      if (col && col.v) {
        rows = rows.slice().sort(function (a, b) {
          var x = col.v(a), y = col.v(b);
          if (x == null) return 1; if (y == null) return -1;
          return (x < y ? -1 : x > y ? 1 : 0) * st.d;
        });
      }
    }
    var total = rows.length, per = opts.per || 0, page = 0, pages = 1;
    if (per) {
      pages = Math.max(1, Math.ceil(total / per));
      page = Math.min(UI.pages[key] || 0, pages - 1);
      rows = rows.slice(page * per, page * per + per);
    }
    var h = '<div class="tablewrap"><table class="tbl"><thead><tr>';
    if (opts.rank) h += '<th class="num">#</th>';
    cols.forEach(function (c, i) {
      var arrow = st && st.c === i ? (st.d > 0 ? ' ▲' : ' ▼') : '';
      h += '<th class="' + (c.cls || '') + (c.v ? ' sortable' : '') + '"' + (c.v ? ' data-sort="' + key + ':' + i + '"' : '') + '>' + c.h + arrow + '</th>';
    });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr>';
      if (opts.rank) h += '<td class="num muted">' + (page * per + i + 1) + '</td>';
      cols.forEach(function (c) { h += '<td class="' + (c.cls || '') + '">' + (c.html ? c.html(r) : esc(c.v(r))) + '</td>'; });
      h += '</tr>';
    });
    if (!rows.length) h += '<tr><td colspan="' + (cols.length + (opts.rank ? 1 : 0)) + '" class="muted">Nothing here yet.</td></tr>';
    h += '</tbody></table></div>';
    if (per && pages > 1) {
      h += '<div class="pager"><button class="btn small" data-page="' + key + ':' + (page - 1) + '"' + (page === 0 ? ' disabled' : '') + '>‹ Prev</button>' +
        '<span>Page ' + (page + 1) + ' / ' + pages + ' <span class="muted">(' + num(total) + ')</span></span>' +
        '<button class="btn small" data-page="' + key + ':' + (page + 1) + '"' + (page >= pages - 1 ? ' disabled' : '') + '>Next ›</button></div>';
    }
    return h;
  }

  function filmsOfYear(y) { return W().films.filter(function (f) { return f.year === y; }); }

  // ---------- pages ----------
  var routes = {
    '': overview, 'studios': studiosPage, 'studio': studioPage, 'talent': talentPage, 'person': personPage,
    'films': filmsPage, 'film': filmPage, 'awards': awardsPage, 'history': historyPage, 'records': recordsPage, 'news': newsPage
  };

  UI.render = function () {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/');
    var fn = routes[parts[0]] || overview;
    var html;
    try { html = fn(parts[1]); } catch (e) { console.error(e); html = empty('Something went wrong rendering this page: ' + esc(e.message)); }
    document.getElementById('app').innerHTML = html;
    document.getElementById('yearValue').textContent = W().year;
    var tabs = document.querySelectorAll('#tabs a');
    var section = { studio: 'studios', person: 'talent', film: 'films' }[parts[0]] || parts[0];
    tabs.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href').replace('#/', '') === section); });
  };

  // ---------- overview ----------
  function overview() {
    var w = W();
    var h = '';
    if (!simulated()) {
      h += '<section class="hero"><h1>Welcome to ' + w.year + ' Hollywood</h1>' +
        '<p>' + w.studios.length + ' studios, ' + num(w.people.filter(function (p) { return p.role === 'actor'; }).length) + ' actors and ' +
        num(w.people.filter(function (p) { return p.role !== 'actor'; }).length) + ' directors, writers, cinematographers and composers are ready to make movies. ' +
        'Press <b>Next Year</b> to roll the cameras: studios greenlight films, cast stars, release them, and at year\'s end the town gathers for the <b>Golden Laurels</b>.</p>' +
        '<p class="muted">Explore every studio and every character sheet, then watch careers, franchises and empires rise and fall.</p></section>';
      h += '<div class="grid two">' + card('Biggest stars', topPeople('actor', 'fame', 12)) + card('Most acclaimed directors', topPeople('director', 'prestige', 12)) + '</div>';
      return h;
    }
    var Y = lastYear(), films = filmsOfYear(Y), hist = w.history[w.history.length - 1];
    var aw = w.awards[Y];
    h += '<div class="pagehead"><h1>' + Y + ' in Review</h1>' + (hist.ev ? '<div class="event">📰 ' + esc(hist.ev) + '</div>' : '') + '</div>';
    var prev = w.history[w.history.length - 2];
    var change = prev && prev.g ? Math.round((hist.g - prev.g) / prev.g * 100) : null;
    h += '<div class="stats-row">' +
      stat('Films released', films.length) +
      stat('Total box office', money(hist.g), change != null ? (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change) + '% vs ' + (Y - 1) : '') +
      stat('Avg. critic score', hist.c) +
      stat('Active studios', hist.studios) +
      '</div>';

    h += '<div class="grid two">';
    // awards
    if (aw && aw.cats.length) {
      var rows = aw.cats.slice(0, 6).map(function (c) {
        var n = c.noms[c.win];
        return '<div class="aw-row"><span class="aw-cat">' + HW.catName(c.k) + '</span><span class="aw-win">' +
          (n.p != null ? pLink(n.p) + ' <span class="muted">· ' + fLink(n.f) + '</span>' : fLink(n.f) + ' <span class="muted">· ' + sLink(w.films[n.f].studio) + '</span>') + '</span></div>';
      }).join('');
      h += card('🏆 ' + HW.ordinal(Y - w.startYear + 1) + ' Golden Laurels', rows + '<p><a href="#/awards/' + Y + '" class="lnk">Full ceremony →</a></p>', 'gold');
    }
    var top = films.slice().sort(function (a, b) { return b.gross - a.gross; }).slice(0, 10);
    h += card('Box office top 10', table('ov-top', [
      { h: 'Film', html: function (f) { return fLink(f.id) + '<div class="sub">' + sLink(f.studio) + '</div>'; } },
      { h: 'Genre', v: function (f) { return f.genre; } },
      { h: 'Gross', cls: 'num', html: function (f) { return money(f.gross); } },
      { h: 'Critics', cls: 'num', html: function (f) { return scoreBadge(f.critic); } }
    ], top, { rank: true }));
    h += '</div>';

    h += '<div class="grid three">';
    var order = { event: 0, awards: 1, boxoffice: 2, studio: 3, people: 4, scandal: 5 };
    var heads = w.news.filter(function (n) { return n.y === Y; }).sort(function (a, b) { return order[a.k] - order[b.k]; }).slice(0, 14);
    h += card('Headlines', newsList(heads) + '<p><a href="#/news" class="lnk">All news →</a></p>');
    h += card('Genre appetite', trendBars());
    h += card('Studio standings ' + Y, studioStandings(Y));
    h += '</div>';
    h += '<div class="grid two">' + card('Biggest stars', topPeople('actor', 'fame', 10)) + card('Most acclaimed actors', topPeople('actor', 'prestige', 10)) + '</div>';
    return h;
  }
  function stat(label, value, sub) {
    return '<div class="stat"><div class="stat-v">' + value + '</div><div class="stat-l">' + label + '</div>' + (sub ? '<div class="stat-s">' + sub + '</div>' : '') + '</div>';
  }
  function topPeople(role, key, n) {
    var list = W().people.filter(function (p) { return p.role === role && p.status === 'active'; })
      .sort(function (a, b) { return b[key] - a[key]; }).slice(0, n);
    return '<ol class="plist">' + list.map(function (p) {
      return '<li>' + pLink(p.id) + ' <span class="muted">' + ageOf(p) + '</span>' + laurels(p.wins) + '<span class="right">' + meter(p[key], key) + ' ' + Math.round(p[key]) + '</span></li>';
    }).join('') + '</ol>';
  }
  function trendBars() {
    var t = W().trends;
    return '<div class="bars">' + HW.GENRE_KEYS.slice().sort(function (a, b) { return t[b] - t[a]; }).map(function (g) {
      var v = t[g];
      return '<div class="barrow"><span class="bl">' + g + '</span><span class="bb"><span class="' + (v >= 1.15 ? 'hot' : v <= 0.8 ? 'cold' : '') + '" style="width:' + Math.min(100, v / 1.9 * 100) + '%"></span></span><span class="bv">' + v.toFixed(2) + '×</span></div>';
    }).join('') + '</div>';
  }
  function studioStandings(Y) {
    var rows = W().studios.filter(function (s) { return s.yearly.length && s.yearly[s.yearly.length - 1].y === Y; })
      .map(function (s) { return { s: s, r: s.yearly[s.yearly.length - 1] }; })
      .sort(function (a, b) { return b.r.g - a.r.g; }).slice(0, 10);
    return '<ol class="plist">' + rows.map(function (x) {
      return '<li>' + sLink(x.s.id) + '<span class="right">' + money(x.r.g) + ' <span class="' + (x.r.p >= 0 ? 'pos' : 'neg') + '">' + (x.r.p >= 0 ? '+' : '') + money(x.r.p) + '</span></span></li>';
    }).join('') + '</ol>';
  }
  function newsList(items) {
    if (!items.length) return empty('No news yet.');
    return '<ul class="news">' + items.map(function (n) {
      var t = esc(n.t);
      if (n.r) {
        if (n.r.f != null) t = '<a href="#/film/' + n.r.f + '" class="lnk plain">' + t + '</a>';
        else if (n.r.p != null) t = '<a href="#/person/' + n.r.p + '" class="lnk plain">' + t + '</a>';
        else if (n.r.s != null) t = '<a href="#/studio/' + n.r.s + '" class="lnk plain">' + t + '</a>';
      }
      return '<li class="nk-' + n.k + '"><span class="ny">' + n.y + '</span> ' + t + '</li>';
    }).join('') + '</ul>';
  }

  // ---------- studios ----------
  function studiosPage() {
    var w = W(), f = UI.filters.studios || 'active';
    var list = w.studios.filter(function (s) { return f === 'all' || (f === 'active') === s.active; });
    var Y = lastYear();
    var h = '<div class="pagehead"><h1>Studios</h1>' + seg('studios', f, [['active', 'Active'], ['closed', 'Defunct'], ['all', 'All']]) + '</div>';
    h += table('studios', [
      { h: 'Studio', v: function (s) { return s.name; }, html: function (s) { return sLink(s.id) + (s.active ? '' : ' <span class="muted small">(' + (s.fate && s.fate.type === 'acquired' ? 'acquired ' : 'closed ') + s.closed + ')</span>'); } },
      { h: 'Tier', v: function (s) { return { Major: 3, Mid: 2, Indie: 1 }[s.tier]; }, html: function (s) { return tierBadge(s.tier); } },
      { h: 'Founded', cls: 'num', v: function (s) { return s.founded; } },
      { h: 'Cash', cls: 'num', v: function (s) { return s.cash; }, html: function (s) { return '<span class="' + (s.cash < 0 ? 'neg' : '') + '">' + money(s.cash) + '</span>'; } },
      { h: 'Prestige', cls: 'num', v: function (s) { return s.prestige; }, html: function (s) { return meter(s.prestige, 'prestige') + ' ' + s.prestige; } },
      { h: 'Style', v: function (s) { return s.commercial; }, html: function (s) { return lean(s.commercial); } },
      { h: Y + ' gross', cls: 'num', v: function (s) { var r = lastRec(s, Y); return r ? r.g : -1; }, html: function (s) { var r = lastRec(s, Y); return r ? money(r.g) : '—'; } },
      { h: 'Films', cls: 'num', v: function (s) { return s.films.length; } },
      { h: 'Career gross', cls: 'num', v: function (s) { return careerGross(s); }, html: function (s) { return money(careerGross(s)); } },
      { h: 'Laurels', cls: 'num', v: function (s) { return s.wins; } },
      { h: 'Best Pic.', cls: 'num', v: function (s) { return s.bestPictures; } }
    ], list, { sort: [3, -1] });
    return h;
  }
  function lastRec(s, Y) { var r = s.yearly[s.yearly.length - 1]; return r && r.y === Y ? r : null; }
  function careerGross(s) { var g = 0; s.yearly.forEach(function (r) { g += r.g; }); return g; }
  function lean(c) {
    return '<span class="lean" title="' + (c < 0.4 ? 'Arthouse' : c > 0.65 ? 'Commercial' : 'Balanced') + '"><span style="left:' + c * 100 + '%"></span></span>';
  }
  function seg(key, cur, opts) {
    return '<div class="seg">' + opts.map(function (o) {
      return '<button class="' + (o[0] === cur ? 'on' : '') + '" data-filter="' + key + ':' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function studioPage(id) {
    var w = W(), s = w.studios[+id];
    if (!s) return empty('No such studio.');
    var prefs = HW.GENRE_KEYS.slice().sort(function (a, b) { return s.prefs[b] - s.prefs[a]; }).slice(0, 3);
    var films = s.films.map(function (fid) { return w.films[fid]; });
    var h = '<div class="pagehead studiohead" style="--hue:' + s.hue + '"><div><h1>' + esc(s.name) + '</h1><div class="meta">' + tierBadge(s.tier) +
      ' Founded ' + s.founded + (s.active ? '' : ' · <b>' + (s.fate && s.fate.type === 'acquired' ? 'Acquired by ' + sLink(s.fate.by) : 'Closed') + ' in ' + s.closed + '</b>') + '</div></div></div>';
    h += '<div class="stats-row">' + stat('Cash', money(s.cash)) + stat('Prestige', s.prestige) + stat('Films', films.length) +
      stat('Career gross', money(careerGross(s))) + stat('Laurels', s.wins + ' <span class="small muted">/ ' + s.noms + ' noms</span>') + stat('Best Pictures', s.bestPictures) + '</div>';
    h += '<div class="grid two">';
    h += card('Profile', '<dl class="kv"><dt>Style</dt><dd>' + lean(s.commercial) + ' ' + (s.commercial < 0.4 ? 'Arthouse' : s.commercial > 0.65 ? 'Commercial' : 'Balanced') + '</dd>' +
      '<dt>Signature genres</dt><dd>' + prefs.join(', ') + '</dd>' +
      '<dt>Paid to parent co.</dt><dd>' + money(s.paidOut || 0) + '</dd>' +
      '<dt>Biggest hit</dt><dd>' + (films.length ? fLink(films.slice().sort(function (a, b) { return b.gross - a.gross; })[0].id) : '—') + '</dd>' +
      '<dt>Most acclaimed</dt><dd>' + (films.length ? fLink(films.slice().sort(function (a, b) { return b.critic - a.critic; })[0].id) : '—') + '</dd></dl>');
    h += card('Year by year', table('st-years-' + s.id, [
      { h: 'Year', v: function (r) { return r.y; } },
      { h: 'Tier', html: function (r) { return tierBadge(r.tier); } },
      { h: 'Films', cls: 'num', v: function (r) { return r.n; } },
      { h: 'Gross', cls: 'num', v: function (r) { return r.g; }, html: function (r) { return money(r.g); } },
      { h: 'Profit', cls: 'num', v: function (r) { return r.p; }, html: function (r) { return '<span class="' + (r.p >= 0 ? 'pos' : 'neg') + '">' + money(r.p) + '</span>'; } },
      { h: 'Cash', cls: 'num', v: function (r) { return r.c; }, html: function (r) { return money(r.c); } },
      { h: 'Laurels', cls: 'num', v: function (r) { return r.w; } }
    ], s.yearly.slice().reverse(), { per: 15 }));
    h += '</div>';
    h += card('Filmography', filmTable('st-films-' + s.id, films.slice().reverse(), { studio: false }));
    return h;
  }

  function filmTable(key, films, o) {
    o = o || {};
    var cols = [
      { h: 'Year', cls: 'num', v: function (f) { return f.year; } },
      { h: 'Title', v: function (f) { return f.title; }, html: function (f) { return fLink(f.id) + tags(f); } }
    ];
    if (o.studio !== false) cols.push({ h: 'Studio', v: function (f) { return W().studios[f.studio].name; }, html: function (f) { return sLink(f.studio); } });
    cols.push(
      { h: 'Genre', v: function (f) { return f.genre; } },
      { h: 'Director', v: function (f) { return W().people[f.director].name; }, html: function (f) { return pLink(f.director); } },
      { h: 'Budget', cls: 'num', v: function (f) { return f.budget; }, html: function (f) { return money(f.budget); } },
      { h: 'Gross', cls: 'num', v: function (f) { return f.gross; }, html: function (f) { return money(f.gross); } },
      { h: 'Critics', cls: 'num', v: function (f) { return f.critic; }, html: function (f) { return scoreBadge(f.critic); } },
      { h: 'Audience', cls: 'num', v: function (f) { return f.audience; }, html: function (f) { return scoreBadge(f.audience); } },
      { h: 'Laurels', cls: 'num', v: function (f) { return f.wins * 100 + f.noms; }, html: function (f) { return f.noms ? (f.wins ? '🏆' + f.wins + ' ' : '') + '<span class="muted">' + f.noms + 'n</span>' : ''; } }
    );
    return table(key, cols, films, { per: o.per || 25 });
  }
  function tags(f) {
    var t = '';
    if (f.won.indexOf('picture') >= 0) t += ' <span class="tag gold">Best Picture</span>';
    if (f.tags.indexOf('smash') >= 0) t += ' <span class="tag green">Smash</span>';
    if (f.tags.indexOf('sleeper') >= 0) t += ' <span class="tag green">Sleeper</span>';
    if (f.tags.indexOf('flop') >= 0) t += ' <span class="tag red">Flop</span>';
    return t;
  }

  // ---------- talent ----------
  function talentPage() {
    var w = W();
    var role = UI.filters.role || 'actor', status = UI.filters.status || 'active', q = (UI.filters.q || '').toLowerCase();
    var list = w.people.filter(function (p) {
      return p.role === role && (status === 'all' || p.status === status) && (!q || p.name.toLowerCase().indexOf(q) >= 0);
    });
    var h = '<div class="pagehead"><h1>Talent</h1>' +
      seg('role', role, HW.ROLE_KEYS.map(function (r) { return [r, HW.ROLES[r].plural]; })) + '</div>';
    h += '<div class="toolbar">' + seg('status', status, [['active', 'Active'], ['retired', 'Retired'], ['deceased', 'Deceased'], ['all', 'All']]) +
      '<input type="search" id="talentSearch" placeholder="Search name…" value="' + esc(UI.filters.q || '') + '"></div>';
    var cols = [
      { h: 'Name', v: function (p) { return p.name; }, html: function (p) { return pLink(p.id) + (p.traits.length ? '<div class="sub">' + p.traits.map(function (t) { return HW.TRAITS[t].name; }).join(' · ') + '</div>' : ''); } },
      { h: 'Age', cls: 'num', v: function (p) { return ageOf(p); } },
      { h: 'Sex', v: function (p) { return p.gender; } },
      { h: 'OVR', cls: 'num', v: function (p) { return HW.ovr(p); }, html: function (p) { return scoreBadge(HW.ovr(p)); } },
      { h: 'Pot.', cls: 'num', v: function (p) { return HW.potentialStars(p); }, html: function (p) { return stars(HW.potentialStars(p)); } }
    ];
    var keyStats = { actor: ['acting', 'charisma', 'looks'], director: ['vision', 'craft'], writer: ['originality', 'dialogue'], cinematographer: ['visuals'], composer: ['melody'] }[role];
    keyStats.forEach(function (k) { cols.push({ h: HW.STAT_LABELS[k], cls: 'num', v: function (p) { return p.stats[k]; } }); });
    cols.push(
      { h: 'Fame', cls: 'num', v: function (p) { return p.fame; }, html: function (p) { return Math.round(p.fame); } },
      { h: 'Prestige', cls: 'num', v: function (p) { return p.prestige; }, html: function (p) { return Math.round(p.prestige); } },
      { h: 'Films', cls: 'num', v: function (p) { return p.films.length; } },
      { h: 'Laurels', cls: 'num', v: function (p) { return p.wins * 1000 + p.noms; }, html: function (p) { return p.noms ? (p.wins ? '🏆' + p.wins + ' ' : '') + '<span class="muted">' + p.noms + 'n</span>' : ''; } }
    );
    h += table('talent-' + role, cols, list, { per: 50, sort: [cols.length - 4, -1] });
    return h;
  }

  function personPage(id) {
    var w = W(), p = w.people[+id];
    if (!p) return empty('No such person.');
    var R = HW.ROLES[p.role], ovr = HW.ovr(p);
    var awards = HW.personAwards(w, p.id);
    var h = '<div class="sheet">';
    h += '<div class="sheet-head"><div class="avatar g' + p.gender + '">' + initials(p.name) + '</div><div class="who"><h1>' + esc(p.name) + '</h1>' +
      '<div class="meta">' + R.label + ' · ' + (p.gender === 'M' ? 'Male' : 'Female') + ' · Age ' + ageOf(p) + ' (b. ' + p.born + ') · Debut ' + p.debut + ' ' + statusBadge(p) + '</div>' +
      '<div class="traits">' + (p.traits.length ? p.traits.map(function (t) { return '<span class="trait" title="' + esc(HW.TRAITS[t].desc) + '">' + HW.TRAITS[t].name + '</span>'; }).join('') : '<span class="muted small">No notable traits</span>') +
      (p.specialty ? p.specialty.map(function (g) { return '<span class="trait spec" title="Specialty genre">' + g + '</span>'; }).join('') : '') +
      (p.lifetime ? '<span class="trait gold" title="Lifetime Achievement Laurel">Lifetime Laurel ' + p.lifetime + '</span>' : '') + '</div></div>' +
      '<div class="ovr"><div class="ovr-v ' + scoreCls(ovr) + '">' + ovr + '</div><div class="ovr-l">OVR</div>' + stars(HW.potentialStars(p)) + '<div class="ovr-l">Potential</div></div></div>';

    h += '<div class="grid sheet-grid">';
    var statRows = R.stats.map(function (k) {
      var v = p.stats[k];
      return '<div class="statline"><span class="sl">' + HW.STAT_LABELS[k] + '</span><span class="sb"><span class="' + scoreCls(v) + '" style="width:' + v + '%"></span></span><span class="sv">' + v + '</span></div>';
    }).join('');
    h += card('Attributes', statRows + '<p class="muted small">Peaks around age ' + p.peakAge + '. Attributes grow with experience and fade with age.</p>');
    var bp = p.bestPerf ? w.films[p.bestPerf.f] : null;
    h += card('Standing', '<div class="statline"><span class="sl">Fame</span><span class="sb">' + '<span class="fame" style="width:' + p.fame + '%"></span></span><span class="sv">' + Math.round(p.fame) + '</span></div>' +
      '<div class="statline"><span class="sl">Prestige</span><span class="sb"><span class="prestige" style="width:' + p.prestige + '%"></span></span><span class="sv">' + Math.round(p.prestige) + '</span></div>' +
      '<dl class="kv"><dt>Asking fee</dt><dd>' + money(HW.fee(p)) + ' / film</dd>' +
      '<dt>Films</dt><dd>' + p.films.length + '</dd>' +
      '<dt>Career gross</dt><dd>' + money(p.gross) + '</dd>' +
      '<dt>Golden Laurels</dt><dd>' + p.wins + ' wins / ' + p.noms + ' nominations</dd>' +
      (bp ? '<dt>Best performance</dt><dd>' + fLink(bp.id) + ' (' + bp.year + ') — ' + grade(p.bestPerf.v) + '</dd>' : '') +
      '<dt>Last worked</dt><dd>' + (p.lastWorked || '—') + '</dd></dl>');
    h += card('Golden Laurels', awards.length ? '<ul class="awl">' + awards.map(function (a) {
      return '<li class="' + (a.won ? 'won' : '') + '"><span class="ny">' + yLink(a.y) + '</span> ' + (a.won ? '🏆 <b>Won</b> ' : 'Nominated ') + HW.catName(a.k) + ' — ' + fLink(a.f) + '</li>';
    }).join('') + '</ul>' : empty('No nominations yet.'));
    h += card('Frequent collaborators', collaborators(p));
    h += '</div>';

    var films = p.films.map(function (fid) { return w.films[fid]; }).reverse();
    h += card('Filmography', table('pf-' + p.id, [
      { h: 'Year', cls: 'num', v: function (f) { return f.year; } },
      { h: 'Title', v: function (f) { return f.title; }, html: function (f) { return fLink(f.id) + tags(f); } },
      { h: 'Credit', v: function (f) { return creditOf(f, p.id); } },
      { h: 'Studio', html: function (f) { return sLink(f.studio); } },
      { h: 'Genre', v: function (f) { return f.genre; } },
      { h: 'Perf.', cls: 'num', v: function (f) { var c = castOf(f, p.id); return c ? c.perf : null; }, html: function (f) { var c = castOf(f, p.id); return c ? '<span class="grade ' + scoreCls(c.perf) + '">' + grade(c.perf) + '</span>' : ''; } },
      { h: 'Gross', cls: 'num', v: function (f) { return f.gross; }, html: function (f) { return money(f.gross); } },
      { h: 'Critics', cls: 'num', v: function (f) { return f.critic; }, html: function (f) { return scoreBadge(f.critic); } }
    ], films, { per: 30 }));
    h += '</div>';
    return h;
  }
  function initials(n) { return esc(n.split(' ').map(function (x) { return x[0]; }).slice(0, 2).join('')); }
  function castOf(f, pid) { for (var i = 0; i < f.cast.length; i++) if (f.cast[i].p === pid) return f.cast[i]; return null; }
  function creditOf(f, pid) {
    var c = castOf(f, pid);
    if (c) return c.r === 'L' ? 'Lead' : 'Supporting';
    if (f.director === pid) return 'Director';
    if (f.writer === pid) return 'Writer';
    if (f.dp === pid) return 'Cinematography';
    if (f.composer === pid) return 'Music';
    return '';
  }
  function collaborators(p) {
    var w = W(), count = {};
    p.films.forEach(function (fid) {
      var f = w.films[fid];
      var ids = f.cast.map(function (c) { return c.p; }).concat([f.director, f.writer, f.dp, f.composer]);
      ids.forEach(function (id) { if (id != null && id !== p.id) count[id] = (count[id] || 0) + 1; });
    });
    var top = Object.keys(count).filter(function (k) { return count[k] >= 2; }).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 8);
    if (!top.length) return empty('No repeat collaborators yet.');
    return '<ul class="plist">' + top.map(function (id) {
      return '<li>' + pLink(+id) + ' <span class="muted small">' + HW.ROLES[w.people[id].role].label + '</span><span class="right">' + count[id] + ' films</span></li>';
    }).join('') + '</ul>';
  }

  // ---------- films ----------
  function filmsPage() {
    var w = W();
    if (!simulated()) return '<div class="pagehead"><h1>Films</h1></div>' + empty('No films released yet — advance a year.');
    var y = UI.filters.filmYear != null ? UI.filters.filmYear : lastYear();
    var genre = UI.filters.genre || 'all';
    var list = w.films.filter(function (f) { return (y === 'all' || f.year === +y) && (genre === 'all' || f.genre === genre); });
    var years = [];
    for (var i = lastYear(); i >= w.startYear; i--) years.push(i);
    var h = '<div class="pagehead"><h1>Films</h1></div><div class="toolbar">' +
      '<select data-select="filmYear"><option value="all"' + (y === 'all' ? ' selected' : '') + '>All years</option>' + years.map(function (yy) { return '<option' + (+y === yy ? ' selected' : '') + '>' + yy + '</option>'; }).join('') + '</select>' +
      '<select data-select="genre"><option value="all">All genres</option>' + HW.GENRE_KEYS.map(function (g) { return '<option' + (genre === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></div>';
    h += filmTable('films', list, { per: 40 });
    return h;
  }

  function filmPage(id) {
    var w = W(), f = w.films[+id];
    if (!f) return empty('No such film.');
    var aw = HW.filmAwards(w, f.id);
    var hue = (HW.GENRE_KEYS.indexOf(f.genre) * 360 / HW.GENRE_KEYS.length) | 0;
    var h = '<div class="filmhead" style="--hue:' + hue + '"><div class="poster"><div class="pt">' + esc(f.title) + '</div><div class="pg">' + f.genre + '</div><div class="py">' + HW.MONTHS[f.month] + ' ' + f.year + '</div></div>' +
      '<div class="finfo"><h1>' + esc(f.title) + '</h1><div class="meta">' + sLink(f.studio) + ' · ' + f.genre + ' · Released ' + HW.MONTHS[f.month] + ' ' + f.year + tags(f) + '</div>' +
      '<div class="stats-row">' + stat('Budget', money(f.budget)) + stat('Worldwide gross', money(f.gross)) +
      stat('Studio profit', '<span class="' + (f.profit >= 0 ? 'pos' : 'neg') + '">' + money(f.profit) + '</span>') +
      stat('Critics', scoreBadge(f.critic)) + stat('Audience', scoreBadge(f.audience)) + '</div></div></div>';
    h += '<div class="grid two">';
    h += card('Crew', '<dl class="kv"><dt>Director</dt><dd>' + pLink(f.director) + '</dd><dt>Screenplay</dt><dd>' + pLink(f.writer) + '</dd>' +
      '<dt>Cinematography</dt><dd>' + pLink(f.dp) + '</dd><dt>Music</dt><dd>' + pLink(f.composer) + '</dd>' +
      (f.overrun > 0.12 ? '<dt>Production</dt><dd class="neg">Went ' + Math.round(f.overrun * 100) + '% over budget</dd>' : '') + '</dl>' +
      '<h4>Craft breakdown</h4>' + ['script', 'dir', 'act', 'tech', 'music'].map(function (k) {
        var v = Math.max(0, Math.min(99, f.sc[k]));
        return '<div class="statline"><span class="sl">' + { script: 'Screenplay', dir: 'Direction', act: 'Acting', tech: 'Visuals', music: 'Score' }[k] + '</span><span class="sb"><span class="' + scoreCls(v) + '" style="width:' + v + '%"></span></span><span class="sv">' + v + '</span></div>';
      }).join(''));
    h += card('Cast', table('fc-' + f.id, [
      { h: 'Actor', html: function (c) { return pLink(c.p); } },
      { h: 'Role', html: function (c) { return c.r === 'L' ? 'Lead' : 'Supporting'; } },
      { h: 'Fee', cls: 'num', html: function (c) { return money(c.fee) + (c.cut ? ' <span class="tag" title="Took a pay cut for this role">cut</span>' : ''); } },
      { h: 'Performance', cls: 'num', html: function (c) { return '<span class="grade ' + scoreCls(c.perf) + '">' + grade(c.perf) + '</span> <span class="muted small">' + c.perf + '</span>'; } }
    ], f.cast));
    h += '</div><div class="grid two">';
    h += card('Golden Laurels', aw.length ? '<ul class="awl">' + aw.map(function (a) {
      return '<li class="' + (a.won ? 'won' : '') + '">' + (a.won ? '🏆 <b>Won</b> ' : 'Nominated ') + HW.catName(a.k) + (a.p != null ? ' — ' + pLink(a.p) : '') + '</li>';
    }).join('') + '</ul>' : empty('No nominations.'));
    var rootId = f.root != null ? f.root : f.id;
    var chain = w.films.filter(function (x) { return x.id === rootId || x.root === rootId; });
    h += card('Franchise', chain.length > 1 ? '<ol class="plist">' + chain.map(function (x) {
      return '<li>' + (x.id === f.id ? '<b>' + esc(x.title) + '</b>' : fLink(x.id)) + ' <span class="muted">' + x.year + '</span><span class="right">' + money(x.gross) + ' ' + scoreBadge(x.critic) + '</span></li>';
    }).join('') + '</ol>' : empty('A standalone film — for now.'));
    h += '</div>';
    return h;
  }

  // ---------- awards ----------
  function awardsPage(y) {
    var w = W();
    var years = Object.keys(w.awards).map(Number).sort(function (a, b) { return a - b; });
    var h = '<div class="pagehead"><h1>The Golden Laurels</h1></div>';
    if (!years.length) return h + empty('The first ceremony takes place at the end of the first year.');
    y = y ? +y : years[years.length - 1];
    var c = w.awards[y];
    if (!c) return h + empty('No ceremony for ' + y + '.');
    var i = years.indexOf(y);
    h += '<div class="toolbar yearnav">' + (i > 0 ? '<a class="btn small" href="#/awards/' + years[i - 1] + '">‹ ' + years[i - 1] + '</a>' : '<span></span>') +
      '<h2>' + HW.ordinal(y - w.startYear + 1) + ' Golden Laurels <span class="muted">· honoring the films of ' + y + '</span></h2>' +
      (i < years.length - 1 ? '<a class="btn small" href="#/awards/' + years[i + 1] + '">' + years[i + 1] + ' ›</a>' : '<span></span>') + '</div>';
    h += '<div class="grid awards">';
    c.cats.forEach(function (cat) {
      var body = '<ol class="noms">' + cat.noms.map(function (n, idx) {
        var won = idx === cat.win;
        return '<li class="' + (won ? 'won' : '') + '">' + (won ? '<span class="statue">🏆</span>' : '<span class="statue off">•</span>') +
          (n.p != null ? pLink(n.p) + '<div class="sub">' + fLink(n.f) + '</div>' : fLink(n.f) + '<div class="sub">' + sLink(w.films[n.f].studio) + '</div>') + '</li>';
      }).join('') + '</ol>';
      h += card(HW.catName(cat.k), body, cat.k === 'picture' ? 'gold' : '');
    });
    if (c.lifetime != null) h += card('Lifetime Achievement', '<p class="lifetime">' + pLink(c.lifetime) + '</p><p class="muted small">' + HW.ROLES[w.people[c.lifetime].role].label + ' · ' + w.people[c.lifetime].films.length + ' films</p>', 'gold');
    h += '</div>';

    var winners = w.people.filter(function (p) { return p.wins > 0; });
    h += '<div class="grid two">' + card('Hall of Fame — most Laurels', table('hof', [
      { h: 'Name', html: function (p) { return pLink(p.id); } },
      { h: 'Role', v: function (p) { return HW.ROLES[p.role].label; } },
      { h: 'Wins', cls: 'num', v: function (p) { return p.wins; } },
      { h: 'Noms', cls: 'num', v: function (p) { return p.noms; } }
    ], winners, { sort: [2, -1], per: 15, rank: true })) +
      card('Best Picture winners', '<ul class="plist">' + years.slice().reverse().map(function (yy) {
        var bp = w.awards[yy].cats[0];
        var f = w.films[bp.noms[bp.win].f];
        return '<li><span class="ny">' + yLink(yy) + '</span> ' + fLink(f.id) + '<span class="right muted small">' + esc(w.studios[f.studio].name) + '</span></li>';
      }).join('') + '</ul>') + '</div>';
    return h;
  }

  // ---------- history ----------
  function historyPage() {
    var w = W();
    var h = '<div class="pagehead"><h1>Industry History</h1></div>';
    if (!simulated()) return h + empty('History is yet to be written.');
    var maxG = Math.max.apply(null, w.history.map(function (r) { return r.g; }));
    h += card('Box office by year', '<div class="chart">' + w.history.map(function (r) {
      return '<div class="col" title="' + r.y + ': ' + money(r.g) + '"><span style="height:' + (r.g / maxG * 100) + '%"></span><i>' + (r.y % 5 === 0 ? r.y : '') + '</i></div>';
    }).join('') + '</div>');
    h += table('history', [
      { h: 'Year', cls: 'num', v: function (r) { return r.y; } },
      { h: 'Films', cls: 'num', v: function (r) { return r.n; } },
      { h: 'Total gross', cls: 'num', v: function (r) { return r.g; }, html: function (r) { return money(r.g); } },
      { h: 'Avg critic', cls: 'num', v: function (r) { return r.c; } },
      { h: 'Top grosser', html: function (r) { return r.top != null ? fLink(r.top) + ' <span class="muted small">' + money(w.films[r.top].gross) + '</span>' : '—'; } },
      { h: 'Best Picture', html: function (r) { return r.bp != null ? fLink(r.bp) : '—'; } },
      { h: 'Hottest genre', html: function (r) { return r.trends ? HW.GENRE_KEYS.reduce(function (a, g) { return r.trends[g] > r.trends[a] ? g : a; }) : ''; } },
      { h: 'Event', html: function (r) { return r.ev ? '<span class="small">' + esc(r.ev) + '</span>' : ''; } }
    ], w.history.slice().reverse(), { per: 25 });
    return h;
  }

  // ---------- records ----------
  function recordsPage() {
    var w = W();
    var h = '<div class="pagehead"><h1>All-Time Records</h1></div>';
    if (!simulated()) return h + empty('No records yet.');
    var films = w.films;
    function topFilms(fn, n) { return films.slice().sort(function (a, b) { return fn(b) - fn(a); }).slice(0, n); }
    var mini = function (key, list, valH) {
      return table(key, [
        { h: 'Film', html: function (f) { return fLink(f.id) + '<div class="sub">' + f.year + ' · ' + sLink(f.studio) + '</div>'; } },
        { h: '', cls: 'num', html: valH }
      ], list, { rank: true });
    };
    h += '<div class="grid three">';
    h += card('Highest grossing', mini('r1', topFilms(function (f) { return f.gross; }, 15), function (f) { return money(f.gross); }));
    h += card('Best reviewed', mini('r2', topFilms(function (f) { return f.critic * 1000 + f.audience; }, 15), function (f) { return scoreBadge(f.critic); }));
    h += card('Most Laurels', mini('r3', topFilms(function (f) { return f.wins * 100 + f.noms; }, 15), function (f) { return '🏆' + f.wins + ' <span class="muted">/' + f.noms + '</span>'; }));
    h += card('Most profitable', mini('r4', topFilms(function (f) { return f.profit; }, 15), function (f) { return '<span class="pos">' + money(f.profit) + '</span>'; }));
    h += card('Biggest bombs', mini('r5', topFilms(function (f) { return -f.profit; }, 15), function (f) { return '<span class="neg">' + money(f.profit) + '</span>'; }));
    // franchises
    var fr = {};
    films.forEach(function (f) { var r = f.root != null ? f.root : f.id; (fr[r] = fr[r] || []).push(f); });
    var frList = Object.keys(fr).filter(function (k) { return fr[k].length > 1; }).map(function (k) {
      return { root: +k, n: fr[k].length, g: fr[k].reduce(function (a, f) { return a + f.gross; }, 0) };
    }).sort(function (a, b) { return b.g - a.g; }).slice(0, 15);
    h += card('Biggest franchises', table('r6', [
      { h: 'Franchise', html: function (x) { return fLink(x.root) + '<div class="sub">' + x.n + ' films</div>'; } },
      { h: '', cls: 'num', html: function (x) { return money(x.g); } }
    ], frList, { rank: true }));
    h += '</div>';
    function topP(key, fn, valH, filter) {
      var list = w.people.filter(filter || function () { return true; }).sort(function (a, b) { return fn(b) - fn(a); }).slice(0, 15);
      return table(key, [{ h: 'Name', html: function (p) { return pLink(p.id) + '<div class="sub">' + HW.ROLES[p.role].label + '</div>'; } }, { h: '', cls: 'num', html: valH }], list, { rank: true });
    }
    h += '<div class="grid three">';
    h += card('Box office kings (actors)', topP('r7', function (p) { return p.gross; }, function (p) { return money(p.gross); }, function (p) { return p.role === 'actor'; }));
    h += card('Most prolific', topP('r8', function (p) { return p.films.length; }, function (p) { return p.films.length + ' films'; }));
    h += card('Always the nominee', topP('r9', function (p) { return p.noms - p.wins * 3; }, function (p) { return p.noms + ' noms, ' + p.wins + ' wins'; }, function (p) { return p.noms > 0; }));
    h += '</div>';
    return h;
  }

  // ---------- news ----------
  function newsPage() {
    var w = W(), k = UI.filters.newsKind || 'all';
    var list = w.news.filter(function (n) { return k === 'all' || n.k === k; }).slice(-300).reverse();
    return '<div class="pagehead"><h1>Trade Papers</h1>' + seg('newsKind', k, [['all', 'All'], ['boxoffice', 'Box office'], ['awards', 'Awards'], ['studio', 'Studios'], ['people', 'People'], ['scandal', 'Scandals'], ['event', 'Industry']]) + '</div>' +
      card('Latest', newsList(list));
  }
})(globalThis.HW = globalThis.HW || {});
