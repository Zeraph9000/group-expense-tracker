import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  title: string;
  children: React.ReactNode;
};

export default function AuthLayout({ title, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">SplitTab</h1>
          <p className="text-slate-500 mt-1 text-sm">Group expense tracking, simplified</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
