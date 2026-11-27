let base;
try {
  base = $('Publish Row').item.json;
} catch (error) {
  base = $('Publish Row').first().json;
}
return [{ json: base }];
