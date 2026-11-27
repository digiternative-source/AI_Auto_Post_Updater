return [{ json: Object.assign({}, $json, { status: 'Publishing', error: '', updated_at: new Date().toISOString() }) }];
