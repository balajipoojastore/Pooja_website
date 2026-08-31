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
import { SEO_STORE_NAME, usePageMetadata } from '../../lib/seo';

export function StoreLayout() {
  const { pathname } = useLocation();
  const closeCart = useCartStore((state) => state.closeDrawer);
  const cartOpen = useCartStore((state) => state.isDrawerOpen);
  const quickViewOpen = useUiStore((state) => Boolean(state.quickViewProductId));
  const pinOpen = useUiStore((state) => state.pinGateOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const browsingRoute = pathname === '/' || pathname === '/products' || pathname.startsWith('/category/') || pathname.startsWith('/product/') || pathname === '/cart';
  const showMobileNavigation = !pathname.startsWith('/auth') && !pathname.startsWith('/complete-profile') && !pathname.startsWith('/checkout') && !pathname.startsWith('/order-success') && !pathname.startsWith('/track/');
  const privateRoute = /^\/(?:auth|cart|checkout|order-success|track(?:\/|$)|complete-profile|profile|addresses|orders)(?:\/|$)/u.test(pathname);
  const genericLabel = pathname === '/' ? 'Pooja essentials in Varthur' : pathname.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') ?? 'Shop';
  usePageMetadata({
    title: pathname === '/' ? `${SEO_STORE_NAME} | ${genericLabel}` : `${genericLabel.replace(/^./u, (value) => value.toUpperCase())} | ${SEO_STORE_NAME}`,
    description: 'Authentic pooja essentials for daily rituals, festivals and celebrations from Balaji Pooja Store in Varthur, Bengaluru.',
    pathname,
    noIndex: privateRoute,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    closeCart();
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
