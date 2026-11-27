let base;
try {
  base = $('Mark Preparing').item.json;
} catch (error) {
  base = $('Mark Preparing').first().json;
}
return [{ json: base }];
