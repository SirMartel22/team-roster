const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidTimeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const dateOnlyInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDays = (dateOnly, days) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const weekdayOf = (dateOnly) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const zonedDateTimeToUtc = (dateOnly, time, timeZone) => {
  if (!DATE_PATTERN.test(dateOnly) || !TIME_PATTERN.test(time) || !isValidTimeZone(timeZone)) return null;
  const [year, month, day] = dateOnly.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetAsUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
    guess += targetAsUtc - representedAsUtc;
  }
  return new Date(guess);
};

const recurringDates = ({ weekday, fromDate, horizonDays }) => {
  const dates = [];
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const candidate = addDays(fromDate, offset);
    if (weekdayOf(candidate) === weekday) dates.push(candidate);
  }
  return dates;
};

module.exports = { TIME_PATTERN, addDays, dateOnlyInZone, isValidTimeZone, recurringDates, zonedDateTimeToUtc };
