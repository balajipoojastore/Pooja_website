import { z } from 'zod';

export const orderStatuses = ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export const trackingTokenSchema = z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid tracking token.');
export const orderNumberSchema = z.string().regex(/^TPH-[0-9]{8}-[0-9]{6}$/, 'Invalid order number.');
export const transitionRequestSchema = z.object({
  orderId: z.string().uuid(),
  toStatus: orderStatusSchema,
  note: z.string().trim().max(500).optional(),
});
