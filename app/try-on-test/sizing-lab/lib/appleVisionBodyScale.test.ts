import assert from "node:assert/strict";
import test from "node:test";
import {
  measureAppleVisionSegmentOnPlane,
  type AppleVisionCameraVector,
  type AppleVisionRayPlaneModel,
} from "./appleVisionBodyScale";

const tiltRadians = 20 * Math.PI / 180;
const planeNormal: AppleVisionCameraVector = {
  x: 0,
  y: -Math.sin(tiltRadians),
  z: Math.cos(tiltRadians),
};
const verticalPlaneAxis: AppleVisionCameraVector = {
  x: 0,
  y: Math.cos(tiltRadians),
  z: Math.sin(tiltRadians),
};
const model: AppleVisionRayPlaneModel = {
  estimatedFocalXPx: 1_200,
  estimatedFocalYPx: 1_180,
  principalPointXPx: 600,
  principalPointYPx: 800,
  bodyOriginCameraM: { x: 0, y: 0, z: 2 },
  bodyPlaneNormalCamera: planeNormal,
};

test("ray-plane geometry keeps a real 10 cm segment at 10 cm across image heights", () => {
  for (const offsetM of [-0.5, 0, 0.5]) {
    const start3D = pointOnVerticalPlane(offsetM);
    const end3D = pointOnVerticalPlane(offsetM + 0.1);
    const measurement = measureAppleVisionSegmentOnPlane(
      model,
      projectToImage(start3D),
      projectToImage(end3D),
    );
    assert.ok(measurement);
    assert.ok(Math.abs(measurement.lengthCm - 10) < 1e-8);
    assert.ok(Math.abs(measurement.bodyPlaneTiltDeg - 20) < 1e-8);
  }
});

test("ray-plane geometry measures horizontal distance on the same tilted plane", () => {
  const center = pointOnVerticalPlane(0.2);
  const start3D = { ...center, x: -0.15 };
  const end3D = { ...center, x: 0.15 };
  const measurement = measureAppleVisionSegmentOnPlane(
    model,
    projectToImage(start3D),
    projectToImage(end3D),
  );
  assert.ok(measurement);
  assert.ok(Math.abs(measurement.lengthCm - 30) < 1e-8);
});

function pointOnVerticalPlane(distanceM: number): AppleVisionCameraVector {
  return {
    x: model.bodyOriginCameraM.x + verticalPlaneAxis.x * distanceM,
    y: model.bodyOriginCameraM.y + verticalPlaneAxis.y * distanceM,
    z: model.bodyOriginCameraM.z + verticalPlaneAxis.z * distanceM,
  };
}

function projectToImage(point: AppleVisionCameraVector): { x: number; y: number } {
  return {
    x: model.estimatedFocalXPx * point.x / point.z + model.principalPointXPx,
    y: model.principalPointYPx - model.estimatedFocalYPx * point.y / point.z,
  };
}
