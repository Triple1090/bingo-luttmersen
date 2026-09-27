interface DrawHistoryProps {
  readonly drawnNumbers: readonly number[];
}

export function DrawHistory({ drawnNumbers }: DrawHistoryProps) {
  const calls = [...drawnNumbers].reverse();

  return (
    <section className="draw-history" aria-labelledby="draw-history-title">
      <h2 id="draw-history-title" className="draw-history-title">Aufgerufene Zahlen</h2>
      {calls.length === 0 ? (
        <p className="draw-history-empty">Es wurden noch keine Zahlen aufgerufen.</p>
      ) : (
        <ol className="draw-history-list" aria-label="Aufgerufene Zahlen, neueste zuerst">
          {calls.map((number, index) => (
            <li key={number} className="draw-history-item">
              <span className="draw-history-order">{drawnNumbers.length - index}</span>
              <span className="draw-history-number">{number}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}