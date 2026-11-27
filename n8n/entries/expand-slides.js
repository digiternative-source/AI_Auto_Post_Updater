const row = $input.first().json;
const urls = String(row.media_urls || '').split(/\s+/).map((url) => url.trim()).filter((url) => /^https:\/\//i.test(url));
return urls.map((url, index) => ({ json: Object.assign({}, row, { slide_url: url, slide_index: index + 1 }) }));
