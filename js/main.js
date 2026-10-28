// Boot, saving (via HW.Store), navigation and input handling.
(function (HW) {
  // Two save slots: 'current' is the sandbox world, 'career' is the career-mode world. 'mode' remembers which is open.
  var S = HW.Store;
  var busy = false, autoTimer = null, saveErrorShown = false;
  var touched = false; // the player has done something since this page load
  HW.careerMeta = null;

  function isCareer(w) { return !!(w && w.mode === 'career'); }
  function slotOf(w) { return isCareer(w) ? 'career' : 'current'; }
  function parse(txt) {
    try {
      var w = txt ? JSON.parse(txt) : null;
      if (!w || w.version !== 2) return null;
      if (w.mode === 'career' && (!w.career || w.career.kind !== 'actor')) return null; // agency-era careers don't carry over
      return w;
    } catch (e) { return null; }
  }
  function stateDoc() { return { mode: isCareer(HW.world) ? 'career' : 'sandbox', careerMeta: HW.careerMeta || null }; }

  // ---------- saving ----------
  var pending = null, cloudTimer = null, cloudBusy = false, lastCloud = 0;
  function save() {
    var w = HW.world;
    w.savedAt = Date.now();
    var text = JSON.stringify(w), e = { mode: isCareer(w) ? 'career' : 'sandbox' };
    e[slotOf(w)] = text;
    if (isCareer(w)) e.careerMeta = HW.careerMeta = { kind: 'actor', name: w.career.name, year: w.year, q: w.career.q, over: !!w.career.over };
    pending = { slot: slotOf(w), text: text, meta: { savedAt: w.savedAt, year: w.year }, state: stateDoc() };
    scheduleCloud();
    return S.put(e).catch(function (err) {
      console.warn('Save failed', err);
      if (!saveErrorShown && !S.cloud) { saveErrorShown = true; toast('Could not save in this browser. Use ☰ → Export save to keep your progress.'); }
    });
  }
  HW.save = save;

  // The cloud copy is written at most every 15 seconds, and whenever the page is hidden or closed.
  function scheduleCloud() {
    if (!S.cloud || !pending) return;
    var wait = Math.max(0, 15000 - (Date.now() - lastCloud));
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(flushCloud, wait);
  }
  function flushCloud() {
    if (!S.cloud || !pending || cloudBusy) return;
    var job = pending;
    pending = null;
    cloudBusy = true;
    lastCloud = Date.now();
    S.cloudSave(job.slot, job.text, job.meta, job.state).catch(function (err) {
      console.warn('Cloud save failed', err);
      S.cloudError = err.message || String(err);
      if (!pending) pending = job;
    }).then(function () { cloudBusy = false; updateStorageNote(); if (pending) scheduleCloud(); });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushCloud(); });
  window.addEventListener('pagehide', flushCloud);

  // Load a slot from whichever copy is newer: this browser or the cloud.
  async function loadSlot(slot) {
    var local = parse(await S.get(slot));
    var meta = await S.cloudMeta(slot);
    if (meta && (!local || (meta.savedAt || 0) > (local.savedAt || 0))) {
      try { var cw = parse(await S.cloudLoad(slot)); if (cw) return cw; } catch (e) { console.warn('Cloud load failed', e); }
    }
    return local;
  }

  // ---------- navigation ----------
  // The game tracks its own route; the address bar's hash follows when the host allows it.
  HW.go = function (href) {
    HW.UI.route = href;
    HW.UI.render();
    window.scrollTo(0, 0);
    try { if (location.hash !== href) location.hash = href; } catch (e) { /* hash not available */ }
  };
  window.addEventListener('hashchange', function () {
    if (location.hash === HW.UI.route) return;
    HW.UI.route = location.hash;
    HW.UI.render();
    window.scrollTo(0, 0);
  });

  // ---------- in-page confirmation (native confirm() is unavailable in hosted pages) ----------
  HW.ask = function (message, okLabel) {
    var m = document.getElementById('askModal');
    document.getElementById('askText').textContent = message;
    document.getElementById('askOk').textContent = okLabel || 'Continue';
    m.hidden = false;
    document.getElementById('askOk').focus();
    return new Promise(function (resolve) {
      var finish = function (v) { m.hidden = true; m.onclick = null; resolve(v); };
      m.onclick = function (e) {
        if (e.target.id === 'askOk') finish(true);
        else if (e.target.id === 'askCancel' || e.target === m) finish(false);
      };
      HW.ask.cancel = function () { finish(false); };
    });
  };
  function asking() { return !document.getElementById('askModal').hidden; }

  // ---------- modes ----------
  function resetView() { HW.UI.sorts = {}; HW.UI.pages = {}; HW.UI.filters = {}; }
  HW.switchMode = function (mode) {
    if (busy) return Promise.resolve();
    setAuto(false);
    HW.UI.closeCeremony();
    return save().then(function () { return loadSlot(mode === 'career' ? 'career' : 'current'); }).then(function (w) {
      if (!w && mode === 'career') { toast('No career in progress.'); return; }
      HW.world = w || HW.newWorld({ startYear: 1980 });
      resetView();
      touched = true;
      save();
      HW.go(mode === 'career' ? '#/career' : '#/');
      toast(mode === 'career' ? 'Welcome back, ' + HW.world.career.name + '.' : 'Back to the sandbox.');
    });
  };
  // Delete the career save and return to the sandbox.
  HW.abandonCareer = function () {
    if (busy) return;
    HW.UI.closeCeremony();
    HW.careerMeta = null;
    pending = null;
    return S.put({ career: null, careerMeta: null, mode: 'sandbox' }).catch(function () {})
      .then(function () { return S.cloudClear('career', { mode: 'sandbox', careerMeta: null }).catch(function () {}); })
      .then(function () { return loadSlot('current'); })
      .then(function (w) {
        HW.world = w || HW.newWorld({ startYear: 1980 });
        resetView();
        HW.go('#/career');
        toast('Career abandoned.');
      });
  };
  HW.startCareer = function (opts) {
    if (busy) return;
    setAuto(false);
    touched = true;
    var start = function () {
      HW.world = HW.Career.newCareer(opts);
      resetView();
      save();
      HW.go('#/career');
      toast(HW.world.career.name + ' arrives in Hollywood. Your first three pitches are in.');
    };
    // keep the sandbox safe before replacing the open world
    if (isCareer(HW.world)) start(); else save().then(start);
  };

  // Chrome that depends on the mode: career banner, hidden multi-year controls.
  function updateChrome() {
    var w = HW.world, banner = document.getElementById('modeBanner');
    document.body.classList.toggle('career-mode', isCareer(w));
    if (!isCareer(w)) { banner.hidden = true; return; }
    var c = w.career, C = HW.Career;
    banner.hidden = false;
    banner.innerHTML = '<span class="mb-tag">Career Mode</span><b>' + HW.UI.h.esc(c.name) + '</b><span class="muted">' + C.age(w) + ' · ' + C.label(w) + ' · reputation ' + C.rep(w) + '</span>' +
      (c.over ? '<span class="muted">Retired</span>' : '') +
      '<span class="mb-actions"><a class="btn small" href="#/career">' + (c.over ? 'Your career' : 'Your pitches') + '</a><button class="btn small ghost" data-action="toSandbox">Back to sandbox</button></span>';
  }
  HW.UI.afterRender = updateChrome;

  // Where saves are going, shown in the menu; a warning bar when nothing can be saved.
  function updateStorageNote() {
    var note = document.getElementById('storageNote'), warn = document.getElementById('storeWarn');
    var parts = [];
    parts.push(S.local ? 'Autosaves in this browser after every year.' : 'This browser can\'t store saves here.');
    if (S.cloud) parts.push(S.cloudError ? 'Cloud backup failed (' + S.cloudError + '); it will retry.' : S.cloudAt ? 'Cloud backup saved at ' + new Date(S.cloudAt).toLocaleTimeString() + '.' : 'Cloud backup is on.');
    note.textContent = parts.join(' ');
    warn.hidden = !!(S.local || S.cloud);
  }

  // per-viewer preference, kept in browser storage
  function ceremonyWanted() {
    var box = document.getElementById('watchCeremony');
    return box ? box.checked : true;
  }
  HW.ceremonyWanted = ceremonyWanted;
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

  // ---------- advancing time ----------
  async function advance(n) {
    if (busy) return;
    if (isCareer(HW.world)) {
      // in a career, time moves when you choose a pitch
      toast('In Career Mode, time moves when you sign on to a film or pass.');
      HW.go('#/career');
      return;
    }
    touched = true;
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
    touched = true;
    HW.world = HW.newWorld({ startYear: start, seed: seed });
    resetView();
    save();
    closeMenu();
    HW.go('#/');
    toast('A new Hollywood is born — seed ' + HW.world.seed);
  }
  function hash(s) {
    if (/^\d+$/.test(s)) return +s;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---------- save files ----------
  async function exportSave() {
    var name = 'hollywood-dynasty-' + (isCareer(HW.world) ? 'career-' : '') + HW.world.year + '.json';
    var blob = new Blob([JSON.stringify(HW.world)], { type: 'application/json' });
    var dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) {
      // hosted page: the viewer confirms the download
      try { await dl.save({ filename: name, data: blob }); }
      catch (e) { if (e && e.code !== 'declined') toast('Export failed: ' + (e.message || e.code)); }
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
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
        touched = true;
        HW.world = w;
        resetView();
        save();
        closeMenu();
        HW.go(isCareer(w) ? '#/career' : '#/');
        toast('Save loaded — year ' + w.year);
      } catch (e) { toast('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  }

  function openMenu() {
    var w = HW.world;
    document.getElementById('saveInfo').textContent = 'Seed ' + w.seed + ' · started ' + w.startYear + ' · ' + w.films.length.toLocaleString() + ' films, ' + w.people.length.toLocaleString() + ' people on record.';
    updateStorageNote();
    document.getElementById('menu').hidden = false;
  }
  function closeMenu() { document.getElementById('menu').hidden = true; }

  // ---------- input ----------
  document.addEventListener('click', function (e) {
    if (e.target.closest('#ceremony a') && !e.target.closest('[data-action]')) HW.UI.closeCeremony(); // following a link leaves the show
    var link = e.target.closest('a[href^="#/"]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      if (link.dataset.action === 'cerClose') HW.UI.closeCeremony();
      HW.go(link.getAttribute('href'));
      return;
    }
    var t = e.target.closest('[data-action],[data-sort],[data-page],[data-filter],[data-go],[data-follow]');
    if (!t) return;
    if (t.dataset.follow) {
      var fp = t.dataset.follow.split(':');
      var on = HW.UI.toggleFollow(fp[0], +fp[1]);
      var nm = fp[0] === 'p' ? HW.world.people[+fp[1]].name : HW.world.studios[+fp[1]].name;
      toast(on ? 'Following ' + nm + '. Their year will show up in your digest.' : 'Unfollowed ' + nm + '.');
      save(); HW.UI.render(); return;
    }
    if (t.dataset.go) { HW.go(t.dataset.go); return; }
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
      case 'new':
        HW.ask('Start a new sandbox world? Your sandbox save will be replaced' + (HW.careerMeta ? ' (your career is kept)' : '') + '.', 'Start new world')
          .then(function (ok) { if (ok) newWorld(); });
        break;
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
    if (asking()) { if (e.key === 'Escape') HW.ask.cancel(); return; }
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

  // ---------- boot ----------
  // Render from this browser's save first; when the cloud answers (hosted page only), pick up a newer save from another device.
  HW.UI.route = location.hash || '#/';
  (async function boot() {
    await S.probe();
    var mode = await S.get('mode');
    HW.careerMeta = await S.get('careerMeta');
    var slot = mode === 'career' && HW.careerMeta ? 'career' : 'current';
    var txt = await S.get(slot), w = parse(txt);
    if (txt && !w) toast('That save is from an older version and can\'t load. A fresh world has started.');
    HW.world = w || HW.newWorld({ startYear: 1980 });
    HW.UI.render();
    updateStorageNote();
    if (!w) save();

    var cloud = await S.initCloud();
    updateStorageNote();
    if (!cloud) return;
    var st = await S.cloudState();
    if (st && st.careerMeta && !HW.careerMeta) HW.careerMeta = st.careerMeta;
    var cloudSlot = st && st.mode === 'career' && HW.careerMeta ? 'career' : slot;
    var meta = await S.cloudMeta(cloudSlot);
    // a world created just now on this device always yields to a real save in the cloud
    if (meta && !touched && (!w || cloudSlot !== slotOf(HW.world) || (meta.savedAt || 0) > (HW.world.savedAt || 0))) {
      var cw = parse(await S.cloudLoad(cloudSlot).catch(function () { return null; }));
      if (cw && !touched) {
        pending = null;
        HW.world = cw;
        resetView();
        S.put({ mode: isCareer(cw) ? 'career' : 'sandbox' }).catch(function () {});
        var e = {}; e[slotOf(cw)] = JSON.stringify(cw); S.put(e).catch(function () {});
        HW.go(isCareer(cw) ? '#/career' : HW.UI.route);
        toast('Picked up your saved game from the cloud (year ' + cw.year + ').');
        return;
      }
    }
    // no newer cloud copy: make sure the cloud has this one
    if (!meta || (HW.world.savedAt || 0) > (meta.savedAt || 0)) save();
  })();
})(globalThis.HW = globalThis.HW || {});
