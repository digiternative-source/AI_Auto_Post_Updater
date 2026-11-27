const events = [];
for (const item of $input.all()) {
  const row = item.json || {};
  if (row.id && (row.summary || row.start)) events.push(row);
}
return [{ json: { events } }];
