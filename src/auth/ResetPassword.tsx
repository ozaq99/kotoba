import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/utils/firebase/client';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setMessage('Password updated! Redirecting to login...');
      setTimeout(() => setLocation('/login'), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-5 py-20">
      <form onSubmit={handleUpdate} className="space-y-4">
        <h1 className="font-serif text-3xl">Set new password</h1>
        <input
          type="password"
          placeholder="New password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}