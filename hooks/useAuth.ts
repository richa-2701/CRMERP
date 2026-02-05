// frontend/hooks/useAuth.ts
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiUser } from '@/lib/api';

interface AuthHook {
  user: ApiUser | null;
  loading: boolean;
}

export function useAuth(): AuthHook {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This code runs on the client-side after the component mounts
    const userString = localStorage.getItem('user');
    
    if (userString) {
      try {
        const parsedUser: ApiUser = JSON.parse(userString);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        // If parsing fails, the user is not authenticated
        localStorage.removeItem('user');
        router.push('/login');
      }
    } else {
      // If no user is in storage, redirect to login
      router.push('/login');
    }

    setLoading(false);
  }, [router]);

  return { user, loading };
}