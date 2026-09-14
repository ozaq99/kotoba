import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { auth } from '@/utils/firebase/client';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setLocation('/');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <form onSubmit={handleSignup} className="space-y-4">
        <h1 className="font-serif text-3xl">Sign up</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
        <p className="text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-[hsl(var(--secondary))]">Log in</Link></p>
      </form>
    </div>
  );
}