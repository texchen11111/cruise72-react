import * as THREE from 'three';

export function createMaterials() {
  const mat = (c, metal = 0.08) =>
    new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: metal,
      roughness: metal > 0.5 ? 0.21 : 0.36,
      clearcoat: metal > 0.5 ? 0.15 : 0.28,
      clearcoatRoughness: 0.3,
      envMapIntensity: metal > 0.5 ? 1.2 : 0.55,
    });
  const silver = mat('#d9dadb', 0.92),
    orange = mat('#ed8e40'),
    dark = mat('#343e4e'),
    white = mat('#edece7'),
    glass = new THREE.MeshPhysicalMaterial({
      color: '#e1eeed',
      transparent: true,
      opacity: 0.3,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      envMapIntensity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

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
  const shared = { silver, orange, dark, white, glass };
  return { mat, textTexture, shared, isShared: (m) => Object.values(shared).includes(m) };
}
