const rows = [];
for (const item of $input.all()) {
  if (item.json && item.json.post_id) rows.push(item.json);
}
return [{ json: { rows } }];
