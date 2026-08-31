import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ProductGridSkeleton } from '../../components/common/Loading';
import { ProductCard } from '../../components/storefront/ProductCard';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useCategories, useProductsPage } from '../../hooks/useStoreData';
import { SEO_STORE_NAME, usePageMetadata } from '../../lib/seo';

const PAGE_SIZE = 16;

export default function ProductsPage({ categorySlug }: { categorySlug?: string }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(categorySlug ?? params.get('category') ?? '');
  const [inStock, setInStock] = useState(params.get('stock') === '1');
  const debounced = useDebouncedValue(search);
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const { data: categories = [] } = useCategories();
  const query = useProductsPage({ search: debounced, categorySlug: category || undefined, inStock, publishedOnly: true }, page, PAGE_SIZE);
  const products = query.data?.products ?? [];

  useEffect(() => {
    const next = new URLSearchParams();
    if (debounced) next.set('q', debounced);
    if (category) next.set('category', category);
    if (inStock) next.set('stock', '1');
    if (page > 1) next.set('page', String(page));
    setParams(next, { replace: true });
  }, [debounced, category, inStock, page, setParams]);

  const resetPage = () => setParams((current) => { const next = new URLSearchParams(current); next.delete('page'); return next; }, { replace: true });
  const changePage = (nextPage: number) => setParams((current) => { const next = new URLSearchParams(current); if (nextPage <= 1) next.delete('page'); else next.set('page', String(nextPage)); return next; });
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryName = categories.find((item) => item.slug === category)?.name;

  usePageMetadata({
    title: `${categoryName ?? 'Pooja Products'} | ${SEO_STORE_NAME}`,
    description: categoryName
      ? `Shop ${categoryName} for daily rituals, festivals and celebrations from Balaji Pooja Store.`
      : 'Shop authentic pooja essentials, incense, brass items, diyas and more from Balaji Pooja Store.',
    pathname: categorySlug ? `/category/${categorySlug}` : '/products',
  });

  return <div className="listing-page shell">
    <header className="page-heading"><span className="eyebrow">Pooja essentials</span><h1>{categoryName ?? 'All products'}</h1><p>{categoryName ? `Shop ${categoryName.toLowerCase()} for everyday worship and celebrations.` : 'Fast, dependable access to authentic pooja essentials.'}</p></header>
    <div className="filter-bar"><label className="listing-search"><span>Search</span><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Name, SKU, description or category" />{search && <button type="button" onClick={() => { setSearch(''); resetPage(); }} aria-label="Clear search"><X /></button>}</label><label><span>Category</span><select value={category} onChange={(event) => { setCategory(event.target.value); resetPage(); }}><option value="">All categories</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label><label className="stock-filter"><input type="checkbox" checked={inStock} onChange={(event) => { setInStock(event.target.checked); resetPage(); }} /><SlidersHorizontal />In stock only</label></div>
    <div className="result-meta"><span>{query.isLoading ? 'Finding products…' : `${total} ${total === 1 ? 'product' : 'products'}`}</span>{(search || category || inStock) && <button onClick={() => { setSearch(''); setCategory(categorySlug ?? ''); setInStock(false); changePage(1); }}>Clear filters</button>}</div>
    <ProductGridSkeleton loading={query.isLoading} count={8} name="customer-catalog-products">
      {query.error ? <ErrorState message={(query.error as Error).message} retry={() => void query.refetch()} /> : products.length ? <><div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div><nav className="pagination" aria-label="Product pages"><button disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</button></nav></> : !query.isLoading ? <EmptyState title="No products found" message="Try a different phrase or remove one of the filters." /> : null}
    </ProductGridSkeleton>
  </div>;
}
