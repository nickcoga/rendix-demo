import { type SQLiteDatabase } from 'expo-sqlite';
import { type Trip, type TripFinancialSummary } from '../../types';
import { deleteReceiptPhoto } from '../storage/photoStorage';

export async function getAllTrips(db: SQLiteDatabase): Promise<Trip[]> {
  return await db.getAllAsync<Trip>(
    'SELECT * FROM trips ORDER BY id DESC'
  );
}

export async function getTripById(db: SQLiteDatabase, id: number): Promise<Trip | null> {
  const result = await db.getFirstAsync<Trip>(
    'SELECT * FROM trips WHERE id = ?',
    [id]
  );
  return result || null;
}

export async function createTrip(
  db: SQLiteDatabase,
  data: {
    technician_name: string;
    destination: string;
    reason: string;
    start_date: string;
    end_date: string;
    advance_amount: number;
    currency?: string;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO trips (
      technician_name, destination, reason, start_date, end_date, advance_amount, currency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
    [
      data.technician_name.trim(),
      data.destination.trim(),
      data.reason.trim(),
      data.start_date,
      data.end_date,
      data.advance_amount || 0,
      data.currency || 'PEN'
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTrip(
  db: SQLiteDatabase,
  id: number,
  data: {
    technician_name?: string;
    destination?: string;
    reason?: string;
    start_date?: string;
    end_date?: string;
    advance_amount?: number;
    currency?: string;
    status?: 'OPEN' | 'CLOSED';
  }
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.technician_name !== undefined) {
    fields.push('technician_name = ?');
    values.push(data.technician_name.trim());
  }
  if (data.destination !== undefined) {
    fields.push('destination = ?');
    values.push(data.destination.trim());
  }
  if (data.reason !== undefined) {
    fields.push('reason = ?');
    values.push(data.reason.trim());
  }
  if (data.start_date !== undefined) {
    fields.push('start_date = ?');
    values.push(data.start_date);
  }
  if (data.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(data.end_date);
  }
  if (data.advance_amount !== undefined) {
    fields.push('advance_amount = ?');
    values.push(data.advance_amount);
  }
  if (data.currency !== undefined) {
    fields.push('currency = ?');
    values.push(data.currency);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteTrip(db: SQLiteDatabase, id: number): Promise<void> {
  // 1. Get all receipt photos for this trip to remove them from disk
  const expenses = await db.getAllAsync<{ photo_uri: string }>(
    'SELECT photo_uri FROM expenses WHERE trip_id = ?',
    [id]
  );

  // 2. Delete trip from SQLite (CASCADE deletes expenses)
  await db.runAsync('DELETE FROM trips WHERE id = ?', [id]);

  // 3. Delete physical image files
  for (const exp of expenses) {
    if (exp.photo_uri) {
      deleteReceiptPhoto(exp.photo_uri);
    }
  }
}

export async function getTripSummary(
  db: SQLiteDatabase,
  tripId: number
): Promise<TripFinancialSummary> {
  const trip = await getTripById(db, tripId);
  const advanceAmount = trip ? trip.advance_amount : 0;
  const currency = trip ? trip.currency : 'PEN';

  const stats = await db.getFirstAsync<{ total_spent: number | null; receipt_count: number }>(
    'SELECT SUM(total_amount) AS total_spent, COUNT(*) AS receipt_count FROM expenses WHERE trip_id = ?',
    [tripId]
  );

  const totalSpent = stats?.total_spent || 0;
  const receiptCount = stats?.receipt_count || 0;
  const balance = advanceAmount - totalSpent;

  return {
    advanceAmount,
    totalSpent,
    balance,
    receiptCount,
    currency
  };
}
