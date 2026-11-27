function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
if (!row.ig_user_id) return fail(row, 'Instagram user id Config mein khali hai.');
const slides = String(row.media_urls || '').split(/\s+/).filter((url) => /^https:\/\//i.test(url));
if (row.media_kind === 'carousel') {
  if (slides.length < 2 || slides.length > 10) return fail(row, 'Instagram carousel ko 2 se 10 images chahiye.');
  return [{ json: Object.assign({}, row, { ready: 'yes' }) }];
}
if (!row.media_public_url) return fail(row, 'Instagram ke liye public media URL nahi hai.');
if (row.media_kind !== 'image' && row.media_kind !== 'video') return fail(row, 'Instagram ko image ya video chahiye.');
return [{ json: Object.assign({}, row, { ready: 'yes' }) }];
