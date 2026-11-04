import { type SQLiteDatabase } from 'expo-sqlite';
import { type Expense, type DocumentType, type ExpenseCategory } from '../../types';
import { promoteDraftToReceipt, deleteReceiptPhoto } from '../storage/photoStorage';

export async function getExpensesByTripId(
  db: SQLiteDatabase,
  tripId: number
): Promise<Expense[]> {
  return await db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC, id DESC',
    [tripId]
  );
}

export async function getExpenseById(
  db: SQLiteDatabase,
  id: number
): Promise<Expense | null> {
  const result = await db.getFirstAsync<Expense>(
    'SELECT * FROM expenses WHERE id = ?',
    [id]
  );
  return result || null;
}

export async function createExpense(
  db: SQLiteDatabase,
  data: {
    trip_id: number;
    category: ExpenseCategory;
    document_type: DocumentType;
    date: string;
    vendor_name?: string | null;
    ruc?: string | null;
    series?: string | null;
    number?: string | null;
    currency?: string;
    taxable_base?: number | null;
    igv?: number | null;
    total_amount: number;
    draft_photo_uri: string;
    notes?: string | null;
  }
): Promise<number> {
  // 1. Promote draft photo to permanent receipt photo
  const permanentPhotoUri = await promoteDraftToReceipt(
    data.draft_photo_uri,
    data.trip_id
  );

  // 2. Insert into SQLite with the permanent URI
  const result = await db.runAsync(
    `INSERT INTO expenses (
      trip_id, category, document_type, date, vendor_name, ruc, series, number,
      currency, taxable_base, igv, total_amount, photo_uri, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.trip_id,
      data.category,
      data.document_type,
      data.date,
      data.vendor_name ? data.vendor_name.trim() : null,
      data.ruc ? data.ruc.trim() : null,
      data.series ? data.series.trim() : null,
      data.number ? data.number.trim() : null,
      data.currency || 'PEN',
      data.taxable_base ?? null,
      data.igv ?? null,
      data.total_amount,
      permanentPhotoUri,
      data.notes ? data.notes.trim() : null,
    ]
  );

  return result.lastInsertRowId;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: number,
  data: {
    category?: ExpenseCategory;
    document_type?: DocumentType;
    date?: string;
    vendor_name?: string | null;
    ruc?: string | null;
    series?: string | null;
    number?: string | null;
    currency?: string;
    taxable_base?: number | null;
    igv?: number | null;
    total_amount?: number;
    new_draft_photo_uri?: string;
    notes?: string | null;
  }
): Promise<void> {
  const existing = await getExpenseById(db, id);
  if (!existing) {
    throw new Error('Comprobante no encontrado');
  }

  let finalPhotoUri = existing.photo_uri;

  // If a new photo draft was supplied, promote it and remove the old photo
  if (data.new_draft_photo_uri) {
    const newPermanentUri = await promoteDraftToReceipt(
      data.new_draft_photo_uri,
      existing.trip_id
    );
    finalPhotoUri = newPermanentUri;

    // Delete old photo
    if (existing.photo_uri && existing.photo_uri !== newPermanentUri) {
      deleteReceiptPhoto(existing.photo_uri);
    }
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (data.category !== undefined) {
    fields.push('category = ?');
    values.push(data.category);
  }
  if (data.document_type !== undefined) {
    fields.push('document_type = ?');
    values.push(data.document_type);
  }
  if (data.date !== undefined) {
    fields.push('date = ?');
    values.push(data.date);
  }
  if (data.vendor_name !== undefined) {
    fields.push('vendor_name = ?');
    values.push(data.vendor_name ? data.vendor_name.trim() : null);
  }
  if (data.ruc !== undefined) {
    fields.push('ruc = ?');
    values.push(data.ruc ? data.ruc.trim() : null);
  }
  if (data.series !== undefined) {
    fields.push('series = ?');
    values.push(data.series ? data.series.trim() : null);
  }
  if (data.number !== undefined) {
    fields.push('number = ?');
    values.push(data.number ? data.number.trim() : null);
  }
  if (data.currency !== undefined) {
    fields.push('currency = ?');
    values.push(data.currency);
  }
  if (data.taxable_base !== undefined) {
    fields.push('taxable_base = ?');
    values.push(data.taxable_base);
  }
  if (data.igv !== undefined) {
    fields.push('igv = ?');
    values.push(data.igv);
  }
  if (data.total_amount !== undefined) {
    fields.push('total_amount = ?');
    values.push(data.total_amount);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes ? data.notes.trim() : null);
  }

  fields.push('photo_uri = ?');
  values.push(finalPhotoUri);

  values.push(id);

  await db.runAsync(
    `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteExpense(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  const existing = await getExpenseById(db, id);
  if (existing) {
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    if (existing.photo_uri) {
      deleteReceiptPhoto(existing.photo_uri);
    }
  }
}
