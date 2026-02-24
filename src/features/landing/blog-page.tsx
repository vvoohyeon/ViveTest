'use client';

import {useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {useInteractionMode} from '@/features/landing/hooks/use-interaction-mode';
import {SiteHeader} from '@/features/landing/components/site-header';
import {clearPendingTransition, getPendingTransition} from '@/features/landing/session-state';
import {useTelemetry} from '@/features/telemetry/telemetry-provider';
import {unlockBodyScroll} from '@/lib/body-lock';
import styles from './blog-page.module.css';

type BlogPageProps = {
  source?: string;
};

export function BlogPage({source}: BlogPageProps) {
  const t = useTranslations('blog');
  const capability = useInteractionMode();
  const {emit} = useTelemetry();

  useEffect(() => {
    unlockBodyScroll({force: true});

    const pending = getPendingTransition();
    if (pending?.type === 'blog') {
      emit('transition_complete', {
        transitionId: pending.transitionId,
        targetType: pending.type,
        cardId: pending.cardId
      });
      clearPendingTransition();
    }
  }, [emit]);

  return (
    <div className={styles.page}>
      <SiteHeader context="blog" capability={capability} />
      <main className={styles.container}>
        <section className={styles.panel}>
          <h1 className={styles.title} data-display>
            {t('title')}
          </h1>
          <p className={styles.text}>{t('source', {source: source ?? '-'})}</p>
        </section>
      </main>
    </div>
  );
}
