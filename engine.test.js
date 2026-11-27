const { test } = require("node:test");
const assert = require("node:assert/strict");
const { step, simulate } = require("./engine.js");

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test("target grows by promoter * dt and falls by inhibitor * dt", () => {
  const next = step([10, 40, 30], [{ target: 0, promoter: 1, inhibitor: 2 }], 0.1);
  close(next[0], 10 + 40 * 0.1 - 30 * 0.1);
  assert.deepEqual(next.slice(1), [40, 30]);
});

test("a gene may have only a promoter or only an inhibitor", () => {
  close(step([10, 40], [{ target: 0, promoter: 1, inhibitor: null }], 0.1)[0], 14);
  close(step([10, 40], [{ target: 0, promoter: null, inhibitor: 1 }], 0.1)[0], 6);
});

test("genes with the same target add up", () => {
  const genes = [
    { target: 0, promoter: 1, inhibitor: null },
    { target: 0, promoter: 2, inhibitor: null },
  ];
  close(step([0, 10, 20], genes, 0.5)[0], 15);
});

test("all genes read the same snapshot", () => {
  const genes = [
    { target: 0, promoter: 1, inhibitor: null },
    { target: 1, promoter: 0, inhibitor: null },
  ];
  assert.deepEqual(step([10, 20], genes, 1), [30, 30]);
});

test("amounts stay within 0..100", () => {
  assert.deepEqual(step([95, 80], [{ target: 0, promoter: 1, inhibitor: null }], 1), [100, 80]);
  assert.deepEqual(step([5, 80], [{ target: 0, promoter: null, inhibitor: 1 }], 1), [0, 80]);
});

test("simulate returns steps + 1 values per molecule, starting at the initial amounts", () => {
  const series = simulate([0, 10], [{ target: 0, promoter: 1, inhibitor: null }], 3, 1);
  assert.deepEqual(series, [[0, 10, 20, 30], [10, 10, 10, 10]]);
});

test("two molecules around a constant midpoint oscillate", () => {
  // A' = A + (C - B) dt, B' = B + (A - C) dt, with C fixed at 50.
  const genes = [
    { target: 0, promoter: 2, inhibitor: 1 },
    { target: 1, promoter: 0, inhibitor: 2 },
  ];
  const [a] = simulate([80, 50, 50], genes, 300, 0.05);
  assert.ok(Math.min(...a) < 30 && Math.max(...a) > 70);
  const crossings = a.filter((v, i) => i > 0 && (a[i - 1] - 50) * (v - 50) < 0).length;
  assert.ok(crossings >= 4, `only ${crossings} crossings of the midpoint`);
});

// ---- the other models ----

const { MODELS, DEFAULT_PARAMS } = require("./engine.js");
const gene = (target, promoter, inhibitor, substrate = null) => ({ target, promoter, inhibitor, substrate });

test("hill: an unregulated gene drives its target towards 100, others do not decay", () => {
  const next = MODELS.hill.step([0, 40], [gene(0, null, null)], 0.1, DEFAULT_PARAMS);
  close(next[0], 10);
  assert.equal(next[1], 40);
});

test("hill: a promoter at the threshold K gives half production", () => {
  const next = MODELS.hill.step([0, 20], [gene(0, 1, null)], 0.1, { n: 4, K: 20 });
  close(next[0], 5);
});

test("hill: an inhibitor at the threshold K halves production, and the target decays", () => {
  const next = MODELS.hill.step([80, 20], [gene(0, null, 1)], 0.1, { n: 4, K: 20 });
  close(next[0], 80 + (50 - 80) * 0.1);
});

test("hill: two repressors settle with one on and one off", () => {
  const genes = [gene(0, null, 1), gene(1, null, 0)];
  const [a, b] = simulate([60, 40], genes, 300, 0.05, "hill");
  assert.ok(a[300] > 99 && b[300] < 1, `ended at ${a[300]}, ${b[300]}`);
});

test("hill: three repressors in a ring oscillate at n = 4 and settle at n = 2", () => {
  const genes = [gene(0, null, 2), gene(1, null, 0), gene(2, null, 1)];
  const range = (values) => Math.max(...values) - Math.min(...values);
  const steep = simulate([80, 20, 10], genes, 1200, 0.05, "hill", { n: 4 })[0].slice(600);
  const shallow = simulate([80, 20, 10], genes, 1200, 0.05, "hill", { n: 2 })[0].slice(600);
  assert.ok(range(steep) > 50, `n = 4 range ${range(steep)}`);
  assert.ok(range(shallow) < 1, `n = 2 range ${range(shallow)}`);
});

test("growth: the change is proportional to the target itself", () => {
  const next = MODELS.growth.step([20, 50, 30], [gene(0, 1, 2)], 0.5);
  close(next[0], 20 + 20 * (50 - 30) / 100 * 0.5);
  assert.deepEqual(MODELS.growth.step([0, 50, 30], [gene(0, 1, 2)], 0.5), [0, 50, 30]);
});

test("conversion: substrate becomes target at promoter * substrate / (1 + inhibitor)", () => {
  // amounts: target, promoter, inhibitor, substrate
  const next = MODELS.conversion.step([0, 50, 100, 80], [gene(0, 1, 2, 3)], 0.1);
  const moved = 0.5 * 80 / 2 * 0.1;
  close(next[0], moved);
  close(next[3], 80 - moved);
  assert.deepEqual([next[1], next[2]], [50, 100]);
});

test("conversion: a gene without a promoter or a substrate does nothing", () => {
  assert.deepEqual(MODELS.conversion.step([0, 50, 80], [gene(0, null, null, 2)], 0.1), [0, 50, 80]);
  assert.deepEqual(MODELS.conversion.step([0, 50, 80], [gene(0, 1, null, null)], 0.1), [0, 50, 80]);
});

test("conversion: genes that want more than exists share it, and the total is conserved", () => {
  const genes = [gene(0, 2, null, 3), gene(1, 2, null, 3)];
  const next = MODELS.conversion.step([0, 0, 100, 10], genes, 5);
  close(next[0], 5);
  close(next[1], 5);
  close(next[3], 0);
});

test("conversion: amounts may pass 100 and the total stays put", () => {
  const genes = [gene(1, 1, null, 0), gene(2, 2, null, 1), gene(0, 0, null, 2)];
  const series = simulate([100, 90, 80], genes, 2000, 0.05, "conversion");
  const total = series.reduce((sum, values) => sum + values[2000], 0);
  assert.ok(Math.abs(total - 270) < 1e-6, `total ${total}`);
  assert.ok(Math.max(...series.flat()) > 100);
});
