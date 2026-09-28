import { cube, cylinder } from '../primitives.js';

// The web scene keeps the Rhino V3 interface dimensions in one place.  The
// source file is millimetre based (0.01 mm tolerance); these values are the
// measured connection envelopes used by the layout preview.
export const RHINO_V3 = {
  source: '墙1111111111.3dm',
  units: 'Millimeters',
  toleranceMm: 0.01,
  nodeEnvelopeMm: [48, 48, 48],
  narrowThroatMm: 9,
  rodDiameterMm: 6,
  rodLengthMm: 30,
  clampPlateMm: 6,
};

export function buildRhinoPillar(g, w, h, d, silver, dark) {
  cube(g, Math.min(w, 0.018), h, Math.min(d, 0.018), 0, 0, 0.009, silver);
  for (let y = -h / 2 + 0.048; y < h / 2; y += 0.096) {
    cylinder(g, 0.003, 0.026, 0, y, 0.018, dark, 'z');
  }
}

export function buildRhinoNode(g, w, h, d, silver, orange, dark) {
  cube(g, Math.min(w, 0.044), Math.min(h, 0.048), Math.min(d, 0.032), 0, 0, 0.016, orange);
  cube(g, 0.009, 0.036, 0.006, 0, 0, 0.034, dark);
  for (const y of [-0.015, 0.015]) {
    cylinder(g, 0.003, 0.03, -0.019, y, 0.042, silver, 'x');
    cylinder(g, 0.003, 0.03, 0.019, y, 0.042, silver, 'x');
  }
  cube(g, 0.044, 0.006, 0.006, 0, -0.021, 0.038, silver);
}
