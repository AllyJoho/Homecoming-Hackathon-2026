// @/utils/formatEnums.ts
// Ported from the purchasing app. Format DB-style enum strings for display.
// Safe on any string: non-enum input returns unchanged, so callers don't need
// to gate the call themselves.
//
//   "SELF_REPORTED" → "Self Reported"
//   "Standard"      → "Standard"   (unchanged, doesn't match the enum pattern)
//   ""              → ""

const DB_ENUM_RE = /^[A-Z][A-Z0-9_]*$/;

export function formatEnums(value: string): string {
  if (!DB_ENUM_RE.test(value)) return value;
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
