let sheet;
try {
  sheet = Object.assign({}, $('Mark Name Lookup').item.json);
} catch (error) {
  sheet = Object.assign({}, $('Mark Name Lookup').first().json);
}
const files = ($json && Array.isArray($json.files)) ? $json.files : [];
const want = String(sheet.drive_folder_name || '').trim().toLowerCase();
const folder = files.find((file) => {
  return String(file.mimeType || '').indexOf('folder') !== -1 && String(file.name || '').trim().toLowerCase() === want;
});
if (!folder) {
  return [{ json: Object.assign({}, sheet, { drive_folder_id: '' }) }];
}
return [{ json: Object.assign({}, sheet, { drive_folder_id: folder.id }) }];
