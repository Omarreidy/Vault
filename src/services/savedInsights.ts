import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@vault_saved_insights_v1';

export interface SavedInsight {
  id: string;
  headline: string;
  tag: string;
  savedAt: string; // ISO string
}

export async function saveInsight(item: SavedInsight): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  const list: SavedInsight[] = raw ? JSON.parse(raw) : [];
  if (list.find(s => s.id === item.id)) return; // already saved
  list.unshift(item);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export async function getSavedInsights(): Promise<SavedInsight[]> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  return raw ? JSON.parse(raw) : [];
}

export async function removeSavedInsight(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  const list: SavedInsight[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(s => s.id !== id)));
}
