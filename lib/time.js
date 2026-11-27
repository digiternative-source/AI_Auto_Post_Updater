function hourInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  let hour = parts.find((part) => part.type === 'hour').value;
  if (hour === '24') hour = '0';
  return Number(hour);
}

function dayKeyInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type).value;
  return pick('year') + '-' + pick('month') + '-' + pick('day');
}

function zoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type).value;
  let hour = pick('hour');
  if (hour === '24') hour = '0';
  const asUtc = Date.UTC(Number(pick('year')), Number(pick('month')) - 1, Number(pick('day')), Number(hour), Number(pick('minute')), Number(pick('second')));
  return asUtc - date.getTime();
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let i = 0; i < 3; i += 1) {
    const offset = zoneOffsetMs(guess, timeZone);
    guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset);
  }
  return guess;
}

function parseScheduledAt(value, timeZone) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!match) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 9 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  return zonedTimeToUtc(year, month, day, hour, minute, timeZone || 'UTC');
}

function formatInZone(date, timeZone) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function ageHours(iso, now) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return Infinity;
  return (now.getTime() - then.getTime()) / 36e5;
}
