import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
          <FileQuestion size={32} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
          <p className="text-slate-500 mt-1 text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/groups')}>
          Back to Groups
        </Button>
      </div>
    </div>
  );
}
