/* tslint:disable */
/* eslint-disable */

/**
 * The result of a simulation.
 */
export class Run {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Amounts, molecule by molecule: `steps + 1` values for the first tag,
     * then `steps + 1` for the second, and so on.
     */
    readonly series: Float32Array;
    /**
     * The molecule types, as their 8-letter tags joined together: first the
     * ones that were passed in, in that order, then any other products of the
     * genome.
     */
    readonly tags: string;
}

/**
 * The genome text for one gene with a perfect promoter.
 */
export function encode_gene(activator: string, inhibitor: string, substrate: string, product: string): string;

/**
 * The genes the engine finds in a genome, one per line:
 * `position strength activator inhibitor substrate product`.
 */
export function genes(genome: string): string;

/**
 * `tags` are 8-letter tags joined together, one per entry of `amounts`.
 * `kinetics` is "conversion", "linear", "hill" or "growth"; `n` and `k` are
 * only used by "hill".
 */
export function simulate(genome: string, tags: string, amounts: Float32Array | number[], steps: number, rate: number, kinetics: string, n: number, k: number): Run;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_run_free: (a: number, b: number) => void;
    readonly encode_gene: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly genes: (a: number, b: number) => [number, number];
    readonly run_series: (a: number) => [number, number];
    readonly run_tags: (a: number) => [number, number];
    readonly simulate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => [number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
