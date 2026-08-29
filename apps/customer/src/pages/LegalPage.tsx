import { Link } from 'react-router-dom';

type LegalDocument = 'terms' | 'privacy';

const effectiveDate = '29 August 2026';
const storeName = 'The Pooja House';

export default function LegalPage({ document }: { document: LegalDocument }) {
  if (document === 'privacy') {
    return <main className="legal-page shell">
      <header className="legal-hero"><span className="eyebrow">Your information</span><h1>Privacy Notice</h1><p>How {storeName} uses the information needed to provide customer accounts, delivery and order tracking.</p><small>Effective {effectiveDate}</small></header>
      <div className="legal-layout">
        <nav className="legal-navigation" aria-label="Legal documents"><Link to="/terms">Terms &amp; Conditions</Link><Link className="is-active" to="/privacy" aria-current="page">Privacy Notice</Link></nav>
        <article className="legal-document">
          <section><h2>1. Information we collect</h2><p>We collect the information you provide when creating an account or ordering: your name, verified email address, mobile number, delivery addresses, PIN code, optional map-location link, delivery instructions and order history. We also process limited technical information required for security, authentication and service reliability.</p></section>
          <section><h2>2. Why we use it</h2><p>We use this information to authenticate your account, check delivery availability, fulfil and track orders, provide customer support, prevent misuse, maintain transaction records and comply with applicable law. We do not use the optional map link for continuous location tracking.</p></section>
          <section><h2>3. Email OTP and phone numbers</h2><p>Supabase Auth generates and verifies email OTP codes. The website does not store the OTP you enter. Mobile numbers are checked for a valid Indian format but are not phone-verified because we do not use SMS OTP.</p></section>
          <section><h2>4. Service providers and access</h2><p>Information is processed using service providers needed to operate the store, including Supabase for authentication, database, storage and secure order functions. Authorized store staff may access order and delivery details only for fulfilment, support and administration. We do not sell customer personal information.</p></section>
          <section><h2>5. Retention and security</h2><p>Account, address and order records are retained for service, legal, accounting and fraud-prevention needs. We use access controls and row-level security, but no internet service can promise absolute security. Private tracking links must not be shared with people who should not see the order summary.</p></section>
          <section><h2>6. Your choices</h2><p>You can update your profile and saved addresses from your account. You may contact the store using the details published on this website to request help with access, correction, deletion or a privacy concern, subject to records we must retain by law.</p></section>
          <section><h2>7. Children</h2><p>The store is intended for customers legally capable of placing an order. A minor should use the service only with a parent or lawful guardian.</p></section>
          <section><h2>8. Updates</h2><p>We may update this notice when our services or legal obligations change. The current version and effective date will remain available on this page.</p></section>
        </article>
      </div>
    </main>;
  }

  return <main className="legal-page shell">
    <header className="legal-hero"><span className="eyebrow">Store agreement</span><h1>Terms &amp; Conditions</h1><p>Please read these terms before creating an account or placing a Cash on Delivery order with {storeName}.</p><small>Effective {effectiveDate}</small></header>
    <div className="legal-layout">
      <nav className="legal-navigation" aria-label="Legal documents"><Link className="is-active" to="/terms" aria-current="page">Terms &amp; Conditions</Link><Link to="/privacy">Privacy Notice</Link></nav>
      <article className="legal-document">
        <section><h2>1. Acceptance and eligibility</h2><p>By creating an account, signing in or placing an order, you agree to these terms and acknowledge the Privacy Notice. You must provide accurate information and be legally capable of entering into a purchase. If you act for another person, you confirm that you have their permission.</p></section>
        <section><h2>2. Customer accounts</h2><p>Customer access uses a one-time code sent to the supplied email address; no customer password is created. Keep your email account, OTP and session secure. You are responsible for activity performed through your authenticated session and should notify the store if you suspect unauthorized use.</p></section>
        <section><h2>3. Products, prices and availability</h2><p>We aim to describe and photograph products accurately, although packaging, colour and handmade characteristics may vary slightly. Cart contents do not reserve stock. Publication, stock, offers, delivery fees and final totals are verified when the order is submitted. If an obvious listing or pricing error is discovered, we may contact you, correct it or cancel the affected order.</p></section>
        <section><h2>4. Delivery area and address</h2><p>Orders are accepted only for active serviceable PIN codes and any minimum order shown at checkout. You must provide a complete, reachable delivery address and mobile number. An optional Google Maps link helps the delivery team locate the address but does not prove that the address is genuine. Delivery times are estimates and may be affected by availability, traffic, weather, festivals or circumstances outside reasonable control.</p></section>
        <section><h2>5. Cash on Delivery</h2><p>Cash on Delivery is the only payment method currently offered. The amount shown on the confirmed order is payable when the order is delivered. Please ensure that an authorized person is available to receive and pay for the order.</p></section>
        <section><h2>6. Order confirmation and cancellation</h2><p>Submitting checkout creates a placed order; it does not guarantee fulfilment until the store confirms it. We may cancel an order that cannot be fulfilled, contains invalid information, falls outside the delivery area, appears abusive or cannot be delivered safely. You may request cancellation using the contact details published on the website; requests made before dispatch will be considered promptly. Any rights available under applicable consumer law remain unaffected.</p></section>
        <section><h2>7. Final sale after delivery</h2><p>After an order has been delivered and accepted, the sale is final. We do not offer a replacement, return or refund after delivery. Please inspect the product identity, quantity, packaging and visible condition before accepting the delivery. This term does not exclude any rights or remedies that cannot lawfully be excluded under applicable consumer protection law.</p></section>
        <section><h2>8. Acceptable use</h2><p>Do not misuse the website, attempt unauthorized access, interfere with checkout or tracking, submit fraudulent orders, scrape protected customer data or use another person’s account or tracking link without permission.</p></section>
        <section><h2>9. Privacy</h2><p>Our <Link to="/privacy">Privacy Notice</Link> explains what customer information we process, why we use it and the choices available to you. Account information must not be used to seek CMS access; administrator access requires separate authorization.</p></section>
        <section><h2>10. Changes and applicable law</h2><p>We may update these terms for future use of the service. The version accepted with an existing order does not remove statutory consumer rights. These terms are governed by Indian law, and consumer remedies available under applicable law are not restricted by this agreement.</p></section>
      </article>
    </div>
  </main>;
}
