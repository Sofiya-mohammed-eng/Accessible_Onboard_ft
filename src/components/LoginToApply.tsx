import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { getPageCopy } from '../engines/pageCopy';
import { emailLooksValid, normalizeSpokenEmail } from '../engines/spokenEmail';
import { PreferredLanguage } from '../types/accessbridge';

interface LoginToApplyProps {
  language: PreferredLanguage;
  jobTitle?: string;
  employer?: string;
  purpose?: 'account' | 'job';
  onBack: () => void;
  onContinue: () => void;
}

export const LoginToApply: React.FC<LoginToApplyProps> = ({
  language,
  jobTitle,
  employer,
  purpose = 'job',
  onBack,
  onContinue,
}) => {
  const page = getPageCopy(language);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [stage, setStage] = useState<'choose' | 'form'>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  const showError = (field: string, message: string) => {
    setErrorField(field);
    setError(message);
  };

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (stage === 'form') formHeadingRef.current?.focus();
  }, [stage, mode]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && !name.trim()) {
      showError('name', page.missingName);
      return;
    }
    if (!email.trim() || !password.trim()) {
      showError(!email.trim() ? 'email' : 'password', page.enterBoth);
      return;
    }
    const correctedEmail = normalizeSpokenEmail(email);
    if (correctedEmail !== email) setEmail(correctedEmail);
    if (!emailLooksValid(correctedEmail)) {
      showError(
        'email',
        language === 'am'
          ? `${correctedEmail} ኢሜይል አይደለም። ${page.enterEmail}`
          : `${correctedEmail} is not an email. ${page.enterEmail}`,
      );
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      showError('confirm', page.passwordsMismatch);
      return;
    }
    onContinue();
  };

  return (
    <div className="bg-transparent high-contrast:bg-black">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d4f9e] via-[#1a73e8] to-[#4aa3f0] px-7 py-10 text-white shadow-xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ecff]">{page.signInLead}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 max-w-md font-display text-4xl font-bold leading-tight text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] sm:text-5xl"
          >
            {purpose === 'account' ? page.welcomeBack : page.loginTitle}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#e7f3ff]">
            {purpose === 'account' ? (
              page.accountLead
            ) : (
              <>
                {page.loginLead} <strong className="text-white">{jobTitle}</strong> ·{' '}
                <strong className="text-white">{employer}</strong>
              </>
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-semibold">
              {purpose === 'account' ? page.login : jobTitle}
            </span>
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-semibold">
              {purpose === 'account' ? page.register : page.aboutTen}
            </span>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full border border-dashed border-white/30" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-6 right-16 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
        </section>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_24px_60px_-28px_rgba(26,115,232,0.45)] backdrop-blur high-contrast:border-white high-contrast:bg-black sm:p-8"
          noValidate
        >
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a73e8] hover:underline high-contrast:text-yellow-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {purpose === 'account' ? page.back : page.backToJob}
          </button>
          {stage === 'choose' ? (
            <div className="mt-5 grid gap-3">
              <h2 className="font-display text-3xl font-bold text-[#0e2a4a] high-contrast:text-white">
                {page.loginTitle}
              </h2>
              <button
                type="button"
                data-voice-choice="login"
                onClick={() => {
                  setMode('login');
                  setStage('form');
                  setError('');
                  setErrorField('');
                }}
                className="rounded-2xl bg-[#1a73e8] px-4 py-4 text-left text-lg font-bold text-white"
              >
                {page.login}
              </button>
              <button
                type="button"
                data-voice-choice="register"
                onClick={() => {
                  setMode('register');
                  setStage('form');
                  setError('');
                  setErrorField('');
                }}
                className="rounded-2xl border border-[#1a73e8] bg-white px-4 py-4 text-left text-lg font-bold text-[#0d4f9e] high-contrast:bg-black high-contrast:text-white"
              >
                {page.register}
              </button>
            </div>
          ) : (
            <>
          <button
            type="button"
            onClick={() => setStage('choose')}
            className="mt-5 text-sm font-semibold text-[#1a73e8] underline high-contrast:text-yellow-300"
          >
            {page.back}
          </button>
          <h2
            ref={formHeadingRef}
            tabIndex={-1}
            className="mt-5 font-display text-3xl font-bold text-[#0e2a4a] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] high-contrast:text-white"
          >
            {mode === 'register' ? page.createAccount : page.welcomeBack}
          </h2>
          <p id="login-hint" className="mt-2 text-sm leading-relaxed text-[#5a7390] high-contrast:text-slate-300">
            {page.loginHint}
          </p>

          {error && (
            <p
              id="login-error"
              role="alert"
              data-voice-fix={errorField}
              className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-sm font-semibold text-[#8a1f17]"
            >
              {error}
            </p>
          )}

          {mode === 'register' && (
            <label className="mt-6 block text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              {page.fullName}
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
                <input
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="name"
                  aria-invalid={errorField === 'name'}
                  aria-describedby={errorField === 'name' ? 'login-error' : undefined}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                    setErrorField('');
                  }}
                  className="w-full rounded-xl border border-[#c5daf2] bg-white py-3 pl-10 pr-3 text-base text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </span>
            </label>
          )}

          <label className="mt-6 block text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
            {page.emailLabel}
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
              <input
                type="email"
                required
                aria-required="true"
                autoComplete="email"
                aria-invalid={errorField === 'email'}
                aria-describedby={errorField === 'email' ? 'login-error' : undefined}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                    setErrorField('');
                }}
                className="w-full rounded-xl border border-[#c5daf2] bg-white py-3 pl-10 pr-3 text-base text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </span>
          </label>

          <label className="mt-4 block text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
            {page.passwordLabel}
            <span className="relative mt-2 block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                aria-required="true"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                aria-invalid={errorField === 'password'}
                aria-describedby={errorField === 'password' ? 'login-error' : undefined}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                    setErrorField('');
                }}
                className="w-full rounded-xl border border-[#c5daf2] bg-white py-3 pl-10 pr-12 text-base text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#1a73e8] hover:bg-[#e7f3ff] high-contrast:text-yellow-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? page.hidePassword : page.showPassword}</span>
              </button>
            </span>
          </label>

          {mode === 'register' && (
            <label className="mt-4 block text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              {page.confirmPassword}
              <span className="relative mt-2 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7f74]" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  autoComplete="new-password"
                  aria-invalid={errorField === 'confirm'}
                  aria-describedby={errorField === 'confirm' ? 'login-error' : undefined}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError('');
                    setErrorField('');
                  }}
                  className="w-full rounded-xl border border-[#c5daf2] bg-white py-3 pl-10 pr-3 text-base text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </span>
            </label>
          )}

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4f9e]"
          >
            {mode === 'register' ? page.register : page.signInContinue}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
