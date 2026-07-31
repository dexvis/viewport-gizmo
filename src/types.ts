import {
  BufferGeometry,
  ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  Object3DEventMap,
} from "three";

/** A plain [x, y, z] triple, accepted anywhere a direction or up vector is configured. */
export type GizmoVec3 = [number, number, number];

/**
 * A named camera view: the unit direction from the target to the camera and an
 * optional screen-up vector. When `up` is omitted it is resolved with the same
 * rule as face clicks (world up, or `poleUp` when looking along the up axis).
 */
export type GizmoView = {
  direction: GizmoVec3;
  up?: GizmoVec3;
};

/**
 * Configuration options for the ViewportGizmo.
 * All properties are optional and fall back to default values if not specified.
 */
export type GizmoOptions = {
  /** Parent element for the gizmo. Can be an HTMLElement or a CSS selector string */
  container?: HTMLElement | string;

  /** Size of the gizmo widget in pixels. Default `128` */
  size?: number;

  /**
   * Placement of the gizmo widget in the viewport: vertical alignment
   * (top, center, bottom) combined with horizontal alignment (left, center, right).
   */
  placement?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center-center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";

  /** Offset of the gizmo from the container edges in pixels. */
  offset?: {
    /** Offset from the left edge in pixels. Default `10` */
    left?: number;
    /** Offset from the top edge in pixels. Default `10` */
    top?: number;
    /** Offset from the right edge in pixels. Default `10` */
    right?: number;
    /** Offset from the bottom edge in pixels. Default `10` */
    bottom?: number;
  };

  /** Whether view changes should be animated. Default `true` */
  animated?: boolean;

  /** Animation speed multiplier. Higher values result in faster animations. Default `1` */
  speed?: number;

  /** Face texture resolution in pixels. Higher values improve label quality. Default `128` */
  resolution?: number;

  /** HTML `id` attribute for the gizmo container */
  id?: string;

  /** HTML `class` attribute for the gizmo container */
  className?: string;

  /**
   * Screen-up vectors for the two views that look along the world up axis (+Y),
   * where "keep world up on screen" has no answer. Defaults to the orientation
   * reached by tumbling from the front (+Z) view over the cube's horizontal edge:
   * `top: [0, 0, -1]`, `bottom: [0, 0, 1]`.
   *
   * These also orient the Top/Bottom face labels so the text reads upright when
   * the view arrives at that face.
   */
  poleUp?: {
    /** Screen-up for the view looking down (-Y direction of view). Default `[0, 0, -1]` */
    top?: GizmoVec3;
    /** Screen-up for the view looking up (+Y direction of view). Default `[0, 0, 1]` */
    bottom?: GizmoVec3;
  };

  /**
   * The view restored by the home button and the `home()` method.
   * Default `null` — `home()` then only emits the `home` event, so the host
   * application can run its own reset.
   */
  homeView?: GizmoView | null;

  /** The overlay buttons around the cube. */
  buttons?: {
    /** Show the two 90°-roll arrow buttons. Default `true` */
    roll?: boolean;
    /** Show the home button. Default `true` */
    home?: boolean;
  };

  /**
   * Font configuration for face labels.
   * Follows standard CSS font properties.
   */
  font?: {
    /** Font family for face labels */
    family?: string;
    /** Font weight for face labels */
    weight?: string | number;
    /** Font size in pixels for face labels. `0` = fit automatically */
    size?: number;
  };

  /** The gizmo background configuration (the plate behind the cube faces). */
  background?: {
    /** Whether to display the background. Default `true` */
    enabled?: boolean;
    /** Color of the background in normal state */
    color?: ColorRepresentation;
    /** Opacity of the background in normal state (0-1) */
    opacity?: number;
    hover?: {
      /** Color of the background when hovered */
      color?: ColorRepresentation;
      /** Opacity of the background when hovered (0-1) */
      opacity?: number;
    };
  };

  /** Configuration for the clickable corner indicators of the cube. */
  corners?: {
    /** Whether to display corner indicators. Default `true` */
    enabled?: boolean;
    /** Base color of the corner indicators in normal state */
    color?: ColorRepresentation;
    /** Opacity of corner indicators in normal state (0-1). Default `1` */
    opacity?: number;
    /** Scale multiplier for corner indicator size */
    scale?: number;
    /** Radius of the corner indicators in range [0, 1] */
    radius?: number;
    /** Smoothness of the corner indicators. Default `18` */
    smoothness?: number;
    /** Corner indicator appearance when hovered */
    hover?: {
      color?: ColorRepresentation;
      opacity?: number;
      scale?: number;
    };
  };

  /** Configuration for the clickable edge indicators of the cube. */
  edges?: {
    /** Whether to display edge indicators. Default `true` */
    enabled?: boolean;
    /** Base color of the edge indicators in normal state */
    color?: ColorRepresentation;
    /** Opacity of edge indicators in normal state (0-1). Default `0` (visible on hover) */
    opacity?: number;
    /** Scale multiplier for edge indicator thickness */
    scale?: number;
    /** Radius of the edge indicators. Controls the roundness */
    radius?: number;
    /** Smoothness of the edge indicators. Default `18` */
    smoothness?: number;
    /** Edge indicator appearance when hovered */
    hover?: {
      color?: ColorRepresentation;
      opacity?: number;
      scale?: number;
    };
  };

  /** The face corner radius in range [0, 1], applied to all faces */
  radius?: number;

  /** The face corner smoothness, applied to all faces */
  smoothness?: number;

  /** Configuration for the positive X face. @see {@link GizmoAxisOptions} */
  x?: GizmoAxisOptions;
  /** Configuration for the positive Y face. @see {@link GizmoAxisOptions} */
  y?: GizmoAxisOptions;
  /** Configuration for the positive Z face. @see {@link GizmoAxisOptions} */
  z?: GizmoAxisOptions;
  /** Configuration for the negative X face. @see {@link GizmoAxisOptions} */
  nx?: GizmoAxisOptions;
  /** Configuration for the negative Y face. @see {@link GizmoAxisOptions} */
  ny?: GizmoAxisOptions;
  /** Configuration for the negative Z face. @see {@link GizmoAxisOptions} */
  nz?: GizmoAxisOptions;

  /** @alias Alias for the positive `x` axis configuration (Y-up CAD naming) */
  right?: GizmoAxisOptions;
  /** @alias Alias for the positive `y` axis configuration */
  top?: GizmoAxisOptions;
  /** @alias Alias for the positive `z` axis configuration */
  front?: GizmoAxisOptions;
  /** @alias Alias for the negative `x` axis configuration */
  left?: GizmoAxisOptions;
  /** @alias Alias for the negative `y` axis configuration */
  bottom?: GizmoAxisOptions;
  /** @alias Alias for the negative `z` axis configuration */
  back?: GizmoAxisOptions;
};

