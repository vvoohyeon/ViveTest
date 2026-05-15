import type {QualifierFieldSpec} from '@/features/test/domain/types';
import type {ResolvedQuestion} from '@/features/test/question-bank';

export interface QualifierOverlayChoice {
  token: string;
  label: string;
}

export interface QualifierOverlayItem {
  canonicalIndex: number;
  questionText: string;
  choices: QualifierOverlayChoice[];
}

export function buildQualifierOverlayModel(
  qualifierFields: ReadonlyArray<QualifierFieldSpec>,
  questions: ReadonlyArray<ResolvedQuestion>
): QualifierOverlayItem[] {
  const questionsByCanonicalIndex = new Map(questions.map((question) => [question.canonicalIndex, question]));
  const items = qualifierFields.flatMap((qualifierField): QualifierOverlayItem[] => {
    const question = questionsByCanonicalIndex.get(qualifierField.questionIndex);
    if (!question) {
      return [];
    }

    const labels = [question.answerA, question.answerB];
    return [
      {
        canonicalIndex: question.canonicalIndex,
        questionText: question.question,
        choices: qualifierField.values.map((token, index) => ({
          token,
          label: labels[index] ?? ''
        }))
      }
    ];
  });

  return items.sort((left, right) => left.canonicalIndex - right.canonicalIndex);
}
