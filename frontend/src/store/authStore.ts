import { create } from "zustand";
import api from "../services/api";

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  user: null,
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: true,

  login: async (token: string) => {
    localStorage.setItem("token", token);
    set({ token, isAuthenticated: true, isLoading: true });
    // axios interceptor will pick up the token from localStorage
    try {
      const response = await api.get("/auth/profile");
      set({ user: response.data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch profile during login:", error);
      get().logout();
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    const token = get().token;
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const response = await api.get("/auth/profile");
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Clean up if token is expired or invalid
      get().logout();
    }
  },

  initialize: async () => {
    const token = get().token;
    if (token) {
      await get().fetchProfile();
    } else {
      set({ isLoading: false });
    }
  }
}));
