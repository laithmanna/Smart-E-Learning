'use client';

import { useT } from '@/i18n/provider';
import { AttachmentCategoryListPage } from '../_category-page';

export default function PresentationPage() {
  const t = useT();
  return (
    <AttachmentCategoryListPage
      category="PRESENTATION"
      title={t('attachments.catPresentation')}
      description={t('attachments.catPresentationDesc')}
    />
  );
}
