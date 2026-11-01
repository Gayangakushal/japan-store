import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { accountQuery } from '@/lib/store';
import { signOut } from '@/lib/sign-out';
import { pageHead } from '@/lib/page-head';
import '@lovable.dev/cloud-auth-js/styles.css';

export const Route = createFileRoute('/auth')({ head: () => pageHead('Admin sign-in', 'Secure access to the KUMO product collection and store settings.'), component: Auth });
function Auth() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [reset, setReset] = useState(false);
  const navigate = useNavigate(), queryClient = useQueryClient();
  const { data: account } = useQuery(accountQuery);
  useEffect(() => { if (account?.isAdmin) void navigate({ to: '/admin', replace: true }); }, [account, navigate]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('If this account exists, a password reset link has been sent.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['account'] });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  }
  async function oauth(provider: 'google' | 'lovable') {
    setBusy(true); setMessage('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) { setMessage(result.error.message); return; }
      if (!result.redirected) await queryClient.invalidateQueries({ queryKey: ['account'] });
    } finally { setBusy(false); }
  }
  return <main className="kumo-console min-h-screen bg-background text-foreground px-6 py-16"><div className="mx-auto max-w-sm space-y-6"><Link to="/" className="text-primary text-3xl font-bold">雲 kumo</Link><h1 className="text-3xl font-semibold">{reset ? 'Reset your password' : 'Admin sign-in'}</h1>{account && !account.isAdmin ? <><p role="status">This account does not have admin access.</p><Button onClick={async () => { await signOut(queryClient); await navigate({ to: '/auth', replace: true }); }}>Sign out</Button></> : <><form onSubmit={submit} className="space-y-4"><label className="block">Email<input className="mt-2 block w-full rounded border border-input bg-background p-3" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>{!reset && <label className="block">Password<input className="mt-2 block w-full rounded border border-input bg-background p-3" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>}<Button className="w-full" disabled={busy}>{busy ? 'Please wait…' : reset ? 'Send reset link' : 'Sign in'}</Button></form><Button variant="link" onClick={() => { setReset(!reset); setMessage(''); }}>{reset ? 'Back to sign-in' : 'Forgot password?'}</Button>{!reset && <div className="space-y-3"><Button variant="outline" className="w-full" disabled={busy} onClick={() => oauth('google')}>Sign in with Google</Button><Button className="lovable-auth-button w-full" disabled={busy} onClick={() => oauth('lovable')}>Sign in with Lovable</Button></div>}</>}{message && <p role="status">{message}</p>}<Link to="/" className="block text-sm text-muted-foreground">Back to shop</Link></div></main>;
}