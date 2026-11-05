import { BikeSettings, Fillup, Mutation, Snapshot } from '../models/tracker';

/** Apply the exact same mutation locally and while rebasing server data. */
export function project(state: Snapshot, mutation: Mutation): Snapshot {
  if (mutation.kind === 'settings')
    return { ...state, settings: structuredClone(mutation.settings) };
  if (mutation.kind === 'delete')
    return { ...state, fills: state.fills.filter((f) => f.id !== mutation.id) };
  return {
    ...state,
    fills: [
      ...state.fills.filter((f) => f.id !== mutation.fill.id),
      structuredClone(mutation.fill),
    ],
  };
}
export function rebase(state: Snapshot, fills: Fillup[], settings: BikeSettings): Snapshot {
  return state.queue.reduce((next, item) => project(next, item.mutation), {
    ...state,
    fills,
    settings,
  });
}
