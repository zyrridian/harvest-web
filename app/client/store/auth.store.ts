import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  checkAuth: async () => {
    set({ isLoading: true });
    const { data, error } = await apiClient<User>('/auth/me');
    
    if (data && !error) {
      set({ user: data, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('accessToken');
    }
  },
  
  logout: async () => {
    await apiClient('/auth/logout', { method: 'POST' });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  }
}));
