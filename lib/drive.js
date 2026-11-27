function extractDriveId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const fromPath = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath) return fromPath[1];
  const fromQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fromQuery) return fromQuery[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw) && raw.indexOf('/') === -1 && raw.indexOf('.') === -1) return raw;
  return '';
}

function mediaKindFromMime(mimeType, name) {
  const mime = String(mimeType || '').toLowerCase();
  const file = String(name || '').toLowerCase();
  if (mime === 'application/vnd.google-apps.document' || mime.indexOf('text/') === 0) return 'document';
  if (mime.indexOf('image/') === 0) return 'image';
  if (mime.indexOf('video/') === 0) return 'video';
  if (/\.(png|jpe?g|webp|gif)$/.test(file)) return 'image';
  if (/\.(mp4|mov|m4v|webm)$/.test(file)) return 'video';
  return 'file';
}

function publicDriveUrl(fileId) {
  if (!fileId) return '';
  return 'https://drive.google.com/uc?export=download&id=' + fileId;
}

function parseKeyedDescription(description) {
  const fields = { caption: '', drive: '', niche: '', link: '', voice: '', language: '' };
  let current = '';
  String(description || '').replace(/\r/g, '').split('\n').forEach((line) => {
    const match = line.match(/^(drive|caption|niche|link|voice|language)\s*:\s*(.*)$/i);
    if (match) {
      current = match[1].toLowerCase();
      fields[current] = match[2].trim();
      return;
    }
    if (current) fields[current] = (fields[current] + '\n' + line).trim();
  });
  return fields;
}

function untrackedDriveFiles(files, rows) {
  const known = new Set();
  (rows || []).forEach((row) => {
    if (row.drive_file_id) known.add(String(row.drive_file_id));
    const fromUrl = extractDriveId(row.drive_url);
    if (fromUrl) known.add(fromUrl);
  });
  return (files || []).filter((file) => {
    if (!file || !file.id) return false;
    if (String(file.mimeType || '').indexOf('application/vnd.google-apps.folder') === 0) return false;
    return !known.has(file.id);
  });
}
