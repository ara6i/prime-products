"use client";

import type { ProductSizeInput, ProductTapes } from "./productSizeImpact";
import { compareBodyTapes, signedTapeError, tapeErrorDescription, tapeNumber } from "./bodyTapeComparisonUtils";
import styles from "./BodyTapeComparison.module.css";

export function BodyTapeComparison({ input, actuals, personLabel, pending = false }: {
  input: ProductSizeInput | null; actuals: ProductTapes; personLabel: string; pending?: boolean;
}) {
  const rows = compareBodyTapes(input?.predicted ?? {}, actuals);
  const measured = rows.filter(row => row.differenceCm != null);
  const worst = measured.reduce<typeof measured[number] | null>((largest, row) =>
    !largest || Math.abs(row.differenceCm!) > Math.abs(largest.differenceCm!) ? row : largest, null);
  const withinGoal = measured.filter(row => row.withinGoal).length;
  const missingTape = rows.filter(row => row.realCm == null);
  const name = personLabel.split(" · ")[0] || personLabel;

  return <section className={styles.panel} aria-label="Real tape versus model" data-testid="body-tape-comparison">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>1 · BODY MEASUREMENT ERRORS</p><h2>Real tape vs model · {name}</h2><p>The saved tape is the reference. These are measurements around the body, not A-to-B widths.</p></div>
      <span className={styles.units}>All measurements in cm</span>
    </header>
    {worst ? <div className={styles.summary}>
      <div className={worst.withinGoal ? styles.within : styles.outside}>
        <span>Biggest difference</span>
        <strong data-testid="biggest-tape-error">{worst.label}: {tapeErrorDescription(worst.differenceCm!)}</strong>
      </div>
      <div><span>Your half-inch goal</span><strong>{withinGoal} of {measured.length} measured parts within 1.27 cm</strong><small>Only this person’s available tape checks—not a whole-model pass.</small></div>
    </div> : <p className={styles.empty} role="status">{pending ? "The model is running. Real tape is shown below; predictions are not ready yet."
      : !input ? "Real tape is shown below. Run the selected model to see its prediction and errors."
      : "No matching real-tape checks are available. Add them above to calculate errors."}</p>}
    <div className={styles.tableScroll}><table>
      <caption className={styles.srOnly}>Original model circumference compared with real tape for {name}</caption>
      <thead><tr><th scope="col">Body part</th><th scope="col">Real tape</th><th scope="col">Model prediction</th><th scope="col">Difference</th><th scope="col">Half-inch goal</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.kind} data-testid={`tape-comparison-${row.kind}`} className={row.withinGoal === false ? styles.errorRow : ""}>
        <th scope="row">{row.label}</th>
        <td><strong>{tapeNumber(row.realCm)}</strong>{row.realCm == null ? <small>No real tape saved</small> : null}</td>
        <td><strong>{tapeNumber(row.modelCm)}</strong>{row.modelCm == null ? <small>{input ? "Model did not provide it" : pending ? "Not ready yet" : "Not run yet"}</small> : null}</td>
        <td className={row.withinGoal === false ? styles.errorValue : ""}>
          <strong>{row.differenceCm == null ? "—" : signedTapeError(row.differenceCm)}</strong>
          <small>{row.differenceCm == null ? "Cannot compare" : row.differenceCm === 0 ? "Exact match" : row.differenceCm > 0 ? "Model is too high" : "Model is too low"}</small>
        </td>
        <td><span className={row.withinGoal == null ? styles.unknown : row.withinGoal ? styles.good : styles.bad}>
          {row.withinGoal == null ? "Not checked" : row.withinGoal ? "Within goal" : "Outside goal"}
        </span></td>
      </tr>)}</tbody>
    </table></div>
    <div className={styles.footnotes}>
      <p><strong>+ means too high. − means too low.</strong> Difference = model prediction minus real tape.</p>
      {missingTape.length ? <p>No real tape for {missingTape.map(row => row.label.toLowerCase()).join(", ")}. Those parts are not counted as correct or incorrect.</p> : null}
      <p>{input ? `Original ${input.model.version} output. ` : ""}This table adds no camera correction, clothing deduction or manual line adjustment.</p>
    </div>
  </section>;
}
