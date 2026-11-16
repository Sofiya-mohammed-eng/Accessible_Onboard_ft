import React, { useMemo, useState } from 'react';
import { Volume2, AlertCircle, CheckCircle2, Code2, Globe, Info } from 'lucide-react';
import {
  SAMPLE_WEB_PAGES,
  createSampleExtensionBridgePayload,
  matchSamplePageForUrl,
  parseHtmlSnippetToElements,
} from '../engines/pageUnderstanding';
import { DetectedPageElement, NavigationView, PageElementCategory, SampleWebPage } from '../types/accessbridge';

interface WebsiteUnderstandingViewProps {
  onSpeakText: (text: string) => void;
  onNavigate: (view: NavigationView) => void;
  simplifiedInstructions: boolean;
}

const CATEGORY_LABELS: Array<{ id: PageElementCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Elements' },
  { id: 'heading', label: 'Headings' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'form_field', label: 'Form Fields' },
  { id: 'input_label', label: 'Input Labels' },
  { id: 'button', label: 'Buttons' },
  { id: 'link', label: 'Links' },
  { id: 'image', label: 'Images & Alt Text' },
  { id: 'interactive', label: 'Interactive' },
];

const DEFAULT_HTML_SNIPPET = `<nav aria-label="Application steps">
  <a href="#details">Job Details</a>
</nav>
<main>
  <h1>Submit Proposal</h1>
  <label for="rate">Hourly Rate ($ USD)</label>
  <input id="rate" type="number" value="250" required />
  <img src="banner.png" alt="" aria-hidden="true" />
  <button type="submit">Review Application</button>
</main>`;

