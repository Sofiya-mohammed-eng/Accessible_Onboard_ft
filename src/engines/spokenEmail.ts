const PROVIDERS = [
  'googlemail.com',
  'gmail.com',
  'yahoo.co.uk',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'protonmail.com',
  'proton.me',
  'icloud.com',
  'live.com',
  'example.com',
  'example.org',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'aol.com',
];

function addAt(local: string, domain: string) {
  const name = local.replace(/\.+$/g, '');
  const host = domain.replace(/^\.+/g, '');
  if (!name || !host.includes('.')) return '';
  return `${name}@${host}`;
}

export function emailLooksValid(value: string) {
  const [name, domain] = value.split('@');
  return Boolean(name && domain?.includes('.') && !value.includes(' '));
}

export function normalizeSpokenEmail(value: string) {
  let next = value.trim().toLowerCase();
  next = next
    .replace(/ጂሜል|ጅሜል|ጂሜይል|ጅሜይል/g, ' gmail ')
    .replace(/ያሁ/g, ' yahoo ')
    .replace(/አውትሉክ|ኣውትሉክ/g, ' outlook ')
    .replace(/ሆትሜል|ሆትሜይል/g, ' hotmail ')
    .replace(/አይክላውድ/g, ' icloud ')
    .replace(/ነጥብ|ዶት/g, ' dot ')
    .replace(/ኮም/g, ' com ')
    .replace(/ኦርግ/g, ' org ');

  next = next
    .replace(/(^|\s)(?:at|ኤት|አት|ኧት)(?=\s|$)/gi, '$1@')
    .replace(/(^|\s)dot(?=\s|$)/gi, '$1.');
  next = next.replace(/\s*@\s*/g, '@');
  next = next.replace(/\.?\s+(com|org|net|et|edu|gov)\b/gi, '.$1');
  next = next.replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim();

  if (!next.includes('@')) {
    const tokens = next.split(' ').filter(Boolean);
    const domainAt = tokens.findIndex((token) => token.includes('.'));
    if (domainAt > 0) {
      const withAt = addAt(tokens.slice(0, domainAt).join(''), tokens.slice(domainAt).join(''));
      if (withAt) return withAt;
    }
  }

  let compact = next.replace(/\s+/g, '');
  compact = compact
    .replace(/gmailcom/g, 'gmail.com')
    .replace(/yahoocom/g, 'yahoo.com')
    .replace(/outlookcom/g, 'outlook.com')
    .replace(/hotmailcom/g, 'hotmail.com')
    .replace(/icloudcom/g, 'icloud.com');

  if (!compact.includes('@')) {
    const provider = PROVIDERS.find((domain) => compact.endsWith(domain) && compact.length > domain.length);
    if (provider) {
      const withAt = addAt(compact.slice(0, -provider.length), provider);
      if (withAt) return withAt;
    }
  }

  return compact;
}
