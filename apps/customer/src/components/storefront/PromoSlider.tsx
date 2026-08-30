import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBanners, useProducts, useSiteSettings } from '../../hooks/useStoreData';
import shopImage from '../../assets/balaji-pooja-store-shop.webp';

const shopSlide = {
  id: 'balaji-pooja-store-shop',
  title: 'Sacred essentials, thoughtfully brought home.',
  subtitle: 'Authentic products for daily aarti and festive rituals.',
  label: 'The Pooja House',
  button_text: 'Shop now',
  button_link: '/products',
  image_url: shopImage,
};

const devotionalMantras = [
  { kannada: 'ಓಂ ನಮಃ ಶಿವಾಯ', english: 'Om Namah Shivaya' },
  { kannada: 'ಓಂ ಗಂ ಗಣಪತಯೇ ನಮಃ', english: 'Om Gam Ganapataye Namaha' },
  { kannada: 'ಓಂ ಶ್ರೀ ಮಹಾಲಕ್ಷ್ಮ್ಯೈ ನಮಃ', english: 'Om Shri Mahalakshmyai Namaha' },
  { kannada: 'ಶುಭಂ ಕರೋತಿ ಕಲ್ಯಾಣಂ', english: 'Shubham Karoti Kalyanam' },
  { kannada: 'ಕನಿಷ್ಠ ಆರ್ಡರ್ ₹599', english: 'Minimum order ₹599' },
];

function DevotionalMarquee() {
  return (
    <div className="devotional-marquee" role="note" aria-label="Devotional mantras in Kannada and English">
      <span className="sr-only">
        ಓಂ ನಮಃ ಶಿವಾಯ, Om Namah Shivaya. ಓಂ ಗಂ ಗಣಪತಯೇ ನಮಃ, Om Gam Ganapataye Namaha. ಕನಿಷ್ಠ ಆರ್ಡರ್ ₹599, Minimum order ₹599.
      </span>
      <div className="devotional-marquee__track" aria-hidden="true">
        {[false, true].map((duplicate) => (
          <div
            className={`devotional-marquee__group${duplicate ? ' devotional-marquee__group--duplicate' : ''}`}
            key={String(duplicate)}
          >
            {devotionalMantras.map((mantra) => (
              <span className="devotional-marquee__item" key={`${duplicate}-${mantra.english}`}>
                <b lang="kn">{mantra.kannada}</b>
                <span className="devotional-marquee__translation" lang="en">{mantra.english}</span>
                <i>✦</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromoSlider() {
  const { data: banners = [] } = useBanners(); const { data: products = [] } = useProducts({ publishedOnly: true, flag: 'is_festival_product' }); const { data: settings } = useSiteSettings();
  const fallback = [{ id: 'fallback', title: settings?.tagline ?? 'Sacred essentials, delivered fast', subtitle: 'Authentic products for daily aarti and festive rituals.', label: 'The Pooja House', button_text: 'Shop now', button_link: '/products', image_url: products[0]?.image_url }];
  const slides = [shopSlide, ...(banners.length ? banners : fallback)]; const [active, setActive] = useState(0); const rail = useRef<HTMLDivElement>(null);
  useEffect(() => { if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 3600); return () => window.clearInterval(timer); }, [slides.length]);
  useEffect(() => {
    rail.current?.scrollTo({ left: (rail.current.clientWidth + 12) * active, behavior: 'smooth' });
  }, [active]);
  return <section className="hero-strip">
    <DevotionalMarquee />
    <div ref={rail} className="promo-slider" aria-label="Promotional banners">
      {slides.map((slide, index) => {
        const isShopSlide = slide.id === shopSlide.id;
        return <article className={`promo-card ${isShopSlide ? 'promo-card--shop' : 'promo-card--campaign'}`} key={slide.id}>
          {!isShopSlide && <div className="promo-card__campaign-copy">
            <span className="label">{slide.label || 'Featured'}</span>
            <h1>{slide.title}</h1>
            <p>{slide.subtitle}</p>
            <Link className="promo-link" to={slide.button_link || '/products'}>{slide.button_text || 'Shop now'}</Link>
          </div>}
          {slide.image_url
            ? <>
              {!isShopSlide && <img className="promo-card__backdrop" src={slide.image_url} alt="" aria-hidden="true" />}
              <img className="promo-card__media" src={slide.image_url} alt={isShopSlide ? 'Balaji Pooja Store storefront in Varthur' : slide.title} loading={index === 0 ? 'eager' : 'lazy'} />
            </>
            : <div className="promo-placeholder">P</div>}
        </article>;
      })}
    </div>
    {slides.length > 1 && <div className="promo-dots" aria-label="Choose banner">{slides.map((slide, index) => <button key={slide.id} aria-label={`Show banner ${index + 1}`} className={index === active ? 'active' : ''} onClick={() => setActive(index)} />)}</div>}
  </section>;
}
