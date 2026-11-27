let sheet;
try {
  sheet = Object.assign({}, $('Mark Name Lookup').item.json);
} catch (error) {
  sheet = Object.assign({}, $('Mark Name Lookup').first().json);
}
const images = ($json && Array.isArray($json._imageFiles)) ? $json._imageFiles : [];
const fromDrive = images.map((file) => publicDriveUrl(file.id)).filter(Boolean);
const fallback = String(sheet.media_urls || '').split(/\s+/).map((url) => url.trim()).filter((url) => /^https:\/\//i.test(url));
const urls = fromDrive.length >= 2 ? fromDrive : fallback;
if (urls.length < 2) {
  return [{
    json: Object.assign({}, sheet, {
      media_kind: 'carousel',
      media_urls: '',
      media_public_url: '',
      can_publish: 'no',
      warnings: 'Carousel folder mein 2 se 10 images nahi mili.',
    }),
  }];
}
return [{
  json: Object.assign({}, sheet, {
    media_kind: 'carousel',
    media_urls: urls.join('\n'),
    media_public_url: urls[0],
    drive_file_id: images[0] ? images[0].id : sheet.drive_file_id || '',
    can_publish: 'yes',
    warnings: '',
  }),
}];
