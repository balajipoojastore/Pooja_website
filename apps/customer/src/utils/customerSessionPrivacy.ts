import type { QueryClient } from '@tanstack/react-query';

/** Remove all in-memory server data whenever the authenticated identity changes. */
export function clearCustomerSessionCache(queryClient: QueryClient): void {
  queryClient.clear();
}
