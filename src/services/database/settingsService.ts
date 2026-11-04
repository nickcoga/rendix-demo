import { type SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_PROXY_URL, PROXY_STORAGE_KEY } from '../../constants/theme';

export async function getProxyUrl(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [PROXY_STORAGE_KEY]
  );
  return row?.value || DEFAULT_PROXY_URL;
}

export async function setProxyUrl(db: SQLiteDatabase, url: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PROXY_STORAGE_KEY, url.trim()]
  );
}

export async function testProxyConnection(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: 'OPTIONS',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 405 || res.status === 200) {
      return { ok: true, message: 'Conexión exitosa con el servidor de IA.' };
    }
    return { ok: false, message: `El servidor respondió con código HTTP ${res.status}` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado al conectar con el proxy.' };
    }
    return { ok: false, message: 'No se pudo conectar con la URL especificada. Verifica tu conexión.' };
  }
}
