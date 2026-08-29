import { z } from 'zod';

export const pincodeSchema = z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code.');
export const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.');

export const emailSchema = z.string().trim().email('Enter a valid email address.');
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100),
  email: emailSchema,
  phone: mobileSchema,
  addressLine1: z.string().trim().min(5, 'Enter a complete address.').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter your city.').max(80),
  state: z.string().trim().min(2, 'Enter your state.').max(80),
  pincode: pincodeSchema,
  locationUrl: z.union([z.literal(''), z.string().url()]).optional(),
  termsAccepted: z.boolean().refine(Boolean, 'Accept the terms and privacy notice to continue.'),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const customerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100),
  phone: mobileSchema,
});

export const customerAddressUpdateSchema = z.object({
  label: z.string().trim().min(1, 'Enter an address label.').max(30),
  addressLine1: z.string().trim().min(5, 'Enter a complete address.').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter your city.').max(80),
  state: z.string().trim().min(2, 'Enter your state.').max(80),
  pincode: pincodeSchema,
  locationUrl: z.union([z.literal(''), z.string().url('Enter a valid map location.')]).optional(),
});

export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;
export type CustomerAddressUpdateInput = z.infer<typeof customerAddressUpdateSchema>;

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100),
  mobile: mobileSchema,
  alternateMobile: z.union([z.literal(''), mobileSchema]).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
  addressLine1: z.string().trim().min(5, 'Enter a complete address.').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter your city.').max(80),
  state: z.string().trim().min(2, 'Enter your state.').max(80),
  pincode: pincodeSchema,
  deliveryInstructions: z.string().trim().max(500).optional(),
  termsAccepted: z.boolean().refine((value) => value, 'Accept the store terms to continue.'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
