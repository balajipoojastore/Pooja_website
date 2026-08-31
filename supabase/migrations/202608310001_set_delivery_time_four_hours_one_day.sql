-- Keep the storefront delivery expectation consistent for every catalog product.
UPDATE public.products
SET delivery_label = '4 hours-1 day'
WHERE delivery_label IS DISTINCT FROM '4 hours-1 day';
