function stampRow(row, config) {
  const next = Object.assign({}, row);
  next.notify_email = config.notifyEmail || next.notify_email || '';
  next.ig_user_id = config.igUserId || next.ig_user_id || '';
  next.facebook_page_id = config.facebookPageId || next.facebook_page_id || '';
  next.linkedin_author_urn = config.linkedinAuthorUrn || next.linkedin_author_urn || '';
  next.tiktok_privacy_level = config.tiktokPrivacyLevel || next.tiktok_privacy_level || 'SELF_ONLY';
  next.publish_mode = config.publishMode || next.publish_mode || 'on_approve';
  next.meta_graph_version = config.metaGraphVersion || next.meta_graph_version || 'v21.0';
  next.timezone = config.timezone || 'Asia/Karachi';
  next.brand_name = config.brandName || '';
  next.niche = next.niche || config.niche || '';
  next.language = next.language || config.language || 'Urdu + English';
  next.brand_voice = next.brand_voice || config.brandVoice || '';
  next.webhook_base_url = String(config.webhookBaseUrl || '').replace(/\/$/, '');
  return next;
}

function repairRows(rows, config, now) {
  const updates = [];
  (rows || []).forEach((row) => {
    if (!row || !row.post_id) return;
    const status = statusKey(row);
    if (status === 'preparing' && ageHours(row.updated_at, now) >= 2) {
      updates.push(Object.assign({}, row, {
        status: 'Scheduled',
        error: 'Preparation beech mein ruk gayi thi, dobara queue mein hai.',
        updated_at: now.toISOString(),
      }));
    }
    if (status === 'publishing' && ageHours(row.updated_at, now) >= 0.25) {
      updates.push(Object.assign({}, row, {
        status: 'Pending Approval',
        error: 'Publish beech mein ruk gaya. Approval email se dubara approve karein.',
        updated_at: now.toISOString(),
      }));
    }
    if (status === 'scheduled' && (!normalizePlatform(row.platform) || !parseScheduledAt(row.scheduled_at, config.timezone))) {
      updates.push(Object.assign({}, row, {
        status: 'Failed',
        error: !normalizePlatform(row.platform)
          ? 'Platform khali hai ya ghalat hai.'
          : 'scheduled_at "YYYY-MM-DD HH:mm" hona chahiye, timezone ' + (config.timezone || 'Asia/Karachi') + '.',
        updated_at: now.toISOString(),
      }));
    }
  });
  return updates;
}

function selectWork(rows, config, now) {
  const lookahead = Number(config.lookaheadHours || 2);
  const grace = Number(config.graceHours || 12);
  const windowStart = now.getTime() - grace * 36e5;
  const windowEnd = now.getTime() + lookahead * 36e5;
  const prepare = [];
  const publish = [];
  (rows || []).forEach((row) => {
    if (!row || !row.post_id) return;
    const status = statusKey(row);
    const when = parseScheduledAt(row.scheduled_at, config.timezone);
    if (!when) return;
    const time = when.getTime();
    if (status === 'scheduled' && time >= windowStart && time <= windowEnd) {
      prepare.push(stampRow(row, config));
    }
    if (status === 'approved' && String(row.can_publish) === 'yes' && String(row.publish_mode || config.publishMode) === 'at_scheduled_time' && time <= now.getTime()) {
      publish.push(stampRow(row, config));
    }
  });
  return { prepare, publish };
}
