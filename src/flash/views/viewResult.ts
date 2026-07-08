/* eslint-disable @typescript-eslint/no-explicit-any */
// The raw decoded result of an SDK view sim (BN/OraclePrice fields intact). The
// SDK types these dynamic shapes as `any`; typed quotes live in `tx/tradeResolution.ts`.
export type ViewResult = Record<string, any>;
