/** Normalized JSON from `weatherForecast` (ai.backend Open-Meteo bridge). */

export type WeatherHourly = {
  time: string;
  tempC: number | null;
  tempF: number | null;
  weatherCode: number | null;
  summary: string;
};

export type WeatherDaily = {
  date: string;
  minC: number | null;
  maxC: number | null;
  minF: number | null;
  maxF: number | null;
  weatherCode: number | null;
  summary: string;
};

export type WeatherCurrent = {
  time?: string | null;
  tempC: number | null;
  tempF: number | null;
  weatherCode: number | null;
  summary: string;
};

export type WeatherForecastPayload = {
  latitude: number;
  longitude: number;
  timezone?: string | null;
  timezoneAbbreviation?: string | null;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function parseHourly(raw: unknown): WeatherHourly[] {
  if (!Array.isArray(raw)) return [];
  const out: WeatherHourly[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    out.push({
      time: str(row.time) ?? '',
      tempC: num(row.tempC),
      tempF: num(row.tempF),
      weatherCode:
        row.weatherCode === null || row.weatherCode === undefined ? null : num(row.weatherCode),
      summary: str(row.summary) ?? 'Unknown',
    });
  }
  return out;
}

function parseDaily(raw: unknown): WeatherDaily[] {
  if (!Array.isArray(raw)) return [];
  const out: WeatherDaily[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    out.push({
      date: str(row.date) ?? '',
      minC: num(row.minC),
      maxC: num(row.maxC),
      minF: num(row.minF),
      maxF: num(row.maxF),
      weatherCode:
        row.weatherCode === null || row.weatherCode === undefined ? null : num(row.weatherCode),
      summary: str(row.summary) ?? 'Unknown',
    });
  }
  return out;
}

export function parseWeatherForecastPayload(raw: unknown): WeatherForecastPayload | null {
  if (!isRecord(raw)) return null;
  const cur = raw.current;
  if (!isRecord(cur)) return null;
  const lat = num(raw.latitude);
  const lon = num(raw.longitude);
  if (lat === null || lon === null) return null;

  return {
    latitude: lat,
    longitude: lon,
    timezone: str(raw.timezone) ?? null,
    timezoneAbbreviation: str(raw.timezoneAbbreviation) ?? null,
    current: {
      time: str(cur.time),
      tempC: num(cur.tempC),
      tempF: num(cur.tempF),
      weatherCode:
        cur.weatherCode === null || cur.weatherCode === undefined ? null : num(cur.weatherCode),
      summary: str(cur.summary) ?? 'Unknown',
    },
    hourly: parseHourly(raw.hourly),
    daily: parseDaily(raw.daily),
  };
}
