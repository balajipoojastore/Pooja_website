import { Banknote, ChevronRight, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';

export function ServiceBento() {
  const selectedPincode = useUiStore((state) => state.selectedPincode);
  const setPinGateOpen = useUiStore((state) => state.setPinGateOpen);

  return <section className="service-bento app-section" aria-labelledby="service-bento-title">
    <div className="section-title section-title--compact">
      <div>
        <span className="section-kicker">Made for everyday pooja</span>
        <h2 id="service-bento-title">Simple, trusted shopping</h2>
      </div>
    </div>
    <div className="service-bento-grid">
      <button className="service-bento-card service-bento-card--delivery" type="button" onClick={() => setPinGateOpen(true)}>
        <span className="service-bento-icon"><MapPin aria-hidden="true" /></span>
        <span className="service-bento-copy">
          <small>Delivery location</small>
          <strong>{selectedPincode ? `Delivering to ${selectedPincode}` : 'Check your PIN code'}</strong>
          <span>{selectedPincode ? 'Tap to change your location' : 'See if we deliver to your area'}</span>
        </span>
        <ChevronRight className="service-bento-arrow" aria-hidden="true" />
      </button>

      <article className="service-bento-card service-bento-card--cod">
        <span className="service-bento-icon"><Banknote aria-hidden="true" /></span>
        <span className="service-bento-copy">
          <small>Easy payment</small>
          <strong>Cash on Delivery</strong>
          <span>Pay when your order arrives</span>
        </span>
      </article>

      <Link className="service-bento-card service-bento-card--orders" to="/orders">
        <span className="service-bento-icon"><ShieldCheck aria-hidden="true" /></span>
        <span className="service-bento-copy">
          <small>Secure account</small>
          <strong>Track every order</strong>
          <span>Email OTP protected</span>
        </span>
        <ChevronRight className="service-bento-arrow" aria-hidden="true" />
      </Link>
    </div>
  </section>;
}
