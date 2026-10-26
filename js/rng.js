// Seeded RNG + small math helpers shared by every module.
(function (HW) {
  function RNG(seed) {
    this.s = (seed >>> 0) || 1;
  }
  // mulberry32
  RNG.prototype.next = function () {
    var t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.normal = function (mu, sd) {
    var u = 1 - this.next(), v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  RNG.prototype.weighted = function (items, weightFn) {
    var total = 0, w = [], i;
    for (i = 0; i < items.length; i++) { w[i] = Math.max(0, weightFn(items[i], i)); total += w[i]; }
    if (total <= 0) return items[Math.floor(this.next() * items.length)];
    var r = this.next() * total;
    for (i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };
  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  HW.RNG = RNG;
  HW.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  HW.round1 = function (v) { return Math.round(v * 10) / 10; };
})(globalThis.HW = globalThis.HW || {});
