const PLATFORM_ALIASES = {
  ig: 'instagram',
  insta: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  li: 'linkedin',
  linkedin: 'linkedin',
  twitter: 'x',
  tweet: 'x',
  x: 'x',
  yt: 'youtube',
  youtube: 'youtube',
  tiktok: 'tiktok',
  tt: 'tiktok',
};

const PLATFORMS = {
  instagram: { label: 'Instagram', caption: 2200, hashtags: 10, needsMedia: true },
  facebook: { label: 'Facebook', caption: 5000, hashtags: 5, needsMedia: false },
  linkedin: { label: 'LinkedIn', caption: 3000, hashtags: 3, needsMedia: false },
  x: { label: 'X', caption: 280, hashtags: 2, needsMedia: false },
  tiktok: { label: 'TikTok', caption: 2200, hashtags: 5, needsMedia: true },
  youtube: { label: 'YouTube', caption: 5000, title: 100, hashtags: 12, needsMedia: true },
};

const SPAM_TAGS = new Set([
  '#follow4follow', '#followforfollow', '#f4f', '#like4like', '#likeforlike', '#l4l',
  '#tagsforlikes', '#like4likes', '#follow4like', '#likeforlikeback', '#followback',
]);

const GENERIC_TAGS = new Set([
  '#love', '#instagood', '#photooftheday', '#beautiful', '#happy', '#cute', '#tbt',
  '#followme', '#like', '#comment', '#viral', '#explore', '#fyp', '#trending',
]);

function normalizePlatform(value) {
  const key = String(value || '').trim().toLowerCase();
  return PLATFORM_ALIASES[key] || '';
}

function splitPlatforms(value) {
  return String(value || '')
    .split(/[,+/]| and /i)
    .map(normalizePlatform)
    .filter(Boolean)
    .filter((platform, index, list) => list.indexOf(platform) === index);
}

function cleanTag(value) {
  let tag = String(value || '').trim().replace(/\s+/g, '');
  if (!tag) return '';
  if (!tag.startsWith('#')) tag = '#' + tag;
  if (!/^#[\p{L}\p{N}_]{2,40}$/u.test(tag)) return '';
  if (SPAM_TAGS.has(tag.toLowerCase())) return '';
  return tag;
}

function cleanTags(values, limit) {
  const seen = new Set();
  const tags = [];
  const droppedSpam = [];
  (Array.isArray(values) ? values : String(values || '').split(/[\s,]+/)).forEach((value) => {
    const original = String(value || '').trim().toLowerCase();
    const tag = cleanTag(value);
    if (!tag) {
      if (original && SPAM_TAGS.has(original.startsWith('#') ? original : '#' + original)) droppedSpam.push(original);
      return;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  });
  const kept = tags.slice(0, limit);
  return { tags: kept, droppedSpam, droppedExtra: tags.slice(limit) };
}

function isDriveHost(url) {
  return /drive\.google\.com|docs\.google\.com|googleusercontent\.com/i.test(String(url || ''));
}

function carouselUrls(row) {
  return String((row && row.media_urls) || '')
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => /^https:\/\//i.test(url));
}

function canPublish(row) {
  const platform = normalizePlatform(row.platform);
  const warnings = [];
  const mediaKind = row.media_kind || 'none';
  const mediaUrl = String(row.media_public_url || '').trim();
  const driveId = String(row.drive_file_id || '').trim();
  const slides = carouselUrls(row);

  if (!platform || !PLATFORMS[platform]) {
    return { ok: false, warnings: ['Platform set nahi hai, ya supported list mein nahi hai.'] };
  }
  if (platform === 'instagram') {
    if (mediaKind === 'carousel') {
      if (slides.length < 2 || slides.length > 10) {
        warnings.push('Instagram carousel nahi lagti jab tak 2 se 10 images na hon.');
      }
    } else if (!mediaUrl || (mediaKind !== 'image' && mediaKind !== 'video')) {
      warnings.push('Instagram pe text-only post API se nahi lagti. Drive mein image ya video hona chahiye, aur file Anyone with the link pe shared ho.');
    }
  }
  if (platform === 'facebook' && mediaKind === 'carousel' && (slides.length < 2 || slides.length > 10)) {
    warnings.push('Facebook carousel nahi lagti jab tak 2 se 10 images na hon.');
  }
  if (platform === 'youtube') {
    if (!driveId || mediaKind !== 'video') {
      warnings.push('YouTube pe video file Drive se chahiye. Image ya khali caption upload nahi hogi.');
    }
  }
  if (platform === 'tiktok') {
    if (mediaKind !== 'video' || !/^https:\/\//i.test(mediaUrl) || isDriveHost(mediaUrl)) {
      warnings.push('TikTok seedha Drive link accept nahi karta. Video ka URL us domain pe hona chahiye jo TikTok app mein verified ho.');
    }
  }
  if (platform === 'x' && mediaKind !== 'none') {
    warnings.push('X pe is tool ki approve ke baad caption jati hai. Image attach is version mein nahi hoti.');
  }
  if (platform === 'linkedin' && mediaKind !== 'none') {
    warnings.push('LinkedIn pe is version mein approved text post hota hai. Drive image automatically attach nahi hoti.');
  }
  if ((platform === 'instagram' || platform === 'facebook') && (mediaUrl || slides.length)) {
    warnings.push('Instagram aur Facebook tabhi media utha pate hain jab Drive file Anyone with the link pe ho.');
  }
  const blocking = [];
  warnings.forEach((warning) => {
    if (/nahi lagti|video file Drive|accept nahi karta|supported list|set nahi/.test(warning)) blocking.push(warning);
  });
  return { ok: blocking.length === 0, warnings, blocking };
}
