import { position, rungSnapShiftMm } from '../core/index.js';

// 真实装配位置：逻辑格位加横档相位补偿。生成、同步和动画共用此派生值。
export function mountedPosition(a, items = []) {
  const result = position(a);
  result[1] += rungSnapShiftMm(a, items) * 0.001;
  return result;
}
