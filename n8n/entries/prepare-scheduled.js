const row = Object.assign({}, $json, { _fromSchedule: true, spreadsheetId: $json.spreadsheetId });
if (String(row.can_publish) !== 'yes') {
  return [{ json: Object.assign({}, row, { route: 'blocked', ok: false, error: row.warnings || row.error || 'Publish blocked' }) }];
}
return [{ json: Object.assign({}, row, { route: 'approve', status: 'Publishing', error: '', updated_at: new Date().toISOString() }) }];
