'use client';

import { useT } from '@/i18n/provider';
import { AttachmentCategoryListPage } from '../_category-page';

export default function MaterialPage() {
  const t = useT();
  return (
    <AttachmentCategoryListPage
      category="MATERIAL"
      title={t('attachments.catMaterial')}
      description={t('attachments.catMaterialDesc')}
    />
  );
}
