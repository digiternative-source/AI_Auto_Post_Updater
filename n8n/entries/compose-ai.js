const row = $json.post_id ? $json : $('Normalize Media').item.json;
const config = $('Config').first().json;
const today = dayKeyInZone(new Date(), row.timezone || config.timezone || 'Asia/Karachi');
return [{
  json: Object.assign({}, row, {
    openaiBody: {
      model: config.openaiModel || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(row, today) },
      ],
    },
  }),
}];
