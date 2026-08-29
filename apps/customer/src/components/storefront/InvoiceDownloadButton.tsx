import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadInvoicePdf } from '../../services/invoiceService';

export function InvoiceDownloadButton({ orderNumber, token, compact = false }: { orderNumber: string; token?: string | null; compact?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError('');
    try {
      await downloadInvoicePdf(orderNumber, token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We couldn’t prepare your invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return <div className={`invoice-download${compact ? ' invoice-download--compact' : ''}`}>
    <button type="button" className={compact ? 'invoice-download-button' : 'button button--invoice'} disabled={downloading} onClick={() => void download()}>
      {downloading ? <LoaderCircle className="spin" /> : <Download />}
      {downloading ? 'Preparing PDF…' : 'Download PDF invoice'}
    </button>
    {error && <p className="invoice-download-error" role="alert">{error}</p>}
  </div>;
}
