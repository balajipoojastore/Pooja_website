import { requireSupabase } from '../lib/supabase';

async function invoiceError(error: unknown): Promise<string> {
  const response = (error as { context?: Response; response?: Response } | null)?.context
    ?? (error as { response?: Response } | null)?.response;
  if (response) {
    try {
      const body = await response.clone().json() as { error?: string };
      if (body.error) return body.error;
    } catch {
      // Use the customer-safe fallback below for non-JSON gateway failures.
    }
  }
  return 'We couldn’t prepare your invoice. Please try again.';
}

export async function downloadInvoicePdf(orderNumber: string, token?: string | null): Promise<void> {
  const { data, error } = await requireSupabase().functions.invoke<Blob>('download-invoice', {
    body: { order_number: orderNumber, ...(token ? { token } : {}) },
  });
  if (error || !(data instanceof Blob) || data.type !== 'application/pdf') {
    throw new Error(await invoiceError(error));
  }
  const objectUrl = URL.createObjectURL(data);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${orderNumber.replace(/[^A-Z0-9-]/gi, '')}-invoice.pdf`;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}
