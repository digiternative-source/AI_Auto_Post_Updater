let prev;
try { prev = $('LinkedIn Prepare').item.json; } catch (error) { prev = $('LinkedIn Prepare').first().json; }
const headers = $json.headers || {};
const body = $json.body && typeof $json.body === 'object' ? $json.body : $json;
const id = headers['x-restli-id'] || headers['X-Restli-Id'] || body.id || '';
if ($json.error || (Number($json.statusCode) >= 400) || !id) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || clip(JSON.stringify(body), 300) || 'LinkedIn ne post id nahi di.';
  return [{ json: Object.assign({}, prev, { ok: false, error: message, posted_url: '' }) }];
}
return [{ json: Object.assign({}, prev, { ok: true, error: '', posted_url: 'https://www.linkedin.com/feed/update/' + id }) }];
