import { useTranslation } from 'react-i18next';
import type { CoreTranslationKeys } from './CoreTranslationKeys';
import type { DataRecord } from '../data/DataRecord';

export function useCoreTranslation() {
  const { t } = useTranslation('core');
  return {
    t: (key: keyof CoreTranslationKeys, options?: DataRecord) =>
      t(key, options) as string,
  };
}
