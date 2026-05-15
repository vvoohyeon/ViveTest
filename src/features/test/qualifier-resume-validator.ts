import type {QualifierOverlayItem} from './qualifier-overlay-model';

export function hasValidQualifierAnswers(
  qualifierItems: ReadonlyArray<QualifierOverlayItem>,
  storedResponses: Record<string, string>
): boolean {
  if (qualifierItems.length === 0) {
    return true;
  }

  return qualifierItems.every((item) => {
    const stored = storedResponses[String(item.canonicalIndex)];
    return item.choices.some((choice) => choice.token === stored);
  });
}
