let base;
try {
  base = $('Build Approval Email').item.json;
} catch (error) {
  base = $('Build Approval Email').first().json;
}
if ($json.error) {
  const message = $json.error.message || $json.error.description || JSON.stringify($json.error);
  return [{
    json: Object.assign({}, base, {
      status: 'Failed',
      error: clip('Approval email failed: ' + message, 500),
      _emailFailed: true,
    }),
  }];
}
return [{ json: Object.assign({}, base, { _emailFailed: false }) }];
