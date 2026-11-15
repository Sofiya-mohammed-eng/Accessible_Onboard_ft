function isShown(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  return element.getClientRects().length > 0;
}

export function openHeaderNavigation(doc: Document): boolean {
  const openButton = doc.querySelector<HTMLButtonElement>('button[aria-label="Open navigation menu"]');
  if (openButton && isShown(openButton)) {
    openButton.click();
    const expanded = openButton.getAttribute('aria-expanded') === 'true';
    const drawer = doc.querySelector<HTMLElement>('nav[aria-label="Mobile primary navigation"]');
    const first = drawer?.querySelector<HTMLButtonElement>('button');
    if (expanded && drawer && first) {
      first.focus();
      return doc.activeElement === first || expanded;
    }
    return false;
  }

  const nav = doc.querySelector<HTMLElement>('nav[aria-label="Primary navigation"]');
  const first = nav?.querySelector<HTMLButtonElement>('button');
  if (nav && first && isShown(first)) {
    first.focus();
    return doc.activeElement === first;
  }
  return false;
}

export function readVisiblePage(root: HTMLElement | null): string | null {
  if (!root) return null;
  const selector = 'h1, h2, h3, p, li, dt, dd, button, label, legend';
  const blocks = [...root.querySelectorAll<HTMLElement>(selector)].filter((node) => {
    if (node.closest('.sr-only, [aria-hidden="true"], [data-voice-close]')) return false;
    if (!isShown(node)) return false;
    return !node.querySelector(selector);
  });
  const lines: string[] = [];
  const add = (text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 2 || lines[lines.length - 1] === clean) return;
    lines.push(clean);
  };
  for (const node of blocks) {
    let text = node.textContent || '';
    const field = node.querySelector('input, textarea');
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      const hiddenValue = field instanceof HTMLInputElement && (field.type === 'password' || field.type === 'hidden');
      if (!hiddenValue && field.type !== 'radio' && field.type !== 'checkbox' && field.type !== 'file' && field.value.trim()) {
        text = `${text} ${field.value.trim()}`;
      }
    }
    add(text);
  }
  const spoken = lines.join('. ');
  return spoken.trim() ? spoken : null;
}

export function focusNamedField(root: HTMLElement | null, target: string): boolean {
  if (!root) return false;
  const email = root.querySelector<HTMLInputElement>('input[type="email"]');
  const field =
    target === 'email' || target === 'password' || target === 'name'
      ? target === 'email'
        ? email
        : target === 'password'
          ? root.querySelector<HTMLInputElement>('input[type="password"]')
          : root.querySelector<HTMLInputElement>('input[autocomplete="name"]')
      : email && !email.value.trim()
        ? email
        : root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            'input:not([type="hidden"]):not([type="password"]):not([disabled]), textarea:not([disabled])',
          );
  if (!(field instanceof HTMLElement) || !isShown(field)) return false;
  field.focus();
  return root.ownerDocument.activeElement === field;
}

export function goToNextQuestion(root: HTMLElement | null): boolean {
  if (!root) return false;
  const button = root.querySelector<HTMLButtonElement>('[data-voice="next"]');
  if (!button || button.disabled || button.getAttribute('data-voice') !== 'next') return false;
  if (button.getAttribute('data-voice') === 'submit' || button.type === 'submit') return false;
  button.click();
  return true;
}
