function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
if (!row.facebook_page_id) return fail(row, 'Facebook page id Config mein khali hai.');
if (!row.full_post_preview) return fail(row, 'Facebook caption khali hai.');
const slides = String(row.media_urls || '').split(/\s+/).filter((url) => /^https:\/\//i.test(url));
if (row.media_kind === 'carousel' && (slides.length < 2 || slides.length > 10)) {
  return fail(row, 'Facebook carousel ko 2 se 10 images chahiye.');
}
return [{ json: Object.assign({}, row, { ready: 'yes' }) }];
