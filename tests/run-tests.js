const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'lib/time.js',
  'lib/text.js',
  'lib/platforms.js',
  'lib/drive.js',
  'lib/calendar.js',
  'lib/sheet.js',
  'lib/draft.js',
  'lib/email.js',
  'lib/approval.js',
];
const context = { console, URL, Intl, Date, Buffer, require };
vm.createContext(context);
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

let passed = 0;
function check(name, condition) {
  if (!condition) {
    console.error('FAIL', name);
    process.exitCode = 1;
    return;
  }
  passed += 1;
}

const karachi = context.parseScheduledAt('2026-10-06 18:00', 'Asia/Karachi');
check('karachi 18:00 is 13:00 UTC', karachi.toISOString() === '2026-10-06T13:00:00.000Z');

check('drive id from url', context.extractDriveId('https://drive.google.com/file/d/abc123456789012345678/view') === 'abc123456789012345678');
check('plain drive id', context.extractDriveId('abc123456789012345678') === 'abc123456789012345678');

const drafts = context.eventToDrafts({
  id: 'evt1',
  summary: 'Instagram + LinkedIn | Serum',
  description: 'drive: https://drive.google.com/file/d/abc123456789012345678/view\ncaption: Naya serum\nniche: skincare',
  start: { dateTime: '2026-10-06T13:00:00.000Z' },
}, 'Asia/Karachi');
check('calendar splits two platforms', drafts.length === 2 && drafts[0].platform === 'instagram' && drafts[1].platform === 'linkedin');
check('calendar keeps local time', drafts[0].scheduled_at === '2026-10-06 18:00');

const posted = context.blankRow({ post_id: 'cal_evt1_instagram', status: 'Posted', platform: 'instagram', raw_caption: 'old' });
const upserts = context.mergeCalendarRows([posted], [{
  id: 'evt1',
  summary: 'Instagram | Serum',
  description: 'caption: Naya serum',
  start: { dateTime: '2026-10-06T13:00:00.000Z' },
}], 'Asia/Karachi');
check('posted row is not overwritten', upserts.length === 0);

const changed = context.mergeCalendarRows([
  context.blankRow({ post_id: 'cal_evt1_instagram', status: 'Scheduled', platform: 'instagram', raw_caption: 'old', scheduled_at: '2026-10-06 18:00' }),
], [{
  id: 'evt1',
  summary: 'Instagram | Serum',
  description: 'caption: Naya serum',
  start: { dateTime: '2026-10-06T13:00:00.000Z' },
}], 'Asia/Karachi');
check('changed caption resets the draft', changed.length === 1 && changed[0].raw_caption === 'Naya serum' && changed[0].status === 'Scheduled');

const same = context.mergeCalendarRows([
  context.blankRow({ post_id: 'cal_evt1_instagram', status: 'Scheduled', platform: 'instagram', topic: 'Serum', raw_caption: 'Naya serum', scheduled_at: '2026-10-06 18:00' }),
], [{
  id: 'evt1',
  summary: 'Instagram | Serum',
  description: 'caption: Naya serum',
  start: { dateTime: '2026-10-06T13:00:00.000Z' },
}], 'Asia/Karachi');
check('unchanged calendar event does not write again', same.length === 0);

const now = new Date('2026-10-06T11:30:00.000Z');
const config = {
  timezone: 'Asia/Karachi',
  lookaheadHours: 2,
  graceHours: 12,
  notifyEmail: 'digiternative@gmail.com',
  publishMode: 'on_approve',
  webhookBaseUrl: 'https://example.n8n.cloud',
};
const work = context.selectWork([
  context.blankRow({ post_id: 'due', status: 'Scheduled', platform: 'linkedin', scheduled_at: '2026-10-06 18:00', raw_caption: 'Hello' }),
  context.blankRow({ post_id: 'later', status: 'Scheduled', platform: 'linkedin', scheduled_at: '2026-10-07 18:00', raw_caption: 'Hello' }),
  context.blankRow({ post_id: 'posted', status: 'Posted', platform: 'linkedin', scheduled_at: '2026-10-06 18:00' }),
], config, now);
check('only the near post is prepared', work.prepare.length === 1 && work.prepare[0].post_id === 'due');
check('email is stamped from config', work.prepare[0].notify_email === 'digiternative@gmail.com');

const stale = context.repairRows([
  context.blankRow({ post_id: 'stuck', status: 'Preparing', platform: 'x', scheduled_at: '2026-10-06 18:00', updated_at: '2026-10-06T08:00:00.000Z' }),
], config, now);
check('stale preparing returns to the queue', stale.length === 1 && stale[0].status === 'Scheduled');

const draft = context.fitDraft({
  platform: 'instagram',
  raw_caption: 'Serum halka hai.',
  cta_link: 'https://shop.example/serum',
  media_kind: 'image',
  media_public_url: 'https://drive.google.com/uc?export=download&id=abc123456789012345678',
}, {
  caption: 'Serum halka hai. https://evil.example/fake',
  hashtags: ['#skincare', '#follow4follow', '#skincare', '#SerumRoutine'],
  trend_notes: [{ tag: '#skincare', kind: 'timely', why: 'This tag is 900% viral this week.' }],
});
check('draft keeps a real tag', draft.prepared_hashtags.indexOf('#skincare') !== -1);
check('spam tag is removed', draft.prepared_hashtags.toLowerCase().indexOf('follow4follow') === -1);
check('invented url is removed', draft.full_post_preview.indexOf('evil.example') === -1);
check('cta stays', draft.full_post_preview.indexOf('https://shop.example/serum') !== -1);
check('fake viral stat is not kept as timely proof', draft.trend_notes.indexOf('900%') === -1);
check('instagram with an image can publish', draft.can_publish === 'yes');