export const WebsiteUnderstandingView: React.FC<WebsiteUnderstandingViewProps> = ({
  onSpeakText,
  onNavigate,
  simplifiedInstructions,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_WEB_PAGES[0].id);
  const [urlInput, setUrlInput] = useState<string>(SAMPLE_WEB_PAGES[0].url);
  const [activeMode, setActiveMode] = useState<'sample' | 'html' | 'extension'>('sample');
  const [categoryFilter, setCategoryFilter] = useState<PageElementCategory | 'all'>('all');
  const [htmlSnippet, setHtmlSnippet] = useState<string>(DEFAULT_HTML_SNIPPET);
  const [urlNotice, setUrlNotice] = useState<string>('');
  const [selectedElementId, setSelectedElementId] = useState<string>(SAMPLE_WEB_PAGES[0].elements[0].id);

  const activeSample: SampleWebPage = useMemo(
    () => SAMPLE_WEB_PAGES.find((p) => p.id === selectedSampleId) || SAMPLE_WEB_PAGES[0],
    [selectedSampleId]
  );

  const parsedHtmlElements = useMemo(
    () => parseHtmlSnippetToElements(htmlSnippet),
    [htmlSnippet]
  );

  const displayedElements: DetectedPageElement[] = useMemo(() => {
    const source = activeMode === 'html' ? parsedHtmlElements : activeSample.elements;
    if (categoryFilter === 'all') return source;
    return source.filter((el) => el.category === categoryFilter);
  }, [activeMode, activeSample.elements, categoryFilter, parsedHtmlElements]);

  const selectedElement =
    displayedElements.find((el) => el.id === selectedElementId) || displayedElements[0] || null;

  const handleInspectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = matchSamplePageForUrl(urlInput);
    if (matched) {
      setSelectedSampleId(matched.id);
      setActiveMode('sample');
      setSelectedElementId(matched.elements[0].id);
      setUrlNotice(
        `Matched simulated ${matched.platform} structure. External live tabs require the future Manifest V3 Chrome Extension due to browser Same-Origin security.`
      );
    } else {
      setUrlNotice(
        'Browser security (CORS / Same-Origin Policy) prevents standard web apps from reading arbitrary external URLs directly. Use a simulated platform sample below, paste HTML into the Live DOM Parser tab, or connect the upcoming Chrome Extension.'
      );
    }
  };

  const missingAltCount = (activeMode === 'html' ? parsedHtmlElements : activeSample.elements).filter(
    (e) => e.altTextStatus === 'missing'
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
          Website Understanding Module
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
          Explore Detected Page Structure & Elements
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
          {simplifiedInstructions
            ? 'Pick a sample job page or paste HTML below. Click any item in the list to hear what it does and check for missing labels or image descriptions.'
            : 'Inspect headings, navigation landmarks, form inputs, labels, buttons, links, and image alt text. Standard web browsers block cross-origin page scraping, so external sites use realistic platform simulations or local DOMParser inspection until paired with the Manifest V3 Chrome Extension.'}
        </p>
      </div>

      {/* URL / Mode Controls */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
        <form onSubmit={handleInspectUrl} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="inspect-url-input"
              className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Website URL to Inspect (Simulated Platform Match or Transparency Check)
            </label>
            <input
              id="inspect-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.upwork.com/nx/proposals/..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#003366] whitespace-nowrap shrink-0 high-contrast:bg-yellow-300 high-contrast:text-black"
          >
            Inspect URL
          </button>
        </form>

        {urlNotice && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-[#001F3F] high-contrast:border-cyan-300 high-contrast:bg-neutral-900 high-contrast:text-cyan-200"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{urlNotice}</span>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 high-contrast:border-slate-700">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inspection mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'sample'}
              onClick={() => setActiveMode('sample')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeMode === 'sample'
                  ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
              }`}
            >
              Simulated Platform Pages
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'html'}
              onClick={() => setActiveMode('html')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeMode === 'html'
                  ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
              }`}
            >
              Live Browser HTML DOMParser
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'extension'}
              onClick={() => setActiveMode('extension')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeMode === 'extension'
                  ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
              }`}
            >
              Manifest V3 Extension Architecture
            </button>
          </div>

          {activeMode === 'sample' && (
            <div className="flex flex-wrap gap-2">
              {SAMPLE_WEB_PAGES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setSelectedSampleId(sample.id);
                    setUrlInput(sample.url);
                    setSelectedElementId(sample.elements[0].id);
                    setUrlNotice('');
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    selectedSampleId === sample.id
                      ? 'border-[#0056B3] bg-blue-50 text-[#001F3F] high-contrast:border-yellow-300 high-contrast:bg-neutral-900 high-contrast:text-yellow-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                  }`}
                >
                  {sample.platform} Sample
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mode Content */}
      {activeMode === 'extension' ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
          <div className="flex items-center gap-2 text-[#001F3F] high-contrast:text-yellow-300">
            <Code2 className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold">
              Chrome Extension (Manifest V3) Bridge Contract
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
            When deployed as a Chrome Extension, the content script runs directly inside the active
            Upwork, LinkedIn, Indeed, Fiverr, or Freelancer tab and sends structured DOM elements and
            actual form values to the AllWays verification engine using this schema:
          </p>

          <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100 high-contrast:border-white">
            {JSON.stringify(createSampleExtensionBridgePayload(activeSample), null, 2)}
          </pre>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {activeMode === 'html' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <label
                htmlFor="html-snippet-input"
                className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Paste HTML Markup (Parsed Locally via Browser DOMParser)
              </label>
              <textarea
                id="html-snippet-input"
                rows={6}
                value={htmlSnippet}
                onChange={(e) => setHtmlSnippet(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>
          )}

          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter detected elements">
              {CATEGORY_LABELS.map((cat) => {
                const active = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-semibold text-slate-700 high-contrast:text-slate-200">
              <span className="tabular-nums">{displayedElements.length} elements</span>
              <span className="mx-2 text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className={missingAltCount > 0 ? 'text-amber-700 high-contrast:text-yellow-300' : 'text-[#1a73e8]'}>
                {missingAltCount} missing alt-text warnings
              </span>
            </div>
          </div>

          {/* Interactive Split: Element List + Detail Inspector */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7 high-contrast:border-white high-contrast:bg-black">
              <div className="border-b border-slate-200 px-5 py-3.5 high-contrast:border-slate-700">
                <h2 className="font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
                  {activeMode === 'sample'
                    ? `${activeSample.title} (Simulated Sample)`
                    : 'Live Parsed HTML Elements'}
                </h2>
              </div>

              {displayedElements.length === 0 ? (
                <p className="p-6 text-sm text-slate-600 high-contrast:text-slate-300">
                  No elements matched this category filter. Select &ldquo;All Elements&rdquo; to
                  view every detected node.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 high-contrast:divide-slate-700">
                  {displayedElements.map((el) => {
                    const isSelected = selectedElement?.id === el.id;
                    const hasIssue =
                      el.altTextStatus === 'missing' ||
                      el.accessibilityNote.startsWith('WARNING') ||
                      el.accessibilityNote.startsWith('ERROR') ||
                      el.accessibilityNote.startsWith('CRITICAL');

                    return (
                      <li key={el.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedElementId(el.id)}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`flex w-full items-start justify-between gap-4 px-5 py-3.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 high-contrast:bg-neutral-900'
                              : 'hover:bg-slate-50 high-contrast:hover:bg-neutral-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 high-contrast:text-slate-400">
                              <span className="font-mono font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                                #{el.focusOrder} {el.tag}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>Role: {el.role}</span>
                              {el.required && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                                    Required
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold text-[#001F3F] high-contrast:text-white">
                              {el.accessibleName}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
                              hasIssue
                                ? 'text-amber-700 high-contrast:text-yellow-300'
                                : 'text-[#1a73e8] high-contrast:text-green-400'
                            }`}
                          >
                            {hasIssue ? (
                              <>
                                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                Check
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Clear
                              </>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Selected Element Inspector */}
            <aside
              aria-label="Selected element details"
              className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 high-contrast:border-white high-contrast:bg-black"
            >
              {selectedElement ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
                      Element Inspector
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        onSpeakText(
                          `Focus order ${selectedElement.focusOrder}. ${selectedElement.role}. Accessible name: ${selectedElement.accessibleName}. ${selectedElement.accessibilityNote}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:text-yellow-300"
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                      Read Element
                    </button>
                  </div>

                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                        Accessible Name
                      </dt>
                      <dd className="mt-1 font-semibold text-[#001F3F] high-contrast:text-white">
                        {selectedElement.accessibleName}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                          HTML Tag
                        </dt>
                        <dd className="mt-1 font-mono text-xs text-slate-800 high-contrast:text-slate-200">
                          &lt;{selectedElement.tag}&gt;
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                          ARIA Role & Tab Order
                        </dt>
                        <dd className="mt-1 text-xs text-slate-800 high-contrast:text-slate-200">
                          {selectedElement.role} (Order #{selectedElement.focusOrder})
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                        CSS Selector
                      </dt>
                      <dd className="mt-1 rounded bg-slate-100 px-2.5 py-1.5 font-mono text-xs text-slate-900 high-contrast:bg-neutral-900 high-contrast:text-cyan-300">
                        {selectedElement.selector}
                      </dd>
                    </div>
                    {selectedElement.currentValue && (
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                          Current Detected Value
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-semibold text-red-700 high-contrast:text-yellow-300">
                          {selectedElement.currentValue}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
                        Accessibility Guidance
                      </dt>
                      <dd className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 high-contrast:border-white high-contrast:bg-neutral-950 high-contrast:text-white">
                        {selectedElement.accessibilityNote}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 border-t border-slate-200 pt-4 high-contrast:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onNavigate('verify')}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#001F3F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
                    >
                      <Globe className="h-4 w-4" aria-hidden="true" />
                      Verify Form Values Against Intended Data
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Select an element to inspect its details.</p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};
