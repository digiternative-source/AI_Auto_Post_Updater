function fail(row, error) {
  return [{ json: Object.assign({}, row, { ok: false, ready: 'no', error }) }];
}
const row = $json;
if (!row.linkedin_author_urn) return fail(row, 'LinkedIn author URN Config mein khali hai. Person ke liye urn:li:person:... aur company ke liye urn:li:organization:...');
if (!row.full_post_preview) return fail(row, 'LinkedIn caption khali hai.');
return [{
  json: Object.assign({}, row, { ready: 'yes',
    linkedinBody: {
      author: row.linkedin_author_urn,
      commentary: row.full_post_preview,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
  }),
}];
