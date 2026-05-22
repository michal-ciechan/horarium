import { usePlan } from '../hooks/useApi';
import { Gantt } from '../components/Gantt';
import { ErrorBanner } from '../components/ErrorBanner';
import { RawContentView } from '../components/RawContentView';
import { StageList } from '../components/StageList';
import styles from './PlanView.module.css';
import type { ParseResult } from '../types/plan';

export function PlanViewContent({ result }: { result: ParseResult }) {
  if (result.status === 'Unrecognisable') {
    return (
      <div className={styles.page}>
        <RawContentView content={result.rawContent ?? ''} />
      </div>
    );
  }

  const plan = result.plan!;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>{plan.title}</h1>
        {plan.description && <p className={styles.desc}>{plan.description}</p>}
        <div className={styles.meta}>
          <span><strong>Start:</strong> {plan.start}</span>
          <span><strong>End:</strong> {plan.end}</span>
          <span><strong>Timeslice:</strong> {plan.timeslice}</span>
        </div>
      </header>

      <ErrorBanner errors={plan.errors} />

      <section className={styles.section}>
        <h2>Gantt</h2>
        <Gantt plan={plan} />
      </section>

      <StageList plan={plan} />
    </div>
  );
}

export function PlanView({ path }: { path: string }) {
  const { result, loading } = usePlan(path);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!result) return null;

  return <PlanViewContent result={result} />;
}
