import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { PageLoader } from '../../components/common/Loading';
import { InvoiceDownloadButton } from '../../components/storefront/InvoiceDownloadButton';
import { listMyOrders } from '../../services/customerOrderService';
import { formatINR } from '../../utils/money';

const labels: Record<string, string> = { placed: 'Placed', confirmed: 'Confirmed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function MyOrdersPage() {
  const query = useQuery({ queryKey: ['my-orders'], queryFn: listMyOrders });
  if (query.isLoading) return <PageLoader />;
  if (query.isError) return <ErrorState message="We couldn’t load your orders." retry={() => void query.refetch()} />;
  return <div className="account-page shell"><header className="page-heading"><span className="eyebrow">Order history</span><h1>My Orders</h1></header>{!query.data?.length ? <EmptyState title="No orders yet" message="Your Cash on Delivery orders will appear here." /> : <div className="customer-orders">{query.data.map((order) => <article key={order.id}><header><span><PackageCheck /><b>{order.order_number}</b></span><span className={`order-status order-status--${order.status}`}>{labels[order.status]}</span></header><p>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p><ul>{order.order_items.map((item) => <li key={`${item.sku}-${item.quantity}`}><span>{item.product_name} × {item.quantity}</span><b>{formatINR(item.line_total_paise)}</b></li>)}</ul><footer>COD total <strong>{formatINR(order.total_paise)}</strong></footer><InvoiceDownloadButton orderNumber={order.order_number} compact /></article>)}</div>}</div>;
}
