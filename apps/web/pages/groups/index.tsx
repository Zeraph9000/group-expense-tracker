import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient, ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronRight, LogOut, Plus, ReceiptText } from 'lucide-react';

type Group = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
};

const roleColors: Record<string, string> = {
  OWNER: 'bg-indigo-100 text-indigo-700',
  ADMIN: 'bg-violet-100 text-violet-700',
  MEMBER: 'bg-slate-100 text-slate-600',
};

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex items-center gap-3 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/5" />
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ user: me }, fetchedGroups] = await Promise.all([
          apiClient<{ user: User | null }>('/auth/me'),
          apiClient<Group[]>('/groups'),
        ]);
        if (!me) {
          router.replace('/login');
          return;
        }
        setUser(me);
        setGroups(fetchedGroups);
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  async function handleLogout() {
    await apiClient('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleCreateGroup(e: React.SyntheticEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const group = await apiClient<Group>('/groups', {
        method: 'POST',
        body: { name },
      });
      setGroups([{ ...group, role: 'OWNER' }, ...groups]);
      setName('');
      setOpen(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-indigo-600 tracking-tight">SplitTab</span>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-slate-500 hidden sm:block">
                {user.name ?? user.email}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 gap-1.5">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? '\u00a0' : groups.length === 0 ? 'No groups yet' : `${groups.length} group${groups.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-1.5" />}>
              <Plus size={15} /> New Group
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a new group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="group-name">Group name</Label>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sydney Trip"
                    required
                    autoFocus
                  />
                </div>
                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {createError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={createLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {createLoading ? 'Creating...' : 'Create group'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
            <ReceiptText className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="text-slate-700 font-medium">No groups yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create a group or accept an invite to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-150 group"
              >
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {group.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[group.role] ?? roleColors.MEMBER}`}>
                      {group.role}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
