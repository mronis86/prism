import { fitGlobeZoom, globeDiscRadius } from '../globeFit';

const FOV = 36.87; // maplibre's default vertical field of view
const base = { centerLat: 20, fovDeg: FOV, maxZoom: 2.8 };

describe('globeDiscRadius', () => {
  it('matches the disc sizes measured in the browser at zoom 2.8', () => {
    // Measured on /travel: a 1836x1008 container drew a 900px disc and a
    // 1052x1848 one drew a 1007px disc.
    expect(2 * globeDiscRadius(2.8, 1008, 20, FOV)).toBeCloseTo(900, -1);
    expect(2 * globeDiscRadius(2.8, 1848, 20, FOV)).toBeCloseTo(1007, -1);
  });
});

describe('fitGlobeZoom', () => {
  it('keeps the fixed zoom when the globe already fits', () => {
    expect(fitGlobeZoom({ ...base, width: 1836, height: 1008 })).toBe(2.8);
    expect(fitGlobeZoom({ ...base, width: 1052, height: 1848 })).toBe(2.8);
  });

  it.each([
    [692, 1208],
    [772, 1208],
    [1196, 728],
    [400, 700],
  ])('fits a %ix%i container', (width, height) => {
    const zoom = fitGlobeZoom({ ...base, width, height });
    expect(zoom).toBeLessThan(2.8);
    const diameter = 2 * globeDiscRadius(zoom, height, 20, FOV);
    expect(diameter).toBeCloseTo(0.96 * Math.min(width, height), 6);
  });

  it('falls back to the fixed zoom for an unmeasured container', () => {
    expect(fitGlobeZoom({ ...base, width: 0, height: 0 })).toBe(2.8);
  });
});
