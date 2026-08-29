import { useQuery } from '@tanstack/react-query';
import { Check, CircleAlert, Clock3, PackageCheck, Truck } from 'lucide-react';
import { useSearchParams, useParams } from 'react-router-dom';
import { ORDER_STATUS_LABELS, formatDateTime, formatINR, isTerminalOrderStatus } from '@pooja-house/shared-utils';
import { orderNumberSchema, trackingTokenSchema } from '@pooja-house/shared-validation';
import { PageLoader } from '../../components/common/Loading';
import { InvoiceDownloadButton } from '../../components/storefront/InvoiceDownloadButton';
import { trackOrder } from '../../services/trackingService';

export default function OrderTrackingPage() {
  const { orderNumber = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const inputValid = orderNumberSchema.safeParse(orderNumber).success && trackingTokenSchema.safeParse(token).success;
  const query = useQuery({
    queryKey: ['tracking', orderNumber, token],
    queryFn: () => trackOrder(orderNumber, token),
    enabled: inputValid,
    retry: false,
    refetchInterval: (state) => state.state.data && isTerminalOrderStatus(state.state.data.status) ? false : 15_000,
    refetchIntervalInBackground: false,
  });

  if (!inputValid) return <TrackingError message="This tracking link is incomplete or invalid." />;
  if (query.isLoading) return <PageLoader />;
  if (query.error || !query.data) return <TrackingError message={(query.error as Error | null)?.message ?? 'Order not found.'} />;
  const order = query.data;
  return <div className="tracking-page shell">
    <header className="tracking-hero"><span className="eyebrow">Secure order tracking</span><h1>{order.order_number}</h1><div className={`tracking-current status--${order.status}`}><StatusIcon status={order.status} /><div><small>Current status</small><strong>{ORDER_STATUS_LABELS[order.status]}</strong></div></div><p>Last updated {formatDateTime(order.latest_update)}{query.isFetching ? ' · Checking for updates…' : ''}</p></header>
    <div className="tracking-layout"><section className="tracking-card"><h2>Journey</h2><ol className="tracking-timeline">{order.timeline.map((event, index) => <li key={`${event.status}-${event.changed_at}`} className={index === order.timeline.length - 1 ? 'is-current' : ''}><span><Check /></span><div><strong>{ORDER_STATUS_LABELS[event.status]}</strong><time>{formatDateTime(event.changed_at)}</time></div></li>)}</ol></section>
      <section className="tracking-card"><h2>Order summary</h2><p className="tracking-meta">Placed {formatDateTime(order.order_date)}<br />Delivering to {order.delivery_area}</p><div className="tracking-items">{order.items.map((item) => <div key={item.sku}><span><strong>{item.product_name}</strong><small>{item.unit_label} · SKU {item.sku} · Qty {item.quantity}</small></span><b>{formatINR(item.line_total_paise)}</b></div>)}</div><div className="tracking-total"><span>Cash on Delivery</span><strong>{formatINR(order.cod_total_paise)}</strong></div><InvoiceDownloadButton orderNumber={order.order_number} token={token} /></section>
    </div>
  </div>;
}

function TrackingError({ message }: { message: string }) { return <div className="tracking-page shell"><div className="tracking-error"><CircleAlert /><h1>We couldn’t open this order</h1><p>{message}</p><small>Use the private tracking link shown immediately after checkout. For your privacy, phone-number-only lookup is not available.</small></div></div>; }
function StatusIcon({ status }: { status: string }) { if (status === 'delivered') return <PackageCheck />; if (status === 'out_for_delivery') return <Truck />; return <Clock3 />; }
