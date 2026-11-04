import { GoogleGenAI } from '@google/genai';

/**
 * Vercel Serverless Function: POST /api/extract
 * Extracts Peruvian receipt/tax data using Google Gemini.
 */
export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Método no permitido. Se requiere POST.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(502).json({
      success: false,
      error: 'GEMINI_NOT_CONFIGURED',
      message: 'La variable de entorno GEMINI_API_KEY no está configurada en el servidor.'
    });
  }

  const { imageBase64, mimeType } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PAYLOAD',
      message: 'Se requiere una imagen en formato base64.'
    });
  }

  // Validate Base64 size (maximum 3.5 MB ~ 4.9M base64 characters)
  const estimatedSizeBytes = (imageBase64.length * 3) / 4;
  if (estimatedSizeBytes > 3.5 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'La imagen excede el límite permitido de 3.5 MB.'
    });
  }

  // Validate MIME Type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const validMime = mimeType && allowedMimes.includes(mimeType) ? mimeType : 'image/jpeg';

  // Timeout controller (8.5 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8500);

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Models priority: gemini-3.8-flash, fallback to gemini-2.5-flash
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const fallbackModel = 'gemini-2.5-flash';

    const systemInstruction = `Eres un asistente contable peruano especializado en digitalización de comprobantes de pago para viáticos (facturas, boletas, tickets de transporte/peaje, recibos).
Tu tarea es extraer los datos visibles con total veracidad.
REGLAS OBLIGATORIAS:
1. Extrae únicamente los datos visibles en el documento.
2. Si un dato no aparece, es borroso o no aplica para este tipo de comprobante (por ejemplo IGV en un ticket de taxi o RUC en un pasaje), déjalo como null.
3. BAJO NINGUNA CIRCUNSTANCIA inventes, calcules o supongas valores que no estén explícitos.
4. Responde estrictamente con un objeto JSON sin formato markdown extra.`;

    const promptText = `Analiza la imagen de este comprobante y extrae en formato JSON los siguientes campos:
- "documentType": Tipo de comprobante ("FACTURA", "BOLETA", "TICKET" u "OTRO"). Si no es determinable, null.
- "vendorName": Razón social o nombre comercial del emisor. Si no es determinable, null.
- "ruc": RUC del emisor (11 dígitos comenzando en 10 o 20). Si no está visible, null.
- "series": Serie del comprobante (ej: F001, B001, E001). Si no está visible, null.
- "number": Correlativo o número de comprobante. Si no está visible, null.
- "date": Fecha de emisión en formato YYYY-MM-DD. Si no está visible, null.
- "currency": "PEN" o "USD". Si no está explícito en el comprobante, déjalo en null.
- "taxableBase": Base imponible numérica (ej: 100.00). Si no está desglosada, null.
- "igv": Monto numérico del IGV (ej: 18.00). Si no está desglosado, null.
- "totalAmount": Importe total numérico pagado (ej: 118.00). Si no es legible, null.
- "notes": Breve detalle o concepto principal del gasto (ej: Almuerzo ejecutivo, Peaje Panamericana Sur, Pasaje Lima-Arequipa).`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageBase64, mimeType: validMime } },
              { text: `${systemInstruction}\n\n${promptText}` }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          abortSignal: controller.signal
        }
      });
    } catch (modelErr) {
      // If primary model failed (e.g. 404 not found or not provisioned) and it wasn't an abort/timeout
      if (modelErr.name !== 'AbortError' && primaryModel !== fallbackModel) {
        response = await ai.models.generateContent({
          model: fallbackModel,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: imageBase64, mimeType: validMime } },
                { text: `${systemInstruction}\n\n${promptText}` }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            abortSignal: controller.signal
          }
        });
      } else {
        throw modelErr;
      }
    }

    const responseText = response.text || '';
    // Clean potential markdown backticks if any
    const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      data: {
        documentType: parsedData.documentType || null,
        vendorName: parsedData.vendorName || null,
        ruc: parsedData.ruc ? String(parsedData.ruc).trim() : null,
        series: parsedData.series ? String(parsedData.series).trim() : null,
        number: parsedData.number ? String(parsedData.number).trim() : null,
        date: parsedData.date || null,
        currency: parsedData.currency || null,
        taxableBase: typeof parsedData.taxableBase === 'number' ? parsedData.taxableBase : (parsedData.taxableBase ? parseFloat(parsedData.taxableBase) : null),
        igv: typeof parsedData.igv === 'number' ? parsedData.igv : (parsedData.igv ? parseFloat(parsedData.igv) : null),
        totalAmount: typeof parsedData.totalAmount === 'number' ? parsedData.totalAmount : (parsedData.totalAmount ? parseFloat(parsedData.totalAmount) : null),
        notes: parsedData.notes || null
      }
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      // HTTP 504 Gateway Timeout for timeouts
      return res.status(504).json({
        success: false,
        error: 'GATEWAY_TIMEOUT',
        message: 'Tiempo de espera de Gemini agotado (8.5s). Continuando en modo manual.'
      });
    }

    // HTTP 502 Bad Gateway for provider errors
    return res.status(502).json({
      success: false,
      error: 'BAD_GATEWAY',
      message: 'Error al comunicarse con el proveedor de IA. Continuando en modo manual.',
      details: error.message
    });

  } finally {
    // Guaranteed timer cleanup in finally block
    clearTimeout(timeoutId);
  }
}
