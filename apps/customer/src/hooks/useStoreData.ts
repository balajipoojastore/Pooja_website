import { useQuery } from '@tanstack/react-query';
import { listBanners, listCategories, listProducts, listProductsByIds, listProductsPage, type ProductFilters } from '../services/catalogService';
import { getSiteSettings, listActiveOffers } from '../services/contentService';
import { checkPincode } from '../services/deliveryService';

export const useCategories = (includeInactive = false) => useQuery({
  queryKey: ['categories', includeInactive],
  queryFn: () => listCategories(includeInactive),
  staleTime: 5 * 60_000,
});

export const useProducts = (filters: ProductFilters = {}) => useQuery({
  queryKey: ['products', filters],
  queryFn: () => listProducts(filters),
  staleTime: 60_000,
});

export const useProductsPage = (filters: ProductFilters = {}, page = 1, pageSize = 24) => useQuery({
  queryKey: ['products-page', filters, page, pageSize],
  queryFn: () => listProductsPage(filters, page, pageSize),
  staleTime: 60_000,
});

export const useProductsByIds = (ids: string[]) => useQuery({
  queryKey: ['products-by-id', [...ids].sort()],
  queryFn: () => listProductsByIds(ids),
  enabled: ids.length > 0,
  staleTime: 60_000,
});

export const useBanners = () => useQuery({ queryKey: ['banners'], queryFn: listBanners, staleTime: 60_000 });
export const useSiteSettings = () => useQuery({ queryKey: ['site-settings'], queryFn: getSiteSettings, staleTime: 5 * 60_000 });
export const useOffers = () => useQuery({ queryKey: ['offers'], queryFn: listActiveOffers, staleTime: 60_000 });
export const useDeliveryArea = (pincode: string | null) => useQuery({
  queryKey: ['delivery-area', pincode],
  queryFn: () => checkPincode(pincode!),
  enabled: Boolean(pincode && /^\d{6}$/.test(pincode)),
  staleTime: 5 * 60_000,
});
