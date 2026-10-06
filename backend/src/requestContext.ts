import { AsyncLocalStorage } from "node:async_hooks";

// Per-request scratch space. getMyTrip() records which trip the request resolved to here, so the
// change-counter middleware can bump that trip without looking the user's trip up a second time.
export const requestTrip = new AsyncLocalStorage<{ tripId?: string }>();
