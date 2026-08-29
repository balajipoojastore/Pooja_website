import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  selectedPincode: string | null;
  wishlist: string[];
  recentlyViewed: string[];
  pinGateOpen: boolean;
  quickViewProductId: string | null;
  setPincode: (value: string | null) => void;
  toggleWishlist: (productId: string) => void;
  addRecentlyViewed: (productId: string) => void;
  setPinGateOpen: (open: boolean) => void;
  setQuickViewProductId: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedPincode: null,
      wishlist: [],
      recentlyViewed: [],
      pinGateOpen: true,
      quickViewProductId: null,
      setPincode: (selectedPincode) => set({ selectedPincode, pinGateOpen: !selectedPincode }),
      toggleWishlist: (productId) => set((state) => ({
        wishlist: state.wishlist.includes(productId)
          ? state.wishlist.filter((id) => id !== productId)
          : [productId, ...state.wishlist].slice(0, 100),
      })),
      addRecentlyViewed: (productId) => set((state) => ({
        recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 12),
      })),
      setPinGateOpen: (pinGateOpen) => set({ pinGateOpen }),
      setQuickViewProductId: (quickViewProductId) => set({ quickViewProductId }),
    }),
    {
      name: 'pooja-house-ui',
      partialize: (state) => ({
        selectedPincode: state.selectedPincode,
        wishlist: state.wishlist,
        recentlyViewed: state.recentlyViewed,
        pinGateOpen: !state.selectedPincode,
      }),
    },
  ),
);
