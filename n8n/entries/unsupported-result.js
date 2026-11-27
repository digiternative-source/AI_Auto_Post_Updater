return [{ json: Object.assign({}, $json, { ok: false, error: 'Yeh platform is workflow mein connected nahi: ' + ($json.platform || 'unknown') }) }];
