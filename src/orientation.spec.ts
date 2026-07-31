import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { resolveViewUp, viewQuaternion, faceQuaternion } from "./orientation";
import type { GizmoOptionsFallback } from "./types";

type PoleUp = GizmoOptionsFallback["poleUp"];

const DEFAULT_POLE_UP: PoleUp = { top: [0, 0, -1], bottom: [0, 0, 1] };

// The HENP convention used by accelerator experiment displays (EIC):
// front view = camera on -X, Y up on screen, Z (beam) right on screen;
// top view keeps Z right on screen, so +X points to the top of the screen.
const HENP_POLE_UP: PoleUp = { top: [1, 0, 0], bottom: [-1, 0, 0] };

/** Screen axes of a camera orientation quaternion (camera local X = right, Y = up, -Z = viewing direction). */
function screenAxes(q: Quaternion) {
  return {
    right: new Vector3(1, 0, 0).applyQuaternion(q),
    up: new Vector3(0, 1, 0).applyQuaternion(q),
    backward: new Vector3(0, 0, 1).applyQuaternion(q),
  };
}

function expectVector(actual: Vector3, [x, y, z]: [number, number, number]) {
  expect(actual.x).toBeCloseTo(x, 10);
  expect(actual.y).toBeCloseTo(y, 10);
  expect(actual.z).toBeCloseTo(z, 10);
}

describe("resolveViewUp", () => {
  it("returns world up for side views", () => {
    const out = new Vector3();
    resolveViewUp(new Vector3(-1, 0, 0), HENP_POLE_UP, out);
    expectVector(out, [0, 1, 0]);
  });

  it("returns world up for corner views", () => {
    const out = new Vector3();
    resolveViewUp(new Vector3(1, 1, 1).normalize(), HENP_POLE_UP, out);
    expectVector(out, [0, 1, 0]);
  });

  it("returns the configured pole vectors at the poles", () => {
    const out = new Vector3();
    resolveViewUp(new Vector3(0, 1, 0), HENP_POLE_UP, out);
    expectVector(out, [1, 0, 0]);
    resolveViewUp(new Vector3(0, -1, 0), HENP_POLE_UP, out);
    expectVector(out, [-1, 0, 0]);
  });

  it("defaults to tumble-from-front at the poles", () => {
    const out = new Vector3();
    resolveViewUp(new Vector3(0, 1, 0), DEFAULT_POLE_UP, out);
    expectVector(out, [0, 0, -1]);
  });
});

describe("viewQuaternion — HENP views", () => {
  it("front view (camera on -X): Y up on screen, Z right, +X into the screen", () => {
    const direction = new Vector3(-1, 0, 0);
    const up = new Vector3(0, 1, 0);
    const q = viewQuaternion(direction, up, new Quaternion());

    const { right, up: screenUp, backward } = screenAxes(q);
    expectVector(right, [0, 0, 1]); // Z right on screen
    expectVector(screenUp, [0, 1, 0]); // Y up on screen
    expectVector(backward, [-1, 0, 0]); // camera sits on -X; +X goes into the screen
  });

  it("top view (camera on +Y with poleUp +X): Z right on screen, X to screen top", () => {
    const direction = new Vector3(0, 1, 0);
    const up = new Vector3();
    resolveViewUp(direction, HENP_POLE_UP, up);
    const q = viewQuaternion(direction, up, new Quaternion());

    const { right, up: screenUp, backward } = screenAxes(q);
    expectVector(right, [0, 0, 1]); // Z stays right — the tumble from the front view
    expectVector(screenUp, [1, 0, 0]); // X points to the top of the screen
    expectVector(backward, [0, 1, 0]); // camera above, looking down
  });

  it("right view (camera on +Z): Y up on screen, X right", () => {
    const q = viewQuaternion(
      new Vector3(0, 0, 1),
      new Vector3(0, 1, 0),
      new Quaternion()
    );

    const { right, up: screenUp } = screenAxes(q);
    expectVector(right, [1, 0, 0]);
    expectVector(screenUp, [0, 1, 0]);
  });

  it("bottom view (camera on -Y with poleUp -X): Z right on screen", () => {
    const direction = new Vector3(0, -1, 0);
    const up = new Vector3();
    resolveViewUp(direction, HENP_POLE_UP, up);
    const q = viewQuaternion(direction, up, new Quaternion());

    const { right, up: screenUp } = screenAxes(q);
    expectVector(right, [0, 0, 1]); // tumbling front -> bottom also keeps Z right
    expectVector(screenUp, [-1, 0, 0]);
  });

  it("re-orthogonalizes world up for corner views", () => {
    const direction = new Vector3(1, 1, 1).normalize();
    const up = new Vector3(0, 1, 0);
    const q = viewQuaternion(direction, up, new Quaternion());

    const { right, up: screenUp, backward } = screenAxes(q);
    // Orthonormal frame, viewing direction preserved
    expectVector(backward, [direction.x, direction.y, direction.z]);
    expect(right.dot(screenUp)).toBeCloseTo(0, 10);
    expect(right.dot(backward)).toBeCloseTo(0, 10);
    // Screen up stays in the plane spanned by world up and the view direction
    // (no unexpected roll): it has no component along right
    expect(screenUp.dot(new Vector3(0, 1, 0))).toBeGreaterThan(0);
  });

  it("never produces the degenerate lookAt roll at the top pole", () => {
    // The upstream bug: lookAt along +Y with up +Y lands with Z pointing DOWN
    // on screen. With resolveViewUp the screen up is exactly the configured one.
    const direction = new Vector3(0, 1, 0);
    const up = new Vector3();
    resolveViewUp(direction, DEFAULT_POLE_UP, up);
    const q = viewQuaternion(direction, up, new Quaternion());

    const { up: screenUp } = screenAxes(q);
    expectVector(screenUp, [0, 0, -1]); // defined roll, not an epsilon accident
  });
});

describe("faceQuaternion", () => {
  it("matches the camera view orientation for every face", () => {
    const normals = [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ];

    for (const normal of normals) {
      const faceQ = faceQuaternion(normal, HENP_POLE_UP, new Quaternion());
      const up = resolveViewUp(normal, HENP_POLE_UP, new Vector3());
      const viewQ = viewQuaternion(normal, up, new Quaternion());

      // Same orientation: the face label reads upright when the camera arrives
      expect(Math.abs(faceQ.dot(viewQ))).toBeCloseTo(1, 10);
    }
  });

  it("keeps the front face identity-oriented (labels upright in default view)", () => {
    const q = faceQuaternion(
      new Vector3(0, 0, 1),
      DEFAULT_POLE_UP,
      new Quaternion()
    );
    expect(Math.abs(q.w)).toBeCloseTo(1, 10);
  });
});

describe("roll composition", () => {
  it("rolling the front view 90° clockwise turns screen up from +Y to +Z... the correct way", () => {
    // Front view (HENP): camera on -X, up +Y, right +Z.
    const q = viewQuaternion(
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Quaternion()
    );

    // The gizmo's roll: q * Rz(+90°) rotates the image clockwise.
    const rolled = q
      .clone()
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
      );

    const { right, up, backward } = screenAxes(rolled);
    // Camera stays on -X
    expectVector(backward, [-1, 0, 0]);
    // Clockwise image rotation: whatever was at the top of the screen (+Y)
    // moves to the right edge, and the old left (-Z) becomes the new up.
    expectVector(right, [0, 1, 0]);
    expectVector(up, [0, 0, -1]);
  });
});
