export const GIZMO_EPSILON = 1e-6;
export const GIZMO_TURN_RATE = 2 * Math.PI;
export const GIZMO_MAIN_AXES = ["x", "y", "z"] as const;
export const GIZMO_AXES = [...GIZMO_MAIN_AXES, "nx", "ny", "nz"] as const;

/** CAD-style aliases accepted in options, mapped to their axis keys (Y-up naming). */
export const GIZMO_FACE_ALIASES = {
  right: "x",
  top: "y",
  front: "z",
  left: "nx",
  bottom: "ny",
  back: "nz",
} as const;

/** Default face labels per axis key (Y-up CAD naming). */
export const GIZMO_DEFAULT_LABELS = {
  x: "Right",
  y: "Top",
  z: "Front",
  nx: "Left",
  ny: "Bottom",
  nz: "Back",
} as const;
