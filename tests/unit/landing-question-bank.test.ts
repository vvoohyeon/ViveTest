import {describe, expect, it} from 'vitest';

import {buildLandingTestQuestionBank} from '../../src/features/landing/test/question-bank';

describe('landing question bank locale fallbacks', () => {
  it('reuses English fallback copy for Japanese until dedicated card content exists', () => {
    const questions = buildLandingTestQuestionBank('ja', 'qmbti');

    expect(questions[0]).toEqual({
      id: 'q1',
      prompt: '🎉 When do you feel most focused?',
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
