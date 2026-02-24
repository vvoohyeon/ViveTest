export type BinaryChoiceCode = 'A' | 'B';

export type TestQuestion = {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
};

export type TestVariantFixture = {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  availability: 'available' | 'unavailable';
  estimatedMinutes: number;
  shareCount: number;
  totalRuns: number;
  questions: TestQuestion[];
  isDebug?: boolean;
};

function createQuestions(seed: string): TestQuestion[] {
  return [
    {
      id: `${seed}-q1`,
      prompt: 'You walk into a crowded room first. What do you do?',
      optionA: 'Find one person and start a direct conversation.',
      optionB: 'Scan the room first and let the mood settle.'
    },
    {
      id: `${seed}-q2`,
      prompt: 'A deadline moves up by two days. Your first response?',
      optionA: 'Restructure priorities and lock execution quickly.',
      optionB: 'Check risks first, then adjust with a buffer plan.'
    },
    {
      id: `${seed}-q3`,
      prompt: 'A teammate asks for feedback on rough work.',
      optionA: 'Give a clear direct critique with examples.',
      optionB: 'Start with encouragement, then suggest refinements.'
    },
    {
      id: `${seed}-q4`,
      prompt: 'Your ideal weekend project style is:',
      optionA: 'Small scope, high finish rate, visible outcomes.',
      optionB: 'Open-ended exploration with room to improvise.'
    },
    {
      id: `${seed}-q5`,
      prompt: 'When plans break unexpectedly, you usually:',
      optionA: 'Choose a fallback fast and keep momentum.',
      optionB: 'Pause to collect context before deciding.'
    }
  ];
}

export const testVariantsFixture: TestVariantFixture[] = [
  {
    id: 'vibe-core',
    title: 'Vibe Core Compass',
    subtitle: 'Balanced baseline read for daily collaboration patterns.',
    tags: ['core', 'quick'],
    availability: 'available',
    estimatedMinutes: 3,
    shareCount: 421,
    totalRuns: 5089,
    questions: createQuestions('vibe-core')
  },
  {
    id: 'spark-balance',
    title: 'Spark Balance Index',
    subtitle: 'Read how you move between speed and certainty under pressure.',
    tags: ['stress', 'decision'],
    availability: 'available',
    estimatedMinutes: 4,
    shareCount: 285,
    totalRuns: 3120,
    questions: createQuestions('spark-balance')
  },
  {
    id: 'focus-flow',
    title: 'Focus Flow Trace',
    subtitle: 'Measures your attention cadence in long-form work sessions.',
    tags: [],
    availability: 'available',
    estimatedMinutes: 5,
    shareCount: 132,
    totalRuns: 1764,
    questions: createQuestions('focus-flow')
  },
  {
    id: 'story-wave',
    title:
      'Story Wave Navigator For Deeply Reflective Team Communication In Ambiguous Meetings',
    subtitle: 'Long-text fixture case for truncation and responsive line-control checks.',
    tags: ['long-title', 'qa'],
    availability: 'available',
    estimatedMinutes: 4,
    shareCount: 88,
    totalRuns: 950,
    questions: createQuestions('story-wave')
  },
  {
    id: 'orbit-shadow',
    title: 'Orbit Shadow Draft',
    subtitle: 'Reserved for next release batch.',
    tags: ['soon'],
    availability: 'unavailable',
    estimatedMinutes: 4,
    shareCount: 0,
    totalRuns: 0,
    questions: createQuestions('orbit-shadow')
  },
  {
    id: 'pulse-matrix',
    title: 'Pulse Matrix Pilot',
    subtitle: 'Reserved for next release batch.',
    tags: ['soon'],
    availability: 'unavailable',
    estimatedMinutes: 4,
    shareCount: 0,
    totalRuns: 0,
    questions: createQuestions('pulse-matrix')
  },
  {
    id: 'debug-sample',
    title: 'Debug Sample Variant',
    subtitle: 'Debug/sample fixture case. Must never be shown in production catalog.',
    tags: ['debug'],
    availability: 'available',
    estimatedMinutes: 2,
    shareCount: 1,
    totalRuns: 1,
    questions: createQuestions('debug-sample'),
    isDebug: true
  }
];

export function getTestVariantFixture(variant: string): TestVariantFixture | undefined {
  return testVariantsFixture.find((item) => item.id === variant);
}

export function getReleasedTestVariants(): TestVariantFixture[] {
  return testVariantsFixture.filter((variant) => !variant.isDebug);
}

export function getDefaultTestVariant(): TestVariantFixture {
  const fallback = testVariantsFixture.find(
    (variant) => !variant.isDebug && variant.availability === 'available'
  );

  if (!fallback) {
    throw new Error('No available test variant fixture found');
  }

  return fallback;
}

export function resolveRunnableVariant(variant: string): TestVariantFixture {
  const matched = testVariantsFixture.find(
    (item) => item.id === variant && !item.isDebug && item.availability === 'available'
  );

  return matched ?? getDefaultTestVariant();
}
