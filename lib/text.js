function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanLine(value) {
  return String(value == null ? '' : value).replace(/\r/g, '').trim();
}

function stripFences(value) {
  return cleanLine(value).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function stripHashtags(value) {
  return String(value || '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractUrls(value) {
  return String(value || '').match(/https?:\/\/[^\s)]+/gi) || [];
}

function allowedUrls(row) {
  const bag = [];
  [row.cta_link, row.raw_caption, row.source_text, row.source_link].forEach((part) => {
    extractUrls(part).forEach((url) => bag.push(url.replace(/[.,]$/, '')));
  });
  if (row.cta_link) bag.push(String(row.cta_link).trim());
  return bag;
}

function stripUnknownUrls(text, row) {
  const allowed = new Set(allowedUrls(row).map((url) => url.replace(/\/$/, '')));
  const removed = [];
  const cleaned = String(text || '').replace(/https?:\/\/[^\s)]+/gi, (url) => {
    const bare = url.replace(/[.,]$/, '').replace(/\/$/, '');
    if (allowed.has(bare)) return url;
    removed.push(url);
    return '';
  }).replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
  return { text: cleaned, removed };
}

function makeToken() {
  let token = '';
  for (let i = 0; i < 24; i += 1) {
    token += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  }
  return token;
}

function tokensMatch(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a.length || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clip(value, max) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return text.slice(0, max);
}
