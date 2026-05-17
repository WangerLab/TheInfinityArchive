import React, { useState, useEffect } from 'react';
import { supabase } from 'lib/supabase';
import { Loader2, Mail, Database, AlertTriangle } from 'lucide-react';
import { cn } from 'lib/utils';

export const AuthGate = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [error, setError] = useState(null);

  // Initial session load + live updates
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleMagicLink = async (e) => {
    e?.preventDefault();
    if (!email || sending) return;

    setSending(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (signInError) throw signInError;

      setSentTo(email.trim());
    } catch (err) {
      console.error('Magic Link error:', err);
      setError(err.message || 'Failed to send magic link.');
    } finally {
      setSending(false);
    }
  };

  // Initial session check loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center scanlines">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 mx-auto rounded-xl grimdark-panel flex items-center justify-center animate-pulse">
            <Database className="w-8 h-8 text-gold" />
          </div>
          <div>
            <p className="font-display text-xl text-gold tracking-wider text-glow-gold">
              AUTHENTICATING COGITATOR
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Loader2 className="w-5 h-5 animate-spin text-auspex" />
              <p className="text-sm text-slate-300 font-semibold">Verifying credentials...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — render the protected app
  if (session) {
    return <>{children}</>;
  }

  // Not authenticated — show Magic Link form
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 scanlines safe-bottom safe-top">
      <div className="w-full max-w-md space-y-6">
        {/* Title block */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-xl grimdark-panel flex items-center justify-center mb-2">
            <Database className="w-10 h-10 text-gold" />
          </div>
          <h1 className="font-display text-3xl text-gold tracking-wider text-glow-gold">
            THE INFINITY ARCHIVE
          </h1>
          <p className="text-[11px] text-slate-400 font-tactical tracking-[0.25em]">
            COGITATOR INTERFACE v.M41
          </p>
        </div>

        {/* Gold accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        {sentTo ? (
          /* Post-submit confirmation state */
          <div className="grimdark-panel rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-lg bg-auspex/10 border border-auspex/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-auspex" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-display text-lg text-auspex tracking-wider">
                AUSPEX SIGNAL DISPATCHED
              </p>
              <p className="text-sm text-slate-300 font-medium">
                A magic link has been sent to
              </p>
              <p className="text-sm text-gold font-bold break-all">
                {sentTo}
              </p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Click the link in your inbox to authenticate.
                You may close this page — the link opens a new session here.
              </p>
            </div>
            <button
              onClick={() => {
                setSentTo(null);
                setEmail('');
                setError(null);
              }}
              className={cn(
                "w-full px-4 py-2 rounded-md",
                "border border-slate-600 text-slate-400",
                "text-xs font-tactical tracking-wider",
                "hover:border-gold/40 hover:text-gold transition-all",
                "active:scale-[0.98]"
              )}
            >
              USE A DIFFERENT EMAIL
            </button>
          </div>
        ) : (
          /* Login form */
          <div className="grimdark-panel rounded-lg p-6 space-y-4">
            <div className="text-center">
              <p className="font-display text-lg text-gold tracking-wider mb-1">
                AUTHENTICATE
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Enter your authorized email to receive a magic link.
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="auth-email" className="block">
                <span className="text-[10px] text-gold font-tactical tracking-[0.2em] mb-1.5 block">
                  EMAIL ADDRESS
                </span>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMagicLink(e);
                  }}
                  placeholder="cogitator@imperium.gov"
                  disabled={sending}
                  autoComplete="email"
                  autoFocus
                  className={cn(
                    "w-full px-4 py-3 rounded-md",
                    "bg-black/60 border-2 border-gold/30",
                    "text-slate-100 font-medium",
                    "placeholder:text-slate-600 placeholder:font-normal",
                    "focus:outline-none focus:border-gold focus:shadow-[0_0_10px_hsl(38,92%,50%,0.3)]",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </label>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <button
                onClick={handleMagicLink}
                disabled={!email || sending}
                className={cn(
                  "w-full px-4 py-3 rounded-md",
                  "grimdark-panel font-bold text-gold tracking-wider",
                  "hover:glow-gold transition-all",
                  "active:scale-[0.98]",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none",
                  "flex items-center justify-center gap-2"
                )}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>TRANSMITTING...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>DISPATCH MAGIC LINK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bottom signature */}
        <div className="text-center">
          <p className="text-[9px] text-slate-600 font-tactical tracking-[0.15em]">
            THOUGHT FOR THE DAY: ONLY THE AUTHENTICATED MAY READ
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
