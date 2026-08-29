import { Skeleton } from 'boneyard-js/react';
import type { ReactNode } from 'react';
import { ProductCard } from '../storefront/ProductCard';
import type { Product } from '../../types/domain';

const fixtureProduct: Product = {
  id: '00000000-0000-4000-8000-000000000001',
  category_id: '00000000-0000-4000-8000-000000000002',
  category: { id: '00000000-0000-4000-8000-000000000002', name: 'Agarbatti & Dhoop', slug: 'agarbatti-dhoop' },
  sku: 'TPH-SKELETON',
  name: 'Traditional pooja essential',
  slug: 'traditional-pooja-essential',
  unit_type: 'pack',
  unit_label: '1 pack',
  short_description: 'Authentic essentials for your daily pooja',
  description: null,
  mrp_paise: 12900,
  price_paise: 9900,
  primary_image_path: null,
  image_url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  in_stock: true,
  stock_status: 'In stock',
  delivery_label: 'Delivery today',
  is_popular: true,
  is_best_seller: false,
  is_recommended: false,
  is_festival_product: false,
  is_published: true,
  sort_order: 1,
};

function ProductGridFixture({ count }: { count: number }) {
  return <div className="product-grid">{Array.from({ length: count }, (_, index) => (
    <ProductCard product={{ ...fixtureProduct, id: `${fixtureProduct.id.slice(0, -1)}${(index % 9) + 1}` }} key={index} />
  ))}</div>;
}

function ProductSkeletonFallback({ count }: { count: number }) {
  return <div className="product-grid">{Array.from({ length: count }, (_, index) => (
    <div className="product-skeleton" aria-hidden="true" key={index}><span /><i /><i /></div>
  ))}</div>;
}

export function PageLoader({ label = 'Loading The Pooja House' }: { label?: string }) {
  return <div className="page-loader" role="status" aria-live="polite"><span className="loader-mark" aria-hidden="true">ॐ</span><p>{label}…</p></div>;
}

interface ProductGridSkeletonProps {
  children: ReactNode;
  loading: boolean;
  count?: number;
  name?: string;
}

export function ProductGridSkeleton({ children, loading, count = 6, name = `customer-product-grid-${count}` }: ProductGridSkeletonProps) {
  const fixture = <ProductGridFixture count={count} />;
  return <div className="boneyard-loading-region" role={loading ? 'status' : undefined} aria-live={loading ? 'polite' : undefined} aria-label={loading ? 'Loading products' : undefined}>
    <Skeleton
      name={name}
      loading={loading}
      animate="shimmer"
      stagger={35}
      transition={180}
      color="#f1dfcf"
      select="viewport"
      className="boneyard-product-grid"
      fixture={fixture}
      fallback={<ProductSkeletonFallback count={count} />}
    >
      {loading ? fixture : children}
    </Skeleton>
  </div>;
}

export function ProductSkeletons({ count = 6 }: { count?: number }) {
  return <ProductGridSkeleton loading count={count}>{null}</ProductGridSkeleton>;
}
