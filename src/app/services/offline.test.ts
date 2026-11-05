import { describe, it, expect } from 'vitest';
import { emptySnapshot, Fillup, Mutation } from '../models/tracker';
import { project, rebase } from './offline';
const fill: Fillup = {
  id: 'one',
  amount: 100,
  liters: 2,
  odometer: 100,
  dateTime: '2026-11-06T12:00:00+08:00',
  station: null,
  grade: null,
  gaugeLevel: 3,
  filledToFull: false,
  latitude: null,
  longitude: null,
  notes: '',
  createdAt: 1,
};
const create: Mutation = { operationId: 'create', kind: 'create', fill };
describe('offline projection and server rebasing', () => {
  it('replaying the same local creation does not duplicate a record', () => {
    expect(project(project(emptySnapshot(), create), create).fills).toEqual([fill]);
  });
  it('keeps an offline edit over a stale server response', () => {
    const state = emptySnapshot();
    state.queue = [
      { mutation: { operationId: 'edit', kind: 'update', fill: { ...fill, amount: 150 } } },
    ];
    expect(rebase(state, [fill], state.settings).fills[0].amount).toBe(150);
  });
  it('keeps an offline deletion hidden after fetching server data', () => {
    const state = emptySnapshot();
    state.queue = [{ mutation: { operationId: 'delete', kind: 'delete', id: fill.id } }];
    expect(rebase(state, [fill], state.settings).fills).toEqual([]);
  });
  it('rebases create-edit-delete in order', () => {
    const state = emptySnapshot();
    state.queue = [
      { mutation: create },
      { mutation: { operationId: 'edit', kind: 'update', fill: { ...fill, amount: 200 } } },
      { mutation: { operationId: 'delete', kind: 'delete', id: fill.id } },
    ];
    expect(rebase(state, [], state.settings).fills).toEqual([]);
  });
  it('retains unsynced settings and catalog choices', () => {
    const state = emptySnapshot();
    const settings = {
      ...state.settings,
      name: 'My bike',
      stations: [...state.settings.stations, 'Local pump'],
    };
    state.queue = [{ mutation: { operationId: 'settings', kind: 'settings', settings } }];
    expect(rebase(state, [], state.settings).settings).toEqual(settings);
  });
  it('does not mutate an input snapshot when applying changes', () => {
    const state = emptySnapshot();
    project(state, create);
    expect(state.fills).toEqual([]);
    expect(state.queue).toEqual([]);
  });
});
