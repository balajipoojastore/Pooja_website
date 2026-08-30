import { describe, expect, it } from 'vitest';
import { canDownloadInvoiceForAuthenticatedUser } from './authorization';

describe('invoice authenticated-user authorization', () => {
  it('allows a customer to download only their own order-number invoice', () => {
    expect(canDownloadInvoiceForAuthenticatedUser({ userId: 'customer-a', orderCustomerId: 'customer-a', requestedByOrderId: false, isActiveAdmin: false })).toBe(true);
    expect(canDownloadInvoiceForAuthenticatedUser({ userId: 'customer-a', orderCustomerId: 'customer-b', requestedByOrderId: false, isActiveAdmin: false })).toBe(false);
  });

  it('does not elevate an administrator on the customer order-number path', () => {
    expect(canDownloadInvoiceForAuthenticatedUser({ userId: 'admin', orderCustomerId: 'customer-b', requestedByOrderId: false, isActiveAdmin: true })).toBe(false);
  });

  it('allows active administrators only on the admin order-id path', () => {
    expect(canDownloadInvoiceForAuthenticatedUser({ userId: 'admin', orderCustomerId: 'customer-b', requestedByOrderId: true, isActiveAdmin: true })).toBe(true);
    expect(canDownloadInvoiceForAuthenticatedUser({ userId: 'customer-a', orderCustomerId: 'customer-a', requestedByOrderId: true, isActiveAdmin: false })).toBe(false);
  });
});
