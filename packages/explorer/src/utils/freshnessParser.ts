export interface FreshnessMetadata {
  commit: string | null;
  raw: string | null;
}

const TABLE_ROW_REGEX =
  /\|\s*Last analyzed commit\s*\|\s*`?([a-f0-9]{7,40})`?\s*\|/i;
const PLAIN_LINE_REGEX =
  /Last analyzed commit[:\s]+`?([a-f0-9]{7,40})`?/i;

export function parseFreshnessMetadata(content: string): FreshnessMetadata {
  const tableMatch = content.match(TABLE_ROW_REGEX);
  if (tableMatch) {
    return { commit: tableMatch[1], raw: tableMatch[0] };
  }
  const plainMatch = content.match(PLAIN_LINE_REGEX);
  if (plainMatch) {
    return { commit: plainMatch[1], raw: plainMatch[0] };
  }
  return { commit: null, raw: null };
}
