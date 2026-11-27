function reviewUrl(row) {
  const base = String(row.webhook_base_url || '').replace(/\/$/, '');
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
  if (!/^https:\/\//i.test(base) && !local) return '';
  return base + '/webhook/post-review?post_id=' + encodeURIComponent(row.post_id) + '&token=' + encodeURIComponent(row.approval_token || '');
}

function pageShell(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
    + escapeHtml(title) + '</title></head><body style="margin:0;background:#f4f1ea;color:#1c1917;font-family:Georgia,serif;">'
    + '<main style="max-width:680px;margin:0 auto;padding:28px 18px;">' + body + '</main></body></html>';
}

function renderResultPage(title, message) {
  return pageShell(title, '<h1 style="font-size:28px;line-height:1.2;">' + escapeHtml(title) + '</h1><p style="font-size:18px;line-height:1.5;">' + escapeHtml(message) + '</p>');
}

function renderTrendNotes(raw) {
  let notes = [];
  try { notes = JSON.parse(raw || '[]'); } catch (error) { notes = []; }
  if (!Array.isArray(notes) || !notes.length) return '<p>Hashtag ki timing note maujood nahi.</p>';
  return '<ul>' + notes.map((note) => '<li><strong>' + escapeHtml(note.tag) + '</strong> · ' + escapeHtml(note.kind) + ' — ' + escapeHtml(note.why) + '</li>').join('') + '</ul>';
}

function mediaLinks(row) {
  const urls = String(row.media_urls || '').split(/\s+/).map((url) => url.trim()).filter((url) => /^https:\/\//i.test(url));
  if (urls.length > 1) {
    return '<ol>' + urls.map((url, index) => '<li><a href="' + escapeHtml(url) + '">Slide ' + (index + 1) + '</a></li>').join('') + '</ol>';
  }
  if (row.media_public_url) return '<p><a href="' + escapeHtml(row.media_public_url) + '">Media dekhein</a></p>';
  return '';
}

function renderReviewPage(row, decisionUrl) {
  const when = formatInZone(parseScheduledAt(row.scheduled_at, row.timezone), row.timezone);
  const modeNote = row.publish_mode === 'at_scheduled_time'
    ? 'Approve ke baad post scheduled time se pehle nahi lagegi.'
    : 'Approve karte hi post usi waqt live ho jayegi.';
  const blocked = String(row.can_publish) !== 'yes';
  const approve = blocked
    ? '<p style="background:#fff4e5;padding:12px;">Approve band hai. Pehle warning theek karein, phir sheet mein status Scheduled kar ke naya draft banwayein.</p>'
    : '<form method="POST" action="' + escapeHtml(decisionUrl) + '">'
      + hiddenFields(row, 'approve')
      + '<button style="background:#0f7b4c;color:white;border:0;padding:14px 18px;font-size:16px;cursor:pointer;" type="submit">Approve karo, post lagao</button></form>';
  const decline = '<form method="POST" action="' + escapeHtml(decisionUrl) + '" style="margin-top:10px;">'
    + hiddenFields(row, 'decline')
    + '<button style="background:#9b2c2c;color:white;border:0;padding:14px 18px;font-size:16px;cursor:pointer;" type="submit">Decline karo, post mat lagao</button></form>';
  const body = '<p style="letter-spacing:.08em;text-transform:uppercase;font-size:12px;">Approval</p>'
    + '<h1 style="font-size:32px;line-height:1.15;margin-bottom:8px;">' + escapeHtml((PLATFORMS[normalizePlatform(row.platform)] || {}).label || row.platform || 'Post') + '</h1>'
    + '<p>' + escapeHtml(modeNote) + '</p>'
    + '<p><strong>Waqt:</strong> ' + escapeHtml(when || row.scheduled_at) + '<br><strong>Topic:</strong> ' + escapeHtml(row.topic || '') + '</p>'
    + mediaLinks(row)
    + '<h2>Yeh exact post lagegi</h2><pre style="white-space:pre-wrap;background:white;padding:16px;border:1px solid #e7e5e4;">' + escapeHtml(row.full_post_preview || '') + '</pre>'
    + '<h2>Hashtags kyun</h2>' + renderTrendNotes(row.trend_notes)
    + (row.warnings ? '<h2>Warnings</h2><pre style="white-space:pre-wrap;background:#fff7ed;padding:16px;">' + escapeHtml(row.warnings) + '</pre>' : '')
    + approve + decline;
  return pageShell('Post approval', body);
}

function hiddenFields(row, action) {
  return '<input type="hidden" name="post_id" value="' + escapeHtml(row.post_id) + '">'
    + '<input type="hidden" name="token" value="' + escapeHtml(row.approval_token) + '">'
    + '<input type="hidden" name="action" value="' + escapeHtml(action) + '">';
}

function renderApprovalEmail(row) {
  const link = reviewUrl(row);
  const when = formatInZone(parseScheduledAt(row.scheduled_at, row.timezone), row.timezone);
  const platform = PLATFORMS[normalizePlatform(row.platform)];
  const label = platform ? platform.label : row.platform;
  const button = link
    ? '<a href="' + escapeHtml(link) + '" style="display:inline-block;background:#1c1917;color:white;text-decoration:none;padding:14px 18px;">Post dekhein, approve ya decline karein</a>'
    : '<p style="background:#fee2e2;padding:12px;">Webhook URL abhi set nahi. n8n Config mein webhookBaseUrl https, ya is Mac pe http://localhost:5678 hona chahiye.</p>';
  const html = '<div style="background:#f4f1ea;padding:24px;font-family:Georgia,serif;color:#1c1917;">'
    + '<div style="max-width:640px;margin:0 auto;background:white;padding:24px;">'
    + '<p>Assalam o alaikum.</p>'
    + '<p><strong>' + escapeHtml(label) + '</strong> ki post tayyar hai. Neeche wahi text hai jo approve ke baad jayega. Koi extra line baad mein add nahi hogi.</p>'
    + '<p><strong>Waqt:</strong> ' + escapeHtml(when || row.scheduled_at) + '<br><strong>Topic:</strong> ' + escapeHtml(row.topic || '') + '</p>'
    + mediaLinks(row)
    + '<pre style="white-space:pre-wrap;background:#fafaf9;padding:16px;border:1px solid #e7e5e4;">' + escapeHtml(row.full_post_preview || '') + '</pre>'
    + '<h3>Hashtags</h3>' + renderTrendNotes(row.trend_notes)
    + (row.warnings ? '<h3>Warnings</h3><pre style="white-space:pre-wrap;">' + escapeHtml(row.warnings) + '</pre>' : '')
    + '<p>' + button + '</p>'
    + '<p style="color:#57534e;">Email ka link khud post nahi karta. Button us page pe hai.</p>'
    + '</div></div>';
  return {
    emailSubject: label + ' post approval: ' + (row.topic || row.post_id),
    emailHtml: html,
  };
}

function renderFailureEmail(row) {
  return {
    emailSubject: 'Post prepare nahi hui: ' + (row.topic || row.post_id),
    emailHtml: '<div style="font-family:Georgia,serif;padding:24px;"><p>Yeh post prepare nahi ho saki.</p><pre style="white-space:pre-wrap;">'
      + escapeHtml(row.error || 'Unknown error') + '</pre><p>Sheet mein status Scheduled kar dein jab source theek ho, phir agla run dubara draft banayega.</p></div>',
  };
}

function renderFolderDigest(files) {
  const items = files.map((file) => '<li>' + escapeHtml(file.name || file.id) + ' — ' + escapeHtml(file.webViewLink || file.id) + '</li>').join('');
  return {
    emailSubject: 'Drive mein kuch files calendar pe nahi hain',
    emailHtml: '<div style="font-family:Georgia,serif;padding:24px;"><p>Yeh files Drive folder mein hain, lekin posting calendar pe inka koi row nahi. Inhein khud post nahi kiya gaya.</p><ul>' + items + '</ul></div>',
  };
}
