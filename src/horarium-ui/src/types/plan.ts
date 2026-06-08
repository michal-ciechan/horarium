export type Timeslice = 'Quarter' | 'Month' | 'Week' | 'Day';

export type ParseStatus = 'Success' | 'Partial' | 'Unrecognisable';

export interface Lane {
  id: string;
  label: string;
  color: string | null;
  description: string | null;
}

export interface Stage {
  id: string;
  title: string;
  laneId: string;
  start: string;
  end: string;
  dependsOn: string[];
  enables: string[];
  /**
   * Optional per-dependency exit-time override.  Key = prerequisite stage id.
   * Value = slice name (e.g. "2025-Q1" → right edge of that column) or
   * "Mid 2025-Q1" → centre of that column.  Omit for the default right-edge exit.
   */
  dependencyAt?: Record<string, string>;
  description: string | null;
}

export interface ParseError {
  field: string;
  message: string;
}

export interface Plan {
  title: string;
  description: string | null;
  start: string;
  end: string;
  timeslice: Timeslice;
  lanes: Lane[];
  stages: Stage[];
  errors: ParseError[];
}

export interface ParseResult {
  status: ParseStatus;
  plan: Plan | null;
  rawContent: string | null;
}

export type NodeKind = 'Plan' | 'PartialPlan' | 'Unrecognised' | 'Directory';

export interface FileTreeNode {
  name: string;
  path: string;
  kind: NodeKind;
  children: FileTreeNode[];
}
