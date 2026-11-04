import { type ExtractedReceiptData } from '../../types';

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedReceiptData;
  error?: string;
  message?: string;
}

/**
 * Invokes the Vercel proxy to extract receipt data via Gemini.
 * Uses a strict 10.0-second mobile timeout with guaranteed finally cleanup.
 * If anything fails or times out, returns null to allow seamless manual entry
 * without losing the photo or blocking the user.
 */
export async function extractReceiptFromProxy(
  imageBase64: string,
  proxyUrl: string
): Promise<ExtractedReceiptData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10.0s mobile timeout

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: 'image/jpeg',
      }),
      signal: controller.signal,
    });

    const result = await response.json();

    if (response.ok && result.success && result.data) {
      return result.data as ExtractedReceiptData;
    }

    return null;
  } catch (error: any) {
    // Note: AbortController cancels the HTTP connection on the phone and frees the UI,
    // but does not guarantee that the remote provider call stopped if already received.
    console.log('Fallo o timeout en extracción de IA, continuando en modo manual:', error?.message);
    return null;
  } finally {
    // Guaranteed timer cleanup in finally block
    clearTimeout(timeoutId);
  }
}
