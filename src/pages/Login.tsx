import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { siteName } = useSite();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError(null);
    const ok = await login(password);
    setLoading(false);
    if (ok) navigate(searchParams.get('redirect') || '/', { replace: true });
    else setError('密码错误');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-accent] text-[--color-accent-foreground] shadow-[var(--shadow-accent)]">
            <span className="text-xl font-bold">{siteName[0]}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[--color-foreground]">{siteName}</h1>
          <p className="mt-1.5 text-sm text-[--color-muted-foreground]">输入密码以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted-foreground]" strokeWidth={1.75} />
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              className="input-clean h-11 w-full pl-10 pr-3 text-sm"
              placeholder="访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-center text-xs text-[--color-destructive] animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-accent w-full py-2.5"
          >
            {loading ? '验证中...' : '进入'}
          </button>
        </form>
      </div>
    </div>
  );
}
