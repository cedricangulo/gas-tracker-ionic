import { TestBed } from '@angular/core/testing';
import { ListViewState } from './list-view-state';

describe('ListViewState', () => {
  it('loads ten more entries per tap, caps at the total, and keeps the two lists independent', () => {
    const state = TestBed.inject(ListViewState);
    expect(state.logLimit()).toBe(10);
    expect(state.mapLimit()).toBe(10);
    state.loadMore('log', 23);
    expect(state.logLimit()).toBe(20);
    expect(state.mapLimit()).toBe(10);
    state.loadMore('log', 23);
    expect(state.logLimit()).toBe(23);
    state.loadMore('map', 42);
    expect(state.mapLimit()).toBe(20);
    expect(state.logLimit()).toBe(23);
  });
  it('resets the map list only when the fuel grade changes', () => {
    const state = TestBed.inject(ListViewState);
    state.selectMapGrade('unleaded');
    state.loadMore('map', 42);
    state.mapScrollTop = 500;
    state.selectMapGrade('unleaded');
    expect(state.mapLimit()).toBe(20);
    expect(state.mapScrollTop).toBe(500);
    state.selectMapGrade('premium');
    expect(state.mapLimit()).toBe(10);
    expect(state.mapScrollTop).toBe(0);
  });
});
