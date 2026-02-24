'use client';

import {useTranslations} from 'next-intl';
import {SiteHeader} from '@/features/landing/components/site-header';
import {useInteractionMode} from '@/features/landing/hooks/use-interaction-mode';
import styles from './history-page.module.css';

export function HistoryPage() {
  const t = useTranslations('history');
  const capability = useInteractionMode();

  return (
    <div className={styles.page}>
      <SiteHeader context="landing" capability={capability} />
      <main className={styles.container}>
        <section className={styles.panel}>
          <h1 className={styles.title} data-display>
            {t('title')}
          </h1>
          <p className={styles.text}>{t('body')}</p>
        </section>
      </main>
    </div>
  );
}
