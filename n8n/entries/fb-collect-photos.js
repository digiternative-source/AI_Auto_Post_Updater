const items = $input.all();
const ids = [];
let error = '';
items.forEach((item) => {
  const body = item.json || {};
  if (body.error) {
    error = body.error.message || JSON.stringify(body.error);
    return;
  }
  if (!body.id) error = error || 'Facebook ne photo id nahi di.';
  else ids.push(body.id);
});
const base = items[0] ? items[0].json : {};
if (error || ids.length < 2) {
  return [{ json: Object.assign({}, base, { ready: 'no', error: error || 'Carousel photos adhuri hain.' }) }];
}
return [{ json: Object.assign({}, base, { ready: 'yes', facebookPhotoIds: ids }) }];
