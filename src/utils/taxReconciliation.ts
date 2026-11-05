/**
 * Pure accounting reconciliation utility for Peruvian receipts (Facturas).
 * Evaluates the relationship: Base gravada + IGV + RC = Total (tolerance S/ 0.15).
 * Distinguishes:
 * - RC identified (> 0): included in reconciliation (Base + IGV + RC = Total).
 * - RC confirmed nonexistent (=== 0): Base + IGV = Total.
 * - RC unknown (null / empty): INCOMPLETE_UNKNOWN_RC, even if Base + IGV matches Total.
 */

export interface TaxReconciliationInput {
  docType: string;
  taxableBase: string | number | null | undefined;
  igv: string | number | null | undefined;
  rc: string | number | null | undefined;
  totalAmount: string | number | null | undefined;
}

export type ReconciliationStatus =
  | 'BALANCED'              // Sum matches total within tolerance (0.15)
  | 'DISCREPANCY'           // Explicit declared values conflict with total
  | 'INCOMPLETE_UNKNOWN_RC' // RC is unknown/null and an unexplained residual exists
  | 'INSUFFICIENT_DATA';    // Missing base, igv or total

export interface TaxReconciliationResult {
  status: ReconciliationStatus;
  hasTaxDiscrepancy: boolean;          // true ONLY if status === 'DISCREPANCY'
  isRcUnspecifiedDifference: boolean;  // true ONLY if status === 'INCOMPLETE_UNKNOWN_RC'
  isBalanced: boolean;                 // true ONLY if status === 'BALANCED'
  numericBase: number;
  numericIgv: number;
  numericRc: number | null;            // null if unknown; number (>= 0) if declared
  hasRcDeclared: boolean;              // true if rc was provided as non-empty input
  numericTotal: number;
  calculatedSum: number;
  unspecifiedDiffAmount: number;
  diff: number;
}

export function evaluateTaxReconciliation(input: TaxReconciliationInput): TaxReconciliationResult {
  const numericBase = parseNumeric(input.taxableBase);
  const numericIgv = parseNumeric(input.igv);
  const numericTotal = parseNumeric(input.totalAmount);

  // Analyze RC declaration
  let hasRcDeclared = false;
  let numericRc: number | null = null;

  if (input.rc !== null && input.rc !== undefined) {
    const rcStr = String(input.rc).trim();
    if (rcStr.length > 0) {
      const parsed = parseFloat(rcStr.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0) {
        hasRcDeclared = true;
        numericRc = parsed;
      }
    }
  }

  const isFactura = input.docType === 'FACTURA';
  const hasBasicFields = numericBase > 0 && numericIgv > 0 && numericTotal > 0;

  if (!isFactura || !hasBasicFields) {
    return {
      status: 'INSUFFICIENT_DATA',
      hasTaxDiscrepancy: false,
      isRcUnspecifiedDifference: false,
      isBalanced: false,
      numericBase,
      numericIgv,
      numericRc,
      hasRcDeclared,
      numericTotal,
      calculatedSum: 0,
      unspecifiedDiffAmount: 0,
      diff: 0,
    };
  }

  if (hasRcDeclared && numericRc !== null) {
    // RC is explicitly declared (either > 0 or confirmed 0)
    const calculatedSum = numericBase + numericIgv + numericRc;
    const diff = Math.abs(calculatedSum - numericTotal);
    const matches = diff <= 0.15;

    return {
      status: matches ? 'BALANCED' : 'DISCREPANCY',
      hasTaxDiscrepancy: !matches,
      isRcUnspecifiedDifference: false,
      isBalanced: matches,
      numericBase,
      numericIgv,
      numericRc,
      hasRcDeclared: true,
      numericTotal,
      calculatedSum,
      unspecifiedDiffAmount: 0,
      diff,
    };
  }

  // RC is unknown / not declared (numericRc === null)
  const basePlusIgv = numericBase + numericIgv;
  const residual = numericTotal - basePlusIgv;

  // If Base + IGV strictly exceeds Total by more than tolerance (0.15),
  // this is a demonstrable discrepancy because RC cannot be negative.
  if (basePlusIgv > numericTotal + 0.15) {
    const diff = Math.abs(residual);
    return {
      status: 'DISCREPANCY',
      hasTaxDiscrepancy: true,
      isRcUnspecifiedDifference: false,
      isBalanced: false,
      numericBase,
      numericIgv,
      numericRc: null,
      hasRcDeclared: false,
      numericTotal,
      calculatedSum: basePlusIgv,
      unspecifiedDiffAmount: 0,
      diff,
    };
  }

  // If Base + IGV <= Total + 0.15 and RC is unknown (NULL):
  // An unknown RC is NEVER equivalent to a confirmed nonexistent RC (0),
  // even when Base + IGV matches Total.
  // Therefore, reconciliation remains incomplete pending confirmation.
  const unspecifiedDiff = residual > 0.15 ? residual : 0;
  return {
    status: 'INCOMPLETE_UNKNOWN_RC',
    hasTaxDiscrepancy: false,
    isRcUnspecifiedDifference: true,
    isBalanced: false,
    numericBase,
    numericIgv,
    numericRc: null,
    hasRcDeclared: false,
    numericTotal,
    calculatedSum: basePlusIgv,
    unspecifiedDiffAmount: unspecifiedDiff,
    diff: Math.abs(residual),
  };
}

function parseNumeric(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}
