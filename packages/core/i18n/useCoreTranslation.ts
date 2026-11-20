import { useTranslation } from 'react-i18next';
import type { TOptions } from 'i18next';
import type { CoreTranslationKeys } from './CoreTranslationKeys';

export function useCoreTranslation() {
  const { t } = useTranslation('core');
  return {
    t: (key: keyof CoreTranslationKeys, options?: TOptions) => t(key, options ?? {}) as string,
  };
}
