export const dictionarySource = 'https://freedictionaryapi.com/';

export type Definition = {
  partOfSpeech: string;
  meanings: string[];
  synonyms: string[];
};

export type DictionaryEntry = {
  definitions: Definition[];
  sourceUrl: string;
};

export class DictionaryLookupError extends Error {}

export function dictionaryWord(text: string) {
  const word = text.normalize('NFC').replace(/[\u00AD\u200B]/g, '').replace(/[’‘]/g, "'")
    .replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '');
  return word.length <= 64 && /^\p{L}[\p{L}\p{M}]*(?:['-]\p{L}[\p{L}\p{M}]*)*$/u.test(word) ? word : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseDictionaryEntry(payload: unknown, word: string): DictionaryEntry | null {
  const data = asRecord(payload);
  if (!Array.isArray(data.entries)) throw new Error('Unexpected dictionary response.');
  const groups = new Map<string, Definition>();

  for (const value of data.entries) {
    const entry = asRecord(value);
    const partOfSpeech = asText(entry.partOfSpeech);
    const senses = asList(entry.senses).map(asRecord);
    const meanings = senses.map((sense) => asText(sense.definition)).filter(Boolean);
    if (meanings.length === 0) continue;

    const previous = groups.get(partOfSpeech);
    const synonyms = [...asList(entry.synonyms), ...senses.flatMap((sense) => asList(sense.synonyms))]
      .map(asText)
      .filter((synonym) => synonym && synonym.toLowerCase() !== word.toLowerCase());
    groups.set(partOfSpeech, {
      partOfSpeech,
      meanings: [...new Set([...(previous?.meanings ?? []), ...meanings])].slice(0, 6),
      synonyms: [...new Set([...(previous?.synonyms ?? []), ...synonyms])].slice(0, 12),
    });
  }
  if (groups.size === 0) return null;

  const source = asText(asRecord(data.source).url);
  const sourceUrl = /^https:\/\/(?:en\.)?wiktionary\.org\/wiki\//i.test(source)
    ? source : `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#English`;
  return { definitions: [...groups.values()], sourceUrl };
}

export async function lookupWord(word: string, signal: AbortSignal) {
  const response = await fetch(`${dictionarySource}api/v1/entries/en/${encodeURIComponent(word.toLowerCase())}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (response.status === 429) throw new DictionaryLookupError('The dictionary is busy. Try again later.');
  if (!response.ok) throw new DictionaryLookupError('The dictionary is unavailable right now.');
  return parseDictionaryEntry(await response.json(), word);
}
