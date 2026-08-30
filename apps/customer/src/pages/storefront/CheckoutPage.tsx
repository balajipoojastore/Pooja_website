import { Check, LoaderCircle, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useToast } from '../../context/ToastContext';
import { useOffers, useProductsByIds } from '../../hooks/useStoreData';
import { checkPincode } from '../../services/deliveryService';
import { createCodOrder } from '../../services/orderService';
import { useCartStore } from '../../stores/cartStore';
import { calculateCartTotals, formatINR } from '../../utils/money';
import { storeOrderConfirmation } from '../../utils/orderConfirmationStorage';

export default function CheckoutPage() {
  const auth = useCustomerAuth();
  const lines = useCartStore((state) => state.lines);
  const clear = useCartStore((state) => state.clear);
  const { data: products = [] } = useProductsByIds(lines.map((line) => line.productId));
  const { data: offers = [] } = useOffers();
  const defaultAddress = auth.addresses.find((address) => address.is_default) ?? auth.addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? '');
  const [instructions, setInstructions] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [offerCode, setOfferCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const navigate = useNavigate(); const { showToast } = useToast();
  const selectedAddress = auth.addresses.find((address) => address.id === addressId) ?? defaultAddress;
  const viewLines = useMemo(() => lines.map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) })).filter((line) => line.product), [lines, products]);
  const offer = offers.find((item) => item.code?.toUpperCase() === appliedCode.toUpperCase());
  const totals = calculateCartTotals(viewLines.map((line) => ({ pricePaise: line.product!.price_paise, quantity: line.quantity })), 0, 0, offer);

  if (!viewLines.length) return <div className="listing-page shell"><div className="empty-state"><h1>Your cart is empty</h1><p>Add products before starting checkout.</p><Link className="button button--dark" to="/products">Browse products</Link></div></div>;
  const placeOrder = async () => {
    if (submittingRef.current) return;
    if (!selectedAddress) { showToast('Add a delivery address before placing your order.', 'error'); return; }
    if (!termsAccepted) { showToast('Accept the store terms to continue.', 'error'); return; }
    submittingRef.current = true; setSubmitting(true);
    try {
      const area = await checkPincode(selectedAddress.pincode);
      if (!area) throw new Error('This delivery address is no longer serviceable.');
      if (totals.subtotalPaise < area.minimum_order_paise) throw new Error(`Minimum order for ${area.area_name} is ${formatINR(area.minimum_order_paise)}.`);
      const confirmation = await createCodOrder(selectedAddress.id, lines, idempotencyKey.current, appliedCode || undefined, instructions);
      const confirmationState = storeOrderConfirmation(auth.user!.id, confirmation);
      clear();
      navigate('/order-success', { replace: true, state: confirmationState });
    } catch (error) {
      console.error('COD order submission failed', error instanceof Error ? error.message : 'Unknown error');
      showToast(error instanceof Error ? error.message : 'Order creation failed. Your cart is safe; please try again.', 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <div className="checkout-page shell"><header className="page-heading"><span className="eyebrow">Secure checkout</span><h1>Review and place your order</h1><p>Signed in as {auth.user?.email}. Prices and availability are checked again on the server.</p></header><div className="checkout-layout"><div className="checkout-form">
    <section><h2><span>1</span>Customer</h2><div className="checkout-identity"><strong>{auth.profile?.full_name}</strong><p>{auth.profile?.phone} · format validated</p></div></section>
    <section><h2><span>2</span>Delivery address</h2><div className="address-options">{auth.addresses.map((address) => <label key={address.id} className={addressId === address.id ? 'is-selected' : ''}><input type="radio" name="address" value={address.id} checked={addressId === address.id} onChange={() => setAddressId(address.id)} /><MapPin /><span><b>{address.label}{address.is_default ? ' · Default' : ''}</b><small>{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ''}, {address.city}, {address.state} · PIN {address.pincode}</small>{address.location_url && <small className="address-map-saved">Map location included for delivery</small>}</span></label>)}</div><Link className="inline-link" to="/addresses">Manage addresses</Link><label className="field field--wide">Delivery instructions <span>(optional)</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value.slice(0, 500))} rows={3} /></label></section>
    <section><h2><span>3</span>Payment</h2><div className="cod-option"><Check /><div><strong>Cash on Delivery</strong><small>Pay the server-confirmed amount when your order arrives.</small></div></div></section>
    <div className="terms-check"><input id="checkout-terms" type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><label htmlFor="checkout-terms">I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link>, including the Cash on Delivery, cancellation, delivery and final-sale conditions, and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>.</label></div>
    <button className="primary-btn place-order" type="button" onClick={() => void placeOrder()} disabled={submitting || !termsAccepted}>{submitting ? <><LoaderCircle className="spin" /><span>Placing order securely…</span></> : <><LockKeyhole /><span>Place COD order · {formatINR(totals.totalPaise)}</span></>}</button>
    <p className="checkout-security"><ShieldCheck />The browser never supplies trusted prices or a customer ID.</p>
  </div><aside className="order-summary checkout-summary"><h2>Your order</h2><div className="checkout-lines">{viewLines.map((line) => <div key={line.productId}>{line.product!.image_url && <img src={line.product!.image_url} alt="" />}<span><b>{line.product!.name}</b><small>{line.quantity} × {formatINR(line.product!.price_paise)}</small></span><strong>{formatINR(line.quantity * line.product!.price_paise)}</strong></div>)}</div><div className="offer-entry"><label htmlFor="offer">Offer code</label><div><input id="offer" value={offerCode} onChange={(event) => setOfferCode(event.target.value.toUpperCase())} /><button type="button" onClick={() => { const found = offers.find((item) => item.code?.toUpperCase() === offerCode.trim().toUpperCase()); if (!found) { showToast('That offer is unavailable or expired.', 'error'); return; } setAppliedCode(found.code ?? ''); showToast(`${found.name} applied.`); }}>Apply</button></div>{appliedCode && <small>{offer?.name}</small>}</div><dl><div><dt>Subtotal</dt><dd>{formatINR(totals.subtotalPaise)}</dd></div>{totals.discountPaise > 0 && <div className="discount-line"><dt>Offer</dt><dd>− {formatINR(totals.discountPaise)}</dd></div>}<div><dt>Estimated delivery</dt><dd>{totals.deliveryFeePaise ? formatINR(totals.deliveryFeePaise) : 'FREE'}</dd></div><div className="summary-total"><dt>Cash on Delivery</dt><dd>{formatINR(totals.totalPaise)}</dd></div></dl></aside></div></div>;
}
