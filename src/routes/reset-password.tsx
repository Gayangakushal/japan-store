import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Reset password', 'Set a new password for your KUMO admin account.'), component: Reset });
function Reset() {
  const [ready, setReady] = useState(false), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (!recovery && sessionStorage.getItem('kumo-recovery') !== 'true') { setMessage('Open the password reset link from your email.'); return; }
    supabase.auth.getUser().then(({ data }) => { if (data.user) setReady(true); else setMessage('This reset link has expired. Request a new one.'); });
  }, []);
  return <main className="kumo-console min-h-screen bg-background px-6 py-16"><form className="mx-auto max-w-sm space-y-5" onSubmit={async e => { e.preventDefault(); if (password !== confirm) { setMessage('Passwords must match.'); return; } setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) { setMessage(error.message); return; } sessionStorage.removeItem('kumo-recovery'); await navigate({ to: '/auth', replace: true }); }}><h1 className="text-3xl">New password</h1>{ready && <><label className="block">New password<input className="block w-full border border-input bg-background p-3 mt-2" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/></label><label className="block">Confirm password<input className="block w-full border border-input bg-background p-3 mt-2" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)}/></label><Button disabled={busy}>{busy ? 'Saving…' : 'Save password'}</Button></>}{message && <p role="status">{message}</p>}<Link to="/auth">Back to sign-in</Link></form></main>;
}