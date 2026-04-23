import ts from 'typescript';
import {describe, expect, it} from 'vitest';

import {serializeRegistryToFile} from '../../src/features/variant-registry/registry-serializer';
import type {VariantRegistry} from '../../src/features/variant-registry/types';

const exportPrefix = 'export const variantRegistryGenerated: VariantRegistry = ';
const exportSuffix = ' as const;';

function extractRegistryObject(source: string): unknown {
  const start = source.indexOf(exportPrefix);
  expect(start).toBeGreaterThanOrEqual(0);

  const afterPrefix = source.slice(start + exportPrefix.length);
  expect(afterPrefix.endsWith(`\n`) || afterPrefix.endsWith(exportSuffix)).toBe(true);

  const trimmed = afterPrefix.trimEnd();
  expect(trimmed.endsWith(exportSuffix)).toBe(true);

  return JSON.parse(trimmed.slice(0, -exportSuffix.length));
}

function getTypeScriptErrorMessages(source: string): string[] {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    },
    reportDiagnostics: true
  });

  return (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function makeMinimalRegistry(): VariantRegistry {
  return {
    landingCards: [],
    testPreviewPayloadByVariant: {}
  };
}

describe('serializeRegistryToFile', () => {
  it('@generated 헤더와 generated export 구조를 포함한다', () => {
    const source = serializeRegistryToFile(makeMinimalRegistry());

    expect(source).toContain('@generated 이 파일은 Google Sheets Sync 스크립트가 자동 생성한다.');
    expect(source).toContain('직접 편집하지 않는다. 편집이 필요하면 Sheets 원본을 수정하고 sync를 재실행한다.');
    expect(source).toContain("import type {VariantRegistry} from './types';");
    expect(source).toContain('export const variantRegistryGenerated: VariantRegistry = {');
    expect(source).toContain('} as const;');
  });

  it('반환 문자열은 TypeScript로 파싱 가능하다', () => {
    expect(getTypeScriptErrorMessages(serializeRegistryToFile(makeMinimalRegistry()))).toEqual([]);
  });

  it('동일 객체를 두 번 직렬화하면 동일한 문자열을 반환한다', () => {
    const registry = makeMinimalRegistry();

    expect(serializeRegistryToFile(registry)).toBe(serializeRegistryToFile(registry));
  });

  it('객체 key 삽입 순서가 다른 동일 데이터도 동일한 문자열로 직렬화한다', () => {
    const registryA = {
      testPreviewPayloadByVariant: {
        qmbti: {
          answerChoiceB: {kr: 'B 선택', en: 'Choice B'},
          previewQuestion: {kr: '질문', en: 'Question'},
          answerChoiceA: {kr: 'A 선택', en: 'Choice A'}
        }
      },
      landingCards: [
        {
          test: {
            meta: {
              sharedC: 20,
              durationM: 3,
              engagedC: 30
            },
            instruction: {
              kr: '설명',
              en: 'Instruction'
            }
          },
          tags: {
            kr: ['태그'],
            en: ['tag']
          },
          variant: 'qmbti',
          type: 'test',
          title: {
            kr: '제목',
            en: 'Title'
          },
          subtitle: {
            kr: '부제',
            en: 'Subtitle'
          },
          attribute: 'available'
        }
      ]
    } as const satisfies VariantRegistry;

    const registryB = {
      landingCards: [
        {
          attribute: 'available',
          subtitle: {
            en: 'Subtitle',
            kr: '부제'
          },
          title: {
            en: 'Title',
            kr: '제목'
          },
          type: 'test',
          variant: 'qmbti',
          tags: {
            en: ['tag'],
            kr: ['태그']
          },
          test: {
            instruction: {
              en: 'Instruction',
              kr: '설명'
            },
            meta: {
              durationM: 3,
              engagedC: 30,
              sharedC: 20
            }
          }
        }
      ],
      testPreviewPayloadByVariant: {
        qmbti: {
          answerChoiceA: {en: 'Choice A', kr: 'A 선택'},
          answerChoiceB: {en: 'Choice B', kr: 'B 선택'},
          previewQuestion: {en: 'Question', kr: '질문'}
        }
      }
    } as const satisfies VariantRegistry;

    expect(serializeRegistryToFile(registryA)).toBe(serializeRegistryToFile(registryB));
  });

  it('현재 generated registry 데이터를 object literal로 구조 동등하게 직렬화한다', async () => {
    const {variantRegistryGenerated} = (await import(
      '../../src/features/variant-registry'
    )) as {variantRegistryGenerated: VariantRegistry};
    const source = serializeRegistryToFile(variantRegistryGenerated);

    expect(getTypeScriptErrorMessages(source)).toEqual([]);
    expect(extractRegistryObject(source)).toEqual(variantRegistryGenerated);
  });
});
