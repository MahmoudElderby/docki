import * as vscode from 'vscode';

export type KnowledgePresence = 'missing' | 'empty' | 'populated';

export interface KnowledgeWorkspace {
  workspaceRoot: vscode.Uri;
  workspaceRootLabel: string;
  knowledgeRoot: vscode.Uri | null;
  presence: KnowledgePresence;
  activeRootIndex: number;
  followsSymlink: boolean;
}

export interface Heading {
  level: number;
  text: string;
  slug: string;
  offset: number;
  line: number;
}

export interface KnowledgeDocument {
  id: string;
  uri: vscode.Uri;
  fileName: string;
  displayName: string;
  categoryPath: string;
  categoryLabel: string;
  headings: Heading[];
  byteSize: number;
  indexedByteLength: number;
  lastModified: number;
  isPinnedName: boolean;
}

export interface CategoryNode {
  kind: 'category';
  id: string;
  folderName: string;
  displayName: string;
  relativePath: string;
}

export interface DocumentNode {
  kind: 'document';
  document: KnowledgeDocument;
}

export interface EmptyStateNode {
  kind: 'empty';
  message: string;
  expectedPath: string;
}

export type TreeNode = CategoryNode | DocumentNode | EmptyStateNode;

export type MatchKind = 'filename' | 'heading' | 'body';

export interface SearchResult {
  documentId: string;
  uri: vscode.Uri;
  displayName: string;
  categoryLabel: string;
  matchKind: MatchKind;
  score: number;
  snippet: string;
  anchor: string | null;
  lineHint: number | null;
}

export type EvidenceStatus = 'resolved' | 'missing' | 'rejected';

export interface EvidenceLink {
  rawToken: string;
  filePath: string;
  lineStart: number | null;
  lineEnd: number | null;
  status: EvidenceStatus;
}

export type FreshnessState = 'up-to-date' | 'potentially-stale' | 'unknown';

export interface FreshnessStatus {
  state: FreshnessState;
  readmeCommit: string | null;
  headCommit: string | null;
  commitDistance: number | null;
  badge: string;
}

export interface KnowledgeChangeEvent {
  kind: 'create' | 'change' | 'delete' | 'rename';
  uris: vscode.Uri[];
}

export interface MermaidBlock {
  id: string;
  source: string;
}
