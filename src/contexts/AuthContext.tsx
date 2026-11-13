"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PublicUser } from '@/types/auth';

interface RegisterResponse {
  success: boolean;
  needVerification?: boolean;
  message: string;
  data?: {
    userId?: string;
    method?: 'email' | 'phone';
    target?: string;
    user?: PublicUser;
    recoveryKeys?: string[];
  };
}

interface RegisterData {
  contact?: string;
  registerMethod?: 'email' | 'phone';
  email?: string;
  phone?: string;
  password: string;
  username: string;
  full_name: string;
}

interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyAccount: (data: { userId?: string; email?: string; phone?: string; otp: string }) => Promise<any>;
  resendActivationOtp: (data: { userId?: string; email?: string; phone?: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login function
  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error: any = new Error(data.message || 'Đăng nhập thất bại');
        error.notVerified = data.notVerified;
        error.data = data.data;
        throw error;
      }

      if (data.success && data.data) {
        setUser(data.data.user);
        setToken(data.data.token);
      }
      
      // Refresh to get full user data
      await checkAuth();
      return data;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (registerData: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      return data;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify account with OTP
  const verifyAccount = async (payload: { userId?: string; email?: string; phone?: string; otp: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Xác thực tài khoản thất bại');
      }

      if (data.success && data.data?.user) {
        setUser(data.data.user);
        setToken(data.data.token || null);
      }

      await checkAuth();
      return data;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const resendActivationOtp = async (payload: { userId?: string; email?: string; phone?: string }) => {
    const response = await fetch('/api/auth/resend-activation-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Không thể gửi lại mã OTP');
    }
    return data;
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setToken(null);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    verifyAccount,
    resendActivationOtp,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
