import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';
import { evaluateTaxReconciliation } from '../src/utils/taxReconciliation.ts';

console.log('='.repeat(78));
console.log(' RENDIX DEMO - SUITE DE VERIFICACIÓN ETAPA 1: AJUSTE FINAL CONCILIACIÓN RC');
console.log('='.repeat(78));

const results = [];

function recordTest(num, name, passed, detail = '') {
  results.push({ num, name, status: passed ? 'PASS' : 'FAIL', detail });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] Test ${num}: ${name}`);
  if (detail) console.log(`         Detalle: ${detail}`);
}

// ============================================================================
// Helper SQLite DB Setup
// ============================================================================
function createTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      document_type TEXT NOT NULL,
      date TEXT NOT NULL,
      vendor_name TEXT,
      ruc TEXT,
      series TEXT,
      number TEXT,
      currency TEXT NOT NULL DEFAULT 'PEN',
      taxable_base REAL,
      igv REAL,
      rc REAL,
      total_amount REAL NOT NULL,
      photo_uri TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

// ============================================================================
// GRUPO 1: PERSISTENCIA Y ESTADOS EN BASE DE DATOS
// ============================================================================

// TEST 1: Guardar y recuperar RC identificado (> 0)
try {
  const db = createTestDb();
  const insertStmt = db.prepare(`
    INSERT INTO expenses (trip_id, category, document_type, date, vendor_name, ruc, series, number, currency, taxable_base, igv, rc, total_amount, photo_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(1, 'Alimentación', 'FACTURA', '2026-02-28', 'CORRALITO SAC', '20603169761', 'F003', '1290', 'PEN', 129.84, 23.37, 7.79, 161.00, 'file:///photo1.jpg');
  
  const row = db.prepare('SELECT rc, total_amount, vendor_name FROM expenses WHERE id = 1').get();
  assert.strictEqual(row.rc, 7.79, 'rc debe ser exactamente 7.79');
  assert(row.rc > 0, 'rc debe ser mayor a 0 (identificado)');
  
  recordTest(1, 'Guardar y recuperar RC identificado (> 0)', true, `Recuperado rc = ${row.rc} (tipo: ${typeof row.rc})`);
} catch (e) {
  recordTest(1, 'Guardar y recuperar RC identificado (> 0)', false, e.message);
}

