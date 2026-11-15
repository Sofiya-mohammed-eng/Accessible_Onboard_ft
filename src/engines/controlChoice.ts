import { PreferredLanguage } from '../types/accessbridge';

export type ControlChoice = 'head' | 'eyes' | 'both' | 'voice' | 'keyboard';

interface ControlOption {
  id: ControlChoice;
  title: string;
  detail: string;
}

const OPTIONS: Record<PreferredLanguage, ControlOption[]> = {
  en: [
    { id: 'head', title: 'Head movement', detail: 'Move your head. Rest on a button to select it.' },
    { id: 'eyes', title: 'Eyes', detail: 'Look at a button. Rest there to select it.' },
    { id: 'both', title: 'Head and eyes', detail: 'Use your head and your eyes together.' },
    { id: 'voice', title: 'Voice', detail: 'Say what you want, and I will do it.' },
    { id: 'keyboard', title: 'Keyboard', detail: 'Use Tab to move, and Enter to select.' },
  ],
  am: [
    { id: 'head', title: 'የጭንቅላት እንቅስቃሴ', detail: 'ጭንቅላትዎን ያንቀሳቅሱ። ለመምረጥ በቁልፉ ላይ ትንሽ ይቆዩ።' },
    { id: 'eyes', title: 'ዓይን', detail: 'ቁልፉን ይመልከቱ። ለመምረጥ ትንሽ ይቆዩ።' },
    { id: 'both', title: 'ጭንቅላት እና ዓይን', detail: 'ጭንቅላትዎን እና ዓይንዎን አንድ ላይ ይጠቀሙ።' },
    { id: 'voice', title: 'ድምፅ', detail: 'የሚፈልጉትን ይናገሩ፣ እኔ አደርገዋለሁ።' },
    { id: 'keyboard', title: 'የቁልፍ ሰሌዳ', detail: 'ለመንቀሳቀስ ታብ፣ ለመምረጥ ኢንተር ይጫኑ።' },
  ],
};

export function controlOptions(language: PreferredLanguage): ControlOption[] {
  return OPTIONS[language];
}

export function controlPrompt(language: PreferredLanguage): string {
  if (language === 'am') {
    return 'የትኛውን ይመርጣሉ? የጭንቅላት እንቅስቃሴ፣ ዓይን፣ ጭንቅላት እና ዓይን፣ ድምፅ፣ ወይም የቁልፍ ሰሌዳ ይበሉ።';
  }
  return 'Which one do you prefer? You can say head movement, eyes, head and eyes, voice, or keyboard.';
}

export function controlRetry(language: PreferredLanguage): string {
  if (language === 'am') {
    return 'አልገባኝም። የጭንቅላት እንቅስቃሴ፣ ዓይን፣ ጭንቅላት እና ዓይን፣ ድምፅ፣ ወይም የቁልፍ ሰሌዳ ይበሉ።';
  }
  return 'I did not catch that. Say head movement, eyes, head and eyes, voice, or keyboard.';
}

export function controlConfirmation(choice: ControlChoice, language: PreferredLanguage): string {
  const english: Record<ControlChoice, string> = {
    head: 'Head movement is on. Move your head to a button, then rest there to select it. Allow the camera if your browser asks.',
    eyes: 'Eye control is on. Look at a button, then rest there to select it. Allow the camera if your browser asks.',
    both: 'Head and eye control is on. Move toward a button, then rest there to select it. Allow the camera if your browser asks.',
    voice: 'Voice is on. Tell me what you want, and I will do it.',
    keyboard: 'Keyboard is on. Use Tab to move, and Enter to select.',
  };
  const amharic: Record<ControlChoice, string> = {
    head: 'የጭንቅላት እንቅስቃሴ በርቷል። ጭንቅላትዎን ወደ ቁልፉ ያንቀሳቅሱ፣ ከዚያ ለመምረጥ ትንሽ ይቆዩ። ካሜራውን ቢጠይቅ ይፍቀዱ።',
    eyes: 'የዓይን መቆጣጠሪያ በርቷል። ቁልፉን ይመልከቱ፣ ከዚያ ለመምረጥ ትንሽ ይቆዩ። ካሜራውን ቢጠይቅ ይፍቀዱ።',
    both: 'የጭንቅላት እና የዓይን መቆጣጠሪያ በርቷል። ወደ ቁልፉ ይቅረቡ፣ ከዚያ ለመምረጥ ትንሽ ይቆዩ። ካሜራውን ቢጠይቅ ይፍቀዱ።',
    voice: 'ድምፅ በርቷል። የሚፈልጉትን ይናገሩ፣ እኔ አደርገዋለሁ።',
    keyboard: 'የቁልፍ ሰሌዳ በርቷል። ለመንቀሳቀስ ታብ፣ ለመምረጥ ኢንተር ይጫኑ።',
  };
  return language === 'am' ? amharic[choice] : english[choice];
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

export function interpretControlChoice(text: string): ControlChoice | null {
  const lower = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!lower) return null;

  if (
    includesAny(lower, [
      'head and eye',
      'head and eyes',
      'both',
      'together',
      'hybrid',
      'ጭንቅላት እና ዓይን',
      'ጭንቅላትና ዓይን',
      'ጭንቅላት እና አይን',
      'ሁለቱም',
    ])
  ) {
    return 'both';
  }

  const mentionsHead = includesAny(lower, ['head', 'ጭንቅላት', 'ras']);
  const mentionsEyes = includesAny(lower, ['eyes', 'eye', 'ዓይን', 'አይን', 'ayin', 'ayn']);
  if (mentionsHead && mentionsEyes) return 'both';
  if (mentionsEyes) return 'eyes';
  if (mentionsHead || includesAny(lower, ['chinq'])) return 'head';
  if (includesAny(lower, ['voice', 'speak', 'talk', 'ድምፅ', 'ድምጽ', 'dimts'])) return 'voice';
  if (includesAny(lower, ['keyboard', 'keys', 'tab', 'ቁልፍ', 'kulf'])) return 'keyboard';
  return null;
}
