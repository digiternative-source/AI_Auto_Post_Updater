let prev;
try { prev = $('FB Prepare').item.json; } catch (error) { prev = $('FB Prepare').first().json; }
const id = $json.id || $json.post_id || '';
if (!id || $json.error) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || 'Facebook ne post id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: 'https://www.facebook.com/' + id }) }];
