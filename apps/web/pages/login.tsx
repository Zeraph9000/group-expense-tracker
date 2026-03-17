import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient('/auth/login', {
        method: 'POST',
        body: { email, password },
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
    <AuthLayout title="Sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Your password"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-indigo-600 hover:underline font-medium">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
