import { create } from 'zustand';
import { apiClient } from '../api/client';

interface CartState {
  count: number;
  fetchCount: () => Promise<void>;
  setCount: (count: number) => void;
  increment: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  count: 0,
  
  fetchCount: async () => {
    const { data } = await apiClient<any>('/cart');
    if (data && data.items) {
      // Unique products count
      const uniqueProducts = new Set(
        data.items.map((item: any) => item.product?.product_id || item.productId)
      );
      set({ count: uniqueProducts.size });
    } else {
      set({ count: 0 });
    }
  },
  
  setCount: (count) => set({ count }),
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
