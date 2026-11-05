/**
 * Local storage manager with auto-save support for Suíte app's
 */

import { getStorageUser, supabase } from './supabase';

const STORAGE_PREFIX = 'suite_apps_';

function storageKey(key: string) {
  const userId = getStorageUser();
  return `${STORAGE_PREFIX}${userId ? `${userId}_` : 'guest_'}${key}`;
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading from storage: ${key}`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(storageKey(key), serialized);
    const userId = getStorageUser();
    if (userId && supabase) {
      void supabase.from('app_data').upsert({ user_id: userId, storage_key: key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,storage_key' });
    }
    return true;
  } catch (err) {
    console.error(`Error saving to storage: ${key}`, err);
    return false;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
    const userId = getStorageUser();
    if (userId && supabase) void supabase.from('app_data').delete().eq('user_id', userId).eq('storage_key', key);
  } catch (err) {
    console.error(`Error removing from storage: ${key}`, err);
  }
}

/** Exports all suite data as a downloadable JSON object */
export function exportEntireSuiteBackup(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}${getStorageUser() ? `${getStorageUser()}_` : 'guest_'}`)) {
      try {
        data[key.slice(storageKey('').length)] = JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        data[key.slice(storageKey('').length)] = localStorage.getItem(key);
      }
    }
  }
  return JSON.stringify({
    version: '1.0',
    suite: "Suíte app's",
    exportedAt: new Date().toISOString(),
    data,
  }, null, 2);
}

/** Imports suite backup JSON */
export function importEntireSuiteBackup(jsonContent: string): boolean {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) {
      throw new Error('Arquivo de backup inválido');
    }
    const dataObj = parsed.data as Record<string, unknown>;
    for (const [k, v] of Object.entries(dataObj)) {
      saveToStorage(k, v);
    }
    return true;
  } catch (err) {
    console.error('Falha ao restaurar backup:', err);
    return false;
  }
}

/** Calculates estimated localStorage usage */
export function getStorageUsage(): { usedKb: number; percent: number } {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}${getStorageUser() ? `${getStorageUser()}_` : 'guest_'}`)) {
      totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
    }
  }
  const usedKb = Math.round(totalBytes / 1024);
  // Default browser localstorage quota is ~5MB (5120KB)
  const percent = Math.min(100, Math.round((usedKb / 5120) * 100));
  return { usedKb, percent };
}