/**
 * Configuration options for an individual cube face.
 */
export type GizmoAxisOptions = {
  /** Whether to draw the face. Default `true` */
  enabled?: boolean;

  /** Custom text label for the face. Defaults to the CAD face name */
  label?: string;

  /** The face opacity. Default `1` */
  opacity?: number;

  /** The scale multiplier for the face size. Default `1` */
  scale?: number;

  /** The face background color. */
  color?: ColorRepresentation;

  /** Color for the face text label */
  labelColor?: ColorRepresentation;

  /** The border around the face. */
  border?: {
    /** The border size around the face. */
    size: number;
    /** The border color around the face. */
    color: ColorRepresentation;
  };

  /** The face hover options. */
  hover?: {
    /** The fill color on hover */
    color?: ColorRepresentation;
    /** The label text color when the face is hovered. */
    labelColor?: ColorRepresentation;
    /** The opacity when the face is hovered. Default `1` */
    opacity?: number;
    /** The face scale multiplier when the face is hovered. Default `1` */
    scale?: number;
    /** The border around the face. */
    border?: {
      size: number;
      color: ColorRepresentation;
    };
  };
};

/**
 * Map of custom events emitted by the ViewportGizmo.
 * Extends Three.js Object3D events with gizmo-specific interaction events.
 */
export interface ViewportGizmoEventMap extends Object3DEventMap {
  /** Fired when a view change interaction begins (drag start or view-transition start). */
  start: {};

  /** Fired when a view change interaction completes. */
  end: {};

  /** Fired during view changes. */
  change: {};

  /** Fired when the home button or the `home()` method is triggered. */
  home: {};

  /** Fired when a roll starts. `direction` is `1` for clockwise, `-1` for counterclockwise. */
  roll: { direction: 1 | -1 };
}

type DeepRequired<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
    : T;

/** The {@link GizmoOptions} with every option resolved to its default or given value */
export type GizmoOptionsFallback = DeepRequired<
  Omit<GizmoOptions, "container" | "homeView">
> & {
  container?: HTMLElement | string;
  homeView: Required<GizmoView> | null;
};

/** A clickable gizmo object (face, edge or corner) */
export type GizmoAxisObject = Mesh<BufferGeometry, MeshBasicMaterial>;

/** Viewport bounding box as consumed by renderer.setViewport */
export type GizmoViewportArray = [
  x: number,
  y: number,
  width: number,
  height: number,
];
