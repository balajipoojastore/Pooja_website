import { useParams } from 'react-router-dom';
import ProductsPage from './ProductsPage';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  return <ProductsPage categorySlug={slug} />;
}
