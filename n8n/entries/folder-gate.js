const config = $('Config').first().json;
const hour = hourInZone(new Date(), config.timezone || 'Asia/Karachi');
if (!config.driveFolderId || config.driveFolderId.indexOf('YOUR_') === 0 || hour !== Number(config.folderCheckHour || 9)) {
  return [{ json: { _skipFolder: true } }];
}
return [{ json: { _skipFolder: false, driveFolderId: config.driveFolderId, notifyEmail: config.notifyEmail } }];
