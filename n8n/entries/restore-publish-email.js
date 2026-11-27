let base;
try {
  base = $('Collect Result').item.json;
} catch (error) {
  base = $('Collect Result').first().json;
}
return [{ json: base }];
