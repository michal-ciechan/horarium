import type { Plan, Stage, Lane } from '../types/plan';
import styles from './StageList.module.css';

function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.prop}>
      <span className={styles.propLabel}>{label}</span>
      <span className={styles.propValue}>{value}</span>
    </div>
  );
}

function StageCard({ stage, lane }: { stage: Stage; lane?: Lane }) {
  const range = stage.start === stage.end ? stage.start : `${stage.start} → ${stage.end}`;

  return (
    <details
      className={styles.card}
      style={{ '--lane-color': lane?.color ?? 'var(--line-strong)' } as React.CSSProperties}
    >
      <summary className={styles.cardSummary}>
        <span className={styles.cardTitle}>{stage.title}</span>
        <span className={styles.cardRange}>{range}</span>
        {lane && (
          <span className={styles.laneTag} style={{ background: lane.color ?? '#eee' }}>
            {lane.label}
          </span>
        )}
      </summary>

      <div className={styles.cardBody}>
        <div className={styles.props}>
          <Prop label="id"    value={stage.id} />
          <Prop label="lane"  value={lane?.label ?? stage.laneId} />
          <Prop label="start" value={stage.start} />
          <Prop label="end"   value={stage.end} />
          {stage.dependsOn.length > 0 && (
            <Prop label="depends_on" value={stage.dependsOn.join(', ')} />
          )}
          {stage.enables.length > 0 && (
            <Prop label="enables" value={stage.enables.join(', ')} />
          )}
        </div>
        {stage.description && <p className={styles.desc}>{stage.description}</p>}
      </div>
    </details>
  );
}

export function StageList({ plan }: { plan: Plan }) {
  return (
    <details className={styles.section}>
      <summary className={styles.sectionSummary}>
        Stages
        <span className={styles.count}>{plan.stages.length}</span>
      </summary>

      <div className={styles.list}>
        {plan.stages.map(stage => (
          <StageCard
            key={stage.id}
            stage={stage}
            lane={plan.lanes.find(l => l.id === stage.laneId)}
          />
        ))}
      </div>
    </details>
  );
}
