import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useCategories } from '../../hooks/useStoreData';
import { ProductSkeletons } from '../common/Loading';

export function CategoryRail() {
  const { data: categories = [], isLoading } = useCategories();
  if (isLoading) return <section className="app-section"><ProductSkeletons count={4} /></section>;
  return <section id="categories" className="app-section category-bento-section"><div className="section-title"><div><span className="section-kicker">Quick shop</span><h2>Shop by category</h2></div><Link to="/products">View all</Link></div><div className="category-rail category-bento-grid">{categories.map((category, index) => <Link className="category-card category-bento-card" key={category.id} to={`/category/${category.slug}`}><span className="category-bento-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="category-bento-copy"><h3>{category.name}</h3><small>Explore essentials</small></span><ArrowUpRight aria-hidden="true" /></Link>)}</div></section>;
}
