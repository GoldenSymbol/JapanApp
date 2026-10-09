import { AsyncLocalStorage } from "node:async_hooks";

// A handler that already bumps `rev` in its own write sets revBumped so the middleware doesn't do a second one.
// Per-request scratch space. getMyTrip() records which trip the request resolved to here, so the
// change-counter middleware can bump that trip without looking the user's trip up a second time.
export const requestTrip = new AsyncLocalStorage<{ tripId?: string; revBumped?: boolean }>();