// TEST 2: Guardar y recuperar RC confirmado como inexistente (=== 0)
try {
  const db = createTestDb();
  const insertStmt = db.prepare(`
    INSERT INTO expenses (trip_id, category, document_type, date, vendor_name, ruc, series, number, currency, taxable_base, igv, rc, total_amount, photo_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(1, 'Alimentación', 'FACTURA', '2026-02-28', 'RESTAURANTE SIN RC', '20100000001', 'F001', '0001', 'PEN', 100.00, 18.00, 0.0, 118.00, 'file:///photo2.jpg');
  
  const row = db.prepare('SELECT rc, total_amount FROM expenses WHERE id = 1').get();
  assert.strictEqual(row.rc, 0.0, 'rc debe ser 0.0, no NULL');
  assert(row.rc !== null, 'rc NO debe convertirse a null cuando es 0');
  
  recordTest(2, 'Guardar y recuperar RC confirmado inexistente (=== 0)', true, `Recuperado rc = ${row.rc} (distinto de NULL)`);
} catch (e) {
  recordTest(2, 'Guardar y recuperar RC confirmado inexistente (=== 0)', false, e.message);
}

// TEST 3: Guardar y recuperar RC desconocido (NULL)
try {
  const db = createTestDb();
  const insertStmt = db.prepare(`
    INSERT INTO expenses (trip_id, category, document_type, date, vendor_name, ruc, series, number, currency, taxable_base, igv, rc, total_amount, photo_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(1, 'Transporte', 'BOLETA', '2026-03-01', 'TAXI METROPOLITANO', null, null, null, 'PEN', null, null, null, 25.00, 'file:///photo3.jpg');
  
  const row = db.prepare('SELECT rc, total_amount FROM expenses WHERE id = 1').get();
  assert.strictEqual(row.rc, null, 'rc debe ser null');
  
  recordTest(3, 'Guardar y recuperar RC desconocido (NULL)', true, `Recuperado rc = null`);
} catch (e) {
  recordTest(3, 'Guardar y recuperar RC desconocido (NULL)', false, e.message);
}

// TEST 4: Actualizar un gasto cambiando entre los 3 estados (NULL -> 0 -> >0 -> NULL)
try {
  const db = createTestDb();
  db.prepare(`
    INSERT INTO expenses (id, trip_id, category, document_type, date, vendor_name, total_amount, photo_uri, rc)
    VALUES (10, 1, 'Hospedaje', 'FACTURA', '2026-02-20', 'HOTEL LIMA', 200.00, 'file:///hotel.jpg', NULL)
  `).run();

  // Estado inicial: desconocido (NULL)
  let row = db.prepare('SELECT rc FROM expenses WHERE id = 10').get();
  assert.strictEqual(row.rc, null, 'Estado inicial: null');

  // Transición 1: cambiar a inexistente (0.0)
  db.prepare('UPDATE expenses SET rc = ? WHERE id = 10').run(0.0);
  row = db.prepare('SELECT rc FROM expenses WHERE id = 10').get();
  assert.strictEqual(row.rc, 0.0, 'Transición a inexistente: rc = 0.0');

  // Transición 2: cambiar a identificado (> 0, ej 15.00)
  db.prepare('UPDATE expenses SET rc = ? WHERE id = 10').run(15.00);
  row = db.prepare('SELECT rc FROM expenses WHERE id = 10').get();
  assert.strictEqual(row.rc, 15.00, 'Transición a identificado: rc = 15.00');

  // Transición 3: cambiar de regreso a desconocido (NULL)
  db.prepare('UPDATE expenses SET rc = ? WHERE id = 10').run(null);
  row = db.prepare('SELECT rc FROM expenses WHERE id = 10').get();
  assert.strictEqual(row.rc, null, 'Transición a desconocido: rc = null');

  recordTest(4, 'Actualizar gasto cambiando entre los tres estados (NULL <-> 0 <-> >0)', true, 'Transiciones verificadas correctamente');
} catch (e) {
  recordTest(4, 'Actualizar gasto cambiando entre los tres estados', false, e.message);
}

// ============================================================================
// GRUPO 2: MIGRACIÓN SQLITE IDEMPOTENTE
// ============================================================================

// TEST 5: Migración SQLite idempotente y conservación de datos legacy
try {
  const dbMig = new DatabaseSync(':memory:');
  
  dbMig.exec(`
    CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      document_type TEXT NOT NULL,
      date TEXT NOT NULL,
      vendor_name TEXT,
      taxable_base REAL,
      igv REAL,
      total_amount REAL NOT NULL,
      photo_uri TEXT NOT NULL
    );
  `);

  dbMig.prepare(`
    INSERT INTO expenses (trip_id, category, document_type, date, vendor_name, total_amount, photo_uri)
    VALUES (1, 'Alimentación', 'FACTURA', '2025-12-01', 'LEGACY SAC', 150.00, 'file:///legacy.jpg')
  `).run();

  function runMigration(database) {
    const tableInfo = database.prepare('PRAGMA table_info(expenses)').all();
    const hasRcColumn = tableInfo.some((col) => col.name === 'rc');
    if (!hasRcColumn) {
      database.exec('ALTER TABLE expenses ADD COLUMN rc REAL;');
    }
  }

  runMigration(dbMig);
  let cols = dbMig.prepare('PRAGMA table_info(expenses)').all();
  assert(cols.some(c => c.name === 'rc'), 'Columna rc debe existir tras migración');

  const legacyRecord = dbMig.prepare('SELECT vendor_name, total_amount, rc FROM expenses WHERE id = 1').get();
  assert.strictEqual(legacyRecord.vendor_name, 'LEGACY SAC');
  assert.strictEqual(legacyRecord.total_amount, 150.00);
  assert.strictEqual(legacyRecord.rc, null);

  runMigration(dbMig);
  cols = dbMig.prepare('PRAGMA table_info(expenses)').all();
  const rcCols = cols.filter(c => c.name === 'rc');
  assert.strictEqual(rcCols.length, 1, 'No debe duplicar columna rc');

  recordTest(5, 'Migración SQLite idempotente y conservación de datos legacy', true, 'Columna añadida, datos históricos con rc=null, reejecución idempotente');
} catch (e) {
  recordTest(5, 'Migración SQLite idempotente y conservación de datos legacy', false, e.message);
}

// ============================================================================
// GRUPO 3: CASOS DE CONCILIACIÓN CONTABLE OBLIGATORIOS
// ============================================================================

// TEST 6: Caso 1: Base 100 + IGV 18 + RC 0 + Total 118 -> BALANCED
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100,
    igv: 18,
    rc: 0,
    totalAmount: 118
  });
  assert.strictEqual(res.status, 'BALANCED');
  assert.strictEqual(res.hasTaxDiscrepancy, false);
  assert.strictEqual(res.isBalanced, true);
  assert.strictEqual(res.isRcUnspecifiedDifference, false);
  recordTest(6, 'Caso 1: Base 100 + IGV 18 + RC 0 + Total 118 → BALANCED', true, `Status: ${res.status}`);
} catch (e) {
  recordTest(6, 'Caso 1: Base 100 + IGV 18 + RC 0 + Total 118', false, e.message);
}

