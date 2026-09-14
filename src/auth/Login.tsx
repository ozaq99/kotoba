import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { auth } from '@/utils/firebase/client';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation('/');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <form onSubmit={handleLogin} className="space-y-4">
        <h1 className="font-serif text-3xl">Log in</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="font-semibold text-[hsl(var(--secondary))]">Forgot password?</Link>
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-sm text-muted-foreground">No account? <Link href="/signup" className="font-semibold text-[hsl(var(--secondary))]">Sign up</Link></p>
      </form>
    </div>
  );
}