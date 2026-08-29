import { describe, expect, it } from 'vitest';
import {
  checkoutSchema,
  customerAddressUpdateSchema,
  customerProfileUpdateSchema,
  pincodeSchema,
  slugify,
} from './validation';

const validCheckout = { fullName: 'Pooja Sharma', mobile: '9876543210', alternateMobile: '', email: '', addressLine1: '12 Temple Road', addressLine2: '', landmark: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', deliveryInstructions: '', termsAccepted: true };

describe('customer validation', () => {
  it('accepts exactly six numeric PIN-code digits', () => {
    expect(pincodeSchema.safeParse('560001').success).toBe(true);
    expect(pincodeSchema.safeParse('56001').success).toBe(false);
    expect(pincodeSchema.safeParse('5600A1').success).toBe(false);
  });
  it('validates checkout contact, address and terms', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, mobile: '1234' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, termsAccepted: false }).success).toBe(false);
  });
  it('validates editable customer names and Indian mobile numbers', () => {
    expect(customerProfileUpdateSchema.safeParse({ fullName: 'Pooja Sharma', phone: '9876543210' }).success).toBe(true);
    expect(customerProfileUpdateSchema.safeParse({ fullName: 'P', phone: '9876543210' }).success).toBe(false);
    expect(customerProfileUpdateSchema.safeParse({ fullName: 'Pooja Sharma', phone: '1234567890' }).success).toBe(false);
  });
  it('validates editable delivery addresses and rejects malformed PIN codes', () => {
    const address = { label: 'Home', addressLine1: '12 Temple Road', addressLine2: '', landmark: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560087', locationUrl: '' };
    expect(customerAddressUpdateSchema.safeParse(address).success).toBe(true);
    expect(customerAddressUpdateSchema.safeParse({ ...address, pincode: '56008A' }).success).toBe(false);
    expect(customerAddressUpdateSchema.safeParse({ ...address, addressLine1: '12' }).success).toBe(false);
  });
  it('creates URL-safe slugs', () => expect(slugify('Brass & Copper Diya #1')).toBe('brass-and-copper-diya-1'));
});
