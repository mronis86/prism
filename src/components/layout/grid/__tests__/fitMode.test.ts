import { resolveFitMode, containGeometry } from '../fitMode';

// Landscape design canvas for the default 1080p screen: 48 cols x 27 rows.
const LANDSCAPE_ROWS = 27;
// Portrait design canvas: 36 cols x 64 rows.
const PORTRAIT_ROWS = 64;

describe('resolveFitMode', () => {
  it('stretches a landscape layout that fits its canvas on a landscape screen', () => {
    expect(resolveFitMode({
      fitCols: 48, fitRows: 24, targetRows: LANDSCAPE_ROWS,
      designOrientation: 'landscape', screenWide: true,
    })).toBe('stretch');
  });

  it('letterboxes content that is taller than wide on a landscape screen, whatever its label', () => {
    // 4 x 6 blocks of 12 units each, as in #519. containGeometry makes it fit.
    expect(resolveFitMode({
      fitCols: 48, fitRows: 72, targetRows: LANDSCAPE_ROWS,
      designOrientation: 'landscape', screenWide: true,
    })).toBe('contain');
  });

  it('still stretches a layout saved as portrait but laid out landscape', () => {
    expect(resolveFitMode({
      fitCols: 48, fitRows: 27, targetRows: PORTRAIT_ROWS,
      designOrientation: 'portrait', screenWide: true,
    })).toBe('stretch');
  });

  it('letterboxes a portrait layout on a landscape screen', () => {
    expect(resolveFitMode({
      fitCols: 36, fitRows: 64, targetRows: PORTRAIT_ROWS,
      designOrientation: 'portrait', screenWide: true,
    })).toBe('contain');
  });

  it('letterboxes a narrow landscape layout that fits its canvas', () => {
    expect(resolveFitMode({
      fitCols: 20, fitRows: 27, targetRows: LANDSCAPE_ROWS,
      designOrientation: 'landscape', screenWide: true,
    })).toBe('contain');
  });

  it('stretches a tall landscape-labelled layout on a portrait screen', () => {
    expect(resolveFitMode({
      fitCols: 48, fitRows: 72, targetRows: LANDSCAPE_ROWS,
      designOrientation: 'landscape', screenWide: false,
    })).toBe('stretch');
  });

  it('always contains in containMode (screensaver)', () => {
    expect(resolveFitMode({
      fitCols: 48, fitRows: 72, targetRows: LANDSCAPE_ROWS,
      designOrientation: 'landscape', screenWide: true, containMode: true,
    })).toBe('contain');
  });

  it('uses the legacy mode without a target canvas or when filling height', () => {
    expect(resolveFitMode({ fitCols: 48, fitRows: 24, screenWide: true })).toBe('legacy');
    expect(resolveFitMode({
      fitCols: 48, fitRows: 24, targetRows: LANDSCAPE_ROWS, screenWide: true, fillHeight: true,
    })).toBe('legacy');
  });
});

// The contain cell as it was before #519, kept verbatim so the sweep below can
// prove every layout that fitted then renders exactly as it did.
function previousContainCell(width: number, availH: number, fitCols: number, fitRows: number, margin: number, containerPadding: number) {
  const innerW = width - 2 * containerPadding - (fitCols - 1) * margin;
  const innerH = availH - 2 * containerPadding - (fitRows - 1) * margin;
  return Math.max(8, Math.floor(Math.min(innerW / fitCols, innerH / fitRows)));
}

// Dashboard (margin 8) and screensaver (margin 4), both with 12px padding.
const SPACINGS = [{ margin: 8, padding: 12 }, { margin: 4, padding: 12 }];
const WIDTHS = [320, 600, 800, 1080, 1321, 1920, 2560];
const HEIGHTS = [120, 300, 459, 491, 700, 1012, 1080, 1800];

function* sweep() {
  for (const { margin, padding } of SPACINGS)
    for (const width of WIDTHS)
      for (const height of HEIGHTS)
        for (let cols = 1; cols <= 48; cols++)
          for (let rows = 1; rows <= 80; rows++)
            yield { width, height, cols, rows, margin, padding };
}

describe('containGeometry', () => {
  it('fits a 48 x 72 layout inside a 1321 x 559 screen on both axes (#519)', () => {
    // 559px viewport less the 56px header and 12px bottom safety margin.
    const height = 559 - 56 - 12;
    const geo = containGeometry({ width: 1321, height, cols: 48, rows: 72, margin: 8, padding: 12 });
    expect(geo.gridHeight).toBeLessThanOrEqual(height);
    expect(geo.gridWidth).toBeLessThanOrEqual(1321);
    expect(geo.cell).toBeGreaterThan(0);
    // Everything shrinks together, keeping the 8 : 8 : 12 proportions.
    expect(geo.gap).toBeCloseTo(geo.cell);
    expect(geo.padding).toBeCloseTo(geo.cell * 1.5);
    // The grid's own arithmetic agrees with the reported size.
    expect(48 * geo.cell + 47 * geo.gap + 2 * geo.padding).toBeCloseTo(geo.gridWidth);
    expect(72 * geo.cell + 71 * geo.gap + 2 * geo.padding).toBeCloseTo(geo.gridHeight);
  });

  it('leaves a layout that already fits exactly as it was', () => {
    // A 36 x 40 portrait layout on a 1321 x 800 landscape screen.
    const geo = containGeometry({ width: 1321, height: 732, cols: 36, rows: 40, margin: 8, padding: 12 });
    const cell = previousContainCell(1321, 732, 36, 40, 8, 12);
    expect(cell).toBeGreaterThan(8);
    expect(geo).toEqual({
      cell,
      gap: 8,
      padding: 12,
      gridWidth: 36 * cell + 35 * 8 + 24,
      gridHeight: 40 * cell + 39 * 8 + 24,
    });
  });

  it('matches the previous geometry for every layout that fitted before, and fits every layout now', () => {
    let fittedBefore = 0;
    let overflowedBefore = 0;
    for (const c of sweep()) {
      const prev = previousContainCell(c.width, c.height, c.cols, c.rows, c.margin, c.padding);
      const prevW = c.cols * prev + (c.cols - 1) * c.margin + 2 * c.padding;
      const prevH = c.rows * prev + (c.rows - 1) * c.margin + 2 * c.padding;
      const geo = containGeometry(c);

      if (prevW <= c.width && prevH <= c.height) {
        fittedBefore++;
        if (geo.cell !== prev || geo.gap !== c.margin || geo.padding !== c.padding
          || geo.gridWidth !== prevW || geo.gridHeight !== prevH) {
          throw new Error(`changed a layout that fitted: ${JSON.stringify(c)}`);
        }
      } else {
        overflowedBefore++;
      }
      // Allow float rounding only.
      if (geo.gridWidth > c.width + 1e-6 || geo.gridHeight > c.height + 1e-6) {
        throw new Error(`does not fit: ${JSON.stringify(c)} -> ${JSON.stringify(geo)}`);
      }
    }
    // Both branches were really exercised.
    expect(fittedBefore).toBeGreaterThan(1000);
    expect(overflowedBefore).toBeGreaterThan(1000);
  });
});
