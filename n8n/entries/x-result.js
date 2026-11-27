let prev;
try { prev = $('X Prepare').item.json; } catch (error) { prev = $('X Prepare').first().json; }
const id = $json.data && $json.data.id;
if ($json.error || !id) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || clip(JSON.stringify($json), 300) || 'X ne tweet id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: 'https://x.com/i/web/status/' + id }) }];
