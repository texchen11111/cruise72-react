import { useSyncExternalStore } from 'react';

// React 组件统一通过本 hook 订阅 planner store 的不可变快照；
// Three.js 场景侧仍直接走 store.getSnapshot / store.subscribe。
export function usePlanner(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
