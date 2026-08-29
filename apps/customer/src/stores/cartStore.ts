import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '../types/domain';

interface CartState {
  lines: CartLine[];
  isDrawerOpen: boolean;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isDrawerOpen: false,
      add: (productId, quantity = 1) => set((state) => {
        const existing = state.lines.find((line) => line.productId === productId);
        return {
          lines: existing
            ? state.lines.map((line) => line.productId === productId
                ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
                : line)
            : [...state.lines, { productId, quantity: Math.max(1, Math.min(99, quantity)) }],
        };
      }),
      setQuantity: (productId, quantity) => set((state) => ({
        lines: quantity <= 0
          ? state.lines.filter((line) => line.productId !== productId)
          : state.lines.map((line) => line.productId === productId
              ? { ...line, quantity: Math.min(99, quantity) }
              : line),
      })),
      remove: (productId) => set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
      clear: () => set({ lines: [], isDrawerOpen: false }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    { name: 'pooja-house-cart', partialize: (state) => ({ lines: state.lines }) },
  ),
);
