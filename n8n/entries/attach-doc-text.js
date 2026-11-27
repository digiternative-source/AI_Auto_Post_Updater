let base;
try {
  base = $('Normalize Media').item.json;
} catch (error) {
  base = $('Normalize Media').first().json;
}
let text = '';
if (typeof $json === 'string') text = $json;
else if ($json && typeof $json.data === 'string') text = $json.data;
else if ($json && typeof $json.body === 'string') text = $json.body;
return [{ json: Object.assign({}, base, { source_text: clip(text, 8000) }) }];
