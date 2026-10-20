import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

// Larger data (the test catalogue is ~1.7 MB) is kept in files: Android's key-value storage
// can't hold rows that big. The browser preview (development only) uses its storage instead.

const useFiles = Platform.OS !== 'web';

export async function readJson<T>(name: string): Promise<T | null> {
  try {
    if (!useFiles) {
      const raw = await AsyncStorage.getItem(`file:${name}`);
      return raw ? JSON.parse(raw) : null;
    }
    const f = new File(Paths.document, `${name}.json`);
    if (!f.exists) return null;
    return JSON.parse(await f.text());
  } catch {
    return null;
  }
}

export async function writeJson(name: string, value: unknown) {
  try {
    const text = JSON.stringify(value);
    if (!useFiles) { await AsyncStorage.setItem(`file:${name}`, text); return; }
    const f = new File(Paths.document, `${name}.json`);
    if (!f.exists) f.create();
    f.write(text);
  } catch { /* storage full: keep working from memory */ }
}

export async function removeJson(name: string) {
  try {
    if (!useFiles) { await AsyncStorage.removeItem(`file:${name}`); return; }
    const f = new File(Paths.document, `${name}.json`);
    if (f.exists) f.delete();
  } catch { /* ignore */ }
}