const longTweet = context.fitDraft({ platform: 'x', raw_caption: 'word '.repeat(120), media_kind: 'none' }, {
  caption: 'word '.repeat(120),
  hashtags: ['#skincare'],
  trend_notes: [],
});
check('x text stays within 280', longTweet.full_post_preview.length <= 280);

const noMedia = context.fitDraft({ platform: 'instagram', raw_caption: 'Sirf text' }, {
  caption: 'Sirf text',
  hashtags: ['#skincare'],
  trend_notes: [],
});
check('instagram text cannot publish', noMedia.can_publish === 'no');

const carousel = context.canPublish({
  platform: 'instagram',
  media_kind: 'carousel',
  media_urls: 'https://drive.google.com/uc?export=download&id=abc123456789012345678\nhttps://drive.google.com/uc?export=download&id=def123456789012345678',
});
check('instagram carousel can publish', carousel.ok === true);
const shortCarousel = context.canPublish({ platform: 'facebook', media_kind: 'carousel', media_urls: 'https://drive.google.com/uc?export=download&id=abc123456789012345678' });
check('carousel needs two slides', shortCarousel.ok === false);
const tiktok = context.canPublish({ platform: 'tiktok', media_kind: 'video', media_public_url: 'https://drive.google.com/uc?id=1' });
check('tiktok rejects a drive url', tiktok.ok === false);

const row = context.stampRow(context.blankRow({
  post_id: 'due',
  platform: 'linkedin',
  topic: 'Serum',
  scheduled_at: '2026-10-06 18:00',
  full_post_preview: 'Serum halka hai.\n\n#skincare',
  trend_notes: JSON.stringify([{ tag: '#skincare', kind: 'evergreen', why: 'Niche tag hai.' }]),
  can_publish: 'yes',
  approval_token: 'abc',
  status: 'Pending Approval',
}), config);
const email = context.renderApprovalEmail(row);
check('email points at the review page', email.emailHtml.indexOf('/webhook/post-review?') !== -1);
const localMail = context.renderApprovalEmail(Object.assign({}, row, { webhook_base_url: 'http://localhost:5678' }));
check('localhost review link works', localMail.emailHtml.indexOf('http://localhost:5678/webhook/post-review?') !== -1);
check('email does not publish from the inbox', email.emailHtml.indexOf('/webhook/post-decision') === -1);

const page = context.renderReviewPage(row, 'https://example.n8n.cloud/webhook/post-decision');
check('approve is a post form', page.indexOf('method="POST"') !== -1 && page.indexOf('value="approve"') !== -1);
check('decline is separate', page.indexOf('value="decline"') !== -1);
check('page shows the exact post', page.indexOf('Serum halka hai.') !== -1);

const token = context.makeToken();
const pending = Object.assign({}, row, { approval_token: token, status: 'Pending Approval', publish_mode: 'on_approve' });
const bad = context.decide([pending], { post_id: 'due', token: 'wrong', action: 'approve' }, now);
check('wrong token does nothing', bad.route === 'invalid');
const ok = context.decide([pending], { post_id: 'due', token, action: 'approve' }, now);
check('approve starts publishing', ok.route === 'approve' && ok.sheet.status === 'Publishing');
const heldRow = Object.assign({}, pending, { publish_mode: 'at_scheduled_time' });
const held = context.decide([heldRow], { post_id: 'due', token, action: 'approve' }, now);
check('future scheduled mode waits', held.route === 'hold' && held.sheet.status === 'Approved');
const declined = context.decide([pending], { post_id: 'due', token, action: 'decline' }, now);
check('decline never publishes', declined.route === 'decline' && declined.sheet.status === 'Declined' && declined.sheet.approval_token === '');
const again = context.decide([Object.assign({}, pending, { status: 'Posted', posted_url: 'https://www.linkedin.com/feed/update/1' })], { post_id: 'due', token, action: 'approve' }, now);
check('posted row cannot publish twice', again.route === 'already');

const filesOnDrive = context.untrackedDriveFiles([
  { id: 'abc123456789012345678', name: 'known.png', mimeType: 'image/png' },
  { id: 'zzzzzzzzzzzzzzzzzzzzz', name: 'new.png', mimeType: 'image/png' },
  { id: 'folder1', name: 'folder', mimeType: 'application/vnd.google-apps.folder' },
], [{ drive_file_id: 'abc123456789012345678' }]);
check('folder audit only returns a new file', filesOnDrive.length === 1 && filesOnDrive[0].name === 'new.png');

const badTitle = context.eventToDrafts({ id: 'bad', summary: 'Just a title', start: { date: '2026-10-06' } }, 'Asia/Karachi');
check('bad calendar title becomes a visible failed row', badTitle[0].status === 'Failed' && badTitle[0].error.indexOf('Platform | Topic') !== -1);

console.log(passed + ' checks passed');
if (process.exitCode) process.exit(process.exitCode);
