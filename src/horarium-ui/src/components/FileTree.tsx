import { useState } from 'react';
import type { FileTreeNode, NodeKind } from '../types/plan';
import styles from './FileTree.module.css';

interface Props {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const ICON: Record<NodeKind, string> = {
  Plan: '📄',
  PartialPlan: '⚠️',
  Unrecognised: '❓',
  Directory: '📁',
};

function TreeNode({ node, selectedPath, onSelect, depth }: {
  node: FileTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);

  if (node.kind === 'Directory') {
    return (
      <div>
        <button
          className={styles.dirNode}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setOpen(o => !o)}
        >
          {open ? '▾' : '▸'} {ICON.Directory} {node.name}
        </button>
        {open && node.children.map(child => (
          <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <button
      className={`${styles.fileNode} ${selectedPath === node.path ? styles.selected : ''}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onSelect(node.path)}
    >
      {ICON[node.kind]} {node.name}
    </button>
  );
}

export function FileTree({ nodes, selectedPath, onSelect }: Props) {
  const regular = nodes.filter(n => n.kind !== 'Unrecognised');
  const unrecognised = nodes.filter(n => n.kind === 'Unrecognised');

  return (
    <nav className={styles.tree}>
      {regular.map(node => (
        <TreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
      ))}
      {unrecognised.length > 0 && (
        <div className={styles.unrecognisedGroup}>
          <div className={styles.groupLabel}>Unrecognised</div>
          {unrecognised.map(node => (
            <TreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
          ))}
        </div>
      )}
    </nav>
  );
}
