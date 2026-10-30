import React, { useState } from 'react';
import { ArrowLeft, MailCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthViewProps {
  initialMode?: 'login' | 'signup';
  onBackToLanding: () => void;
}

type AuthTab = 'login' | 'signup' | 'forgot';

export function AuthView({ initialMode = 'signup', onBackToLanding }: AuthViewProps) {
  const {
    user,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendResetPassword,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<AuthTab>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formatFirebaseAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication > Sign-in method > Email/Password). Use "Continue with Google" above for instant access, or enable Email/Password in Firebase Console.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Incorrect email or password. Please verify your credentials and try again.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters long.';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return 'Sign-in popup was closed before completing authentication.';
    }
    return raw;
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (name.trim().length < 2) {
          setErrorMessage('Please enter your full name (at least 2 characters).');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(name, email, password);
        setSuccessMessage(
          'Account created! We sent a verification link to your email address. Verify your email below to unlock your workspace.'
        );
      } else if (mode === 'login') {
        if (!password) {
          setErrorMessage('Please enter your password.');
          setSubmitting(false);
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'forgot') {
        await sendResetPassword(email);
        setSuccessMessage(
          'Password reset instructions have been sent if an account exists for that email.'
        );
      }
    } catch (err) {
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Unverified email state screen
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <MailCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Verify your email address</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            To protect private coaching transcripts and personal performance reports, KAIZEN
            requires a verified email address. We sent a verification link to{' '}
            <span className="font-medium text-slate-900">{user.email}</span>.
          </p>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setErrorMessage(null);
                try {
                  const ok = await refreshVerificationStatus();
                  if (!ok) {
                    setErrorMessage(
                      'Your email is not marked verified yet. Click the link in your inbox first, then try again.'
                    );
                  }
                } catch (err) {
                  setErrorMessage(formatFirebaseAuthError(err));
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Checking status...' : 'I Verified My Email — Continue'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setErrorMessage(null);
                try {
                  await resendVerificationEmail();
                  setSuccessMessage('Verification email resent. Please check your inbox and spam folder.');
                } catch (err) {
                  setErrorMessage(formatFirebaseAuthError(err));
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Resend Verification Email
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Or Sign In Instantly with Google
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Sign out &amp; return
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-6 py-8">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to KAIZEN Home</span>
        </button>
        <span className="text-base font-bold tracking-tight text-slate-900">KAIZEN</span>
      </div>

      <div className="w-full max-w-md mx-auto my-10 bg-white border border-slate-200 rounded-2xl p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'signup' && 'Create your KAIZEN account'}
            {mode === 'login' && 'Welcome back to KAIZEN'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {mode === 'signup' &&
              'Save your mock interviews, coaching sessions, and soft skill progress.'}
            {mode === 'login' && 'Sign in to continue your daily communication practice.'}
            {mode === 'forgot' && 'Enter your email address to receive a password reset link.'}
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        {mode !== 'forgot' && (
          <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log In
            </button>
          </div>
        )}

        {/* Primary Instant Google Sign-In */}
        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="mt-6 w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Maya Krishnan"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {mode === 'signup' && 'Create Account'}
              {mode === 'login' && 'Sign In'}
              {mode === 'forgot' && 'Send Reset Link'}
            </span>
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Return to Sign In
            </button>
          )}
        </form>
      </div>

      <div className="text-center text-xs text-slate-400">
        Protected by Firebase Authentication &amp; Zero-Trust Firestore Security Rules
      </div>
    </div>
  );
}
