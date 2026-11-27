let prev;
try { prev = $('TikTok Prepare').item.json; } catch (error) { prev = $('TikTok Prepare').first().json; }
const id = $json.data && $json.data.publish_id;
if ($json.error || !id) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || clip(JSON.stringify($json), 300) || 'TikTok ne publish id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: 'TikTok publish id ' + id }) }];
