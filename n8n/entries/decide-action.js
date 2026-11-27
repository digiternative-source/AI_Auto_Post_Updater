const body = $('Decision Webhook').first().json.body || {};
const rows = $input.all().map((item) => item.json).filter((row) => row && row.post_id);
const result = decide(rows, body, new Date());
const spreadsheetId = $('Branch').first().json.spreadsheetId;
const titles = {
  decline: 'Decline ho gaya',
  hold: 'Approve ho gaya',
  approve: 'Post lag rahi hai',
  blocked: 'Approve band hai',
  already: 'Pehle se faisla ho chuka hai',
  invalid: 'Link valid nahi',
};
const pageHtml = renderResultPage(titles[result.route] || 'Update', result.message || 'Post ab platform pe ja rahi hai.');
const base = Object.assign({}, result.row || {}, result.sheet || {}, {
  route: result.route,
  pageHtml,
  emailSubject: titles[result.route] || 'Post update',
  emailHtml: pageHtml,
  spreadsheetId,
  _fromSchedule: false,
  message: result.message || '',
});
return [{ json: base }];
