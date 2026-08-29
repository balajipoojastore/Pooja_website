import { CheckCircle2, House, PackageCheck, Route } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { InvoiceDownloadButton } from '../../components/storefront/InvoiceDownloadButton';
import { PageLoader } from '../../components/common/Loading';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import type { OrderConfirmation } from '../../types/domain';
import { formatINR } from '../../utils/money';
import { consumeOrderConfirmation, type StoredOrderConfirmation } from '../../utils/orderConfirmationStorage';

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useCustomerAuth();
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const consumed = useRef(false);
  useEffect(() => {
    if (!user || consumed.current) return;
    consumed.current = true;
    const fromState = location.state as StoredOrderConfirmation | null;
    const stored = consumeOrderConfirmation(user.id);
    setConfirmation(fromState?.customerId === user.id && fromState.confirmation ? fromState.confirmation : stored);
  }, [location.state, user]);
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);
  if (loading) return <PageLoader label="Opening order confirmation" />;
  if (!confirmation) return <div className="success-page shell"><PackageCheck /><h1>No recent confirmation</h1><p>For privacy, order details are only shown immediately after checkout.</p><Link className="button button--dark" to="/">Return home</Link></div>;
  const trackingLink = confirmation.trackingToken ? `/track/${encodeURIComponent(confirmation.orderNumber)}?token=${encodeURIComponent(confirmation.trackingToken)}` : null;
  return <div className="success-page shell"><CheckCircle2 /><span className="eyebrow">Order placed</span><h1>Thank you for your order</h1><p>Your order is safely recorded and is waiting for store confirmation.</p><dl><div><dt>Order number</dt><dd>{confirmation.orderNumber}</dd></div><div><dt>Payment</dt><dd>{confirmation.paymentMethod}</dd></div><div><dt>Amount due</dt><dd>{formatINR(confirmation.totalPaise)}</dd></div></dl><InvoiceDownloadButton orderNumber={confirmation.orderNumber} token={confirmation.trackingToken} />{trackingLink ? <Link className="button button--gold" to={trackingLink}><Route />Track this order</Link> : <p className="tracking-link-warning">The one-time tracking secret is not returned again for a repeated checkout request. Keep the original confirmation link if you received it.</p>}<Link className="button button--dark" to="/"><House />Continue shopping</Link><small>Keep the tracking link private: it contains the secret required to view updates.</small></div>;
}
