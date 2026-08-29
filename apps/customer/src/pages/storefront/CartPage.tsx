import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { useDeliveryArea, useProductsByIds, useSiteSettings } from '../../hooks/useStoreData';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import { calculateCartTotals, formatINR } from '../../utils/money';

export default function CartPage() {
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const selectedPincode = useUiStore((state) => state.selectedPincode);
  const { data: products = [] } = useProductsByIds(lines.map((line) => line.productId));
  const { data: settings } = useSiteSettings();
  const deliveryArea = useDeliveryArea(selectedPincode);
  const viewLines = useMemo(() => lines.map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) })).filter((line) => line.product), [lines, products]);
  const totals = calculateCartTotals(viewLines.map((line) => ({ pricePaise: line.product!.price_paise, quantity: line.quantity })), settings?.deliveryChargePaise ?? 0, settings?.freeDeliveryThresholdPaise ?? Number.MAX_SAFE_INTEGER);
  const minimumOrderPaise = deliveryArea.data?.minimum_order_paise ?? null;
  const minimumShortfallPaise = minimumOrderPaise === null ? null : Math.max(0, minimumOrderPaise - totals.subtotalPaise);
  const canCheckout = minimumShortfallPaise === 0;

  if (!viewLines.length) return <div className="listing-page shell"><EmptyState title="Your cart is empty" message="Add a few sacred essentials and they’ll appear here." action /></div>;

  return <div className="cart-page shell">
    <header className="page-heading"><span className="eyebrow">Your selection</span><h1>Shopping cart</h1><p>Review your items before secure Cash on Delivery checkout.</p></header>
    <div className="cart-layout">
      <section className="cart-list" aria-label="Cart items">{viewLines.map((line) => <article className="cart-page-line" key={line.productId}>
        {line.product!.image_url ? <img src={line.product!.image_url} alt={line.product!.name} /> : <div className="image-placeholder">P</div>}
        <div><span className="eyebrow">{line.product!.category?.name}</span><Link to={`/product/${line.product!.slug}`}><h2>{line.product!.name}</h2></Link><p>{line.product!.unit_label} · SKU {line.product!.sku}</p><div className="quantity-stepper"><button aria-label="Decrease quantity" onClick={() => setQuantity(line.productId, line.quantity - 1)}><Minus /></button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(line.productId, line.quantity + 1)}><Plus /></button></div></div>
        <div className="cart-line-total"><strong>{formatINR(line.product!.price_paise * line.quantity)}</strong><button onClick={() => remove(line.productId)}><Trash2 />Remove</button></div>
      </article>)}</section>
      <aside className="order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>{formatINR(totals.subtotalPaise)}</dd></div><div><dt>Estimated delivery</dt><dd>{totals.deliveryFeePaise ? formatINR(totals.deliveryFeePaise) : 'FREE'}</dd></div><div className="summary-total"><dt>Estimated total</dt><dd>{formatINR(totals.totalPaise)}</dd></div></dl>
        <div id="minimum-order-message" className={`minimum-order-message ${canCheckout ? 'is-met' : ''}`} role="status">
          {deliveryArea.isLoading ? 'Checking the minimum order for your delivery area…' : deliveryArea.isError || !deliveryArea.data ? 'We could not verify the delivery minimum. Please retry before checkout.' : minimumShortfallPaise! > 0 ? <>Add <strong>{formatINR(minimumShortfallPaise!)}</strong> more to reach the {formatINR(minimumOrderPaise!)} minimum for PIN {selectedPincode}.</> : <>Minimum order of <strong>{formatINR(minimumOrderPaise!)}</strong> reached.</>}
        </div>
        <p>Final prices, offers, serviceability, and delivery fees are securely verified during checkout.</p>
        {canCheckout ? <Link className="button button--dark" to="/checkout">Continue to checkout <ArrowRight /></Link> : <button className="button button--dark" type="button" disabled aria-describedby="minimum-order-message">Continue to checkout <ArrowRight /></button>}
        <Link to="/products">Continue shopping</Link>
      </aside>
    </div>
  </div>;
}
