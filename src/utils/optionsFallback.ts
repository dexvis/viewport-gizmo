import {
  GizmoAxisOptions,
  GizmoOptions,
  GizmoOptionsFallback,
} from "../types";
import {
  GIZMO_MAIN_AXES,
  GIZMO_FACE_ALIASES,
  GIZMO_DEFAULT_LABELS,
} from "./constants";

import { deepClone } from "./deepClone";

export const optionsFallback = (
  options: GizmoOptions
): GizmoOptionsFallback => {
  const resolution = options.resolution ?? 128;

  // JSON round-trip detaches the fallback merge from the caller's object;
  // the container element cannot survive it and is carried over explicitly.
  const { container, ...plainOptions } = options;
  options = JSON.parse(JSON.stringify(plainOptions));
  options.container = container;

  // Resolve CAD face aliases (front/back/left/right/top/bottom) to axis keys
  for (const [face, axis] of Object.entries(GIZMO_FACE_ALIASES)) {
    const faceOptions = (options as Record<string, GizmoAxisOptions>)[face];
    if (faceOptions) options[axis as keyof typeof GIZMO_DEFAULT_LABELS] = faceOptions;
  }

  const axesFallback: GizmoAxisOptions = {
    enabled: true,
    color: 0xffffff,
    opacity: 1,
    scale: 0.7,
    labelColor: 0x222222,
    border: {
      size: 0,
      color: 0xdddddd,
    },
    hover: {
      color: 0x93d3eb,
      labelColor: 0x222222,
      opacity: 1,
      scale: 0.7,
      border: {
        size: 0,
        color: 0xdddddd,
      },
    },
  };

  // No container default here: assignNestedDefaults skips the key, and
  // ViewportGizmo.set() falls back to document.body itself. Keeping DOM
  // references out makes this function runnable in plain node (tests).
  const optionsFallback: GizmoOptions = {
    size: 128,
    placement: "top-right",
    resolution,
    radius: 0.2,
    smoothness: 18,
    animated: true,
    speed: 1,
    poleUp: {
      // Tumble-from-front default: the roll reached by rotating the front
      // (+Z) view over the cube's top/bottom edge.
      top: [0, 0, -1],
      bottom: [0, 0, 1],
    },
    homeView: null,
    buttons: {
      roll: true,
      home: true,
    },
    background: {
      enabled: true,
      color: 0xe0e6ec,
      opacity: 1,
      hover: {
        color: 0xe0e6ec,
        opacity: 1,
      },
    },
    font: {
      family: "sans-serif",
      weight: 900,
      size: 0,
    },
    offset: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    corners: {
      enabled: true,
      color: 0xffffff,
      opacity: 1,
      scale: 0.2,
      radius: 1,
      smoothness: 18,
      hover: {
        color: 0x93d3eb,
        opacity: 1,
        scale: 0.225,
      },
    },
    edges: {
      enabled: true,
      color: 0xffffff,
      opacity: 0,
      radius: 0.125,
      smoothness: 18,
      scale: 1,
      hover: {
        color: 0x93d3eb,
        opacity: 1,
        scale: 1,
      },
    },
    x: { ...deepClone(axesFallback), label: GIZMO_DEFAULT_LABELS.x },
    y: { ...deepClone(axesFallback), label: GIZMO_DEFAULT_LABELS.y },
    z: { ...deepClone(axesFallback), label: GIZMO_DEFAULT_LABELS.z },
    nx: { label: GIZMO_DEFAULT_LABELS.nx },
    ny: { label: GIZMO_DEFAULT_LABELS.ny },
    nz: { label: GIZMO_DEFAULT_LABELS.nz },
  };

  assignNestedDefaults(options, optionsFallback);

  // Negative axes inherit everything unset from their positive counterpart
  GIZMO_MAIN_AXES.forEach((axis) =>
    assignNestedDefaults(
      (options as Record<string, unknown>)[`n${axis}`],
      deepClone((options as Record<string, unknown>)[axis])
    )
  );

  return options as GizmoOptionsFallback;
};

function assignNestedDefaults<T>(target: T, ...defaultObjects: T[]) {
  if (
    (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) ||
    typeof target !== "object" ||
    target === null
  )
    return target;

  for (const defaults of defaultObjects) {
    for (const key in defaults) {
      if (key === "container") continue;

      if (key in (defaults as object)) {
        if (target[key] === undefined) {
          (target as Record<string, unknown>)[key] = defaults[key];
        } else if (
          typeof defaults[key] === "object" &&
          defaults[key] !== null &&
          !Array.isArray(defaults[key])
        ) {
          (target as Record<string, unknown>)[key] = assignNestedDefaults(
            (target as Record<string, unknown>)[key] || {},
            defaults[key]
          );
        }
      }
    }
  }

  return target as T;
}
