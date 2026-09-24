import * as THREE from 'three';

// Shared materials and texture helpers. Shared instances are owned by the
// scene lifecycle: per-module dispose must never release them (see isShared).
export function createMaterials() {
  const mat = (c, metal = 0) =>
    new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: 0.55 });
  const shared = {
    silver: mat('#aeb8c6', 0.5),
    orange: mat('#ed8e40'),
    dark: mat('#343e4e'),
    white: mat('#edece7'),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#b9d2df',
      transparent: true,
      opacity: 0.23,
      roughness: 0.12,
      metalness: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
  const isShared = (m) => Object.values(shared).includes(m);
  function textTexture(top, bottom, bg = '#eee9db') {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 512);
    ctx.fillStyle = '#3158e8';
    ctx.fillRect(52, 50, 70, 8);
    ctx.font = '600 48px sans-serif';
    ctx.fillText(top, 52, 160);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#627086';
    ctx.fillText(bottom, 52, 216);
    ctx.font = 'bold 135px sans-serif';
    ctx.fillStyle = '#3158e8';
    ctx.fillText('72+', 460, 444);
    ctx.strokeStyle = '#c8cbd1';
    ctx.beginPath();
    ctx.moveTo(52, 300);
    ctx.lineTo(714, 300);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  }
  return { mat, textTexture, shared, isShared };
}
