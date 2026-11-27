let base;
try {
  base = $('Loop Over Items').item.json;
} catch (error) {
  base = $('Loop Over Items').first().json;
}
const incoming = $json || {};
if (incoming.media_kind === 'carousel' || base.media_kind === 'carousel') {
  const urls = String(incoming.media_urls || base.media_urls || '').trim();
  return [{
    json: Object.assign({}, base, incoming, {
      media_kind: 'carousel',
      media_urls: urls,
      media_public_url: String(incoming.media_public_url || base.media_public_url || '').trim(),
      source_kind: '',
    }),
  }];
}
const fileId = base.drive_file_id || (!incoming.error && incoming.id) || '';
const mimeType = incoming.mimeType || '';
let mediaKind = fileId ? mediaKindFromMime(mimeType, incoming.name || '') : 'none';
const isDoc = mediaKind === 'document';
if (mediaKind === 'file' || mediaKind === 'document') mediaKind = 'none';
return [{
  json: Object.assign({}, base, {
    drive_file_id: fileId,
    media_kind: mediaKind,
    source_kind: isDoc ? 'document' : '',
    media_public_url: fileId && (mediaKind === 'image' || mediaKind === 'video') ? publicDriveUrl(fileId) : '',
    drive_name: incoming.name || '',
  }),
}];
