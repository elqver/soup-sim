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