// TEST 7: Caso 2: Base 100 + IGV 18 + RC NULL + Total 118 -> INCOMPLETE_UNKNOWN_RC
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100,
    igv: 18,
    rc: null,
    totalAmount: 118
  });
  assert.strictEqual(res.status, 'INCOMPLETE_UNKNOWN_RC', 'RC NULL con Base+IGV=Total debe ser INCOMPLETE_UNKNOWN_RC');
  assert.strictEqual(res.hasTaxDiscrepancy, false, 'No debe tener discrepancia errónea');
  assert.strictEqual(res.isBalanced, false, 'No debe ser considerado balanceado');
  assert.strictEqual(res.isRcUnspecifiedDifference, true, 'isRcUnspecifiedDifference debe ser true');
  assert.strictEqual(res.unspecifiedDiffAmount, 0, 'unspecifiedDiffAmount debe ser 0');
  recordTest(7, 'Caso 2: Base 100 + IGV 18 + RC NULL + Total 118 → INCOMPLETE_UNKNOWN_RC', true, `Status: ${res.status}, isBalanced: ${res.isBalanced}`);
} catch (e) {
  recordTest(7, 'Caso 2: Base 100 + IGV 18 + RC NULL + Total 118', false, e.message);
}

// TEST 8: Caso 3: Base 100 + IGV 18 + RC NULL + Total 125 -> INCOMPLETE_UNKNOWN_RC
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100,
    igv: 18,
    rc: null,
    totalAmount: 125
  });
  assert.strictEqual(res.status, 'INCOMPLETE_UNKNOWN_RC');
  assert.strictEqual(res.hasTaxDiscrepancy, false);
  assert.strictEqual(res.isBalanced, false);
  assert.strictEqual(res.isRcUnspecifiedDifference, true);
  assert(Math.abs(res.unspecifiedDiffAmount - 7.00) < 0.01, 'Diferencia residual debe ser 7.00');
  recordTest(8, 'Caso 3: Base 100 + IGV 18 + RC NULL + Total 125 → INCOMPLETE_UNKNOWN_RC', true, `Status: ${res.status}, Diferencia: S/ ${res.unspecifiedDiffAmount.toFixed(2)}`);
} catch (e) {
  recordTest(8, 'Caso 3: Base 100 + IGV 18 + RC NULL + Total 125', false, e.message);
}

