const now = new Date().toISOString();
return [{ json: Object.assign({}, $json, { status: 'Preparing', error: '', updated_at: now }) }];
