'use client';

import { useT } from '@/i18n/provider';
import { AttachmentCategoryListPage } from '../_category-page';

export default function TopicsPage() {
  const t = useT();
  return (
    <AttachmentCategoryListPage
      category="TOPICS"
      title={t('attachments.catTopics')}
      description={t('attachments.catTopicsDesc')}
    />
  );
}
