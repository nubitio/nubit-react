import i18next from 'i18next';
import { coreTranslationsEn, coreTranslationsEs } from './coreTranslations';

export function initCoreI18n(): void {
  i18next.addResourceBundle('es', 'core', coreTranslationsEs, true, false);
  i18next.addResourceBundle('en', 'core', coreTranslationsEn, true, false);
}
