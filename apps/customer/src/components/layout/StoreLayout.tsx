import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { PinCodeGate } from '../storefront/PinCodeGate';
import { CartDrawer } from '../storefront/CartDrawer';
import { QuickView } from '../storefront/QuickView';
import { BottomNav } from './BottomNav';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';

export function StoreLayout() {
  const { pathname } = useLocation();
  const closeCart = useCartStore((state) => state.closeDrawer);
  const cartOpen = useCartStore((state) => state.isDrawerOpen);
  const quickViewOpen = useUiStore((state) => Boolean(state.quickViewProductId));
  const pinOpen = useUiStore((state) => state.pinGateOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const browsingRoute = pathname === '/' || pathname === '/products' || pathname.startsWith('/category/') || pathname.startsWith('/product/') || pathname === '/cart';
  const showMobileNavigation = !pathname.startsWith('/auth') && !pathname.startsWith('/complete-profile') && !pathname.startsWith('/checkout') && !pathname.startsWith('/order-success') && !pathname.startsWith('/track/');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    closeCart();
    const label = pathname === '/' ? 'Pooja essentials' : pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') ?? 'Shop';
    document.title = `${label.replace(/^./, (value) => value.toUpperCase())} | The Pooja House`;
  }, [pathname, closeCart]);
  useEffect(() => {
    const element = contentRef.current as (HTMLDivElement & { inert: boolean }) | null;
    if (!element) return;
    const blocked = cartOpen || quickViewOpen || (pinOpen && browsingRoute);
    element.inert = blocked;
    element.setAttribute('aria-hidden', blocked ? 'true' : 'false');
    return () => { element.inert = false; element.removeAttribute('aria-hidden'); };
  }, [cartOpen, quickViewOpen, pinOpen, browsingRoute]);

  return <><div ref={contentRef} id="store-content"><Header /><main><Outlet /></main><Footer />{showMobileNavigation && <BottomNav />}</div>{browsingRoute && <PinCodeGate />}{showMobileNavigation && <CartDrawer />}<QuickView /></>;
}
