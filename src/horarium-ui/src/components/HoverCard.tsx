import type { Stage, Lane } from '../types/plan';
import styles from './HoverCard.module.css';

interface Props {
  stage: Stage;
  lanes: Lane[];
}

export function HoverCard({ stage, lanes }: Props) {
  const lane = lanes.find(l => l.id === stage.laneId);

  return (
    <div className={styles.card}>
      <div className={styles.meta}>
        {lane && <span className={styles.lanePill} style={{ background: lane.color ?? '#f0f0f0' }}>{lane.label}</span>}
        <span className={styles.period}>{stage.start}{stage.start !== stage.end ? ` → ${stage.end}` : ''}</span>
      </div>
      <h3 className={styles.title}>{stage.title}</h3>
      {stage.description && <p className={styles.desc}>{stage.description}</p>}
      {stage.dependsOn.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipLabel}>Depends on</span>
          {stage.dependsOn.map(id => <span key={id} className={styles.chip}>{id}</span>)}
        </div>
      )}
      {stage.enables.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipLabel}>Enables</span>
          {stage.enables.map(id => <span key={id} className={styles.chip}>{id}</span>)}
        </div>
      )}
    </div>
  );
}
