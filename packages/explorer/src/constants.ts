export const SEARCH_DEBOUNCE_MS = 200;
export const WATCHER_COALESCE_MS = 300;
export const MAX_FILE_BYTES = 5_242_880;
export const SNIPPET_RADIUS = 80;
export const KNOWLEDGE_DIR = 'knowledge';
export const PINNED_FILES = ['README.md', 'AI_CONTEXT.md'] as const;
export const OUTPUT_CHANNEL_NAME = 'Docki Explorer';
export const MERMAID_SECURITY_LEVEL = 'strict' as const;

/** Matches backticked paths and markdown link targets with optional #L / #L-L suffix */
export const EVIDENCE_PATH_REGEX =
  /^([a-zA-Z0-9_./\\-]+(?:\.[a-zA-Z0-9]+)?)(?:#L(\d+)(?:-L(\d+))?)?$/;

export const ALLOWED_EVIDENCE_EXTENSIONS = new Set([
  '.cs', '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml',
  '.xml', '.sql', '.ps1', '.sh', '.csproj', '.sln', '.config', '.html', '.css',
]);

export const COMMAND_OPEN = 'dockiExplorer.open';
export const COMMAND_REFRESH = 'dockiExplorer.refresh';
export const COMMAND_SEARCH = 'dockiExplorer.search';
export const COMMAND_OPEN_AI_CONTEXT = 'dockiExplorer.openAiContext';
export const COMMAND_OPEN_README = 'dockiExplorer.openReadme';
export const COMMAND_OPEN_RAW = 'dockiExplorer.openRaw';
export const COMMAND_RELOAD = 'dockiExplorer.reload';

export const VIEW_KNOWLEDGE_TREE = 'dockiExplorer.knowledgeTree';

export const FRESHNESS_BADGE_UP_TO_DATE = '✅ Up to date';
export const FRESHNESS_BADGE_STALE = '⚠ May be stale';
export const FRESHNESS_BADGE_UNKNOWN = '? Unknown';
