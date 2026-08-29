import { useEffect, useMemo, useRef } from 'react';
import { ErrorState } from '../../components/common/ErrorState';
import { ProductGridSkeleton } from '../../components/common/Loading';
import { CategoryRail } from '../../components/storefront/CategoryRail';
import { ProductSection } from '../../components/storefront/ProductSection';
import { PromoSlider } from '../../components/storefront/PromoSlider';
import { Reviews } from '../../components/storefront/Reviews';
import { ServiceBento } from '../../components/storefront/ServiceBento';
import { useProducts, useSiteSettings } from '../../hooks/useStoreData';
import { useUiStore } from '../../stores/uiStore';

export default function HomePage() {
  const devotionalStageRef = useRef<HTMLDivElement>(null);
  const { data: products = [], isLoading, error, refetch } = useProducts({ publishedOnly: true });
  const { data: settings } = useSiteSettings();
  const recentIds = useUiStore((state) => state.recentlyViewed);
  const sections = useMemo(() => ({
    popular: products.filter((product) => product.is_popular).slice(0, 8),
    festival: products.filter((product) => product.is_festival_product).slice(0, 7),
    best: products.filter((product) => product.is_best_seller).slice(0, 8),
    recommended: products.filter((product) => product.is_recommended).slice(0, 8),
    recent: recentIds.map((id) => products.find((product) => product.id === id)).filter(Boolean).slice(0, 8),
    all: products.slice(0, 12),
  }), [products, recentIds]);

  useEffect(() => {
    const stage = devotionalStageRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!stage || reducedMotion.matches) return;

    let animationFrame = 0;
    const updateBackgroundPosition = () => {
      animationFrame = 0;
      const bounds = stage.getBoundingClientRect();
      const travel = window.innerHeight + bounds.height;
      const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / travel));
      stage.style.setProperty('--home-bg-shift', `${Math.round((progress - 0.5) * 72)}px`);
    };
    const requestUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateBackgroundPosition);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <div className="app-main">
    <div className="home-devotional-stage" ref={devotionalStageRef}>
      <div className="home-devotional-stage__inner">
        <PromoSlider />
        <CategoryRail />
      </div>
    </div>
    <ServiceBento />
    {settings?.generalAnnouncement && <aside className="general-store-announcement app-section" role="note">{settings.generalAnnouncement}</aside>}
    <div className={isLoading ? 'product-section' : undefined}><div className={isLoading ? 'shell' : undefined}>
      <ProductGridSkeleton loading={isLoading} count={6} name="customer-home-products">
        {error ? <ErrorState message={(error as Error).message} retry={() => void refetch()} /> : !isLoading ? <>
          <ProductSection index="02" eyebrow="Loved right now" title="Popular essentials" description="Everyday favourites chosen by our community." products={sections.popular} />
          <ProductSection index="03" eyebrow="Festival collection" title={settings?.festivalHeading ?? 'Auspicious picks'} description={settings?.festivalDescription} products={sections.festival} tone="festival" />
          <ProductSection index="04" eyebrow="Time-honoured picks" title="Best sellers" products={sections.best} />
          <ProductSection index="05" eyebrow="From us, for you" title="Recommended" products={sections.recommended} />
          <ProductSection index="06" title="Recently viewed" products={sections.recent as typeof products} />
          <ProductSection index="08" eyebrow="The complete catalogue" title="All pooja essentials" description="A considered range, ready for your home." products={sections.all} />
        </> : null}
      </ProductGridSkeleton>
    </div></div>
    <Reviews />
  </div>;
}
