const INPUT_FIELDS = ['scheduled_at', 'platform', 'topic', 'drive_file_id', 'drive_url', 'raw_caption', 'niche', 'cta_link'];
const LOCKED_STATUSES = new Set(['pending approval', 'publishing', 'approved', 'posted', 'declined']);

function emptyDraftFields() {
  return {
    approval_token: '',
    prepared_caption: '',
    prepared_hashtags: '',
    prepared_title: '',
    trend_notes: '',
    full_post_preview: '',
    media_public_url: '',
    media_kind: '',
    posted_url: '',
    error: '',
    warnings: '',
    can_publish: '',
    updated_at: '',
  };
}

function blankRow(partial) {
  return Object.assign({
    post_id: '',
    source: 'sheet',
    scheduled_at: '',
    platform: '',
    topic: '',
    drive_file_id: '',
    drive_url: '',
    source_link: '',
    raw_caption: '',
    niche: '',
    cta_link: '',
    language: '',
    brand_voice: '',
    status: 'Scheduled',
    ig_user_id: '',
    facebook_page_id: '',
    linkedin_author_urn: '',
    tiktok_privacy_level: '',
    publish_mode: '',
    meta_graph_version: '',
    notify_email: '',
  }, emptyDraftFields(), partial || {});
}

function statusKey(row) {
  return String((row && row.status) || '').trim().toLowerCase();
}

function inputsChanged(existing, next) {
  return INPUT_FIELDS.some((field) => String(existing[field] || '') !== String(next[field] || ''));
}

function eventToDrafts(event, timeZone) {
  const title = String(event.summary || '').trim();
  const match = title.match(/^([^|]+)\|\s*(.+)$/);
  const fields = parseKeyedDescription(event.description || '');
  const when = event.start && (event.start.dateTime || event.start.date) ? (event.start.dateTime || event.start.date) : '';
  let scheduledAt = '';
  if (event.start && event.start.date && !event.start.dateTime) {
    scheduledAt = event.start.date + ' 09:00';
  } else if (when) {
    const parsed = new Date(when);
    if (!Number.isNaN(parsed.getTime())) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(parsed);
      const pick = (type) => parts.find((part) => part.type === type).value;
      let hour = pick('hour');
      if (hour === '24') hour = '00';
      scheduledAt = pick('year') + '-' + pick('month') + '-' + pick('day') + ' ' + hour + ':' + pick('minute');
    }
  }
  const driveRaw = fields.drive || '';
  const base = {
    source: 'calendar',
    scheduled_at: scheduledAt,
    topic: match ? match[2].trim() : title,
    drive_file_id: extractDriveId(driveRaw),
    drive_url: /^https?:\/\//i.test(driveRaw) ? driveRaw : '',
    raw_caption: fields.caption || '',
    niche: fields.niche || '',
    cta_link: fields.link || '',
    language: fields.language || '',
    brand_voice: fields.voice || '',
    source_link: event.htmlLink || '',
  };
  if (!match) {
    return [blankRow(Object.assign(base, {
      post_id: 'cal_' + event.id + '_invalid',
      platform: '',
      status: 'Failed',
      error: 'Calendar title "Platform | Topic" hona chahiye. Example: Instagram | Winter serum',
    }))];
  }
  const platforms = splitPlatforms(match[1]);
  if (!platforms.length) {
    return [blankRow(Object.assign(base, {
      post_id: 'cal_' + event.id + '_invalid',
      platform: match[1].trim(),
      status: 'Failed',
      error: 'Platform pehchana nahi gaya. Instagram, Facebook, LinkedIn, X, TikTok, YouTube use karein.',
    }))];
  }
  return platforms.map((platform) => blankRow(Object.assign({}, base, {
    post_id: 'cal_' + event.id + '_' + platform,
    platform,
    status: 'Scheduled',
  })));
}

function mergeCalendarRows(existingRows, events, timeZone) {
  const byId = new Map();
  (existingRows || []).forEach((row) => {
    if (row && row.post_id) byId.set(String(row.post_id), row);
  });
  const upserts = [];
  (events || []).forEach((event) => {
    if (!event || !event.id) return;
    eventToDrafts(event, timeZone).forEach((draft) => {
      const existing = byId.get(draft.post_id);
      if (existing && LOCKED_STATUSES.has(statusKey(existing))) return;
      if (existing && !inputsChanged(existing, draft) && statusKey(existing) === statusKey(draft)) return;
      const next = existing ? Object.assign({}, existing, draft) : draft;
      if (existing && inputsChanged(existing, draft)) {
        Object.assign(next, emptyDraftFields(), { status: draft.status, error: draft.error || '' });
      }
      upserts.push(next);
    });
  });
  return upserts;
}
