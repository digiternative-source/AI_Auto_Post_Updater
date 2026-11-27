const config = $('Config').first().json;
const merged = $input.first().json || {};
const now = new Date();
const calendarUpserts = mergeCalendarRows(merged.rows || [], merged.events || [], config.timezone || 'Asia/Karachi');
const repairs = repairRows(merged.rows || [], config, now);
const byId = new Map();
calendarUpserts.forEach((row) => byId.set(String(row.post_id), row));
repairs.forEach((row) => {
  if (!byId.has(String(row.post_id))) byId.set(String(row.post_id), row);
});
const upserts = Array.from(byId.values());
if (!upserts.length) return [{ json: { _noUpsert: true } }];
return upserts.map((row) => ({ json: row }));
