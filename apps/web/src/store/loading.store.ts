import { create } from 'zustand';

/**
 * Tracks the number of in-flight Axios requests.
 * Incremented by the request interceptor, decremented by both
 * the response and error interceptors so it always reaches 0.
 */
interface LoadingState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
