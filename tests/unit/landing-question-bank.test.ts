import {describe, expect, it} from 'vitest';

import {buildTestQuestionDefinition} from '../../src/features/test/question-bank';

describe('test question definition', () => {
  it('builds the ready-state question bank for available variants while reusing English fallback copy for Japanese', () => {
    const definition = buildTestQuestionDefinition('ja', 'qmbti');
    expect(definition.status).toBe('ready');
    if (definition.status !== 'ready') {
      return;
    }

    expect(definition.questions[0]).toEqual({
      id: 'q1',
      prompt: '🎉 When do you feel most focused?',
      choiceA: 'Early morning blocks',
      choiceB: 'Late-night sprints'
    });

    expect(definition.questions[1]).toEqual({
      id: 'q2',
      prompt: 'Which block keeps your focus the longest?',
      choiceA: 'Morning work sessions',
      choiceB: 'Afternoon work sessions'
    });
  });

  it('surfaces malformed variants as recoverable state instead of falling back to generic questions', () => {
    const definition = buildTestQuestionDefinition('en', 'INVALID!');

    expect(definition).toMatchObject({
      status: 'recoverable',
      reason: 'invalid_variant'
    });
    if (definition.status !== 'recoverable') {
      return;
    }

    expect(definition.recommendedCards.map((card) => card.sourceParam)).toEqual(['qmbti', 'rhythm-b']);
  });

  it('surfaces unavailable variants as recoverable state while keeping recommendations limited to available cards', () => {
    const definition = buildTestQuestionDefinition('en', 'creativity-profile');

    expect(definition).toMatchObject({
      status: 'recoverable',
      reason: 'unavailable_variant'
    });
    if (definition.status !== 'recoverable') {
      return;
    }

    expect(definition.recommendedCards).toHaveLength(2);
    expect(definition.recommendedCards.every((card) => card.availability === 'available')).toBe(true);
  });
});
