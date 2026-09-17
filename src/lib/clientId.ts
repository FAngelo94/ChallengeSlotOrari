const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export function isValidClientId(value: unknown): value is string {
  return typeof value === "string" && CLIENT_ID_PATTERN.test(value);
}
