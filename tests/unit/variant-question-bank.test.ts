import {describe, expect, it} from 'vitest';

import {buildVariantQuestionBank, resolveVariantPreviewQ1} from '../../src/features/test/question-bank';

describe('buildVariantQuestionBank', () => {
  it('qmbti: 8개 scoring question 반환', () => {
    const bank = buildVariantQuestionBank('qmbti', 'en');

    expect(bank).toHaveLength(8);
    expect(bank.every((question) => question.questionType === 'scoring')).toBe(true);
  });

  it('egtt: 4개 항목, 첫 번째는 profile', () => {
    const bank = buildVariantQuestionBank('egtt', 'en');

    expect(bank).toHaveLength(4);
    expect(bank[0].questionType).toBe('profile');
    expect(bank[1].questionType).toBe('scoring');
    expect(bank[2].questionType).toBe('scoring');
    expect(bank[3].questionType).toBe('scoring');
  });

  it('canonical index는 1-based 출현 순서', () => {
    const bank = buildVariantQuestionBank('egtt', 'en');

    expect(bank[0].id).toBe('q1');
    expect(bank[1].id).toBe('q2');
    expect(bank[0].canonicalIndex).toBe(1);
    expect(bank[1].canonicalIndex).toBe(2);
    expect(bank[2].canonicalIndex).toBe(3);
    expect(bank[3].canonicalIndex).toBe(4);
  });

  it('buildVariantQuestionBank는 poleA/poleB를 그대로 보존하며 A/B로 변환하지 않는다', () => {
    const bank = buildVariantQuestionBank('qmbti', 'en');

    expect(bank[0].poleA).toBe('E');
    expect(bank[0].poleB).toBe('I');
    expect(bank[0].poleA).not.toBe('A');
    expect(bank[0].poleB).not.toBe('B');
  });

  it('buildVariantQuestionBank는 egtt profile question의 poleA/poleB를 undefined로 보존한다', () => {
    const bank = buildVariantQuestionBank('egtt', 'en');

    expect(bank[0].questionType).toBe('profile');
    expect(bank[0].poleA).toBeUndefined();
    expect(bank[0].poleB).toBeUndefined();
  });

  it('존재하지 않는 variant는 빈 배열 반환', () => {
    const bank = buildVariantQuestionBank('non-existent', 'en');

    expect(bank).toHaveLength(0);
  });
});

describe('resolveVariantPreviewQ1', () => {
  it('qmbti: scoring1 텍스트 반환', () => {
    const q1 = resolveVariantPreviewQ1('qmbti', 'en');

    expect(q1?.question).toBe('🎉 At parties or birthday celebrations,');
    expect(q1?.answerA).toBe('Early morning blocks');
    expect(q1?.answerB).toBe('Late-night sprints');
  });

  it('egtt: q.1(profile)이 아닌 scoring1 반환', () => {
    const q1 = resolveVariantPreviewQ1('egtt', 'en');

    expect(q1?.question).toContain('I`m interested in making me charming');
  });

  it('KR locale 반환', () => {
    const q1 = resolveVariantPreviewQ1('qmbti', 'kr');

    expect(q1?.question).toBe('🎉 파티나 생일잔치에 가면 나는');
  });
});
