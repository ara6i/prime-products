"use client";

import type { PoseResult } from "../types";

const POSE_NAMES: Record<number, string> = {
  0: "nose",
  1: "left_eye_inner", 2: "left_eye", 3: "left_eye_outer",
  4: "right_eye_inner", 5: "right_eye", 6: "right_eye_outer",
  7: "left_ear", 8: "right_ear",
  9: "mouth_left", 10: "mouth_right",
  11: "left_shoulder", 12: "right_shoulder",
  13: "left_elbow", 14: "right_elbow",
  15: "left_wrist", 16: "right_wrist",
  17: "left_pinky", 18: "right_pinky",
  19: "left_index", 20: "right_index",
  21: "left_thumb", 22: "right_thumb",
  23: "left_hip", 24: "right_hip",
  25: "left_knee", 26: "right_knee",
  27: "left_ankle", 28: "right_ankle",
  29: "left_heel", 30: "right_heel",
  31: "left_foot_index", 32: "right_foot_index",
};

interface Props {
  pose: PoseResult | null;
}

export function LandmarkTable({ pose }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Landmarks{pose?.landmarks ? ` (${pose.landmarks.length})` : ""}
      </h3>
      {!pose?.landmarks?.length ? (
        <p className="text-sm text-text-secondary">No landmarks yet — run Analyze.</p>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-[11px] font-mono tabular-nums">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-text-hint uppercase tracking-wider">
                <th className="text-left px-2 py-1.5">#</th>
                <th className="text-left px-2 py-1.5">name</th>
                <th className="text-right px-2 py-1.5">x</th>
                <th className="text-right px-2 py-1.5">y</th>
                <th className="text-right px-2 py-1.5">z</th>
                <th className="text-right px-2 py-1.5">vis</th>
              </tr>
            </thead>
            <tbody>
              {pose.landmarks.map((p, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1 text-text-hint">{i}</td>
                  <td className="px-2 py-1 text-text-primary">{POSE_NAMES[i] ?? `lm_${i}`}</td>
                  <td className="px-2 py-1 text-right">{p.x.toFixed(4)}</td>
                  <td className="px-2 py-1 text-right">{p.y.toFixed(4)}</td>
                  <td className={`px-2 py-1 text-right ${Math.abs(p.z) > 0.001 ? "text-brand-blue font-semibold" : "text-text-hint"}`}>
                    {p.z.toFixed(4)}
                  </td>
                  <td className={`px-2 py-1 text-right ${p.visibility < 0.5 ? "text-amber-600" : "text-text-secondary"}`}>
                    {p.visibility.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
