const SHEET_ACCESS_KEY = "2026";

export function isValidSheetAccessKey(value: string) {
  return value.trim() === SHEET_ACCESS_KEY;
}
