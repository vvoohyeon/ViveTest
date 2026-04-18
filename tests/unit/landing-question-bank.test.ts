import {describe, expect, it} from 'vitest';

import {buildLandingTestQuestionBank} from '../../src/features/test/question-bank';
import {resolveLandingTestCardByVariant} from '../../src/features/variant-registry';

describe('landing question bank locale fallbacks', () => {
  it('builds q1 from the resolved landing card while keeping the shared locale fallback questions', () => {
    const card = resolveLandingTestCardByVariant('ja', 'qmbti');
    if (!card) {
      throw new Error('Expected qmbti fixture card');
    }

    const questions = buildLandingTestQuestionBank(card, 'ja');

    expect(questions[0]).toEqual({
      id: 'q1',
      prompt: '🎉 At parties or birthday celebrations,',
      choiceA: 'Early morning blocks',
      choiceB: 'Late-night sprints'
    });

    expect(questions[1]).toEqual({
      id: 'q2',
      prompt: 'Which block keeps your focus the longest?',
      choiceA: 'Morning work sessions',
      choiceB: 'Afternoon work sessions'
    });
  });
});
