import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth';
import axios, { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on initial mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate the stored user data
        if (parsedUser?.username && parsedUser?.sessionId && parsedUser?.csrfToken) {
          setUser(parsedUser);
          // Set username cookie
          document.cookie = `username=${encodeURIComponent(parsedUser.username)}; path=/`;
        } else {
          // If stored data is invalid, clear it
          localStorage.removeItem('user');
        }
      } catch (error) {
        // If there's an error parsing the stored data, clear it
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password
      }, {
        withCredentials: true // Penting untuk cookie
      });

      if (!response.data.success) {
        throw new Error('Login failed');
      }

      const userData = response.data.user;

      // Validate user data before storing
      if (!userData?.username || !userData?.sessionId || !userData?.csrfToken) {
        throw new Error('Invalid user data received');
      }

      // Set username cookie
      document.cookie = `username=${encodeURIComponent(userData.username)}; path=/`;

      setUser(userData);
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || 'Authentication failed');
      }
      throw new Error('Authentication failed');
    }
  };

  const signOut = async () => {
    setUser(null);
    // Clear user data from localStorage and cookies
    localStorage.removeItem('user');
    document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  };

  return (
      <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
        {!loading && children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}