import styles from './RawContentView.module.css';

export function RawContentView({ content }: { content: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.label}>Unrecognised file — raw content</div>
      <pre className={styles.pre}>{content}</pre>
    </div>
  );
}
