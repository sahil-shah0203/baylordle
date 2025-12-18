export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";

  const key = "connections_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }

  document.cookie = `connections_device_id=${id}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return id;
}

export function getPlayedKeyForDate(date: string) {
  return `connections_played_${date}`;
}
