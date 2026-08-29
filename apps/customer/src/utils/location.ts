const GOOGLE_MAPS_COORDINATE_URL = /^https:\/\/www\.google\.com\/maps\?q=(-?\d{1,2}(?:\.\d{1,6})?),(-?\d{1,3}(?:\.\d{1,6})?)$/;

export function createGoogleMapsLocationUrl(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

export function isSafeGoogleMapsLocationUrl(value: string): boolean {
  const match = value.match(GOOGLE_MAPS_COORDINATE_URL);
  if (!match) return false;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}
