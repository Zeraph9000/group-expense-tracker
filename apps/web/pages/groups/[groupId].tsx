import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { apiClient, ApiError } from '@/lib/apiClient';
import { CheckCircle2, Link2, Plus, ReceiptText, Handshake, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type Member = {
  userId: string;
  name: string | null;
  email: string;
  balanceCents: number;
};

type Expense = {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  paidBy: { id: string; name: string | null; email: string };
  splits: { userId: string; amountCents: number; user: { id: string; name: string | null; email: string } }[];
};

type Settlement = {
  id: string;
  amountCents: number;
  currency: string;
  note: string | null;
  createdAt: string;
  fromUser: { id: string; name: string | null; email: string };
  toUser: { id: string; name: string | null; email: string };
};

type Transfer = {
  fromUserId: string;
  fromName: string | null;
  fromEmail: string;
  toUserId: string;
  toName: string | null;
  toEmail: string;
  amountCents: number;
};

type PageData = {
  groupName: string;
  userRole: string;
  expenses: Expense[];
  settlements: Settlement[];
  members: Member[];
  transfers: Transfer[];
};

type Props = {
  groupId: string;
  currentUserId: string;
};

type Tab = 'expenses' | 'balances' | 'settlements';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function displayName(user: { name: string | null; email: string }): string {
  return user.name ?? user.email;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GroupDetailPage({ groupId, currentUserId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('expenses');
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState(currentUserId);
  const [expError, setExpError] = useState('');
  const [expLoading, setExpLoading] = useState(false);

  // Settlement form
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [stlFrom, setStlFrom] = useState(currentUserId);
  const [stlTo, setStlTo] = useState('');
  const [stlAmount, setStlAmount] = useState('');
  const [stlNote, setStlNote] = useState('');
  const [stlError, setStlError] = useState('');
  const [stlLoading, setStlLoading] = useState(false);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [groups, expenses, settlements, settleData] = await Promise.all([
        apiClient<Array<{ id: string; name: string; role: string }>>('/groups'),
        apiClient<Expense[]>(`/groups/${groupId}/expenses`),
        apiClient<Settlement[]>(`/groups/${groupId}/settlements`),
        apiClient<{ balances: Member[]; transfers: Transfer[] }>(`/groups/${groupId}/settle/suggestions`),
      ]);

      const group = groups.find((g) => g.id === groupId);
      if (!group) {
        router.replace('/groups');
        return;
      }

      setData({
        groupName: group.name,
        userRole: group.role,
        expenses,
        settlements,
        members: settleData.balances,
        transfers: settleData.transfers,
      });
    } catch {
      router.replace('/groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [groupId]);

  async function handleAddExpense(e: React.SyntheticEvent) {
    e.preventDefault();
    setExpError('');
    setExpLoading(true);
    try {
      await apiClient(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: {
          description: expDesc,
          amountCents: Math.round(parseFloat(expAmount) * 100),
          paidById: expPaidBy,
        },
      });
      setExpDesc('');
      setExpAmount('');
      setExpPaidBy(currentUserId);
      setExpenseOpen(false);
      fetchData();
    } catch (err) {
      setExpError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setExpLoading(false);
    }
  }

  async function handleRecordSettlement(e: React.SyntheticEvent) {
    e.preventDefault();
    setStlError('');
    setStlLoading(true);
    try {
      await apiClient(`/groups/${groupId}/settlements`, {
        method: 'POST',
        body: {
          fromUserId: stlFrom,
          toUserId: stlTo,
          amountCents: Math.round(parseFloat(stlAmount) * 100),
          note: stlNote || undefined,
        },
      });
      setStlFrom(currentUserId);
      setStlTo('');
      setStlAmount('');
      setStlNote('');
      setSettlementOpen(false);
      fetchData();
    } catch (err) {
      setStlError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setStlLoading(false);
    }
  }

  async function handleGetInvite() {
    setInviteLoading(true);
    try {
      const result = await apiClient<{ token: string; expiresAt: string }>(
        `/groups/${groupId}/invites`,
        { method: 'POST' },
      );
      setInviteToken(result.token);
      setInviteOpen(true);
    } catch {}
    finally {
      setInviteLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openFromSuggestion(t: Transfer) {
    setStlFrom(t.fromUserId);
    setStlTo(t.toUserId);
    setStlAmount((t.amountCents / 100).toFixed(2));
    setStlNote('');
    setStlError('');
    setSettlementOpen(true);
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  const isOwnerOrAdmin = data?.userRole === 'OWNER' || data?.userRole === 'ADMIN';
  const members = data?.members ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/groups')}
              className="flex items-center text-slate-400 hover:text-slate-600 text-sm transition-colors"
            >
              <ChevronLeft size={16} /> Groups
            </button>
            <span className="text-slate-200">/</span>
            {data ? (
              <h1 className="text-sm font-semibold text-slate-800">{data.groupName}</h1>
            ) : (
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            )}
          </div>
          {isOwnerOrAdmin && (
            <Button variant="outline" size="sm" onClick={handleGetInvite} disabled={inviteLoading}>
              {inviteLoading ? '...' : <><Link2 size={14} className="mr-1.5" />Invite</>}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex">
          <button className={tabCls('expenses')} onClick={() => setTab('expenses')}>Expenses</button>
          <button className={tabCls('balances')} onClick={() => setTab('balances')}>Balances</button>
          <button className={tabCls('settlements')} onClick={() => setTab('settlements')}>Settlements</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* ── LOADING SKELETONS ── */}
        {loading && <SkeletonList />}

        {/* ── EXPENSES TAB ── */}
        {!loading && tab === 'expenses' && data && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                {data.expenses.length} expense{data.expenses.length !== 1 ? 's' : ''}
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => setExpenseOpen(true)}>
                <Plus size={15} /> Add Expense
              </Button>
            </div>

            {data.expenses.length === 0 ? (
              <EmptyState icon={<ReceiptText size={36} className="text-slate-300" />} title="No expenses yet" sub="Add the first expense for this group." />
            ) : (
              <div className="space-y-3">
                {data.expenses.map((exp) => (
                  <Card key={exp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <div>
                        <p className="font-medium text-slate-800">{exp.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Paid by {displayName(exp.paidBy)} · {new Date(exp.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-700 tabular-nums">{fmt(exp.amountCents)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BALANCES TAB ── */}
        {!loading && tab === 'balances' && data && (
          <div className="space-y-8">
            <section>
              <SectionHeading>Net Balances</SectionHeading>
              <div className="space-y-2">
                {data.members.map((m) => (
                  <Card key={m.userId}>
                    <CardContent className="flex items-center justify-between py-3 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name ?? m.email} />
                        <p className="text-sm font-medium text-slate-700">{m.name ?? m.email}</p>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${
                        m.balanceCents > 0 ? 'text-emerald-600' :
                        m.balanceCents < 0 ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {m.balanceCents === 0 ? 'settled up' :
                         m.balanceCents > 0 ? `+${fmt(m.balanceCents)}` :
                         `-${fmt(m.balanceCents)}`}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {data.transfers.length > 0 && (
              <section>
                <SectionHeading>Suggested Payments</SectionHeading>
                <div className="space-y-2">
                  {data.transfers.map((t, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center justify-between py-3 px-5">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">{t.fromName ?? t.fromEmail}</span>
                          <span className="text-slate-400 mx-1.5">pays</span>
                          <span className="font-medium">{t.toName ?? t.toEmail}</span>
                          <span className="text-slate-400"> · {fmt(t.amountCents)}</span>
                        </p>
                        <Button size="sm" variant="outline" onClick={() => { openFromSuggestion(t); setTab('settlements'); }}>
                          Record
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {data.transfers.length === 0 && data.members.every((m) => m.balanceCents === 0) && (
              <EmptyState icon={<CheckCircle2 size={36} className="text-emerald-300" />} title="All settled up!" sub="No outstanding balances in this group." />
            )}
          </div>
        )}

        {/* ── SETTLEMENTS TAB ── */}
        {!loading && tab === 'settlements' && data && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                {data.settlements.length} settlement{data.settlements.length !== 1 ? 's' : ''}
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => setSettlementOpen(true)}>
                <Plus size={15} /> Record Payment
              </Button>
            </div>

            {data.settlements.length === 0 ? (
              <EmptyState icon={<Handshake size={36} className="text-slate-300" />} title="No settlements yet" sub="Record a payment to reduce balances." />
            ) : (
              <div className="space-y-3">
                {data.settlements.map((s) => (
                  <Card key={s.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {displayName(s.fromUser)}
                          <span className="text-slate-400 mx-1.5">paid</span>
                          {displayName(s.toUser)}
                        </p>
                        {s.note && <p className="text-xs text-slate-400 mt-0.5 italic">{s.note}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="font-semibold text-slate-700 tabular-nums">{fmt(s.amountCents)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Description</Label>
              <Input id="exp-desc" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="e.g. Dinner" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount ($)</Label>
              <Input id="exp-amount" type="number" min="0.01" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-paid-by">Paid by</Label>
              <NativeSelect id="exp-paid-by" value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name ?? m.email}{m.userId === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {expError && <ErrorMsg>{expError}</ErrorMsg>}
            <Button type="submit" disabled={expLoading} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {expLoading ? 'Adding...' : 'Add expense'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Record Settlement Dialog ── */}
      <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <form onSubmit={handleRecordSettlement} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="stl-from">From (who paid)</Label>
              <NativeSelect id="stl-from" value={stlFrom} onChange={(e) => setStlFrom(e.target.value)}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name ?? m.email}{m.userId === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stl-to">To (who received)</Label>
              <NativeSelect id="stl-to" value={stlTo} onChange={(e) => setStlTo(e.target.value)} required>
                <option value="">Select...</option>
                {members.filter((m) => m.userId !== stlFrom).map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name ?? m.email}{m.userId === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stl-amount">Amount ($)</Label>
              <Input id="stl-amount" type="number" min="0.01" step="0.01" value={stlAmount} onChange={(e) => setStlAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stl-note">Note (optional)</Label>
              <Input id="stl-note" value={stlNote} onChange={(e) => setStlNote(e.target.value)} placeholder="e.g. Bank transfer" />
            </div>
            {stlError && <ErrorMsg>{stlError}</ErrorMsg>}
            <Button type="submit" disabled={stlLoading} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {stlLoading ? 'Recording...' : 'Record payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite link</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-slate-500">Share this link. It expires in 7 days.</p>
            <div className="flex gap-2">
              <Input readOnly value={inviteToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}` : ''} className="text-xs" />
              <Button variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-14 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-slate-600 font-medium">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function NativeSelect({ children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className ?? ''}`} {...props}>
      {children}
    </select>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
      {children}
    </p>
  );
}

// ─── Server-side: auth check only ────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { groupId } = ctx.params as { groupId: string };
  const cookie = ctx.req.headers.cookie ?? '';

  try {
    const { user } = await apiClient<{ user: { id: string } | null }>('/auth/me', { cookie });
    if (!user) return { redirect: { destination: '/login', permanent: false } };
    return { props: { groupId, currentUserId: user.id } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};
