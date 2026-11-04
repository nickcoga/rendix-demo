import { File, Directory, Paths } from 'expo-file-system';
import { type SQLiteDatabase } from 'expo-sqlite';

const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutos de gracia

/**
 * Ensures the drafts and receipts directories exist in private app storage (Paths.document).
 */
export function ensureDirectories(): { draftsDir: Directory; receiptsDir: Directory } {
  const draftsDir = new Directory(Paths.document, 'drafts');
  if (!draftsDir.exists) {
    draftsDir.create();
  }

  const receiptsDir = new Directory(Paths.document, 'receipts');
  if (!receiptsDir.exists) {
    receiptsDir.create();
  }

  return { draftsDir, receiptsDir };
}

/**
 * Saves a captured/picked image into the private drafts directory.
 * Keeps it safe during user review (never wiped by OS cache cleaner).
 */
export async function saveDraftPhoto(sourceUri: string): Promise<string> {
  const { draftsDir } = ensureDirectories();
  const sourceFile = new File(sourceUri);
  const targetName = `draft_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const draftFile = new File(draftsDir, targetName);

  await sourceFile.copy(draftFile);
  return draftFile.uri;
}

/**
 * Promotes a draft photo to a permanent receipt photo in receipts/
 * Deletes the draft once copied and returns the permanent URI to store in SQLite.
 */
export async function promoteDraftToReceipt(draftUri: string, tripId: number): Promise<string> {
  const { receiptsDir } = ensureDirectories();
  const draftFile = new File(draftUri);
  const permanentName = `receipt_trip_${tripId}_${Date.now()}.jpg`;
  const permanentFile = new File(receiptsDir, permanentName);

  if (draftFile.exists) {
    await draftFile.copy(permanentFile);
    try {
      draftFile.delete();
    } catch {
      // Non-critical if draft delete fails
    }
    return permanentFile.uri;
  }

  // Fallback: if already a permanent file or direct path
  return draftUri;
}

/**
 * Discards a draft file if user cancels receipt review.
 */
export function discardDraft(draftUri: string): void {
  try {
    const file = new File(draftUri);
    if (file.exists && draftUri.includes('/drafts/')) {
      file.delete();
    }
  } catch (err) {
    console.warn('No se pudo descartar borrador:', err);
  }
}

/**
 * Safely deletes a single receipt photo from disk.
 */
export function deleteReceiptPhoto(photoUri: string): void {
  try {
    const file = new File(photoUri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.warn('Error al eliminar fotografía física:', err);
  }
}

/**
 * Cleans orphan photos in receipts/ that have no matching record in SQLite.
 * Uses a 15-minute grace period based on modificationTime (which is already in ms).
 * Does NOT touch the drafts directory.
 */
export async function cleanOrphanPhotos(db: SQLiteDatabase): Promise<void> {
  try {
    const { receiptsDir } = ensureDirectories();
    const rows = await db.getAllAsync<{ photo_uri: string }>(
      'SELECT photo_uri FROM expenses WHERE photo_uri IS NOT NULL'
    );
    const registeredUris = new Set(rows.map(r => r.photo_uri));

    const diskFiles = receiptsDir.list();
    const now = Date.now();

    for (const item of diskFiles) {
      if (item instanceof File) {
        // If file is tracked in SQLite, keep it
        if (registeredUris.has(item.uri)) {
          continue;
        }

        const info = item.info();
        // modificationTime is directly in milliseconds
        const fileModTime = info.modificationTime || now;
        const fileAge = now - fileModTime;

        // Only delete orphan if older than grace period
        if (fileAge > GRACE_PERIOD_MS) {
          try {
            item.delete();
          } catch {
            // Ignore deletion errors in background scan
          }
        }
      }
    }
  } catch (err) {
    console.warn('Aviso en cleanOrphanPhotos (no crítico):', err);
  }
}

/**
 * Converts a file at photoUri to a Base64 string for Gemini or PDF generation.
 */
export async function getFileBase64(photoUri: string): Promise<string> {
  const file = new File(photoUri);
  return await file.base64();
}
