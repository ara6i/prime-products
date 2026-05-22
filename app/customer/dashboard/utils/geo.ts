export function flagFromIso2(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";

  const base = 0x1f1a5;
  const codePoints = Array.from(iso2.toUpperCase()).map((character) => base + character.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
