import {describe, expect, it} from 'vitest';

import {buildRowCompensationModel, deriveNaturalHeightFromGeometry} from '../../src/features/landing/grid/spacing-plan';

describe('landing row compensation model', () => {
  it('derives natural height from geometry while neutralizing applied comp gap', () => {
    const beforeComp = deriveNaturalHeightFromGeometry({
      cardVariant: 'card-a',
      contentTop: 120,
      tagsBottom: 290,
      appliedCompGap: 0
    });
    const afterComp = deriveNaturalHeightFromGeometry({
      cardVariant: 'card-a',
      contentTop: 120,
      tagsBottom: 314,
      appliedCompGap: 24
    });

    expect(beforeComp.naturalHeight).toBe(170);
    expect(afterComp.naturalHeight).toBe(170);
  });

  it('supports viewport-relative coordinates that can be negative while preserving geometry distance', () => {
    const measurement = deriveNaturalHeightFromGeometry({
      cardVariant: 'card-b',
      contentTop: -40,
      tagsBottom: 82,
      appliedCompGap: 10
    });

    expect(measurement.naturalHeight).toBe(112);
  });

  it('applies comp gap only to cards shorter than row max natural height', () => {
    const model = buildRowCompensationModel([
      {cardVariant: 'a', naturalHeight: 200},
      {cardVariant: 'b', naturalHeight: 176},
      {cardVariant: 'c', naturalHeight: 200}
    ]);

    const byId = new Map(model.map((entry) => [entry.cardVariant, entry]));

    expect(byId.get('a')?.needsComp).toBe(false);
    expect(byId.get('a')?.compGap).toBe(0);

    expect(byId.get('b')?.needsComp).toBe(true);
    expect(byId.get('b')?.compGap).toBe(24);

    expect(byId.get('c')?.needsComp).toBe(false);
    expect(byId.get('c')?.compGap).toBe(0);
  });

  it('keeps comp gap at zero for equal natural heights', () => {
    const model = buildRowCompensationModel([
      {cardVariant: 'r1-a', naturalHeight: 188},
      {cardVariant: 'r1-b', naturalHeight: 188}
    ]);

    for (const entry of model) {
      expect(entry.needsComp).toBe(false);
      expect(entry.compGap).toBe(0);
      expect(entry.rowMaxNaturalHeight).toBe(188);
    }
  });

  it('uses the same row-local decision rule regardless of row index context', () => {
    const rowOneLike = buildRowCompensationModel([
      {cardVariant: 'x1', naturalHeight: 210},
      {cardVariant: 'x2', naturalHeight: 198}
    ]);
    const rowTwoLike = buildRowCompensationModel([
      {cardVariant: 'y1', naturalHeight: 210},
      {cardVariant: 'y2', naturalHeight: 198}
    ]);

    expect(rowOneLike[0].needsComp).toBe(rowTwoLike[0].needsComp);
    expect(rowOneLike[0].compGap).toBe(rowTwoLike[0].compGap);
    expect(rowOneLike[1].needsComp).toBe(rowTwoLike[1].needsComp);
    expect(rowOneLike[1].compGap).toBe(rowTwoLike[1].compGap);
  });
});
