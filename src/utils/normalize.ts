const HIDDEN_KEYS = new Set(["id", "createdAt", "updatedAt", "deletedAt"]);

const shouldHide = (key: string) =>
  HIDDEN_KEYS.has(key) || key.toLowerCase().endsWith("id");

export function normalizeCnpj(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.replace(/\D/g, "");
}

export function normalizeMunicipio(val: unknown): string {
  if (typeof val !== "string") return "";
  return val
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function normalizeUf(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().toUpperCase();
}

export function normalizeText(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim();
}

export function normalizeResponse(data: unknown): unknown {
  if (
    data == null ||
    data instanceof Date ||
    Buffer.isBuffer(data) ||
    typeof data !== "object"
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(normalizeResponse);
  }

  if (Object.getPrototypeOf(data) !== Object.prototype) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !shouldHide(key))
      .map(([key, value]) => [key, normalizeResponse(value)]),
  );
}
