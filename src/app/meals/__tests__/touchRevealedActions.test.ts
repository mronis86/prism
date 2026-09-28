/**
 * Meal actions that are hidden until hover must stay visible on a touchscreen.
 *
 * Tailwind v4 wraps every hover variant, group-hover included, in
 * `@media (hover: hover)`, so on a device that cannot hover an
 * `opacity-0 group-hover:opacity-100` control is never shown. Each such control
 * needs a `pointer-coarse:` opacity of its own.
 */

import { readFileSync } from 'fs';
import path from 'path';

const FILES = [
  'src/app/meals/MealsView.tsx',
  'src/components/widgets/MealsWidget.tsx',
];

function hoverRevealedClassNames(source: string): string[] {
  const classNames = source.match(/className="[^"]*"/g) ?? [];
  return classNames.filter(
    (c) => /(^|\s|")opacity-0(\s|")/.test(c) && c.includes('group-hover:opacity-100'),
  );
}

describe.each(FILES)('%s hover-revealed actions', (file) => {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8');
  const revealed = hoverRevealedClassNames(source);

  it('has hover-revealed controls to check', () => {
    expect(revealed.length).toBeGreaterThan(0);
  });

  it.each(revealed)('%s is visible on a coarse pointer', (className) => {
    expect(className).toMatch(/pointer-coarse:opacity-(?!0\b)\d+/);
  });
});
