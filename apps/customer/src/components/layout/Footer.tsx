import { Link } from 'react-router-dom';
import { Banknote, Instagram, MapPin, ShieldCheck } from 'lucide-react';
import { useSiteSettings } from '../../hooks/useStoreData';
import { BrandLogo } from '../common/BrandLogo';

const fallbackAddress = 'Shop no. 1, sy. No. 61 Ground Floor, Muthsandra Main Rd, Varthur, Bengaluru, Karnataka 560087';
const fallbackLocationUrl = 'https://maps.app.goo.gl/LpaDsNXq62UnM59X6';
const instagramUrl = 'https://www.instagram.com/balaji.pooja.store.varthur?igsi=cmQzaHI1bGcwNHM2';

function safeMapsUrl(value?: string) {
  try {
    const url = new URL(value || fallbackLocationUrl);
    const googleMapsHost = url.hostname === 'maps.app.goo.gl' || url.hostname === 'maps.google.com' || url.hostname === 'www.google.com';
    return url.protocol === 'https:' && googleMapsHost ? url.toString() : fallbackLocationUrl;
  } catch { return fallbackLocationUrl; }
}

export function Footer() {
  const { data: settings } = useSiteSettings();
  const phone = settings?.contactPhone?.replace(/[^+\d]/g, '') ?? '';
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const isPlaceholder = ['9000000000', '9999999999', '0000000000'].includes(digits) || /^(\d)\1{9}$/.test(digits);
  const validPhone = /^(?:\+91)?[6-9]\d{9}$/.test(phone) && !isPlaceholder;
  const email = settings?.contactEmail?.trim() ?? '';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const address = settings?.address?.trim() || fallbackAddress;
  const locationUrl = safeMapsUrl(settings?.locationUrl);
  const storeName = settings?.storeName ?? 'The Pooja House';

  return <footer id="contact" className="site-footer">
    <div className="footer-accent" aria-hidden="true" />
    <div className="footer-inner">
      <section className="footer-brand" aria-labelledby="footer-store-name">
        <div className="footer-brand-lockup"><BrandLogo className="footer-brand-mark" /><div><h2 id="footer-store-name">{storeName}</h2><small>Pooja essentials, delivered</small></div></div>
        <address className="footer-address">
          <a href={locationUrl} target="_blank" rel="noopener noreferrer" aria-label="Open The Pooja House location in Google Maps">
            <MapPin aria-hidden="true" />
            <span>{address}</span>
          </a>
        </address>
        <div className="footer-business-meta">
          <a className="footer-instagram" href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Follow Balaji Pooja Store Varthur on Instagram">
            <Instagram aria-hidden="true" />
            <span>balaji.pooja.store.varthur</span>
          </a>
          <p className="footer-gstin"><span>GSTIN</span><strong>29BSQPL2307A1ZW</strong></p>
        </div>
        <div className="footer-promises" aria-label="Store promises"><span><Banknote />Cash on Delivery</span><span><ShieldCheck />Secure checkout</span><span><MapPin />Local delivery</span></div>
      </section>
      <nav className="footer-navigation" aria-label="Footer navigation">
        <div><h3>Shop</h3><Link to="/#categories">Categories</Link><Link to="/products">All products</Link><Link to="/#reviews">Customer reviews</Link></div>
        <div><h3>Your account</h3><Link to="/orders">My orders</Link><Link to="/profile">Profile</Link><Link to="/addresses">Saved addresses</Link></div>
        <div><h3>Store</h3><Link to="/">Home</Link><Link to="/cart">Cart</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link>{validPhone && <a href={`tel:${phone}`}>Call support</a>}{validEmail && <a href={`mailto:${email}`}>Email support</a>}{settings?.supportHours && <small>{settings.supportHours}</small>}</div>
      </nav>
    </div>
    <div className="footer-bottom">
      <p>© {new Date().getFullYear()} {storeName}</p>
      <p className="footer-developer">Developed by <a href="https://www.mohitkumar2007.in" target="_blank" rel="noopener noreferrer">Mohit Kumar A</a></p>
      <p>Cash on Delivery · Secure website checkout</p>
    </div>
  </footer>;
}
