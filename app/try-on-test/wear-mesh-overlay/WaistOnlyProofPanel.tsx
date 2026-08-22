"use client";

import { useEffect, useState } from "react";
import styles from "./wearMeshOverlay.module.css";

interface WaistNeighbor {
  rank: number;
  scanId: string;
  heightCm: number;
  weightKg: number;
  meanAbsoluteWidthErrorCmEquivalent: number;
  wearWaistDepthCm: number;
  wearWaistTapeCm: number | null;
}

interface WaistMatchResponse {
  error?: string;
  strictCohort: { eligibleCount: number };
  revealPhase: {
    predictedCircumferenceCm: number | null;
    neighbors: WaistNeighbor[];
  };
}

export function WaistOnlyProofPanel({
  photoId,
  gender,
  heightCm,
  weightKg,
  savedWaistCm,
}: {
  photoId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  savedWaistCm: number;
}) {
  const [payload, setPayload] = useState<WaistMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const proofKey = `${photoId}:${heightCm}:${weightKg}`;
  const revealed = revealedKey === proofKey;

  useEffect(() => {
    let cancelled = false;
    const parameters = new URLSearchParams({
      photo: photoId,
      gender,
      heightCm: String(heightCm),
      weightKg: String(weightKg),
    });
    fetch(`/api/try-on-test/wear-mesh-overlay/waist-match?${parameters}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as WaistMatchResponse;
        if (!response.ok) throw new Error(result.error || "Waist proof unavailable");
        return result;
      })
      .then((result) => {
        if (!cancelled) {
          setPayload(result);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Waist proof unavailable");
      });
    return () => { cancelled = true; };
  }, [gender, heightCm, photoId, weightKg]);

  if (error) return <section className={styles.waistProof}><strong>Waist-only proof unavailable</strong><p>{error}</p></section>;
  if (!payload) return <section className={styles.waistProof}><strong>Running tape-blind waist search…</strong></section>;
  const predicted = payload.revealPhase.predictedCircumferenceCm;
  const difference = predicted == null ? null : predicted - savedWaistCm;

  return (
    <section className={styles.waistProof}>
      <header>
        <div>
          <span>New proof · front waist only</span>
          <h2>Five waist slices choose the WEAR neighbors</h2>
          <p>No Delaram tape, WEAR tape, depth, or circumference entered the ranking.</p>
        </div>
        <b>{payload.strictCohort.eligibleCount} strict bodies</b>
      </header>
      <div className={styles.waistProofSteps}>
        <div><b>1</b><span>Measure 5 visible waist widths</span></div>
        <div><b>2</b><span>Freeze the closest 5 shapes</span></div>
        <div><b>3</b><span>Reveal their WEAR labels</span></div>
      </div>
      <div className={styles.waistProofResult}>
        <div><span>Blind WEAR prediction</span><strong>{predicted == null ? "–" : `${predicted.toFixed(1)} cm`}</strong><small>weighted top-five real WEAR waists</small></div>
        <div><span>Delaram saved tape</span><strong>{revealed ? `${savedWaistCm.toFixed(1)} cm` : "Hidden"}</strong><small>never sent to the matcher</small></div>
        <div><span>Final error</span><strong>{revealed && difference != null ? `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} cm` : "Reveal first"}</strong><small>{revealed ? "prediction minus tape" : "blind check locked"}</small></div>
        <button type="button" onClick={() => setRevealedKey(revealed ? null : proofKey)}>{revealed ? "Hide tape again" : "Reveal saved 79 cm"}</button>
      </div>
      <div className={styles.waistNeighborGrid}>
        {payload.revealPhase.neighbors.map((neighbor) => (
          <article key={neighbor.scanId}>
            <span>#{neighbor.rank} · {neighbor.scanId}</span>
            <strong>{neighbor.meanAbsoluteWidthErrorCmEquivalent.toFixed(2)} cm slice error</strong>
            <small>H {neighbor.heightCm.toFixed(1)} · W {neighbor.weightKg.toFixed(2)} kg</small>
            <div><b>{neighbor.wearWaistTapeCm?.toFixed(1) ?? "–"} cm</b><em>WEAR waist · revealed after rank</em></div>
          </article>
        ))}
      </div>
      <p className={styles.waistProofTruth}>Current honest result: front-only predicts {predicted?.toFixed(1) ?? "–"} cm. It does not naturally reach 79 cm yet. The separate Front + Side tab tests whether measured depth fixes that gap.</p>
    </section>
  );
}
