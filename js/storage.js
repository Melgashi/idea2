// Saving. Two layers:
//  - local: this browser's IndexedDB (fast, works offline, may be blocked in previews or private windows)
//  - cloud: when the game runs as a claude.ai artifact, a gzip-compressed copy in the viewer's private
//    per-user database space, split into chunks under the 256 KiB document limit. This is what carries
//    a game across devices and survives cleared browser data.
// Slots are 'current' (sandbox), 'career' (career mode); 'state' remembers the open mode.
(function (HW) {
  var DB = 'hollywood-dynasty', STORE = 'saves', CHUNK = 180000, MAX_CHUNKS = 80;
  var S = HW.Store = { local: null, cloud: null, cloudAt: null, cloudError: null };

  function openDb() {
    return new Promise(function (res, rej) {
      try {
        if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
        var r = indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  }
  S.probe = function () {
    return openDb().then(function () { S.local = true; }, function () { S.local = false; });
  };
  S.put = function (entries) {
    if (!S.local) return Promise.resolve();
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
        for (var k in entries) st.put(entries[k], k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  };
  S.get = function (key) {
    if (!S.local) return Promise.resolve(null);
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = function () { res(r.result == null ? null : r.result); };
        r.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  };

  // ---------- cloud ----------
  // Resolves the cloud handle, or null outside claude.ai / signed out / not granted.
  S.initCloud = async function () {
    try {
      if (!window.claude || !window.claude.use) return null;
      var r = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!r[0] || !r[1]) return null;
      var uid = await r[1].id();
      if (!uid) return null;
      S.cloud = { db: r[0], base: 'data/users/' + uid };
      return S.cloud;
    } catch (e) { console.warn('Cloud save unavailable', e); return null; }
  };
  function doc(name) { return S.cloud.db.doc(S.cloud.base + '/' + name); }

  function toB64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(b64) {
    var s = atob(b64), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }
  async function pack(text) {
    if (window.CompressionStream) {
      var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
      return { enc: 'gz', data: toB64(await new Response(stream).arrayBuffer()) };
    }
    return { enc: 'raw', data: text };
  }
  async function unpack(enc, data) {
    if (enc !== 'gz') return data;
    var stream = new Blob([fromB64(data)]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  S.cloudMeta = async function (slot) {
    if (!S.cloud) return null;
    try { var s = await doc(slot + '-meta').get(); return s.exists ? s.data() : null; } catch (e) { return null; }
  };
  S.cloudState = async function () {
    if (!S.cloud) return null;
    try { var s = await doc('state').get(); return s.exists ? s.data() : null; } catch (e) { return null; }
  };

  // Chunks are written under a new generation first, then the meta doc is switched over,
  // so an interrupted save never corrupts the previous one.
  S.cloudSave = async function (slot, text, meta, state) {
    if (!S.cloud) return;
    var p = await pack(text), parts = [];
    for (var i = 0; i < p.data.length; i += CHUNK) parts.push(p.data.slice(i, i + CHUNK));
    if (parts.length > MAX_CHUNKS) throw new Error('save too large for cloud backup');
    var gen = String(meta.savedAt), old = await S.cloudMeta(slot);
    for (var j = 0; j < parts.length; j++) await doc(slot + '-' + gen + '-' + j).set({ d: parts[j] });
    await doc(slot + '-meta').set(Object.assign({ gen: gen, n: parts.length, enc: p.enc }, meta));
    if (state) await doc('state').set(state);
    if (old && old.gen !== gen) for (var k = 0; k < old.n; k++) doc(slot + '-' + old.gen + '-' + k).delete().catch(function () {});
    S.cloudAt = Date.now();
    S.cloudError = null;
  };
  S.cloudLoad = async function (slot) {
    var m = await S.cloudMeta(slot);
    if (!m) return null;
    var snaps = [];
    for (var i = 0; i < m.n; i++) snaps.push(doc(slot + '-' + m.gen + '-' + i).get());
    snaps = await Promise.all(snaps);
    if (snaps.some(function (s) { return !s.exists; })) return null;
    return unpack(m.enc, snaps.map(function (s) { return s.data().d; }).join(''));
  };
  S.cloudClear = async function (slot, state) {
    if (!S.cloud) return;
    var m = await S.cloudMeta(slot);
    if (m) {
      for (var i = 0; i < m.n; i++) doc(slot + '-' + m.gen + '-' + i).delete().catch(function () {});
      await doc(slot + '-meta').delete();
    }
    if (state) await doc('state').set(state);
  };
})(globalThis.HW = globalThis.HW || {});
