#!/usr/bin/env python3
"""Speak text with gTTS. Language code is the first argument. Text is read from stdin."""

import sys

from gtts import gTTS


def main() -> None:
    lang = sys.argv[1] if len(sys.argv) > 1 else "am"
    if lang.lower().startswith("am"):
        lang = "am"
    elif lang.lower().startswith("en"):
        lang = "en"
    slow = len(sys.argv) > 2 and sys.argv[2] in ("1", "slow", "true")
    text = sys.stdin.read().strip()
    if not text:
        sys.exit(2)
    gTTS(text=text, lang=lang, slow=slow).write_to_fp(sys.stdout.buffer)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
