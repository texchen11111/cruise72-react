import { PRESETS, EXHIBITIONS, prepareLayout, compareLayouts } from '../core/index.js';

// 场景切换：预设 / 展陈轮换与自动播放。计时器由 store 骨架统一管理。
export function createSceneActions({ getState, update, stopPlay, startPlayTimer }) {
  function applyLayout(i, exhibition) {
    const layout = i === 0 ? EXHIBITIONS[exhibition] : PRESETS[i];
    const next = prepareLayout(layout.items);
    for (const a of next) {
      const old = getState().items.find((b) => b.id === a.id && b.type === a.type);
      if (old) a.color = old.color;
    }
    const transition = compareLayouts(getState().items, next);
    update({
      preset: i,
      exhibition,
      transition,
      dirty: false,
      night: PRESETS[i].ambient === 'night',
      items: next,
      selected: next[0]?.id,
      sceneRevision: getState().sceneRevision + 1,
    });
  }
  function setPreset(i) {
    if (PRESETS[i]) applyLayout(i, getState().exhibition);
  }
  function setExhibition(i) {
    if (EXHIBITIONS[i]) applyLayout(0, i);
  }
  function togglePlay() {
    if (getState().playing) {
      stopPlay();
      return;
    }
    update({ playing: true });
    startPlayTimer(
      () =>
        getState().preset === 0
          ? setExhibition((getState().exhibition + 1) % EXHIBITIONS.length)
          : setPreset((getState().preset + 1) % PRESETS.length),
      6500,
    );
  }
  return { setPreset, setExhibition, togglePlay };
}
