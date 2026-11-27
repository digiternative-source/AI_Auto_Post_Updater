let base;
try {
  base = $('Decide Action').item.json;
} catch (error) {
  base = $('Decide Action').first().json;
}
return [{ json: base }];
