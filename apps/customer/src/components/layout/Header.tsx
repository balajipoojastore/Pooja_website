import { BadgePercent, CircleUserRound, MapPin, PackageCheck, Search, ShoppingCart, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../../hooks/useStoreData';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { BrandLogo } from '../common/BrandLogo';

const suggestions = ['Diyas', 'Agarbatti', 'Kumkum', 'Pooja oil', 'Lakshmi', 'Brass'];

export function Header() {
  const [query, setQuery] = useState(''); const inputRef = useRef<HTMLInputElement>(null); const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const openDrawer = useCartStore((state) => state.openDrawer); const selectedPincode = useUiStore((state) => state.selectedPincode); const setPinGateOpen = useUiStore((state) => state.setPinGateOpen); const { data: settings } = useSiteSettings();
  const auth = useCustomerAuth();
  const search = (value = query) => { const next = value.trim(); if (next) navigate(`/products?q=${encodeURIComponent(next)}`); };
  return <>
    {settings?.headerAnnouncement && <div className="announcement">{settings.headerAnnouncement}</div>}
    <header id="site-header" className="site-header">
      <div className="top-row"><Link className="brand" to="/" aria-label="The Pooja House home"><BrandLogo className="brand-mark" /><span><strong>{settings?.storeName ?? 'The Pooja House'}</strong><small>Pooja essentials, delivered</small></span></Link>
        <button className="location-pill" type="button" onClick={() => setPinGateOpen(true)} aria-label="Change delivery PIN"><MapPin /><span>{selectedPincode ?? 'PIN'}</span></button>
        <nav className="desktop-quick-nav" aria-label="Customer navigation"><Link to="/products?offers=1"><BadgePercent />Offers</Link><Link to={auth.user ? '/orders' : '/auth'} state={{ from: '/orders' }}><PackageCheck />My Orders</Link><Link to={auth.user ? '/profile' : '/auth'} state={{ from: '/profile' }}><CircleUserRound />{auth.user ? 'Account' : 'Login'}</Link></nav>
        <button className="icon-btn cart-icon" type="button" onClick={openDrawer} aria-label={`Open cart with ${itemCount} items`}><ShoppingCart />{itemCount > 0 && <span>{itemCount}</span>}</button>
      </div>
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); search(); }}><Search aria-hidden="true" /><label className="sr-only" htmlFor="store-search">Search products</label><input id="store-search" ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search pooja essentials" />{query && <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search"><X /></button>}</form>
      <div className="suggestions" aria-label="Suggested searches">{suggestions.map((item) => <button type="button" key={item} onClick={() => { setQuery(item); search(item); }}>{item}</button>)}</div>
    </header>
  </>;
}
