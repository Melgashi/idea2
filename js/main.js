// Boot, persistence (IndexedDB), and input handling.
(function (HW) {
  var DB = 'hollywood-dynasty', STORE = 'saves', KEY = 'current';
  var busy = false, autoTimer = null;

  function openDb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function save() {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(JSON.stringify(HW.world), KEY);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).catch(function (e) { console.warn('Save failed', e); toast('Could not save: ' + e.message); });
  }
  function load() {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        r.onsuccess = function () { res(r.result ? JSON.parse(r.result) : null); };
        r.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }

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
            HW.UI.render();
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
    HW.UI.sorts = {}; HW.UI.pages = {}; HW.UI.filters = {};
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
    var t = e.target.closest('[data-action],[data-sort],[data-page],[data-filter],[data-go]');
    if (!t) return;
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
      case 'new': if (confirm('Start a new world? Your current save will be replaced.')) newWorld(); break;
      case 'export': exportSave(); break;
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
    if (e.key === ' ' || e.key === 'n') { e.preventDefault(); advance(1); }
    if (e.key === 'Escape') closeMenu();
  });
  window.addEventListener('hashchange', function () { HW.UI.render(); window.scrollTo(0, 0); });

  load().then(function (w) {
    HW.world = w && w.version === 2 ? w : HW.newWorld({ startYear: 1980 });
    if (w && w.version !== 2) toast('Actor stats were redesigned, so older saves can\'t load. A fresh world has started.');
    if (HW.world !== w) save();
    HW.UI.render();
  });
})(globalThis.HW = globalThis.HW || {});
