function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
if (!row.full_post_preview) return fail(row, 'X caption khali hai.');
if (String(row.full_post_preview).length > 280) return fail(row, 'X caption 280 characters se lambi hai.');
return [{ json: Object.assign({}, row, { ready: 'yes' }) }];
