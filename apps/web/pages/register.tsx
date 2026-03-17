import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/apiClient';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      router.push('/groups');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create an account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Jane Smith"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jane@example.com"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="8+ characters, letters and numbers"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const cookie = ctx.req.headers.cookie ?? '';
  try {
    const { user } = await apiClient<{ user: unknown }>('/auth/me', { cookie });
    if (user) return { redirect: { destination: '/groups', permanent: false } };
  } catch {}
  return { props: {} };
};
