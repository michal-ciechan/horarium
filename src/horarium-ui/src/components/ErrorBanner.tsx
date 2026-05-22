import type { ParseError } from '../types/plan';
import styles from './ErrorBanner.module.css';

export function ErrorBanner({ errors }: { errors: ParseError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className={styles.banner} role="alert">
      <strong>⚠ Parse warnings</strong>
      <ul>
        {errors.map((e, i) => (
          <li key={i}><code>{e.field}</code>: {e.message}</li>
        ))}
      </ul>
    </div>
  );
}
