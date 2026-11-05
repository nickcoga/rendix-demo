export interface Trip {
  id: number;
  technician_name: string;
  destination: string;
  reason: string;
  start_date: string;
  end_date: string;
  advance_amount: number;
  currency: string;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
}

export type ExpenseCategory =
  | 'Alimentación'
  | 'Hospedaje'
  | 'Transporte'
  | 'Combustible/Peajes'
  | 'Materiales/Útiles'
  | 'Otros';

export type DocumentType = 'FACTURA' | 'BOLETA' | 'TICKET' | 'OTRO';

export interface Expense {
  id: number;
  trip_id: number;
  category: ExpenseCategory;
  document_type: DocumentType;
  date: string;
  vendor_name: string | null;
  ruc: string | null;
  series: string | null;
  number: string | null;
  currency: string;
  taxable_base: number | null;
  igv: number | null;
  rc: number | null;
  total_amount: number;
  photo_uri: string;
  notes: string | null;
  created_at: string;
}

export interface ExtractedReceiptData {
  documentType: string | null;
  vendorName: string | null;
  ruc: string | null;
  series: string | null;
  number: string | null;
  date: string | null;
  currency: string | null;
  taxableBase: number | null;
  igv: number | null;
  rc: number | null;
  totalAmount: number | null;
  notes: string | null;
}

export type FieldStatus = 'ai_detected' | 'not_detected' | 'manually_edited';

export interface TripFinancialSummary {
  advanceAmount: number;
  totalSpent: number;
  balance: number; // positive: remaining balance to return; negative: surplus spent to reimburse
  receiptCount: number;
  currency: string;
}
