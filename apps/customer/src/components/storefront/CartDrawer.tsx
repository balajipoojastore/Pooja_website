import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProductsByIds } from '../../hooks/useStoreData';
import { useCartStore } from '../../stores/cartStore';
import { calculateCartTotals, formatINR } from '../../utils/money';

export function CartDrawer() {
  const { pathname } = useLocation(); const lines = useCartStore((state) => state.lines); const open = useCartStore((state) => state.isDrawerOpen);
  const openDrawer = useCartStore((state) => state.openDrawer); const close = useCartStore((state) => state.closeDrawer); const setQuantity = useCartStore((state) => state.setQuantity); const remove = useCartStore((state) => state.remove);
  const { data: products = [], isSuccess: productsLoaded } = useProductsByIds(lines.map((line) => line.productId));
  const closeRef = useRef<HTMLButtonElement>(null); const restoreRef = useRef<HTMLElement | null>(null); const drawerRef = useRef<HTMLElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const viewLines = useMemo(() => lines.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId) })).filter((line) => line.product), [lines, products]);
  const totals = calculateCartTotals(viewLines.map((line) => ({ pricePaise: line.product!.price_paise, quantity: line.quantity })), 0, 0);
  const count = viewLines.reduce((sum, line) => sum + line.quantity, 0);
  useEffect(() => { if (!productsLoaded) return; const ids = new Set(products.map((product) => product.id)); for (const line of lines) if (!ids.has(line.productId)) remove(line.productId); }, [productsLoaded, products, lines, remove]);
  useEffect(() => {
    if (!open) return; restoreRef.current = document.activeElement as HTMLElement; closeRef.current?.focus(); document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const controls = [...drawerRef.current.querySelectorAll<HTMLElement>('a,button:not([disabled])')]; if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = ''; window.setTimeout(() => restoreRef.current?.focus(), 0); };
  }, [open, close]);
  useEffect(() => { close(); }, [pathname, close]);
  useEffect(() => {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);
  const hideSticky = pathname === '/checkout' || pathname === '/order-success' || pathname.startsWith('/track/');
  return <>
    {!hideSticky && !footerVisible && count > 0 && <button className="cart-bar show" onClick={openDrawer} aria-label={`Open cart with ${count} items`}><span><b>{count} {count === 1 ? 'item' : 'items'}</b><small>{formatINR(totals.subtotalPaise)}</small></span><strong>View cart</strong></button>}
    {open && <><button className="cart-overlay show" onClick={close} aria-label="Close cart" /><aside ref={drawerRef} className="cart-drawer open" aria-label="Your cart" role="dialog" aria-modal="true"><header className="drawer-top"><div><h2>Your cart</h2><p>Review items before secure website checkout.</p></div><button ref={closeRef} className="round-btn" onClick={close} aria-label="Close cart"><X /></button></header><div className="drawer-items">{!viewLines.length ? <p className="drawer-empty"><ShoppingBag />Your cart is empty.</p> : viewLines.map((line) => <div className="drawer-item" key={line.productId}>{line.product!.image_url ? <img className="di-img" src={line.product!.image_url} alt={line.product!.name} /> : <div className="di-img image-placeholder">P</div>}<span><Link className="di-name" to={`/product/${line.product!.slug}`} onClick={close}>{line.product!.name}</Link><span className="di-price">{formatINR(line.product!.price_paise)} × {line.quantity} = <b>{formatINR(line.product!.price_paise * line.quantity)}</b></span><button className="remove-btn" onClick={() => remove(line.productId)}>Remove</button></span><span className="stepper stepper--sm"><button onClick={() => setQuantity(line.productId, line.quantity - 1)} aria-label="Decrease quantity"><Minus /></button><span className="qty">{line.quantity}</span><button onClick={() => setQuantity(line.productId, line.quantity + 1)} aria-label="Increase quantity"><Plus /></button></span></div>)}</div>{viewLines.length > 0 && <footer className="drawer-bottom"><div className="price-line"><span>Subtotal</span><strong>{formatINR(totals.subtotalPaise)}</strong></div><div className="price-line"><span>Delivery</span><strong>FREE</strong></div><div className="price-line total"><span>Estimated total</span><strong>{formatINR(totals.totalPaise)}</strong></div><Link className="checkout-btn" to="/checkout" onClick={close}>Continue to COD checkout</Link><Link className="drawer-cart-link" to="/cart" onClick={close}>View full cart</Link></footer>}</aside></>}
  </>;
}
