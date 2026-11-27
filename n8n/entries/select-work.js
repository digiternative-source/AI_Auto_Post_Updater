const config = $('Config').first().json;
const packed = $input.first().json || {};
const work = selectWork(packed.rows || [], config, new Date());
const items = [];
work.prepare.forEach((row) => items.push({ json: Object.assign({ _action: 'prepare' }, row) }));
work.publish.forEach((row) => items.push({ json: Object.assign({ _action: 'publish', _fromSchedule: true }, row) }));
if (!items.length) return [{ json: { _action: 'skip' } }];
return items;
