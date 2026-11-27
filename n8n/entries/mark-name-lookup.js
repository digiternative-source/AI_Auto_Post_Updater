const row = $json;
const name = String(row.drive_file_name || '').trim();
const folder = String(row.drive_folder_name || '').trim();
const id = String(row.drive_file_id || '').trim();
let lookup = 'no';
if (!id && folder) lookup = 'folder';
else if (!id && name) lookup = 'file';
return [{ json: Object.assign({}, row, { _lookup: lookup }) }];
