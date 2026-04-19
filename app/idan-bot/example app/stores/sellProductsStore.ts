import { create } from 'zustand';
import { Product } from '@/types/products';

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

interface SellProductsState {
  appointmentId: string;
  customerName: string;
  cart: CartItem[];
  notes: string;
}

interface SellProductsActions {
  setContext: (appointmentId: string, customerName: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
  getCartQuantity: (productId: string) => number;
  totalItems: () => number;
  totalAmount: () => number;
}

export type SellProductsStore = SellProductsState & SellProductsActions;

const initialState: SellProductsState = {
  appointmentId: '',
  customerName: '',
  cart: [],
  notes: '',
};

export const useSellProductsStore = create<SellProductsStore>((set, get) => ({
  ...initialState,

  setContext: (appointmentId, customerName) => set({ appointmentId, customerName }),

  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((item) => item.product.id !== productId) };
      }
      return {
        cart: state.cart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      };
    }),

  updateItemPrice: (productId, price) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId ? { ...item, customPrice: price } : item
      ),
    })),

  setNotes: (notes) => set({ notes }),

  reset: () => set(initialState),

  getCartQuantity: (productId) => {
    const item = get().cart.find((item) => item.product.id === productId);
    return item ? item.quantity : 0;
  },

  totalItems: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),

  totalAmount: () =>
    get().cart.reduce(
      (sum, item) => sum + (item.customPrice ?? item.product.price) * item.quantity,
      0
    ),
}));
