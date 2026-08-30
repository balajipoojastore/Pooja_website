export function canDownloadInvoiceForAuthenticatedUser(input: {
  userId: string | null;
  orderCustomerId: string | null;
  requestedByOrderId: boolean;
  isActiveAdmin: boolean;
}): boolean {
  if (!input.userId) return false;
  if (input.requestedByOrderId) return input.isActiveAdmin;
  return input.orderCustomerId === input.userId;
}
