const now = new Date();
const row = $json;
if (row.ok) {
  const patch = publishSuccess(row, row.posted_url, now);
  const pageHtml = renderResultPage('Post lag gayi', row.posted_url || 'Platform ne post accept kar li.');
  return [{ json: Object.assign({}, row, patch, { pageHtml, emailSubject: 'Post lag gayi: ' + (row.platform || ''), emailHtml: pageHtml }) }];
}
const patch = publishFailure(row, row.error || 'Publish fail', now);
const pageHtml = renderResultPage('Post nahi lagi', patch.error || 'Publish fail');
return [{ json: Object.assign({}, row, patch, { pageHtml, emailSubject: 'Post nahi lagi: ' + (row.platform || ''), emailHtml: pageHtml }) }];
