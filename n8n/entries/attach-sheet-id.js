const config = $('Config').first().json;
return [{ json: Object.assign({}, $json, { spreadsheetId: config.spreadsheetId, _fromSchedule: true }) }];
