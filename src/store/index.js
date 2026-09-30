import { PRESETS, prepareLayout } from '../core/index.js';
import { createLayoutActions } from './layoutActions.js';
import { createSceneActions } from './sceneActions.js';
import { createExportData } from './exportData.js';

// React reads immutable snapshots through useSyncExternalStore. Three.js consumes
// the same state; it never owns or rewrites the React interface.
export function createPlannerStore() {
  let state = {
    items: prepareLayout(PRESETS[0].items),
    selected: 'b',
    preset: 0,
    exhibition: 0,
    transition: null,
    filter: '全部',
    familyFilter: '全部',
    subkindFilter: '全部',
    rightTab: 'detail',
    view: '3d',
    viewRevision: 0,
    playing: false,
    night: false,
    dirty: false,
    showDims: true,
    gridTouched: false,
    sceneRevision: 0,
    toast: '',
    error: '',
  };
  let uid = 100,
    timer = null,
    toastTimer = null;
  const listeners = new Set();
  const update = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  const toast = (text) => {
    clearTimeout(toastTimer);
    update({ toast: text });
    toastTimer = setTimeout(() => update({ toast: '' }), 3200);
  };
  const stopPlay = () => {
    clearInterval(timer);
    timer = null;
    update({ playing: false });
  };
  const changed = () => {
    clearInterval(timer);
    timer = null;
    update({ dirty: true, playing: false });
  };
  const startPlayTimer = (fn, ms) => {
    timer = setInterval(fn, ms);
  };
  const getState = () => state;
  const getUid = () => 'u' + uid;
  const advanceUid = () => {
    uid += 1;
  };
  const select = (id) => update({ selected: id, rightTab: 'detail' });
  const layoutActions = createLayoutActions({
    getState,
    update,
    toast,
    changed,
    getUid,
    advanceUid,
  });
  const sceneActions = createSceneActions({ getState, update, stopPlay, startPlayTimer });
  const exportData = createExportData({ getState });
  return {
    getSnapshot: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    toast,
    changed,
    select,
    moveItem: layoutActions.moveItem,
    addItem: layoutActions.addItem,
    setPreset: sceneActions.setPreset,
    setExhibition: sceneActions.setExhibition,
    patchItem: layoutActions.patchItem,
    toggleState: layoutActions.toggleState,
    remove: layoutActions.remove,
    duplicate: layoutActions.duplicate,
    exportData,
    stopPlay,
    setFilter: (filter) => update({ filter }),
    setFamilyFilter: (familyFilter) => update({ familyFilter, subkindFilter: '全部' }),
    setSubkindFilter: (subkindFilter) => update({ subkindFilter }),
    resizeItem: layoutActions.resizeItem,
    setTab: (rightTab) => update({ rightTab }),
    setView: (view) => update({ view, viewRevision: state.viewRevision + 1 }),
    setError: (error) => update({ error }),
    toggleGrid: () => update({ showDims: !state.showDims, gridTouched: true }),
    togglePlay: sceneActions.togglePlay,
    destroy: () => {
      clearInterval(timer);
      clearTimeout(toastTimer);
      listeners.clear();
    },
  };
}
