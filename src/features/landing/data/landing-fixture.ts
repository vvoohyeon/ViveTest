import {getReleasedTestVariants, testVariantsFixture} from '@/features/test/data/test-fixture';
import type {CatalogCard} from '@/features/landing/types';

function makeThumbnail(label: string, left: string, right: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='0%'>
        <stop offset='0%' stop-color='${left}' />
        <stop offset='100%' stop-color='${right}' />
      </linearGradient>
    </defs>
    <rect x='0' y='0' width='1200' height='200' fill='url(#g)' />
    <text x='48' y='122' fill='#ffffff' font-family='Helvetica, Arial, sans-serif' font-size='56' font-weight='700'>${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const testCards: CatalogCard[] = testVariantsFixture.map((variant, index) => {
  const firstQuestion = variant.questions[0];

  return {
    id: variant.id,
    type: 'test',
    variant: variant.id,
    availability: variant.availability,
    cardTitle: variant.title,
    cardSubtitle: variant.subtitle,
    thumbnailOrIcon: makeThumbnail(variant.id.toUpperCase(), ['#2f574f', '#4f8f84', '#21486d'][index % 3], ['#21486d', '#a06343', '#3f7854'][index % 3]),
    tags: variant.tags,
    previewQuestion: firstQuestion.prompt,
    answerChoiceA: firstQuestion.optionA,
    answerChoiceB: firstQuestion.optionB,
    meta: {
      estimatedMinutes: variant.estimatedMinutes,
      shares: variant.shareCount,
      totalRuns: variant.totalRuns
    },
    isDebug: variant.isDebug
  };
});

const blogCards: CatalogCard[] = [
  {
    id: 'blog-speed-vs-depth',
    type: 'blog',
    availability: 'available',
    cardTitle: 'Speed vs Depth: Choosing the Right Tempo',
    cardSubtitle: 'How teams avoid false urgency without slowing output.',
    thumbnailOrIcon: makeThumbnail('BLOG / TEMPO', '#8a4b2a', '#355e7a'),
    tags: ['team', 'delivery'],
    summary:
      'Fast teams are not always hurried teams. The strongest cadence comes from explicit tradeoffs: where to go fast, where to absorb uncertainty, and where to pause before irreversible choices.',
    meta: {
      readMinutes: 6,
      shares: 203,
      views: 2140
    },
    primaryCTAKey: 'landing.readMore'
  },
  {
    id: 'blog-feedback-patterns',
    type: 'blog',
    availability: 'available',
    cardTitle: 'Feedback Patterns That Keep Momentum',
    cardSubtitle: 'A compact protocol for critique in active delivery cycles.',
    thumbnailOrIcon: makeThumbnail('BLOG / FEEDBACK', '#2d6159', '#7462a0'),
    tags: [],
    summary:
      'Feedback quality is mostly choreography. Teams improve when they time critique to decision points, separate judgment from direction, and close loops with one explicit next step.',
    meta: {
      readMinutes: 5,
      shares: 149,
      views: 1672
    },
    primaryCTAKey: 'landing.readMore'
  },
  {
    id: 'blog-quiet-systems',
    type: 'blog',
    availability: 'available',
    cardTitle: 'Quiet Systems for Noisy Weeks',
    cardSubtitle: 'Reduce context churn while preserving situational awareness.',
    thumbnailOrIcon: makeThumbnail('BLOG / QUIET', '#3b7157', '#4f5a96'),
    tags: ['ops', 'focus', 'ritual'],
    summary:
      'When priorities churn, high-performing teams do less reactive work by default. They maintain a light decision ledger, enforce interruption windows, and force explicit ownership handoffs.',
    meta: {
      readMinutes: 4,
      shares: 112,
      views: 1234
    },
    primaryCTAKey: 'landing.readMore'
  }
];

export const landingFixture: CatalogCard[] = [...testCards, ...blogCards];

export const releasedTestVariantIds = new Set(getReleasedTestVariants().map((variant) => variant.id));
