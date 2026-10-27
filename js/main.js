// Boot, persistence (IndexedDB), and input handling.
(function (HW) {
  // Two save slots: 'current' is the sandbox world, 'career' is the career-mode world. 'mode' remembers which is open.
  var DB = 'hollywood-dynasty', STORE = 'saves';
  var busy = false, autoTimer = null;
  HW.careerMeta = null;

  function openDb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function put(entries) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
        for (var k in entries) st.put(entries[k], k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function get(key) {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = function () { res(r.result == null ? null : r.result); };
        r.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function isCareer(w) { return !!(w && w.mode === 'career'); }
  function save() {
    var w = HW.world, e = { mode: isCareer(w) ? 'career' : 'sandbox' };
    e[isCareer(w) ? 'career' : 'current'] = JSON.stringify(w);
    if (isCareer(w)) e.careerMeta = HW.careerMeta = { agency: w.career.agency, year: w.year, over: !!w.career.over };
    return put(e).catch(function (err) { console.warn('Save failed', err); toast('Could not save: ' + err.message); });
  }
  HW.save = save;
  function parse(txt) { try { var w = txt ? JSON.parse(txt) : null; return w && w.version === 2 ? w : null; } catch (e) { return null; } }

  function resetView() { HW.UI.sorts = {}; HW.UI.pages = {}; HW.UI.filters = {}; }
  // Switch between the sandbox and career worlds; each keeps its own save.
  HW.switchMode = function (mode) {
    if (busy) return;
    setAuto(false);
    HW.UI.closeCeremony();
    return save().then(function () { return get(mode === 'career' ? 'career' : 'current'); }).then(function (txt) {
      var w = parse(txt);
      if (!w && mode === 'career') { toast('No career in progress.'); return; }
      HW.world = w || HW.newWorld({ startYear: 1980 });
      resetView();
      return put({ mode: mode }).then(function () {
        location.hash = mode === 'career' ? '#/career' : '#/';
        HW.UI.render();
        toast(mode === 'career' ? 'Welcome back to ' + HW.world.career.agency + '.' : 'Back to the sandbox.');
      });
    });
  };
  // Delete the career save and return to the sandbox.
  HW.abandonCareer = function () {
    if (busy) return;
    HW.UI.closeCeremony();
    HW.careerMeta = null;
    return put({ career: null, careerMeta: null, mode: 'sandbox' }).then(function () { return get('current'); }).then(function (txt) {
      HW.world = parse(txt) || HW.newWorld({ startYear: 1980 });
      resetView();
      location.hash = '#/career';
      HW.UI.render();
      toast('Career abandoned.');
    });
  };
  HW.startCareer = function (opts) {
    if (busy) return;
    setAuto(false);
    var start = function () {
      HW.world = HW.Career.newCareer(opts);
      resetView();
      save();
      location.hash = '#/career';
      HW.UI.render();
      toast(HW.world.career.agency + ' opens its doors in ' + HW.world.year + '.');
    };
    // keep the sandbox safe before replacing the open world
    if (isCareer(HW.world)) start(); else save().then(start);
  };

  // Chrome that depends on the mode: career banner, hidden multi-year controls.
  function updateChrome() {
    var w = HW.world, banner = document.getElementById('modeBanner');
    document.body.classList.toggle('career-mode', isCareer(w));
    if (!isCareer(w)) { banner.hidden = true; return; }
    var c = w.career;
    banner.hidden = false;
    banner.innerHTML = '<span class="mb-tag">Career Mode</span><b>' + HW.UI.h.esc(c.agency) + '</b><span class="muted">' + HW.money(c.cash) + ' · reputation ' + c.rep + ' · ' + c.clients.length + ' client' + (c.clients.length === 1 ? '' : 's') + '</span>' +
      (c.over ? '<span class="neg">Agency folded</span>' : '') +
      '<span class="mb-actions"><a class="btn small" href="#/career">Agency</a><button class="btn small ghost" data-action="toSandbox">Back to sandbox</button></span>';
  }
  HW.UI.afterRender = updateChrome;

  // per-viewer preference, kept in browser storage
  function ceremonyWanted() {
    var box = document.getElementById('watchCeremony');
    return box ? box.checked : true;
  }
  try {
    var pref = localStorage.getItem('hd-watch-ceremony');
    if (pref === '0') document.getElementById('watchCeremony').checked = false;
  } catch (e) { /* storage unavailable */ }
  document.getElementById('watchCeremony').addEventListener('change', function (e) {
    try { localStorage.setItem('hd-watch-ceremony', e.target.checked ? '1' : '0'); } catch (err) { /* ignore */ }
  });

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  HW.toast = toast;

  function progress(frac) {
    var p = document.getElementById('progress');
    p.classList.toggle('on', frac != null);
    document.getElementById('progressBar').style.width = ((frac || 0) * 100) + '%';
  }

  function advance(n) {
    if (busy) return Promise.resolve();
    if (isCareer(HW.world)) {
      // the agency plays one year at a time: offers have to be answered
      var car = HW.world.career;
      n = 1;
      if (car.over) { toast('Your agency has folded. Start a new career from the Career Mode tab.'); return Promise.resolve(); }
      var idle = car.clients.filter(function (c) { return (car.offers[c.id] || []).length && !(car.accepted[c.id] || []).length; });
      if (idle.length && !confirm(idle.length + ' client' + (idle.length > 1 ? 's have' : ' has') + ' no role this year and will sit idle (they won\'t like it). Continue?')) return Promise.resolve();
    }
    busy = true;
    document.body.classList.add('busy');
    var done = 0;
    return new Promise(function (resolve) {
      function step() {
        HW.simulateYear(HW.world);
        done++;
        progress(done / n);
        if (done < n) setTimeout(step, 0);
        else {
          save().then(function () {
            busy = false;
            document.body.classList.remove('busy');
            progress(null);
            HW.UI.filters.digestYear = null;
            HW.UI.render();
            var Y = HW.world.year - 1, updates = HW.UI.digestCount(Y);
            if (updates) toast('★ ' + updates + ' update' + (updates > 1 ? 's' : '') + ' about people you follow');
            if (n === 1 && !autoTimer && !document.getElementById('autoBtn').classList.contains('on') && ceremonyWanted()) HW.UI.startCeremony(Y);
            resolve();
          });
        }
      }
      setTimeout(step, 0);
    });
  }

  function setAuto(on) {
    var btn = document.getElementById('autoBtn');
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    btn.classList.toggle('on', on);
    btn.textContent = on ? '■ Stop' : '⟳ Auto';
    if (!on) return;
    var tick = function () {
      advance(1).then(function () {
        if (!btn.classList.contains('on')) return;
        autoTimer = setTimeout(tick, +document.getElementById('autoSpeed').value);
      });
    };
    tick();
  }

  function newWorld() {
    var start = parseInt(document.getElementById('newStart').value, 10) || 1980;
    var seedTxt = document.getElementById('newSeed').value.trim();
    var seed = seedTxt ? hash(seedTxt) : undefined;
    setAuto(false);
    HW.world = HW.newWorld({ startYear: start, seed: seed });
    resetView();
    save();
    closeMenu();
    location.hash = '#/';
    HW.UI.render();
    toast('A new Hollywood is born — seed ' + HW.world.seed);
  }
  function hash(s) {
    if (/^\d+$/.test(s)) return +s;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function exportSave() {
    var blob = new Blob([JSON.stringify(HW.world)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hollywood-dynasty-' + HW.world.year + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function importSave(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var w = JSON.parse(r.result);
        if (!w || !w.people || !w.studios || !w.films) throw new Error('not a Hollywood Dynasty save');
        if (w.version !== 2) throw new Error('this save is from an older version');
        if (isCareer(w) && !w.career) throw new Error('damaged career save');
        setAuto(false);
        HW.world = w;
        save();
        closeMenu();
        location.hash = '#/';
        HW.UI.render();
        toast('Save loaded — year ' + w.year);
      } catch (e) { toast('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  }

  function openMenu() {
    var w = HW.world;
    document.getElementById('saveInfo').textContent = 'Seed ' + w.seed + ' · started ' + w.startYear + ' · ' + w.films.length.toLocaleString() + ' films, ' + w.people.length.toLocaleString() + ' people on record. Autosaves in this browser after every year.';
    document.getElementById('menu').hidden = false;
  }
  function closeMenu() { document.getElementById('menu').hidden = true; }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#ceremony a') && !e.target.closest('[data-action]')) HW.UI.closeCeremony(); // following a link leaves the show
    var t = e.target.closest('[data-action],[data-sort],[data-page],[data-filter],[data-go],[data-follow]');
    if (!t) return;
    if (t.dataset.follow) {
      var fp = t.dataset.follow.split(':');
      var on = HW.UI.toggleFollow(fp[0], +fp[1]);
      var nm = fp[0] === 'p' ? HW.world.people[+fp[1]].name : HW.world.studios[+fp[1]].name;
      toast(on ? 'Following ' + nm + '. Their year will show up in your digest.' : 'Unfollowed ' + nm + '.');
      save(); HW.UI.render(); return;
    }
    if (t.dataset.go) { location.hash = t.dataset.go; return; }
    if (t.dataset.sort) {
      var p = t.dataset.sort.split(':'), key = p[0], col = +p[1], cur = HW.UI.sorts[key];
      HW.UI.sorts[key] = { c: col, d: cur && cur.c === col ? -cur.d : (t.classList.contains('num') ? -1 : 1) };
      HW.UI.render(); return;
    }
    if (t.dataset.page) { var q = t.dataset.page.split(':'); HW.UI.pages[q[0]] = Math.max(0, +q[1]); HW.UI.render(); window.scrollTo(0, 0); return; }
    if (t.dataset.filter) {
      var f = t.dataset.filter.split(':');
      HW.UI.filters[f[0]] = f[1];
      Object.keys(HW.UI.pages).forEach(function (k) { if (/^talent|^films|^studios/.test(k)) HW.UI.pages[k] = 0; });
      HW.UI.render(); return;
    }
    switch (t.dataset.action) {
      case 'advance': setAuto(false); advance(+t.dataset.years); break;
      case 'auto': setAuto(!document.getElementById('autoBtn').classList.contains('on')); break;
      case 'menu': openMenu(); break;
      case 'closeMenu': closeMenu(); break;
      case 'new': if (confirm('Start a new sandbox world? Your sandbox save will be replaced' + (HW.careerMeta ? ' (your career is kept)' : '') + '.')) newWorld(); break;
      case 'toSandbox': HW.switchMode('sandbox'); break;
      case 'toCareer': HW.switchMode('career'); break;
      case 'export': exportSave(); break;
      case 'ceremony': HW.UI.startCeremony(+t.dataset.year); break;
      case 'cerNext': HW.UI.ceremonyNext(); break;
      case 'cerSkip': HW.UI.ceremonySkip(false); break;
      case 'cerPicture': HW.UI.ceremonySkip(true); break;
      case 'cerClose': HW.UI.closeCeremony(); break;
    }
  });
  document.getElementById('menu').addEventListener('click', function (e) { if (e.target.id === 'menu') closeMenu(); });
  document.getElementById('importFile').addEventListener('change', function (e) { if (e.target.files[0]) importSave(e.target.files[0]); e.target.value = ''; });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.select) {
      HW.UI.filters[t.dataset.select] = t.value;
      HW.UI.pages.films = 0;
      HW.UI.render();
    }
  });
  var searchTimer;
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'talentSearch') return;
    clearTimeout(searchTimer);
    var v = e.target.value;
    searchTimer = setTimeout(function () {
      HW.UI.filters.q = v;
      HW.UI.pages['talent-' + (HW.UI.filters.role || 'actor')] = 0;
      HW.UI.render();
      var el = document.getElementById('talentSearch');
      if (el) { el.focus(); el.setSelectionRange(v.length, v.length); }
    }, 200);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (HW.UI.ceremonyOpen()) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); HW.UI.ceremonyNext(); }
      if (e.key === 'Escape') HW.UI.closeCeremony();
      return;
    }
    if (e.key === ' ' || e.key === 'n') { e.preventDefault(); advance(1); }
    if (e.key === 'Escape') closeMenu();
  });
  document.addEventListener('mousemove', function (e) { HW.UI.chartHover(e); });
  document.addEventListener('touchstart', function (e) { if (e.touches[0]) HW.UI.chartHover({ target: e.target, clientX: e.touches[0].clientX }); }, { passive: true });
  window.addEventListener('hashchange', function () { HW.UI.render(); window.scrollTo(0, 0); });

  Promise.all([get('mode'), get('careerMeta')]).then(function (r) {
    HW.careerMeta = r[1];
    var mode = r[0] === 'career' && r[1] ? 'career' : 'sandbox';
    return get(mode === 'career' ? 'career' : 'current').then(function (txt) {
      var w = parse(txt);
      if (txt && !w) toast('That save is from an older version and can\'t load. A fresh world has started.');
      HW.world = w || HW.newWorld({ startYear: 1980 });
      if (!w) save();
      HW.UI.render();
    });
  });
})(globalThis.HW = globalThis.HW || {});
