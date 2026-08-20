// Ambient globals for `bun test` — mirrors bun-types/test-globals.d.ts so the
// plan's Jest-style `describe`/`it`/`expect` spec files typecheck without
// per-file imports. `bun test` provides these names at runtime.

declare var test: typeof import("bun:test").test;
declare var it: typeof import("bun:test").it;
declare var describe: typeof import("bun:test").describe;
declare var expect: typeof import("bun:test").expect;
declare var beforeAll: typeof import("bun:test").beforeAll;
declare var beforeEach: typeof import("bun:test").beforeEach;
declare var afterAll: typeof import("bun:test").afterAll;
declare var afterEach: typeof import("bun:test").afterEach;
declare var mock: typeof import("bun:test").mock;
declare var spyOn: typeof import("bun:test").spyOn;
