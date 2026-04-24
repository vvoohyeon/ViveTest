import {describe, expect, it} from 'vitest';

import {buildLandingTestQuestionBank} from '../../src/features/test/question-bank';
import {resolveLandingTestCardByVariant} from '../../src/features/variant-registry';

describe('landing question bank locale fallbacks', () => {
  it('builds q1 from Questions scoring1 while keeping the shared locale fallback questions', () => {
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

  it('skips profile rows when building the landing q1 compatibility question', () => {
    const card = resolveLandingTestCardByVariant('en', 'egtt');
    if (!card) {
      throw new Error('Expected egtt fixture card');
    }

    const questions = buildLandingTestQuestionBank(card, 'en');

    expect(questions[0]).toEqual({
      id: 'q1',
      prompt: 'I`m interested in making me charming...',
      choiceA: 'A lot',
      choiceB: 'Not at all'
    });
  });
});
