/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// The Flash SDK's view methods simulate an on-chain instruction and decode its
// return log; their result shape is dynamic (the SDK types them as `any`).
// `ViewResult` is that raw decoded object — BN / OraclePrice fields and all —
// surfaced for callers who want more than the normalized fields we pull out.
// ---------------------------------------------------------------------------
export type ViewResult = Record<string, any>;
