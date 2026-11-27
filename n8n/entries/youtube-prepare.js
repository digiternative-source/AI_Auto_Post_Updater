function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
if (!row.drive_file_id || row.media_kind !== 'video') return fail(row, 'YouTube ko Drive wali video file chahiye.');
if (!row.prepared_title && !row.topic) return fail(row, 'YouTube title khali hai.');
return [{ json: Object.assign({}, row, { ready: 'yes' }) }];
