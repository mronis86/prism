/**
 * How the display grid maps the design canvas onto the real screen.
 *   stretch: both axes flex to fill the available box.
 *   contain: square cells scaled to fit the whole content, letterboxed.
 *   legacy:  fill width with square cells, adaptive row count.
 */
export type FitMode = 'stretch' | 'contain' | 'legacy';

export type FitModeInput = {
  /** Content bounding box, in grid units (origin to furthest used col/row). */
  fitCols: number;
  fitRows: number;
  /** Row count of the design canvas for the layout's orientation. */
  targetRows?: number;
  designOrientation?: 'landscape' | 'portrait';
  screenWide: boolean;
  containMode?: boolean;
  fillHeight?: boolean;
};

export function resolveFitMode({
  fitCols,
  fitRows,
  targetRows,
  designOrientation,
  screenWide,
  containMode = false,
  fillHeight = false,
}: FitModeInput): FitMode {
  const fit = (!!targetRows || containMode) && !fillHeight;
  if (!fit) return 'legacy';
  // containMode always scales-to-fit (screensaver: a sparse ambient layout that
  // should fit any screen without clipping).
  if (containMode) return 'contain';
  // Decide stretch-vs-letterbox from the CONTENT'S OWN SHAPE, not a stored
  // orientation label (which can drift from the actual widgets, e.g. a layout
  // saved as "portrait" but laid out landscape). A wide design on a wide screen
  // (or tall on tall) stretches to fill; a genuine orientation mismatch would be
  // a ~2x skew, so it letterboxes to preserve proportions. `designOrientation`
  // is kept only as a fallback for an empty/degenerate layout.
  const designWide = fitCols !== fitRows
    ? fitCols > fitRows
    : (designOrientation ? designOrientation === 'landscape' : true);
  return designWide === screenWide ? 'stretch' : 'contain';
}

/**
 * Smallest cell the contain canvas uses at full gap and padding. Below it the
 * whole canvas (cells, gaps and padding) shrinks together instead.
 */
export const MIN_CONTAIN_CELL = 8;

export type ContainGeometryInput = {
  /** Available box, in px. */
  width: number;
  height: number;
  cols: number;
  rows: number;
  margin: number;
  padding: number;
};

export type ContainGeometry = {
  cell: number;
  gap: number;
  padding: number;
  gridWidth: number;
  gridHeight: number;
};

/**
 * Square-cell canvas that fits the whole `cols x rows` content inside the box.
 *
 * While a cell of at least MIN_CONTAIN_CELL fits beside full-size gaps and
 * padding, that whole-pixel cell is used as is. A tall, fine-grained layout
 * can need more room for its gaps alone than the box has (72 rows carry 71
 * gaps), so past that point the cell, gap and padding scale down together
 * from their MIN_CONTAIN_CELL proportions until the canvas fits on both axes.
 */
export function containGeometry({ width, height, cols, rows, margin, padding }: ContainGeometryInput): ContainGeometry {
  const innerW = width - 2 * padding - (cols - 1) * margin;
  const innerH = height - 2 * padding - (rows - 1) * margin;
  const whole = Math.floor(Math.min(innerW / cols, innerH / rows));
  if (whole >= MIN_CONTAIN_CELL) {
    return {
      cell: whole,
      gap: margin,
      padding,
      gridWidth: cols * whole + (cols - 1) * margin + 2 * padding,
      gridHeight: rows * whole + (rows - 1) * margin + 2 * padding,
    };
  }
  const baseW = cols * MIN_CONTAIN_CELL + (cols - 1) * margin + 2 * padding;
  const baseH = rows * MIN_CONTAIN_CELL + (rows - 1) * margin + 2 * padding;
  const scale = Math.max(0, Math.min(width / baseW, height / baseH));
  return {
    cell: MIN_CONTAIN_CELL * scale,
    gap: margin * scale,
    padding: padding * scale,
    gridWidth: baseW * scale,
    gridHeight: baseH * scale,
  };
}
