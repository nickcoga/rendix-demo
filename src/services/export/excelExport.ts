import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { type Trip, type Expense, type TripFinancialSummary } from '../../types';

export async function exportTripToExcel(
  trip: Trip,
  expenses: Expense[],
  summary: TripFinancialSummary
): Promise<string> {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: Resumen de la Rendición
  // ----------------------------------------------------
  const isBalancePositive = summary.balance >= 0;
  const balanceLabel = isBalancePositive ? 'Saldo a Devolver' : 'Reembolso al Técnico';

  const summaryData = [
    ['RENDIX - LIQUIDACIÓN DE GASTOS Y VIÁTICOS', ''],
    ['Fecha de Generación', new Date().toLocaleDateString('es-PE')],
    ['', ''],
    ['DATOS GENERALES DEL VIAJE', ''],
    ['Técnico / Responsable', trip.technician_name],
    ['Destino', trip.destination],
    ['Motivo del Viaje', trip.reason],
    ['Fecha Inicio', trip.start_date],
    ['Fecha Fin', trip.end_date],
    ['Estado', trip.status === 'OPEN' ? 'Abierta' : 'Cerrada'],
    ['Moneda', trip.currency],
    ['', ''],
    ['BALANCE ECONÓMICO', ''],
    ['Viáticos / Adelanto Recibido', summary.advanceAmount],
    ['Total Gastado Sustentado', summary.totalSpent],
    [balanceLabel, summary.balance],
    ['Cantidad de Comprobantes', summary.receiptCount],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  // Column widths
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // ----------------------------------------------------
  // Sheet 2: Detalle de Gastos
  // ----------------------------------------------------
  const expensesHeaders = [
    'Item',
    'Fecha',
    'Tipo Documento',
    'Serie',
    'Número',
    'RUC',
    'Proveedor / Razón Social',
    'Categoría',
    'Base Imponible',
    'IGV',
    'Total (S/.)',
    'Observaciones'
  ];

  const expensesRows = expenses.map((exp, index) => [
    index + 1,
    exp.date,
    exp.document_type,
    exp.series || '',
    exp.number || '',
    exp.ruc || '',
    exp.vendor_name || '',
    exp.category,
    exp.taxable_base ?? '',
    exp.igv ?? '',
    exp.total_amount,
    exp.notes || ''
  ]);

  // Add total row at the end
  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    summary.totalSpent,
    ''
  ];

  const wsExpenses = XLSX.utils.aoa_to_sheet([expensesHeaders, ...expensesRows, totalRow]);
  wsExpenses['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detalle_Gastos');

  // Generate binary XLSX buffer
  const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const uint8Buffer = new Uint8Array(wbArray);

  // Write to cache using modern expo-file-system File API
  const fileName = `Rendicion_${trip.technician_name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  const exportFile = new File(Paths.cache, fileName);
  await exportFile.write(uint8Buffer);

  // Share via expo-sharing
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(exportFile.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Rendición_${trip.technician_name}_Excel`,
      UTI: 'com.microsoft.excel.xlsx'
    });
  }

  return exportFile.uri;
}
