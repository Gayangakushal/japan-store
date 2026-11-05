import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { accountQuery } from "@/lib/store";
import { signOut } from "@/lib/sign-out";
import { pageHead } from "@/lib/page-head";
import "@/components/admin/admin.css";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () =>
    pageHead("Admin sign-in", "Secure access to the KUMO product collection and store settings."),
  component: Auth,
});
function Auth() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reset, setReset] = useState(false);
  const navigate = useNavigate(),
    queryClient = useQueryClient();
  const { data: account } = useQuery(accountQuery);
  useEffect(() => {
    if (account?.isAdmin) void navigate({ to: "/admin", replace: true });
  }, [account, navigate]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("If this account exists, a password reset link has been sent.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["account"] });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-ui admin-login">
      <section className="admin-login-story">
        <Link to="/" className="admin-brand">
          {"\u96f2"} <b>kumo</b>
          <small>STORE MANAGEMENT</small>
        </Link>
        <div>
          <span className="admin-kicker">A LITTLE CARE BEHIND EVERY FIND.</span>
          <h1>
            Your store.
            <br />
            Beautifully organised.
          </h1>
          <p>A thoughtful workspace for your products, collections and everyday details.</p>
          <div className="admin-story-tags">
            <span>Catalogue</span>
            <span>Collections</span>
            <span>Store settings</span>
          </div>
        </div>
        <small>JAPAN, A LITTLE CLOSER.</small>
      </section>
      <section className="admin-login-form">
        <Link to="/" className="admin-back">
          <ArrowLeft size={15} /> Back to storefront
        </Link>
        <div className="admin-login-box">
          <span className="admin-status">
            <LockKeyhole size={11} /> &nbsp; ADMIN ACCESS
          </span>
          <h2>{reset ? "Reset your password" : "Welcome back."}</h2>
          <p>
            {reset
              ? "We will send a secure link to your registered email."
              : "Sign in to take care of your KUMO store."}
          </p>
          {account && !account.isAdmin ? (
            <>
              <p role="status">
                This account does not have admin access. Contact store management to request access.
              </p>
              <Button
                onClick={async () => {
                  await signOut(queryClient);
                  await navigate({ to: "/auth", replace: true });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={submit}>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                {!reset && (
                  <label>
                    Password
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}
                <button className="admin-button primary" disabled={busy}>
                  {busy ? "Please wait..." : reset ? "Send reset link" : "Sign in to workspace"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
              <button
                className="admin-text-link"
                onClick={() => {
                  setReset(!reset);
                  setMessage("");
                }}
              >
                {reset ? "Back to sign-in" : "Forgot your password?"}
              </button>
            </>
          )}
          {message && (
            <p role="status" className="admin-form-error">
              {message}
            </p>
          )}
          <Link to="/admin-preview" className="admin-text-link">
            Explore the workspace preview <ArrowRight size={14} />
          </Link>
        </div>
        <p className="admin-login-footer">Access is limited to authorised store administrators.</p>
      </section>
    </main>
  );
}
