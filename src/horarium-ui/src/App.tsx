import { useState } from 'react';
import { FileTree } from './components/FileTree';
import { PlanView } from './pages/PlanView';
import { useFileTree } from './hooks/useApi';
import styles from './App.module.css';

export default function App() {
  const { tree, loading } = useFileTree();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);

  function handleSelect(path: string) {
    setSelectedPath(path);
    setTreeOpen(false);
  }

  const planTitle = selectedPath
    ? (selectedPath.split('/').pop() ?? selectedPath).replace(/\.md$/i, '')
    : 'horarium';

  return (
    <div className={styles.shell} data-view={treeOpen ? 'tree' : 'plan'}>

      {/* Mobile top-bar — only visible in plan view on small screens */}
      <header className={styles.mobileBar}>
        <button className={styles.burgerBtn} onClick={() => setTreeOpen(true)} aria-label="Open file tree">
          &#9776;
        </button>
        <span className={styles.mobileTitle}>{planTitle}</span>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>horarium</span>
          {selectedPath && (
            <button
              className={styles.closeTreeBtn}
              onClick={() => setTreeOpen(false)}
              aria-label="Back to plan"
            >
              &#10005;
            </button>
          )}
        </div>
        {loading
          ? <div className={styles.sidebarLoading}>Loading…</div>
          : <FileTree nodes={tree} selectedPath={selectedPath} onSelect={handleSelect} />
        }
      </aside>

      <main className={styles.main}>
        {selectedPath
          ? <PlanView path={selectedPath} />
          : <div className={styles.empty}>Select a plan from the sidebar</div>
        }
      </main>

    </div>
  );
}
