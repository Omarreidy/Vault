import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Display-locale preferences chosen in Settings. Currency is a stored
 * preference only for now — app amounts are USD (Plaid, US market) and are
 * never relabelled in another currency without real FX conversion. Language
 * steers AI surfaces (Concierge responds in the member's language); native
 * UI chrome remains English until a full localization pass.
 */

export const CURRENCY_KEY = '@vault_currency';
export const LANGUAGE_KEY = '@vault_language';

export const SUPPORTED_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese'] as const;
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

export async function getPreferredLanguage(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(LANGUAGE_KEY);
    return v && (SUPPORTED_LANGUAGES as readonly string[]).includes(v) ? v : 'English';
  } catch {
    return 'English';
  }
}

export async function getPreferredCurrency(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(CURRENCY_KEY);
    return v && (SUPPORTED_CURRENCIES as readonly string[]).includes(v) ? v : 'USD';
  } catch {
    return 'USD';
  }
}
