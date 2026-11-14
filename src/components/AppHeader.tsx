import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { getLocalizedCopy } from '../engines/i18n';
import { NavigationView, PreferredLanguage } from '../types/accessbridge';

interface AppHeaderProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  language: PreferredLanguage;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentView, onNavigate, language }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = getLocalizedCopy(language);

  const workspaceLinks: Array<{ view: NavigationView; label: string }> = [
    { view: 'dashboard', label: copy.navDashboard },
    { view: 'scanner', label: copy.navUnderstandPage },
    { view: 'jobs', label: copy.navFindJobs },
    { view: 'apply', label: copy.navApply },
    { view: 'verify', label: copy.navVerify },
  ];

  const handleNav = (view: NavigationView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur high-contrast:border-white high-contrast:bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('landing')}
          className="font-display text-xl font-bold tracking-tight text-[#001F3F] hover:text-[#0056B3] whitespace-nowrap shrink-0 high-contrast:text-yellow-300"
        >
          AccessBridge
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
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

        {/* Zone 3: 1 primary action + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {currentView === 'landing' ? (
            <button
              type="button"
              onClick={() => handleNav('onboarding')}
              className="rounded-lg bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#003366] transition-colors whitespace-nowrap shrink-0 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {copy.navGetStarted}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('review')}
              className="rounded-lg bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#003366] transition-colors whitespace-nowrap shrink-0 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {copy.navFinalReview}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 p-2.5 text-[#001F3F] hover:bg-slate-100 high-contrast:border-white high-contrast:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
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
          <button
            type="button"
            onClick={() => handleNav('onboarding')}
            className="block w-full text-left rounded-lg px-4 py-3 text-base font-medium text-[#0056B3] hover:bg-slate-100 high-contrast:text-cyan-300"
          >
            Accessibility Setup
          </button>
        </nav>
      )}
    </header>
  );
};
