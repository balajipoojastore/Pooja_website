import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Heart, Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '../../components/common/ErrorState';
import { PageLoader } from '../../components/common/Loading';
import { ProductSection } from '../../components/storefront/ProductSection';
import { useProducts } from '../../hooks/useStoreData';
import { getProductBySlug } from '../../services/catalogService';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import { formatINR } from '../../utils/money';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading, error } = useQuery({ queryKey: ['product', slug], queryFn: () => getProductBySlug(slug) });
  const { data: categoryProducts = [] } = useProducts({ categorySlug: product?.category?.slug, publishedOnly: true });
  const line = useCartStore((state) => state.lines.find((item) => item.productId === product?.id));
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const wishlist = useUiStore((state) => state.wishlist);
  const toggleWishlist = useUiStore((state) => state.toggleWishlist);
  const addRecent = useUiStore((state) => state.addRecentlyViewed);

  useEffect(() => { if (product) addRecent(product.id); }, [product, addRecent]);
  useEffect(() => { if (product) document.title = `${product.name} | The Pooja House`; }, [product]);

  if (isLoading) return <PageLoader label="Opening product" />;
  if (error || !product) return <ErrorState message={error ? (error as Error).message : 'This product is unavailable or no longer published.'} />;

  const discount = product.mrp_paise > product.price_paise ? Math.round((1 - product.price_paise / product.mrp_paise) * 100) : 0;
  const isSaved = wishlist.includes(product.id);

  return <>
    <article className={`product-detail shell ${line ? 'product-detail--in-cart' : ''}`}>
      <Link className="back-link" to="/products"><ArrowLeft />Back to shop</Link>
      <div className="product-detail-grid">
        <div className="product-detail-image">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="image-placeholder">P</div>}{discount > 0 && <span className="discount-badge">Save {discount}%</span>}</div>
        <div className="product-detail-copy">
          <span className="eyebrow">{product.category?.name}</span><h1>{product.name}</h1><p className="sku">SKU {product.sku}</p>
          <div className="price price--detail"><strong>{formatINR(product.price_paise)}</strong>{discount > 0 && <del>{formatINR(product.mrp_paise)}</del>}<small>Inclusive of taxes</small></div>
          <p className="lead">{product.short_description}</p>
          <div className="product-facts"><span><Check />{product.in_stock ? product.stock_status : 'Out of stock'}</span><span><Truck />{product.delivery_label}</span><span><ShieldCheck />Cash on Delivery</span></div>
          <div className="purchase-row">
            <span className="purchase-row-price"><small>Price</small><strong>{formatINR(product.price_paise)}</strong></span>
            {!line ? <button className="button button--dark" disabled={!product.in_stock} onClick={() => add(product.id, 1)}>{product.in_stock ? 'Add to cart' : 'Currently unavailable'}</button> : <div className="quantity-stepper quantity-stepper--large"><button aria-label="Decrease quantity" onClick={() => setQuantity(product.id, line.quantity - 1)}><Minus /></button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(product.id, line.quantity + 1)}><Plus /></button></div>}
            <button className={`wish-detail ${isSaved ? 'is-active' : ''}`} onClick={() => toggleWishlist(product.id)}><Heart fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'Saved' : 'Save'}</button>
          </div>
          <div className="description"><h2>About this product</h2><p>{product.description}</p><dl><div><dt>Package</dt><dd>{product.unit_label}</dd></div><div><dt>Unit type</dt><dd>{product.unit_type}</dd></div><div><dt>Payment</dt><dd>Cash on Delivery</dd></div></dl></div>
        </div>
      </div>
    </article>
    <ProductSection eyebrow="You may also like" title="More from this collection" products={categoryProducts.filter((item) => item.id !== product.id).slice(0, 6)} link={`/category/${product.category?.slug}`} />
  </>;
}
