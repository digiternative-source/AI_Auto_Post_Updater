let entry = 'decision';
try {
  if ($('Review Webhook').isExecuted) entry = 'review';
} catch (error) {
  entry = 'decision';
}
return [{ json: { spreadsheetId: $json.spreadsheetId, _entry: entry } }];
