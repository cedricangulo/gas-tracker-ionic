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

/** Remove the retired field from stored records and queued drafts without resetting data. */
export function withoutLegacyNotes(state: Snapshot): Snapshot {
  const clean = (fill: Fillup): Fillup => {
    const copy = { ...fill } as Fillup & { notes?: unknown };
    delete copy.notes;
    return copy;
  };
  return {
    ...state,
    fills: state.fills.map(clean),
    queue: state.queue.map((item) => ({
      ...item,
      mutation:
        item.mutation.kind === 'create' || item.mutation.kind === 'update'
          ? { ...item.mutation, fill: clean(item.mutation.fill) }
          : item.mutation,
    })),
  };
}
