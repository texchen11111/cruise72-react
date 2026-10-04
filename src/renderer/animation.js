import * as THREE from 'three';
import { mountedPosition } from '../geometry/placement.js';

export function createAnimation(ctx) {
  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    for (const g of [...ctx.exiting]) {
      g.scale.multiplyScalar(0.8);
      if (g.scale.x < 0.02) {
        ctx.dispose(g);
        ctx.exiting = ctx.exiting.filter((x) => x !== g);
      }
    }
    for (const a of ctx.items) {
      const g = ctx.models.get(a.id);
      if (!g) continue;
      const target = new THREE.Vector3(...mountedPosition(a, ctx.items));
      if (g.userData.transition) {
        g.position.lerp(target, 0.13);
        g.scale.lerp(new THREE.Vector3(1, 1, 1), 0.15);
        if (g.position.distanceTo(target) < 0.001 && g.scale.x > 0.999) {
          g.position.copy(target);
          g.scale.setScalar(1);
          g.userData.transition = false;
        }
      } else g.position.copy(target);
      if (g.userData.book) g.userData.book.visible = !a.state;
      const act = g.userData.act;
      if (act) {
        if (a.type === 'cabinet')
          act.rotation.y = THREE.MathUtils.lerp(
            act.rotation.y,
            a.state ? -Math.PI / 2 : 0,
            0.12,
          );
        if (a.type === 'worktop')
          act.rotation.x = THREE.MathUtils.lerp(
            act.rotation.x,
            a.state ? 0 : -Math.PI / 2,
            0.12,
          );
      }
      if (g.userData.light) {
        const l = g.userData.light;
        l.intensity = THREE.MathUtils.lerp(
          l.intensity,
          a.state ? a.intensity * 0.017 : 0,
          0.1,
        );
        const color =
          a.temperature === 2700
            ? '#ffbd67'
            : a.temperature === 3200
              ? '#ffd794'
              : '#fff0d2';
        l.color.set(color);
        g.userData.disk.material.emissive.set(color);
        g.userData.disk.material.emissiveIntensity = a.state
          ? a.intensity / 55
          : 0;
      }
      if (g.userData.particles) {
        g.userData.particles.forEach((p, i) => {
          p.visible = !!a.state;
          const ph = (t * 0.3 + i / 10) % 1;
          p.position.set(
            Math.sin(t + i) * 0.013,
            0.12 + ph * 0.18,
            0.144 + ph * 0.05,
          );
        });
      }
    }
    ctx.ambient.intensity = THREE.MathUtils.lerp(
      ctx.ambient.intensity,
      ctx.night ? 0.52 : 1.8,
      0.04,
    );
    ctx.sun.intensity = THREE.MathUtils.lerp(
      ctx.sun.intensity,
      ctx.night ? 0.28 : 2.5,
      0.04,
    );
    const bg = new THREE.Color(ctx.night ? '#6b768b' : '#e9e7e1');
    ctx.scene.background.lerp(bg, 0.04);
    ctx.orbit.update();
    ctx.updateSelection();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }
  return { update: animate };
}
