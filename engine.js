// Four ways a gene can change the soup. A gene names a target molecule and,
// optionally, a promoter, an inhibitor and (for the conversion model) a
// substrate, all as indexes into the list of amounts. Every gene reads the
// same snapshot of the soup.

(function (root) {
  const MAX = 100;
  const DEFAULT_PARAMS = { n: 4, K: 20 };

  const has = (index) => index !== null && index !== undefined;
  const capped = (amounts) => amounts.map((amount) => Math.min(MAX, Math.max(0, amount)));

  // target' = target + (promoter - inhibitor) * dt
  function linear(amounts, genes, dt) {
    const next = amounts.slice();
    for (const gene of genes) {
      const promoter = has(gene.promoter) ? amounts[gene.promoter] : 0;
      const inhibitor = has(gene.inhibitor) ? amounts[gene.inhibitor] : 0;
      next[gene.target] += (promoter - inhibitor) * dt;
    }
    return capped(next);
  }

  // Gene regulation with saturation and decay:
  //   target' = target + (100 * on(promoter) * off(inhibitor) - target) * dt
  // where on(x) = x^n / (K^n + x^n) and off(x) = K^n / (K^n + x^n).
  // A missing promoter counts as fully on, a missing inhibitor as absent.
  // Molecules that no gene targets do not decay.
  function hill(amounts, genes, dt, params) {
    const { n, K } = params;
    const threshold = Math.pow(K, n);
    const production = amounts.map(() => null);
    for (const gene of genes) {
      const on = has(gene.promoter)
        ? Math.pow(amounts[gene.promoter], n) / (threshold + Math.pow(amounts[gene.promoter], n))
        : 1;
      const off = has(gene.inhibitor) ? threshold / (threshold + Math.pow(amounts[gene.inhibitor], n)) : 1;
      production[gene.target] = (production[gene.target] || 0) + MAX * on * off;
    }
    return capped(amounts.map((amount, i) =>
      production[i] === null ? amount : amount + (production[i] - amount) * dt));
  }

  // Growth in proportion to the target itself (Lotka-Volterra):
  //   target' = target + target * (promoter - inhibitor) / 100 * dt
  function growth(amounts, genes, dt) {
    const next = amounts.slice();
    for (const gene of genes) {
      const promoter = has(gene.promoter) ? amounts[gene.promoter] : 0;
      const inhibitor = has(gene.inhibitor) ? amounts[gene.inhibitor] : 0;
      next[gene.target] += (amounts[gene.target] * (promoter - inhibitor) / MAX) * dt;
    }
    return capped(next);
  }

  // Conversion with conserved mass, the rule of the Rust engine without tags:
  // the gene turns substrate into target at
  //   (promoter / 100) * substrate / (1 + inhibitor / 100) * dt
  // A gene without a promoter or without a substrate does nothing. If genes
  // together want more of a molecule than exists, each gets a proportional
  // share. Amounts are not capped at 100, because the total is conserved.
  function conversion(amounts, genes, dt) {
    const draws = [];
    const demand = amounts.map(() => 0);
    for (const gene of genes) {
      if (!has(gene.promoter) || !has(gene.substrate) || gene.substrate === gene.target) continue;
      const inhibitor = has(gene.inhibitor) ? amounts[gene.inhibitor] : 0;
      const wanted = ((amounts[gene.promoter] / MAX) * amounts[gene.substrate] / (1 + inhibitor / MAX)) * dt;
      if (wanted <= 0) continue;
      draws.push({ from: gene.substrate, to: gene.target, wanted });
      demand[gene.substrate] += wanted;
    }
    const next = amounts.slice();
    for (const draw of draws) {
      const available = amounts[draw.from];
      const moved = demand[draw.from] <= available ? draw.wanted : (draw.wanted / demand[draw.from]) * available;
      next[draw.from] -= moved;
      next[draw.to] += moved;
    }
    return next.map((amount) => Math.max(0, amount));
  }

  // `capped` says whether the model keeps amounts within 0..100.
  const MODELS = {
    linear: { step: linear, capped: true },
    hill: { step: hill, capped: true },
    growth: { step: growth, capped: true },
    conversion: { step: conversion, capped: false },
  };

  // Returns one array per molecule with steps + 1 values, starting at the
  // initial amounts.
  function simulate(initial, genes, steps, dt, model = "linear", params = {}) {
    const settings = Object.assign({}, DEFAULT_PARAMS, params);
    let amounts = capped(initial);
    const series = amounts.map((amount) => [amount]);
    for (let t = 0; t < steps; t++) {
      amounts = MODELS[model].step(amounts, genes, dt, settings);
      amounts.forEach((amount, i) => series[i].push(amount));
    }
    return series;
  }

  const api = { step: linear, simulate, MODELS, DEFAULT_PARAMS, MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SoupEngine = api;
})(typeof self !== "undefined" ? self : this);
