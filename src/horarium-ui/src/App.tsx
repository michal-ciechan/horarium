import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileTree } from './components/FileTree';
import { PlanView } from './pages/PlanView';
import { useFileTree } from './hooks/useApi';
import styles from './App.module.css';

const PLAN_PREFIX = '/plan/';

function pathFromLocation(pathname: string): string | null {
  if (!pathname.startsWith(PLAN_PREFIX)) return null;
  return pathname
    .slice(PLAN_PREFIX.length)
    .split('/')
    .map(decodeURIComponent)
    .join('/');
}

function encodePlanPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export default function App() {
  const { tree, loading } = useFileTree();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedPath = pathFromLocation(location.pathname);

  // On mobile: start with tree open when no plan is in the URL, plan view otherwise.
  const [treeOpen, setTreeOpen] = useState(!selectedPath);

  // Re-open tree when navigating back to the root (e.g., browser back button).
  useEffect(() => {
    if (!selectedPath) setTreeOpen(true);
  }, [selectedPath]);

  function handleSelect(path: string) {
    navigate(PLAN_PREFIX + encodePlanPath(path));
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
        {import.meta.env.DEV && (
          <a
            href="http://localhost:17004"
            target="_blank"
            rel="noreferrer"
            className={styles.storybookLink}
          >
            Storybook
          </a>
        )}
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
