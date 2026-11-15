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
  if (!name || !host.includes('.') || !/^[a-z0-9._%+-]+$/i.test(name)) return '';
  return `${name}@${host}`;
}

export function emailLooksValid(value: string) {
  if (!/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value)) {
    return false;
  }
  const tld = value.split('@')[1]?.split('.').pop()?.toLowerCase() || '';
  if (tld.length < 2) return false;
  return !/^(?:com|org|net|edu|gov)[a-z]+$/i.test(tld);
}

export function looksLikeEmailAttempt(value: string) {
  if (value.includes('@')) return true;
  return /(?:^|\s)(?:at|ኤት|አት|ኧት)\s+\S+(?:\s+\S+){0,4}\s+(?:dot|ነጥብ|ዶት)\s+\S+/i.test(value)
    || /(?:^|\s)(?:at|ኤት|አት|ኧት)\s+[a-z0-9.-]+\.[a-z]{2,}/i.test(value);
}

function providerAddress(compact: string) {
  const provider = PROVIDERS.find((domain) => compact.endsWith(domain) && compact.length > domain.length);
  if (!provider) return '';
  return addAt(compact.slice(0, -provider.length), provider);
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
  next = next.replace(/\s+/g, ' ').trim();

  const spokenAt = /(?:^|\s)(?:at|ኤት|አት|ኧት)(?=\s|$)/i.test(next);
  const spokenDot = /(?:^|\s)(?:dot|ነጥብ|ዶት)(?=\s|$)/i.test(next);
  const clearSpokenEmail = spokenAt && (spokenDot || /\s(?:com|org|net|et|edu|gov)\b/i.test(next) || /\s[a-z0-9.-]+\.[a-z]{2,}/i.test(next));

  if (next.includes('@') || clearSpokenEmail) {
    let spoken = next;
    if (clearSpokenEmail) {
      spoken = spoken
        .replace(/(^|\s)(?:at|ኤት|አት|ኧት)(?=\s|$)/gi, '$1@')
        .replace(/(^|\s)(?:dot|ነጥብ|ዶት)(?=\s|$)/gi, '$1.');
    }
    spoken = spoken
      .replace(/\s*@\s*/g, '@')
      .replace(/\s*\.\s*/g, '.')
      .replace(/\.{2,}/g, '.');
    const found = spoken.match(/[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}(?![a-z])/i);
    return (found?.[0] || spoken).replace(/\.+$/g, '');
  }

  const tokens = next.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    const compact = tokens[0]
      .replace(/gmailcom$/g, 'gmail.com')
      .replace(/yahoocom$/g, 'yahoo.com')
      .replace(/outlookcom$/g, 'outlook.com')
      .replace(/hotmailcom$/g, 'hotmail.com')
      .replace(/icloudcom$/g, 'icloud.com');
    if (compact.includes('@')) return compact;
    return providerAddress(compact) || compact;
  }
  if (tokens.length === 2 && /^[a-z0-9._%+-]+$/i.test(tokens[0]) && tokens[1].includes('.')) {
    return addAt(tokens[0], tokens[1]) || next;
  }
  return next;
}
