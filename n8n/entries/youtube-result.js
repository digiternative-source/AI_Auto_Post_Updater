let prev;
try { prev = $('YouTube Prepare').item.json; } catch (error) { prev = $('YouTube Prepare').first().json; }
const id = $json.id || '';
if ($json.error || !id) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || 'YouTube ne video id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: 'https://www.youtube.com/watch?v=' + id }) }];
