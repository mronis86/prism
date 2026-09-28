/**
 * Zoom that keeps the whole globe inside its container.
 *
 * The globe opens at a fixed zoom. Its on-screen size follows the container
 * HEIGHT (the camera distance is derived from it), not the width, so a tall,
 * narrow portrait container gets a globe wider than itself and the sides are
 * cut off. This returns the fixed zoom when the globe already fits and a
 * smaller one when it does not, so containers that fit today are unchanged.
 *
 * Geometry, matching maplibre's globe projection:
 *   globe radius R = worldSize / (2 * PI * cos(centerLat)), worldSize = 512 * 2^zoom
 *   camera distance to the surface D = (height / 2) / tan(fov / 2), also the focal length
 *   apparent disc radius r = D * R / sqrt(D^2 + 2 * D * R)
 * Solving the last line for R gives R = (r^2 + r * sqrt(r^2 + D^2)) / D.
 */
export type GlobeFitInput = {
  width: number;
  height: number;
  /** Latitude at the map centre, in degrees. */
  centerLat: number;
  /** Vertical field of view, in degrees (map.getVerticalFieldOfView()). */
  fovDeg: number;
  /** The zoom used when the globe already fits. */
  maxZoom: number;
  /** Largest disc diameter as a fraction of the container's shorter side. The
   *  default leaves the sizes that already fit (up to 96%) as they are. */
  fill?: number;
};

export function globeDiscRadius(zoom: number, height: number, centerLat: number, fovDeg: number): number {
  const R = (512 * 2 ** zoom) / (2 * Math.PI * Math.cos((centerLat * Math.PI) / 180));
  const D = height / 2 / Math.tan((fovDeg * Math.PI) / 360);
  return (D * R) / Math.sqrt(D * D + 2 * D * R);
}

export function fitGlobeZoom({ width, height, centerLat, fovDeg, maxZoom, fill = 0.96 }: GlobeFitInput): number {
  if (!(width > 0) || !(height > 0)) return maxZoom;
  const r = (fill * Math.min(width, height)) / 2;
  const D = height / 2 / Math.tan((fovDeg * Math.PI) / 360);
  const R = (r * r + r * Math.sqrt(r * r + D * D)) / D;
  const worldSize = R * 2 * Math.PI * Math.cos((centerLat * Math.PI) / 180);
  const zoom = Math.log2(worldSize / 512);
  return Number.isFinite(zoom) ? Math.min(maxZoom, zoom) : maxZoom;
}
