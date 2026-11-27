let row;
try {
  row = Object.assign({}, $('Compose AI Request').item.json);
} catch (error) {
  row = Object.assign({}, $('Compose AI Request').first().json);
}
delete row.openaiBody;
const now = new Date().toISOString();
if (String(row.source_locked).toLowerCase() === 'yes' && String(row.full_post_preview || '').trim()) {
  const media = canPublish(row);
  const slideCount = String(row.media_urls || '').split(/\s+/).filter((url) => /^https:\/\//i.test(url)).length;
  const carouselReady = String(row.media_kind) === 'carousel' && slideCount >= 2;
  let can = media.ok ? 'yes' : 'no';
  if (!carouselReady && String(row.can_publish).toLowerCase() === 'no') can = 'no';
  if (!carouselReady && !String(row.media_public_url || '').trim()) can = 'no';
  const warnings = []
    .concat(row.warnings ? [row.warnings] : [])
    .concat(media.warnings || [])
    .filter((warning) => !(carouselReady && /approve se pehle nahi lagegi/.test(warning)));
  const next = Object.assign({}, row, {
    approval_token: makeToken(),
    status: 'Pending Approval',
    updated_at: now,
    can_publish: can,
    warnings: warnings.filter(Boolean).join('\n'),
    publish_mode: row.publish_mode || 'at_scheduled_time',
  });
  return [{ json: Object.assign(next, renderApprovalEmail(next)) }];
}
try {
  if ($json.error) {
    const message = $json.error.message || $json.error.description || JSON.stringify($json.error);
    throw new Error(message);
  }
  const content = $json.choices && $json.choices[0] && $json.choices[0].message && $json.choices[0].message.content;
  const draft = fitDraft(row, parseModelContent(content));
  if (!draft.ok) throw new Error(draft.error || 'Draft failed');
  const next = Object.assign({}, row, draft, {
    approval_token: makeToken(),
    status: 'Pending Approval',
    updated_at: now,
  });
  return [{ json: Object.assign(next, renderApprovalEmail(next)) }];
} catch (error) {
  const failed = Object.assign({}, row, {
    status: 'Failed',
    error: clip(error.message, 500),
    updated_at: now,
  });
  return [{ json: Object.assign(failed, renderFailureEmail(failed)) }];
}