// TEST 9: Caso 4: Base 100 + IGV 18 + RC 7 + Total 125 -> BALANCED
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100,
    igv: 18,
    rc: 7,
    totalAmount: 125
  });
  assert.strictEqual(res.status, 'BALANCED');
  assert.strictEqual(res.hasTaxDiscrepancy, false);
  assert.strictEqual(res.isBalanced, true);
  assert.strictEqual(res.isRcUnspecifiedDifference, false);
  assert(Math.abs(res.calculatedSum - 125.00) < 0.01);
  recordTest(9, 'Caso 4: Base 100 + IGV 18 + RC 7 + Total 125 → BALANCED', true, `Status: ${res.status}, Suma: ${res.calculatedSum.toFixed(2)}`);
} catch (e) {
  recordTest(9, 'Caso 4: Base 100 + IGV 18 + RC 7 + Total 125', false, e.message);
}

// TEST 10: Caso 5: Base 100 + IGV 18 + RC 7 + Total 130 -> DISCREPANCY
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100,
    igv: 18,
    rc: 7,
    totalAmount: 130
  });
  assert.strictEqual(res.status, 'DISCREPANCY');
  assert.strictEqual(res.hasTaxDiscrepancy, true);
  assert.strictEqual(res.isBalanced, false);
  assert.strictEqual(res.isRcUnspecifiedDifference, false);
  recordTest(10, 'Caso 5: Base 100 + IGV 18 + RC 7 + Total 130 → DISCREPANCY', true, `Status: ${res.status}, hasTaxDiscrepancy: ${res.hasTaxDiscrepancy}`);
} catch (e) {
  recordTest(10, 'Caso 5: Base 100 + IGV 18 + RC 7 + Total 130', false, e.message);
}

// TEST 11: Caso CORRALITO (Base 129.84 + IGV 23.37 + RC 7.79 + Total 161.00) -> BALANCED
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: '129.84',
    igv: '23.37',
    rc: '7.79',
    totalAmount: '161.00'
  });
  assert.strictEqual(res.status, 'BALANCED');
  assert.strictEqual(res.hasTaxDiscrepancy, false);
  assert.strictEqual(res.isBalanced, true);
  assert.strictEqual(res.isRcUnspecifiedDifference, false);
  assert(Math.abs(res.calculatedSum - 161.00) < 0.01);
  recordTest(11, 'Caso CORRALITO: 129.84 + 23.37 + 7.79 = 161.00 → BALANCED', true, `Status: ${res.status}, Suma: ${res.calculatedSum.toFixed(2)}`);
} catch (e) {
  recordTest(11, 'Caso CORRALITO', false, e.message);
}

// TEST 12: Detección de conflicto demostrable cuando Base + IGV excede Total
try {
  const res = evaluateTaxReconciliation({
    docType: 'FACTURA',
    taxableBase: 100.00,
    igv: 25.00,
    rc: null,
    totalAmount: 118.00
  });
  assert.strictEqual(res.status, 'DISCREPANCY');
  assert.strictEqual(res.hasTaxDiscrepancy, true);
  recordTest(12, 'Detección de conflicto cuando Base + IGV excede el Total declarado', true, `Status: ${res.status}, hasTaxDiscrepancy: ${res.hasTaxDiscrepancy}`);
} catch (e) {
  recordTest(12, 'Detección de conflicto por exceso', false, e.message);
}

// ============================================================================
// RESUMEN FINAL
// ============================================================================
console.log('\n' + '='.repeat(78));
const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`RESUMEN: ${passed}/${total} PRUEBAS EXITOSAS (${failed} FALLAS)`);
console.log('='.repeat(78));

if (failed > 0) {
  process.exit(1);
}
