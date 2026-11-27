// The simple model:
//   target' = target + promoter * dt - inhibitor * dt
// A gene names a target molecule and, optionally, a promoter and an inhibitor.
// All genes read the same snapshot, and amounts are kept within 0..100.

(function (root) {
  const MIN = 0;
  const MAX = 100;

  // amounts: number[]; genes: {target, promoter, inhibitor}[] of molecule
  // indexes, where promoter and inhibitor may be null.
  function step(amounts, genes, dt) {
    const next = amounts.slice();
    for (const gene of genes) {
      const promoter = gene.promoter === null ? 0 : amounts[gene.promoter];
      const inhibitor = gene.inhibitor === null ? 0 : amounts[gene.inhibitor];
      next[gene.target] += (promoter - inhibitor) * dt;
    }
    return next.map((amount) => Math.min(MAX, Math.max(MIN, amount)));
  }

  // Returns one array per molecule with steps + 1 values, starting at the
  // initial amounts.
  function simulate(initial, genes, steps, dt) {
    let amounts = initial.map((amount) => Math.min(MAX, Math.max(MIN, amount)));
    const series = amounts.map((amount) => [amount]);
    for (let t = 0; t < steps; t++) {
      amounts = step(amounts, genes, dt);
      amounts.forEach((amount, i) => series[i].push(amount));
    }
    return series;
  }

  const api = { step, simulate, MIN, MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SoupEngine = api;
})(typeof self !== "undefined" ? self : this);
