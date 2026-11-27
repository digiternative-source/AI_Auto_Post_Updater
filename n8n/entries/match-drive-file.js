let base;
try {
  base = $('Mark Name Lookup').item.json;
} catch (error) {
  base = $('Mark Name Lookup').first().json;
}
const files = $json && Array.isArray($json.files) ? $json.files : [];
const want = String(base.drive_file_name || '').trim().toLowerCase();
const found = files.find((file) => String(file.name || '').trim().toLowerCase() === want);
if (!found) {
  return [{
    json: Object.assign({}, base, {
      drive_file_id: '',
      warnings: 'Drive folder mein yeh file nahi mili: ' + (base.drive_file_name || ''),
    }),
  }];
}
return [{
  json: Object.assign({}, base, {
    drive_file_id: found.id,
    drive_url: found.webViewLink || base.drive_url || '',
  }),
}];
