let prev;
try {
  prev = $('IG Prepare').item.json;
} catch (error) {
  prev = $('IG Prepare').first().json;
}
const creationId = $json.id || '';
if (!creationId) {
  const message = ($json.error && ($json.error.message || JSON.stringify($json.error))) || clip(JSON.stringify($json), 300);
  return [{ json: Object.assign({}, prev, { ok: false, ready: 'no', error: 'Instagram container nahi bana. ' + message }) }];
}
await new Promise((resolve) => setTimeout(resolve, 15000));
return [{ json: Object.assign({}, prev, { ok: true, ready: 'yes', creationId }) }];
