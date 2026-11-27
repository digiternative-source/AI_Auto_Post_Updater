function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
const mediaUrl = String(row.media_public_url || '');
if (row.media_kind !== 'video' || !/^https:\/\//i.test(mediaUrl) || /drive\.google\.com|docs\.google\.com/i.test(mediaUrl)) {
  return fail(row, 'TikTok Drive link accept nahi karta. Verified domain ka direct video URL chahiye.');
}
return [{
  json: Object.assign({}, row, { ready: 'yes',
    tiktokBody: {
      post_info: {
        title: clip(row.full_post_preview || row.topic || '', 2200),
        privacy_level: row.tiktok_privacy_level || 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
    },
  }),
}];
