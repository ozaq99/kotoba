import { useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/utils/supabase/client';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage('Check your email to confirm your account.');
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <form onSubmit={handleSignup} className="space-y-4">
        <h1 className="font-serif text-3xl">Sign up</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
        <p className="text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-[hsl(var(--secondary))]">Log in</Link></p>
      </form>
    </div>
  );
}