import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { getPageCopy } from '../engines/pageCopy';
import { emailLooksValid, normalizeSpokenEmail } from '../engines/spokenEmail';
import { ApiError, registerAccount, signIn } from '../engines/api';
import { ACCOUNT_OPEN_EVENT } from '../engines/accountPage';
import {
  clearAccountFill,
  clearStoredPasswords,
  loadAccountDraft,
  saveAccountDraft,
} from '../engines/formDraft';
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
  const savedAccount = loadAccountDraft();
  const [mode, setMode] = useState<'login' | 'register'>(savedAccount?.mode || 'login');
  const [stage, setStage] = useState<'choose' | 'form'>(savedAccount?.stage || 'choose');
  const [name, setName] = useState(savedAccount?.name || '');
  const [email, setEmail] = useState(savedAccount?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [sending, setSending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const showError = (field: string, message: string) => {
    setErrorField(field);
    setError(message);
  };

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
    clearStoredPasswords();
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== 'login' && detail !== 'register') return;
      setMode(detail);
      setStage('form');
      setError('');
      setErrorField('');
    };
    window.addEventListener(ACCOUNT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ACCOUNT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    saveAccountDraft({ mode, stage, name, email });
  }, [mode, stage, name, email]);

  const chooseMode = (next: 'login' | 'register') => {
    setMode(next);
    setStage('form');
    setError('');
    setErrorField('');
    window.dispatchEvent(new CustomEvent('allways-account-choice', { detail: next }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
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
    setSending(true);
    try {
      const account =
        mode === 'register'
          ? await registerAccount({ name: name.trim(), email: correctedEmail, password })
          : await signIn({ email: correctedEmail, password });
      clearAccountFill();
      sessionStorage.setItem('allways-account', JSON.stringify(account));
      if (mode === 'register') {
        sessionStorage.setItem('allways-account-notice', `Account saved for ${account.name}.`);
      }
      onContinue();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : language === 'am'
            ? 'መለያው አልተቀመጠም።'
            : 'The account service is not available.';
      showError(mode === 'register' ? 'email' : 'password', message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-transparent high-contrast:bg-black">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d4f9e] via-[#1a73e8] to-[#4aa3f0] px-7 py-10 text-white shadow-xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ecff]">{page.signInLead}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 max-w-md font-display text-4xl font-bold leading-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] sm:text-5xl"
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
          data-account-stage={stage}
          data-account-mode={mode}
          onSubmit={submit}
          className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_24px_60px_-28px_rgba(26,115,232,0.45)] backdrop-blur high-contrast:border-white high-contrast:bg-black sm:p-8"
          noValidate
        >
          {stage === 'form' ? (
            <button
              type="button"
              onClick={() => setStage('choose')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a73e8] hover:underline high-contrast:text-yellow-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {page.back}
            </button>
          ) : purpose === 'job' ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a73e8] hover:underline high-contrast:text-yellow-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {page.backToJob}
            </button>
          ) : null}
          {stage === 'choose' ? (
            <div className="mt-5 grid gap-3">
              <h2 className="font-display text-3xl font-bold text-[#0e2a4a] high-contrast:text-white">
                {page.loginTitle}
              </h2>
              <button
                type="button"
                data-voice-choice="login"
                onClick={() => chooseMode('login')}
                className="rounded-2xl bg-[#1a73e8] px-4 py-4 text-left text-lg font-bold text-white"
              >
                {page.login}
              </button>
              <button
                type="button"
                data-voice-choice="register"
                onClick={() => chooseMode('register')}
                className="rounded-2xl border border-[#1a73e8] bg-white px-4 py-4 text-left text-lg font-bold text-[#0d4f9e] high-contrast:bg-black high-contrast:text-white"
              >
                {page.register}
              </button>
            </div>
          ) : (
            <>
          <h2 className="mt-5 font-display text-3xl font-bold text-[#0e2a4a] high-contrast:text-white">
            {mode === 'register' ? page.createAccount : page.welcomeBack}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5a7390] high-contrast:text-slate-300">
            {page.loginHint}
          </p>

          {error && (
            <p
              id="account-error"
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
                  autoComplete="name"
                  aria-invalid={errorField === 'name'}
                  aria-describedby={errorField === 'name' ? 'account-error' : undefined}
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
                  autoComplete="email"
                  aria-invalid={errorField === 'email'}
                  aria-describedby={errorField === 'email' ? 'account-error' : undefined}
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
                autoComplete="current-password"
                aria-invalid={errorField === 'password'}
                aria-describedby={errorField === 'password' ? 'account-error' : undefined}
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
                  autoComplete="new-password"
                  aria-invalid={errorField === 'confirm'}
                  aria-describedby={errorField === 'confirm' ? 'account-error' : undefined}
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
            disabled={sending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4f9e] disabled:opacity-60"
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
