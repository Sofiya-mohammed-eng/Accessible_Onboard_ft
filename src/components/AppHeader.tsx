import React, { useEffect, useRef, useState } from 'react';
import { Globe, Menu, Moon, Sun, X } from 'lucide-react';
import { getLocalizedCopy } from '../engines/i18n';
import { ColorMode, NavigationView, PreferredLanguage } from '../types/accessbridge';

interface AppHeaderProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  onLogin: () => void;
  onGetStarted: () => void;
  onOpenLanguage: () => void;
  language: PreferredLanguage;
  languageLabel: string;
  loginLabel: string;
  signedIn: boolean;
  colorMode: ColorMode;
  onSetColorMode: (mode: ColorMode) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  onNavigate,
  onLogin,
  onGetStarted,
  onOpenLanguage,
  language,
  languageLabel,
  loginLabel,
  signedIn,
  colorMode,
  onSetColorMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const copy = getLocalizedCopy(language);

  useEffect(() => {
    if (mobileMenuOpen) {
      mobileDrawerRef.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus();
    }
  }, [mobileMenuOpen]);

  const workspaceLinks: Array<{ view: NavigationView; label: string }> = signedIn
    ? [
        { view: 'jobs', label: copy.navFindJobs },
        { view: 'apply', label: copy.navApply },
      ]
    : [];
  const whiteLabel = language === 'am' ? 'ነጭ' : 'White';
  const darkLabel = language === 'am' ? 'ጨለማ' : 'Dark';

  const handleNav = (view: NavigationView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_10px_40px_-24px_rgba(26,115,232,0.45)] backdrop-blur-xl high-contrast:border-white high-contrast:bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('landing')}
          aria-label={language === 'am' ? 'AllWays መነሻ ገጽ' : 'AllWays home page'}
          className="font-display text-2xl font-bold tracking-tight text-[#0e2a4a] hover:text-[#1a73e8] whitespace-nowrap shrink-0 high-contrast:text-yellow-300"
        >
          AllWays
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        {workspaceLinks.length > 0 && (
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {workspaceLinks.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#007BFF] text-[#001F3F] font-semibold high-contrast:border-yellow-300 high-contrast:text-yellow-300'
                    : 'border-transparent text-slate-600 hover:text-[#001F3F] hover:border-slate-300 high-contrast:text-white high-contrast:hover:text-yellow-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        )}

        {/* Zone 3: 1 primary action + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex rounded-full border border-[#d5e6f7] bg-white/80 p-1 high-contrast:border-white high-contrast:bg-black" role="group" aria-label={language === 'am' ? 'የቀለም ሁኔታ' : 'Color mode'}>
            <button
              type="button"
              aria-pressed={colorMode === 'light'}
              onClick={() => onSetColorMode('light')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                colorMode === 'light' ? 'bg-[#1a73e8] text-white' : 'text-[#0e2a4a] high-contrast:text-white'
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              {whiteLabel}
            </button>
            <button
              type="button"
              aria-pressed={colorMode === 'dark'}
              onClick={() => onSetColorMode('dark')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                colorMode === 'dark' ? 'bg-[#1a73e8] text-white' : 'text-[#0e2a4a] high-contrast:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              {darkLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenLanguage();
              setMobileMenuOpen(false);
            }}
            aria-label={
              language === 'am'
                ? `ቋንቋ ይቀይሩ። አሁን ያለው ቋንቋ፦ ${languageLabel}`
                : `Change language. Current language: ${languageLabel}`
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:text-white"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {languageLabel}
          </button>
          {currentView === 'landing' ? (
            <button
              type="button"
              onClick={() => {
                onGetStarted();
                setMobileMenuOpen(false);
              }}
              className="rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 whitespace-nowrap shrink-0 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {copy.navGetStarted}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onLogin();
                setMobileMenuOpen(false);
              }}
              className="rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 whitespace-nowrap shrink-0 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {loginLabel}
            </button>
          )}

          {workspaceLinks.length > 0 && (
          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => {
              if (mobileMenuOpen) {
                setMobileMenuOpen(false);
                mobileToggleRef.current?.focus();
              } else {
                setMobileMenuOpen(true);
              }
            }}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 p-2.5 text-[#001F3F] hover:bg-slate-100 high-contrast:border-white high-contrast:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && workspaceLinks.length > 0 && (
        <nav
          ref={mobileDrawerRef}
          id="mobile-nav-drawer"
          aria-label="Mobile primary navigation"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 high-contrast:border-white high-contrast:bg-black"
        >
          {workspaceLinks.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                aria-current={isActive ? 'page' : undefined}
                className={`block w-full text-left rounded-lg px-4 py-3 text-base font-medium ${
                  isActive
                    ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                    : 'text-slate-700 hover:bg-slate-100 high-contrast:text-white high-contrast:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
