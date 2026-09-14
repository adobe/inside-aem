/**
 * Citation extraction/resolution shared by both search blocks.
 *
 * Confirmed empirically 2026-09-14 by capturing a real raw SSE stream
 * against the live `inside-aem-aicoc` pack (see docs/goal4-checklist.md,
 * Phase 3's raw-stream-capture task):
 *  - FluffyJaws's `annotations` field (the OpenAI-style structured citation
 *    slot) is always empty — citations are text-embedded only, never
 *    structured, confirming the plan's original caution.
 *  - The model cites sources as a raw `adobe.sharepoint.com` document URL —
 *    for BOTH write-ups and transcripts. Our `Source session write-up:`
 *    annotation line inside transcripts does not reliably override this
 *    (observed once still citing the raw transcript file).
 *
 * So: rather than trust FluffyJaws to cite our public URL, this module
 * recognizes a raw SharePoint doc URL, extracts its filename, and resolves
 * it to the real public page via the site's own indexes — the same
 * strategy already worked out for building the hub block's source cards.
 */

import { fetchBlogArticleIndex } from './scripts.js';

const AICOC_INDEX_URL = '/en/aicoc-index.json';
let aicocIndexCache = null;

async function fetchAicocIndex() {
  if (aicocIndexCache) return aicocIndexCache;
  const sessions = [];
  const limit = 500;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(`${AICOC_INDEX_URL}?limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    if (!json.data?.length) break;
    json.data.forEach((row) => sessions.push({
      path: (row.path || '').split('.')[0],
      title: row.title || '',
      presenter: row.presenter || row.author || '',
    }));
    const consumed = (json.offset || 0) + (json.limit || json.data.length);
    if (!json.total || consumed >= json.total) break;
    offset = consumed;
  }
  aicocIndexCache = sessions;
  return sessions;
}

function indexEntry(map, path, info) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const entry = { ...info, path: normalized };
  map.set(normalized, entry);
  // Also index by trailing slug so a bare SharePoint filename (no folder
  // context) can still resolve — see slugFromSharePointUrl() below.
  const slug = normalized.split('/').filter(Boolean).pop();
  if (slug) map.set(slug, entry);
}

let siteIndexPromise = null;

/** Path/slug -> { title, kind: 'Blog'|'AI CoC', meta, path } */
export function buildSiteIndex() {
  if (!siteIndexPromise) {
    siteIndexPromise = (async () => {
      const map = new Map();

      let blogIndex = await fetchBlogArticleIndex();
      while (!blogIndex.complete) {
        // eslint-disable-next-line no-await-in-loop
        blogIndex = await fetchBlogArticleIndex();
      }
      Object.entries(blogIndex.byPath).forEach(([path, article]) => {
        indexEntry(map, path, { title: article.title, kind: 'Blog', meta: article.author || '' });
      });

      const sessions = await fetchAicocIndex();
      sessions.forEach((s) => {
        indexEntry(map, s.path, { title: s.title, kind: 'AI CoC', meta: s.presenter || '' });
      });

      return map;
    })();
  }
  return siteIndexPromise;
}

const PUBLIC_URL_RE = /https:\/\/(?:culture-tecture|re-think)\.adobe\.com\/[^\s)<>"']+/g;
const SHAREPOINT_URL_RE = /https:\/\/adobe(?:-my)?\.sharepoint\.com\/[^\s)<>"']*InsideAEM[^\s)<>"']*\.docx/gi;

function cleanTrailingPunct(url) {
  return url.replace(/[.,;:)]+$/, '');
}

function isPublicUrl(url) {
  return /^https:\/\/(culture-tecture|re-think)\.adobe\.com\//.test(url);
}

function slugFromSharePointUrl(url) {
  try {
    const filename = decodeURIComponent(url).split('/').pop() || '';
    return filename.replace(/\.docx$/i, '').replace(/-transcript$/i, '');
  } catch {
    return null;
  }
}

function extractRawCitationUrls(text) {
  const found = [
    ...(text.match(PUBLIC_URL_RE) || []),
    ...(text.match(SHAREPOINT_URL_RE) || []),
  ].map(cleanTrailingPunct);
  return [...new Set(found)];
}

/**
 * Resolves every citation-shaped URL found in an answer's text to a public
 * page, using the site's own indexes to translate raw SharePoint doc URLs.
 * Unresolvable SharePoint links (no matching index entry) are dropped
 * rather than shown broken; already-public links pass through as-is.
 *
 * @returns {Promise<Array<{url: string, title?: string, kind?: string, meta?: string}>>}
 */
export default async function resolveCitations(text) {
  const rawUrls = extractRawCitationUrls(text);
  if (!rawUrls.length) return [];

  const index = await buildSiteIndex();
  const resolved = [];
  const seenUrls = new Set();

  rawUrls.forEach((url) => {
    if (isPublicUrl(url)) {
      let info;
      try {
        info = index.get(new URL(url).pathname);
      } catch {
        info = undefined;
      }
      const finalUrl = info ? `https://culture-tecture.adobe.com${info.path}` : url;
      if (!seenUrls.has(finalUrl)) {
        seenUrls.add(finalUrl);
        resolved.push({ url: finalUrl, ...info });
      }
      return;
    }

    const slug = slugFromSharePointUrl(url);
    const info = slug ? index.get(slug) : undefined;
    if (!info) {
      // eslint-disable-next-line no-console
      console.warn('fluffyjaws-citations: could not resolve SharePoint citation to a public URL', url);
      return;
    }
    const finalUrl = `https://culture-tecture.adobe.com${info.path}`;
    if (!seenUrls.has(finalUrl)) {
      seenUrls.add(finalUrl);
      resolved.push({ url: finalUrl, ...info });
    }
  });

  return resolved;
}
