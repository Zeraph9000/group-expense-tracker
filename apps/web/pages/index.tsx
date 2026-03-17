import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/apiClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const { user } = await apiClient<{ user: unknown }>('/auth/me');
        router.replace(user ? '/groups' : '/login');
      } catch {
        router.replace('/login');
      }
    }
    redirect();
  }, [router]);

  return null;
}
