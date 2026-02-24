import {TestQuestionPage} from '@/features/test/test-question-page';

type TestQuestionRoutePageProps = {
  params: Promise<{variant: string}>;
};

export default async function LocaleTestQuestionRoutePage({params}: TestQuestionRoutePageProps) {
  const {variant} = await params;

  return <TestQuestionPage variant={variant} />;
}
