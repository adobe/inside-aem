/**
 * AI CoC session formats.
 *
 * There is no single authoritative field for the format: the index picks up
 * `title` from the page H1, the browser tab title comes from the Metadata
 * Title, and authors also list the format in Tags. Those three don't always
 * agree, so detection looks at whatever sources the caller can supply and
 * takes the first match.
 *
 * Keep the list ordered by precedence — a title that mentions several formats
 * resolves to the first one listed here.
 */
const MATCHERS = [
  ['Brownbag', /brownbag/i],
  ['Outside Voices', /outside\s*voices/i],
  ['Show & Tell', /show\s*(?:&|and)\s*tell/i],
];

/** Every format, in display order — used to build the feed's filter dropdown. */
export const SESSION_FORMATS = ['Show & Tell', 'Brownbag', 'Outside Voices'];

/** The format's CSS modifier suffix, e.g. "Outside Voices" → "outside-voices". */
export function sessionFormatModifier(format) {
  return (format || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Detect the session format from any combination of strings and string arrays
 * (title, H1 text, tags, …).
 *
 * @param {...(string|string[])} sources
 * @returns {string} one of SESSION_FORMATS, or '' when nothing matches
 */
export function detectSessionFormat(...sources) {
  const haystack = sources.flat().filter(Boolean).join(' · ');
  const hit = MATCHERS.find(([, re]) => re.test(haystack));
  return hit ? hit[0] : '';
}
