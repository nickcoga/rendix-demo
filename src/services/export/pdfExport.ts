import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { type Trip, type Expense, type TripFinancialSummary } from '../../types';
import { getFileBase64 } from '../storage/photoStorage';

export async function exportTripToPdf(
  trip: Trip,
  expenses: Expense[],
  summary: TripFinancialSummary
): Promise<string> {
  // Convert expense photos to base64 for embedding in the HTML
  const expensePhotoData: { id: number; base64: string | null }[] = [];
  for (const exp of expenses) {
    let b64: string | null = null;
    if (exp.photo_uri) {
      try {
        b64 = await getFileBase64(exp.photo_uri);
      } catch (err) {
        console.warn(`No se pudo leer la foto del gasto ${exp.id}:`, err);
      }
    }
    expensePhotoData.push({ id: exp.id, base64: b64 });
  }

  const isBalancePositive = summary.balance >= 0;
  const balanceLabel = isBalancePositive ? 'Saldo a Devolver a la Empresa' : 'Importe a Reembolsar al Técnico';
  const balanceColor = isBalancePositive ? '#10B981' : '#EF4444';

  const rowsHtml = expenses.map((exp, index) => {
    const docDesc = exp.series && exp.number
      ? `${exp.series}-${exp.number}`
      : (exp.series || exp.number || '-');
    const rucDesc = exp.ruc || '-';
    const baseDesc = exp.taxable_base != null ? `S/ ${exp.taxable_base.toFixed(2)}` : '-';
    const igvDesc = exp.igv != null ? `S/ ${exp.igv.toFixed(2)}` : '-';

    return `
      <tr style="border-bottom: 1px solid #E2E8F0; ${index % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
        <td style="padding: 8px 6px; text-align: center; font-size: 11px;">${index + 1}</td>
        <td style="padding: 8px 6px; font-size: 11px;">${exp.date || '-'}</td>
        <td style="padding: 8px 6px; font-size: 11px; font-weight: 600;">${exp.document_type}</td>
        <td style="padding: 8px 6px; font-size: 11px; font-family: monospace;">${docDesc}</td>
        <td style="padding: 8px 6px; font-size: 11px;">${rucDesc}</td>
        <td style="padding: 8px 6px; font-size: 11px;">
          <strong>${exp.vendor_name || 'Sin proveedor'}</strong>
          ${exp.notes ? `<div style="font-size: 10px; color: #64748B;">${exp.notes}</div>` : ''}
        </td>
        <td style="padding: 8px 6px; font-size: 11px;">${exp.category}</td>
        <td style="padding: 8px 6px; text-align: right; font-size: 11px;">${baseDesc}</td>
        <td style="padding: 8px 6px; text-align: right; font-size: 11px;">${igvDesc}</td>
        <td style="padding: 8px 6px; text-align: right; font-size: 11px; font-weight: bold; color: #001F3F;">
          S/ ${exp.total_amount.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  // Photographic annexes HTML
  const annexesHtml = expenses.map((exp, index) => {
    const photoItem = expensePhotoData.find(p => p.id === exp.id);
    if (!photoItem?.base64) return '';

    return `
      <div style="break-inside: avoid; margin-bottom: 25px; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
        <div style="font-size: 12px; font-weight: bold; color: #001F3F; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>Anexo ${index + 1}: ${exp.document_type} ${exp.series && exp.number ? `${exp.series}-${exp.number}` : ''}</span>
          <span style="color: #001F3F;">S/ ${exp.total_amount.toFixed(2)}</span>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 10px;">
          ${exp.vendor_name || 'Proveedor no especificado'} | ${exp.date} | Categoría: ${exp.category}
        </div>
        <div style="text-align: center;">
          <img src="data:image/jpeg;base64,${photoItem.base64}" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 4px; border: 1px solid #E2E8F0;" />
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Rendición de Gastos - ${trip.technician_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 24px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #001F3F; padding-bottom: 14px; margin-bottom: 20px; }
          .logo { font-size: 26px; font-weight: 900; color: #001F3F; letter-spacing: -0.5px; }
          .logo span { color: #00B4D8; }
          .title { font-size: 16px; font-weight: bold; color: #334155; text-align: right; }
          .grid { display: flex; gap: 16px; margin-bottom: 20px; }
          .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; background: #F8FAFC; }
          .card-title { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
          .info-label { color: #64748B; }
          .info-value { font-weight: 600; color: #0F172A; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #001F3F; color: #FFFFFF; font-size: 11px; font-weight: 600; text-align: left; padding: 8px 6px; }
          .summary-card { background: #FFFFFF; border: 2px solid #001F3F; border-radius: 8px; padding: 14px; margin-bottom: 25px; }
          .signatures { display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 30px; page-break-inside: avoid; }
          .sig-box { width: 220px; text-align: center; border-top: 1px solid #94A3B8; padding-top: 8px; font-size: 11px; color: #475569; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">RENDIX<span>.</span></div>
            <div style="font-size: 11px; color: #64748B;">Control Inteligente de Viáticos y Rendiciones</div>
          </div>
          <div class="title">
            LIQUIDACIÓN DE GASTOS
            <div style="font-size: 11px; font-weight: normal; color: #64748B;">Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Datos del Viaje y Técnico</div>
            <div class="info-row"><span class="info-label">Técnico / Responsable:</span><span class="info-value">${trip.technician_name}</span></div>
            <div class="info-row"><span class="info-label">Destino:</span><span class="info-value">${trip.destination}</span></div>
            <div class="info-row"><span class="info-label">Motivo del Viaje:</span><span class="info-value">${trip.reason}</span></div>
            <div class="info-row"><span class="info-label">Periodo:</span><span class="info-value">${trip.start_date} al ${trip.end_date}</span></div>
          </div>
          <div class="card" style="background: #FFFFFF; border-color: #CBD5E1;">
            <div class="card-title">Balance Económico</div>
            <div class="info-row"><span class="info-label">Viáticos Recibidos (Adelanto):</span><span class="info-value">S/ ${summary.advanceAmount.toFixed(2)}</span></div>
            <div class="info-row"><span class="info-label">Total Gastos Sustentados (${summary.receiptCount} docs):</span><span class="info-value">S/ ${summary.totalSpent.toFixed(2)}</span></div>
            <div class="info-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #CBD5E1; font-size: 13px;">
              <span class="info-label" style="font-weight: bold; color: ${balanceColor};">${balanceLabel}:</span>
              <span class="info-value" style="font-size: 15px; font-weight: 800; color: ${balanceColor};">S/ ${Math.abs(summary.balance).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="font-weight: 700; font-size: 13px; color: #001F3F; margin-bottom: 8px;">
          DETALLE DE COMPROBANTES DE PAGO
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 70px;">Fecha</th>
              <th style="width: 65px;">Tipo</th>
              <th style="width: 85px;">Serie-N°</th>
              <th style="width: 85px;">RUC</th>
              <th>Proveedor / Concepto</th>
              <th style="width: 90px;">Categoría</th>
              <th style="width: 65px; text-align: right;">Base</th>
              <th style="width: 55px; text-align: right;">IGV</th>
              <th style="width: 75px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #64748B;">No hay comprobantes registrados.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #E2E8F0; font-weight: bold; border-top: 2px solid #001F3F;">
              <td colspan="9" style="padding: 10px 8px; text-align: right; font-size: 12px;">TOTAL GASTADO (${trip.currency}):</td>
              <td style="padding: 10px 8px; text-align: right; font-size: 12px; color: #001F3F;">S/ ${summary.totalSpent.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div class="sig-box">
            Firma del Técnico Responsable<br>
            <strong>${trip.technician_name}</strong>
          </div>
          <div class="sig-box">
            Revisado por Administración / Contabilidad<br>
            <strong>Softvalley / Área Contable</strong>
          </div>
        </div>

        ${annexesHtml ? `
          <div class="page-break"></div>
          <div style="font-weight: 800; font-size: 16px; color: #001F3F; border-bottom: 2px solid #001F3F; padding-bottom: 6px; margin-bottom: 20px;">
            ANEXO FOTOGRÁFICO DE COMPROBANTES
          </div>
          ${annexesHtml}
        ` : ''}
      </body>
    </html>
  `;

  // Print to local PDF
  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false
  });

  // Share if sharing is available
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Rendición_${trip.technician_name.replace(/\s+/g, '_')}_${trip.destination}`,
      UTI: 'com.adobe.pdf'
    });
  }

  return uri;
}
