if ($json.error) return [{ json: { _skipFolder: true } }];
const packed = $('Pack Sheet Again').first().json || {};
const files = $json.files || ($json.body && $json.body.files) || [];
const missing = untrackedDriveFiles(files, packed.rows || []);
if (!missing.length) return [{ json: { _skipFolder: true } }];
const email = renderFolderDigest(missing);
return [{ json: Object.assign({ notifyEmail: $('Config').first().json.notifyEmail, _skipFolder: false }, email) }];
