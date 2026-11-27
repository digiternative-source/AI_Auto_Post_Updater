let prev;
try {
  prev = $('IG Prepare').item.json;
} catch (error) {
  prev = $('IG Prepare').first().json;
}
let publish = {};
try { publish = $('IG Publish').item.json || {}; } catch (error) { publish = $('IG Publish').first().json || {}; }
const mediaId = publish.id || '';
const permalink = $json.permalink || '';
if (!mediaId) {
  const message = (publish.error && (publish.error.message || JSON.stringify(publish.error))) || 'Instagram ne publish id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: permalink }) }];
