const query = $('Review Webhook').first().json.query || {};
const rows = $input.all().map((item) => item.json).filter((row) => row && row.post_id);
const found = findRow(rows, query.post_id, query.token);
if (found.reason !== 'ok') {
  return [{ json: { pageHtml: renderResultPage('Link valid nahi', 'Yeh approval link sahi nahi. Nayi email wala button kholein.') } }];
}
const webhook = $('Review Webhook').first().json.webhookUrl || '';
const decisionUrl = String(webhook).replace('post-review', 'post-decision');
return [{ json: { pageHtml: renderReviewPage(found.row, decisionUrl) } }];
