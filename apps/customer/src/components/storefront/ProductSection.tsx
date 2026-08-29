import { Link } from 'react-router-dom';
import type { Product } from '../../types/domain';
import { ProductCard } from './ProductCard';

export function ProductSection({ title, description, products, link = '/products', tone = 'plain' }: { index?: string; eyebrow?: string; title: string; description?: string; products: Product[]; link?: string; tone?: 'plain' | 'festival' }) {
  if (!products.length) return null;
  if (tone === 'festival') { const featured = products[0]!; return <section className="app-section"><div className="section-title"><h2>{title}</h2><Link to={link}>Explore</Link></div><Link className="festival-card" to={`/product/${featured.slug}`}><div><span className="label">Festival collection</span><h2>{featured.name}</h2><p>{description || featured.short_description}</p><span className="primary-btn">Shop now</span></div>{featured.image_url ? <img src={featured.image_url} alt={featured.name} /> : <div className="image-placeholder">P</div>}</Link>{products.length > 1 && <div className="product-rail festival-rail">{products.slice(1).map((product) => <ProductCard product={product} key={product.id} />)}</div>}</section>; }
  return <section className="app-section"><div className="section-title"><h2>{title}</h2><Link to={link}>See all</Link></div>{description && <p className="section-description">{description}</p>}<div className="product-rail">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div></section>;
}
