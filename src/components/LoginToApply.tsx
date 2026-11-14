import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface LoginToApplyProps {
  jobTitle: string;
  employer: string;
  onBack: () => void;
  onContinue: () => void;
}

export const LoginToApply: React.FC<LoginToApplyProps> = ({
  jobTitle,
  employer,
  onBack,
  onContinue,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter an email address, such as name@example.com.');
      return;
    }
    onContinue();
  };

  return (
    <div className="bg-[#f4f7f2] high-contrast:bg-black">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e4638] via-[#176b52] to-[#2b8a68] px-7 py-10 text-white shadow-xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7f3e8]">Sign in to continue</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 max-w-md font-display text-4xl font-bold leading-tight text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] sm:text-5xl"
          >
            Login to apply
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#e7f6ef]">
            Sign in to start your application for <strong className="text-white">{jobTitle}</strong> at{' '}
            <strong className="text-white">{employer}</strong>.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-semibold">
              {jobTitle}
            </span>
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-semibold">
              About 10 minutes
            </span>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full border border-dashed border-white/30" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-6 right-16 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
        </section>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-[#dbe3df] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(20,60,42,0.45)] high-contrast:border-white high-contrast:bg-black sm:p-8"
          noValidate
        >
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#157347] hover:underline high-contrast:text-yellow-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the job
          </button>
          <h2 className="mt-5 font-display text-3xl font-bold text-[#14281f] high-contrast:text-white">
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5d7266] high-contrast:text-slate-300">
            Use your email and password. This demo keeps them on this page and does not send them to the employer.
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-sm font-semibold text-[#8a1f17]">
              {error}
            </p>
          )}

          <label className="mt-6 block text-sm font-semibold text-[#14281f] high-contrast:text-white">
            Email
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-[#c9d5ce] bg-white py-3 pl-10 pr-3 text-base text-[#14281f] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </span>
          </label>

          <label className="mt-4 block text-sm font-semibold text-[#14281f] high-contrast:text-white">
            Password
            <span className="relative mt-2 block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-[#c9d5ce] bg-white py-3 pl-10 pr-12 text-base text-[#14281f] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#157347] hover:bg-[#e7f4ec] high-contrast:text-yellow-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e4638]"
          >
            Sign in and continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};
