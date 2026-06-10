import {describe, expect, it} from 'vitest';

import {
  buildRowCompensationModel,
  deriveNaturalHeightFromGeometry,
  resolveVisibleTagPrefix
} from '../../src/features/landing/grid/spacing-plan';

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

  it('keeps non-comp compensation at zero for repeated normalized measurements', () => {
    let appliedCompGap = 0;

    for (let pass = 0; pass < 5; pass += 1) {
      const shorter = deriveNaturalHeightFromGeometry({
        cardVariant: 'shorter',
        contentTop: 100.2,
        tagsBottom: 276.8 + appliedCompGap,
        appliedCompGap
      });
      const taller = deriveNaturalHeightFromGeometry({
        cardVariant: 'taller',
        contentTop: 100.2,
        tagsBottom: 300.8,
        appliedCompGap: 0
      });
      const model = buildRowCompensationModel([shorter, taller]);
      const shorterDecision = model.find((entry) => entry.cardVariant === 'shorter');
      const tallerDecision = model.find((entry) => entry.cardVariant === 'taller');

      expect(shorterDecision?.naturalHeight).toBe(176.6);
      expect(shorterDecision?.needsComp).toBe(true);
      expect(shorterDecision?.compGap).toBe(24);
      expect(tallerDecision?.naturalHeight).toBe(200.6);
      expect(tallerDecision?.needsComp).toBe(false);
      expect(tallerDecision?.compGap).toBe(0);

      appliedCompGap = shorterDecision?.compGap ?? 0;
    }
  });

  it('resolves tag tail ellipsis with right-first hiding and growth reappearance', () => {
    const resolve = (availableWidth: number, intrinsicWidths = [80, 90, 100]) =>
      resolveVisibleTagPrefix({
        availableWidth,
        intrinsicWidths,
        gap: 8,
        requiredVisiblePrefixCount: 0
      });

    expect(resolve(0)).toEqual({visibleCount: 0, tailIndex: null, tailMayEllipsize: false});
    expect(resolve(55)).toEqual({visibleCount: 0, tailIndex: null, tailMayEllipsize: false});
    expect(resolve(56)).toEqual({visibleCount: 1, tailIndex: 0, tailMayEllipsize: true});
    expect(resolve(143)).toEqual({visibleCount: 1, tailIndex: 0, tailMayEllipsize: false});
    expect(resolve(144)).toEqual({visibleCount: 2, tailIndex: 1, tailMayEllipsize: true});
    expect(resolve(241)).toEqual({visibleCount: 2, tailIndex: 1, tailMayEllipsize: false});
    expect(resolve(242)).toEqual({visibleCount: 3, tailIndex: 2, tailMayEllipsize: true});
    expect(resolve(243)).toEqual({visibleCount: 3, tailIndex: 2, tailMayEllipsize: true});
    expect(resolve(286)).toEqual({visibleCount: 3, tailIndex: 2, tailMayEllipsize: false});

    expect(resolve(39, [40])).toEqual({visibleCount: 0, tailIndex: null, tailMayEllipsize: false});
    expect(resolve(40, [40])).toEqual({visibleCount: 1, tailIndex: 0, tailMayEllipsize: false});

    const shrink = resolve(241);
    const widen = resolve(242);
    expect(shrink.visibleCount).toBe(2);
    expect(widen.visibleCount).toBe(3);
  });

  it('keeps mandatory status-first prefix visible', () => {
    expect(
      resolveVisibleTagPrefix({
        availableWidth: 0,
        intrinsicWidths: [96, 80, 90],
        gap: 8,
        requiredVisiblePrefixCount: 1
      })
    ).toEqual({
      visibleCount: 1,
      tailIndex: 0,
      tailMayEllipsize: true
    });

    expect(
      resolveVisibleTagPrefix({
        availableWidth: 160,
        intrinsicWidths: [96, 80, 90],
        gap: 8,
        requiredVisiblePrefixCount: 1
      })
    ).toEqual({
      visibleCount: 2,
      tailIndex: 1,
      tailMayEllipsize: true
    });
  });
});
