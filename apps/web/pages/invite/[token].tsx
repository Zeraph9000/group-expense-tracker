import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient, ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function InvitePage() {
  const router = useRouter();
  const token = router.query.token as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function checkAuth() {
      try {
        const { user } = await apiClient<{ user: unknown }>('/auth/me');
        if (!user) {
          router.replace(`/login?redirect=/invite/${token}`);
          return;
        }
        setReady(true);
      } catch {
        router.replace(`/login?redirect=/invite/${token}`);
      }
    }
    checkAuth();
  }, [token, router]);

  async function handleJoin() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiClient<{ ok: boolean; groupId: string }>(
        `/invites/${token}/accept`,
        { method: 'POST' },
      );
      router.push(`/groups/${result.groupId}`);
    } catch (err) {
      if (err instanceof ApiError && err.error === 'INVALID_ROLE') {
        router.push('/groups');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.');
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">SplitTab</h1>
          <p className="text-slate-500 mt-1 text-sm">Group expense tracking, simplified</p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6 px-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
              <Users size={26} className="text-indigo-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800">You've been invited</h2>
              <p className="text-sm text-slate-500 mt-1">
                Click below to join the group and start splitting expenses.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleJoin}
              disabled={loading || !ready}
            >
              {loading ? 'Joining...' : 'Join group'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
