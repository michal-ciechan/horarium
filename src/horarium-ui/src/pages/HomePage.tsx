import { useState } from 'react';
import { FileTree } from '../components/FileTree';
import { PlanViewContent } from './PlanView';
import styles from '../App.module.css';
import type { FileTreeNode, ParseResult } from '../types/plan';

interface HomePageContentProps {
  tree: FileTreeNode[];
  loading: boolean;
  initialSelectedPath?: string | null;
  getPlanResult?: (path: string) => ParseResult | null;
}

export function HomePageContent({ tree, loading, initialSelectedPath = null, getPlanResult }: HomePageContentProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(initialSelectedPath);
  const result = selectedPath && getPlanResult ? getPlanResult(selectedPath) : null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>horarium</div>
        {loading ? (
          <div className={styles.sidebarLoading}>Loading…</div>
        ) : (
          <FileTree nodes={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
        )}
      </aside>
      <main className={styles.main}>
        {selectedPath && result
          ? <PlanViewContent result={result} />
          : <div className={styles.empty}>Select a plan from the sidebar</div>
        }
      </main>
    </div>
  );
}
