function buildSystemPrompt() {
  return [
    'You prepare one social post from source material the user already wrote.',
    'Return only a JSON object with keys caption, hashtags, title, trend_notes, warnings.',
    'caption is the post text without hashtags.',
    'hashtags is an array of real tags people already use for this exact topic.',
    'title is required for YouTube and empty for other platforms.',
    'trend_notes is an array of objects {tag, kind, why}. kind is only "evergreen" or "timely".',
    'why is one factual sentence. Do not invent view counts, ranks, quotes, studies, or news.',
    'If you are not sure a tag is trending right now, kind must be "evergreen". Never call a tag viral.',
    'Do not use engagement-pod tags such as follow4follow, like4like, or tagsforlikes.',
    'Do not invent brand names, prices, offers, places, or URLs.',
    'Do not add a claim that is not in the source caption.',
    'Match the requested language. Urdu captions may use the everyday Urdu/English hashtags of that niche.',
    'No markdown.',
  ].join(' ');
}

function buildUserPrompt(row, today) {
  const platform = normalizePlatform(row.platform);
  const spec = PLATFORMS[platform];
  return JSON.stringify({
    today,
    platform,
    limits: spec,
    brand_name: row.brand_name || '',
    niche: row.niche || '',
    language: row.language || 'Urdu + English',
    voice: row.brand_voice || '',
    topic: row.topic || '',
    source_caption: row.raw_caption || '',
    source_text: clip(row.source_text || '', 8000),
    cta_link: row.cta_link || '',
    rules: [
      'Use the CTA link only if it is present. Otherwise include no link.',
      'Hashtags must be specific to the niche before broad tags.',
      'For X, the caption plus hashtags must be able to fit in 280 characters.',
      'For LinkedIn, write like a person, with at most 3 hashtags.',
      'For Instagram, the first line should be readable on its own.',
    ],
  });
}

function fitDraft(row, model) {
  const platform = normalizePlatform(row.platform);
  const spec = PLATFORMS[platform];
  const warnings = [];
  if (!spec) {
    return { ok: false, error: 'Platform supported nahi hai.', warnings };
  }
  const payload = model && typeof model === 'object' ? model : {};
  let caption = stripHashtags(payload.caption || '');
  const urlPass = stripUnknownUrls(caption, row);
  caption = urlPass.text;
  if (urlPass.removed.length) warnings.push('Jo links source mein nahi thay, nikaal diye gaye.');
  if (row.cta_link && caption.indexOf(String(row.cta_link).trim()) === -1) {
    caption = (caption + '\n\n' + String(row.cta_link).trim()).trim();
  }
  const tagPass = cleanTags(payload.hashtags, spec.hashtags);
  if (tagPass.droppedSpam.length) warnings.push('Fake engagement hashtags hata diye gaye.');
  if (tagPass.droppedExtra.length) warnings.push('Platform ki had se zyada hashtags hata diye gaye.');
  const genericCount = tagPass.tags.filter((tag) => GENERIC_TAGS.has(tag.toLowerCase())).length;
  if (tagPass.tags.length && genericCount * 2 > tagPass.tags.length) {
    warnings.push('Zyada tar hashtags bohot aam hain. Niche wale tags behtar hote hain.');
  }
  const notes = Array.isArray(payload.trend_notes) ? payload.trend_notes : [];
  const trendNotes = [];
  const kept = new Set(tagPass.tags.map((tag) => tag.toLowerCase()));
  notes.forEach((note) => {
    const tag = cleanTag(note && note.tag);
    if (!tag || !kept.has(tag.toLowerCase())) return;
    const kind = String(note.kind || '').toLowerCase() === 'timely' ? 'timely' : 'evergreen';
    const why = clip(note.why || '', 180);
    if (/viral|guaranteed|million views|%\s*growth/i.test(why)) {
      warnings.push(tag + ' ki timing claim hata di gayi kyunke us mein number ya viral claim tha.');
      trendNotes.push({ tag, kind: 'evergreen', why: 'Source ne is tag ko topic se mutabiq rakha hai.' });
      return;
    }
    trendNotes.push({ tag, kind, why: why || 'Is topic ke audiences yeh tag pehle se use karte hain.' });
  });
  tagPass.tags.forEach((tag) => {
    if (!trendNotes.some((note) => note.tag.toLowerCase() === tag.toLowerCase())) {
      trendNotes.push({ tag, kind: 'evergreen', why: 'Model ne is tag ki timing confirm nahi ki, is liye evergreen rakha gaya.' });
    }
  });
  let title = clip(payload.title || row.topic || '', spec.title || 100);
  const hashtagLine = tagPass.tags.join(' ');
  let full = caption;
  if (platform !== 'youtube' && hashtagLine) full = (caption + '\n\n' + hashtagLine).trim();
  if (platform === 'x' && full.length > spec.caption) {
    const room = spec.caption - (hashtagLine ? hashtagLine.length + 2 : 0);
    if (room < 20) {
      full = clip(caption, spec.caption);
      warnings.push('X ki 280 limit ki wajah se hashtags nahi aaye.');
    } else {
      const trimmed = clip(caption, room).replace(/\s+\S*$/, '').trim();
      full = hashtagLine ? trimmed + '\n\n' + hashtagLine : trimmed;
      warnings.push('X ki 280 limit ki wajah se caption chhota kiya gaya. Jo text neeche hai wahi post hoga.');
    }
    if (full.length > spec.caption) full = clip(full, spec.caption);
  }
  if (platform !== 'x' && full.length > spec.caption) {
    full = clip(full, spec.caption);
    warnings.push('Caption platform limit se lamba tha, limit tak chhota kiya gaya.');
  }
  if (!caption) return { ok: false, error: 'AI ne khali caption diya.', warnings };
  const media = canPublish(row);
  media.warnings.forEach((warning) => warnings.push(warning));
  let preview = full;
  if (platform === 'youtube') {
    preview = 'TITLE:\n' + title + '\n\nDESCRIPTION:\n' + caption + '\n\nTAGS:\n' + tagPass.tags.map((tag) => tag.replace(/^#/, '')).join(', ');
  }
  return {
    ok: true,
    prepared_caption: platform === 'youtube' ? caption : full,
    prepared_hashtags: platform === 'youtube' ? tagPass.tags.map((tag) => tag.replace(/^#/, '')).join(', ') : hashtagLine,
    prepared_title: platform === 'youtube' ? title : '',
    trend_notes: JSON.stringify(trendNotes),
    full_post_preview: preview,
    publish_text: platform === 'youtube' ? caption : full,
    warnings: warnings.join('\n'),
    can_publish: media.ok ? 'yes' : 'no',
    error: media.ok ? '' : media.blocking.join(' '),
  };
}

function parseModelContent(content) {
  const parsed = JSON.parse(stripFences(content));
  if (parsed && parsed.post && typeof parsed.post === 'object') return parsed.post;
  return parsed;
}
