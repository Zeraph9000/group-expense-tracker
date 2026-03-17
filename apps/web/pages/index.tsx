import { GetServerSideProps } from 'next';
import { apiClient } from '@/lib/apiClient';

export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const cookie = ctx.req.headers.cookie ?? '';

  try {
    const { user } = await apiClient<{ user: unknown }>('/auth/me', { cookie });
    if (user) {
      return { redirect: { destination: '/groups', permanent: false } };
    }
  } catch {}

  return { redirect: { destination: '/login', permanent: false } };
};
