let sheet;
try {
  sheet = Object.assign({}, $('Mark Name Lookup').item.json);
} catch (error) {
  sheet = Object.assign({}, $('Mark Name Lookup').first().json);
}
const files = ($json && Array.isArray($json.files)) ? $json.files : [];

function isFolder(file) {
  return String(file.mimeType || '').indexOf('folder') !== -1;
}
function isImage(file) {
  const mime = String(file.mimeType || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return mime.indexOf('image/') === 0 || /\.(png|jpe?g|webp|gif)$/.test(name);
}
function byName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
}
function folderScore(name) {
  const version = String(name || '').match(/version\s*(\d+)/i);
  if (version) return 1000 + Number(version[1]);
  const num = String(name || '').match(/(\d+)/);
  return num ? Number(num[1]) : 0;
}

const images = files.filter(isImage).sort(byName);
if (images.length >= 2) {
  return [{ json: Object.assign({}, sheet, { _slidesReady: 'yes', _imageFiles: images, drive_folder_id: '' }) }];
}
const folders = files.filter(isFolder).sort((a, b) => folderScore(b.name) - folderScore(a.name) || byName(a, b));
const next = folders[0];
return [{ json: Object.assign({}, sheet, { _slidesReady: 'no', _imageFiles: [], drive_folder_id: next ? next.id : '' }) }];
