import {
  Camera,
  Clock,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer,
} from "three";

import { gizmoDomElement, setDomPlacement } from "./utils/gizmoDomElement";
import { getDomElement } from "./utils/getDomElement";
import { isClick } from "./utils/isClick";
import { intersectedObjects } from "./utils/intersectedObjects";
import { overlayButtons } from "./utils/overlayButtons";

import {
  GizmoOptions,
  GizmoView,
  ViewportGizmoEventMap,
  GizmoAxisOptions,
  GizmoOptionsFallback,
  GizmoAxisObject,
  GizmoViewportArray,
} from "./types";
import { GIZMO_EPSILON, GIZMO_TURN_RATE } from "./utils/constants";
import { updateBackground } from "./utils/updateBackground";
import type { OrbitControls } from "three/examples/jsm/Addons.js";
import { optionsFallback } from "./utils/optionsFallback";
import { clamp } from "three/src/math/MathUtils.js";
import { axesObjects } from "./utils/axesObjects";
import { axisHover } from "./utils/axisHover";
import { resolveViewUp, viewQuaternion } from "./orientation";
import type { WebGPURenderer } from "three/webgpu";

export type { GizmoOptions, ViewportGizmoEventMap, GizmoAxisOptions };

const _spherical = /*@__PURE__*/ new Spherical();
const _vec2 = /*@__PURE__*/ new Vector2();
const _vec3 = /*@__PURE__*/ new Vector3();
const _vec3b = /*@__PURE__*/ new Vector3();
const _vec4 = /*@__PURE__*/ new Vector4();
const _quat = /*@__PURE__*/ new Quaternion();
const _yAxis = /*@__PURE__*/ new Vector3(0, 1, 0);
const _zAxis = /*@__PURE__*/ new Vector3(0, 0, 1);

/**
 * ViewportGizmo is a 3D camera orientation controller: an interactive cube that
 * shows the current camera orientation and changes the view through clicking
 * its faces/edges/corners, dragging, rolling, or jumping to the home view.
 *
 * The world up axis is +Y. Views looking along ±Y take their screen-up from
 * the `poleUp` option, so "Top" arrives with a defined, configurable roll.
 *
 * @fires ViewportGizmo#start - Fired when a view change interaction begins
 * @fires ViewportGizmo#change - Fired during view changes
 * @fires ViewportGizmo#end - Fired when a view change interaction ends
 * @fires ViewportGizmo#home - Fired when the home button or `home()` is triggered
 * @fires ViewportGizmo#roll - Fired when a roll starts
 *
 * @extends Object3D
 */
export class ViewportGizmo extends Object3D<ViewportGizmoEventMap> {
  /** Whether the gizmo is currently active and responding to user input */
  enabled: boolean = true;

  /** The camera being controlled by this gizmo */
  camera: OrthographicCamera | PerspectiveCamera;

  /** The renderer rendering the gizmo (WebGLRenderer or WebGPURenderer) */
  renderer: WebGLRenderer | WebGPURenderer;

  /** The configuration options */
  options!: GizmoOptions;

  /** The point around which the camera rotates */
  target = new Vector3();

  /** Whether view changes should be animated */
  animated: boolean = true;

  /** The speed of view change animations. Higher values result in faster animations */
  speed: number = 1;

  /**
   * Indicates whether the gizmo is currently being animated or not,
   * Useful when interacting with other camera controllers
   *
   * @readonly This value is set internally.
   **/
  animating = false;

  private _options!: GizmoOptionsFallback;
  private _intersections!: GizmoAxisObject[];
  private _background: Mesh<any, MeshBasicMaterial> | null = null;
  private _viewport: GizmoViewportArray = [0, 0, 0, 0];
  private _originalViewport: GizmoViewportArray = [0, 0, 0, 0];
  private _originalScissor: GizmoViewportArray = [0, 0, 0, 0];
  private _scene: Scene;
  private _camera!: Camera;
  private _container!: HTMLElement;
  private _domElement!: HTMLElement;
  private _domRect!: DOMRect;
  private _dragging: boolean = false;
  private _distance: number = 0;
  private _clock: Clock = new Clock();
  private _targetQuaternion = new Quaternion();
  private _quaternionStart = new Quaternion();
  private _quaternionEnd = new Quaternion();
  private _upEnd = new Vector3(0, 1, 0);
  private _pointerStart = new Vector2();
  private _focus: GizmoAxisObject | null = null;
  private _placement!: GizmoOptionsFallback["placement"];
  private _controls?: OrbitControls;
  private _controlsListeners?: {
    start: () => void;
    end: () => void;
    change: () => void;
  };

  /**
   * Creates a new ViewportGizmo instance.
   *
   * @param camera - The camera to be controlled by this gizmo
   * @param renderer - The renderer used to render the scene
   * @param options - {@link GizmoOptions}, Configuration options for the gizmo.
   */
  constructor(
    camera: PerspectiveCamera | OrthographicCamera,
    renderer: WebGLRenderer | WebGPURenderer,
    options: GizmoOptions = {}
  ) {
    super();

    this.camera = camera;
    this.renderer = renderer;
    this._scene = new Scene().add(this);
    this.set(options);
  }

  /** Gets the current placement of the gizmo relative to its container. */
  get placement(): GizmoOptionsFallback["placement"] {
    return this._placement;
  }

  /**
   * Sets and update the placement of the gizmo relative to its container.
   *
   * @param placement - The new placement position
   */
  set placement(placement: GizmoOptionsFallback["placement"]) {
    this._placement = setDomPlacement(this._domElement, placement);
    this.domUpdate();
  }

  /**
   * Regenerates the gizmo with the new options.
   *
   * @remarks
   * - Not recommended for use in real-time rendering or animation loops
   * - Provides a way to completely rebuild the gizmo with new options
   * - Can be computationally expensive, so use sparingly
   */
  set(options: GizmoOptions = {}) {
    this.dispose();

    this.options = options;
    this._options = optionsFallback(options);

    this._camera = new PerspectiveCamera(26, 1, 5, 10);
    this._camera.position.set(0, 0, 7);

    const [axes, background] = axesObjects(this._options);

    if (background) this.add(background);
    this.add(...axes);

    this._background = background;
    this._intersections = axes;

    const { container, animated, speed, placement } = this._options;

    this.animated = animated;
    this.speed = speed;
    this._placement = placement;

    this._container = container
      ? getDomElement(container as string)
      : document.body;

    this._domElement = gizmoDomElement(this._options);
    this._domElement.onpointerdown = (e) => this._onPointerDown(e);
    this._domElement.onpointermove = (e) => this._onPointerMove(e);
    this._domElement.onpointerleave = () => this._onPointerLeave();

    overlayButtons(this._domElement, this._options, {
      roll: (direction) => this.roll(direction),
      home: () => this.home(),
    });

    this._container.appendChild(this._domElement);

    if (this._controls) this.attachControls(this._controls);

    this.update();

    return this;
  }

  /**
   * Renders the gizmo to the screen.
   * This method handles viewport and scissor management to ensure the gizmo
   * renders correctly without affecting the main scene rendering.
   *
   * @returns The gizmo instance for method chaining
   */
  render() {
    if (this.animating) this._animate();

    const renderer = this.renderer;

    const scissorTest = renderer.getScissorTest();
    const saved = {
      autoClear: renderer.autoClear,
      color: renderer.autoClearColor,
      depth: renderer.autoClearDepth,
      stencil: renderer.autoClearStencil,
    };

    // Clear depth in-pass via the autoClear flags instead of renderer.clear():
    // WebGPURenderer runs an explicit clear() as its own render pass, which
    // desyncs the viewport state and draws parts of the gizmo displaced.
    renderer.autoClear = true;
    renderer.autoClearColor = false;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = false;

    renderer.setViewport(...this._viewport);
    if (scissorTest) renderer.setScissor(...this._viewport);

    renderer.render(this._scene, this._camera);

    renderer.setViewport(...this._originalViewport);
    if (scissorTest) renderer.setScissor(...this._originalScissor);

    renderer.autoClear = saved.autoClear;
    renderer.autoClearColor = saved.color;
    renderer.autoClearDepth = saved.depth;
    renderer.autoClearStencil = saved.stencil;

    return this;
  }

  /**
   * Updates the gizmo's DOM-related properties based on its current position
   * and size in the document.
   *
   * @returns The gizmo instance for method chaining
   */
  domUpdate() {
    this._domRect = this._domElement.getBoundingClientRect();

    const renderer = this.renderer;
    const domRect = this._domRect;
    const containerRect = renderer.domElement.getBoundingClientRect();

    // WebGL's viewport origin is bottom-left, WebGPU's is top-left.
    const isWebGPU = (renderer as WebGPURenderer).isWebGPURenderer === true;
    const viewportY = isWebGPU
      ? domRect.top - containerRect.top
      : renderer.domElement.clientHeight -
        (domRect.top - containerRect.top + domRect.height);

    this._viewport.splice(
      0,
      4,
      domRect.left - containerRect.left,
      viewportY,
      domRect.width,
      domRect.height
    );

    renderer.getViewport(_vec4).toArray(this._originalViewport);
    if (renderer.getScissorTest())
      renderer.getScissor(_vec4).toArray(this._originalScissor);

    return this;
  }

  /**
   * Updates the gizmo's orientation to match the current camera orientation.
   *
   * @returns The gizmo instance for method chaining
   */
  cameraUpdate() {
    this._updateOrientation();
    return this;
  }

  /**
   * Performs a complete update of the gizmo, including both DOM and camera-related updates.
   *
   * @param controls - Internal. Set to `false` if the update event comes from the attached controls.
   *
   * @returns The gizmo instance for method chaining
   */
  update(controls: boolean = true) {
    if (controls && this._controls) this._controls.update();
    return this.domUpdate().cameraUpdate();
  }

  /**
   * Animates the camera to a given view.
   *
   * @param view - The view direction (from the target to the camera) and an
   * optional screen-up vector. When `up` is omitted it is resolved like a face
   * click: world up, or `poleUp` when the direction looks along the up axis.
   *
   * @returns The gizmo instance for method chaining
   */
  view(view: GizmoView) {
    if (this.animating) return this;

    _vec3.fromArray(view.direction).normalize();

    if (view.up) _vec3b.fromArray(view.up).normalize();
    else resolveViewUp(_vec3, this._options.poleUp, _vec3b);

    this._startTransition(_vec3, _vec3b);
    this.dispatchEvent({ type: "change" });

    return this;
  }

  /**
   * Rolls the view by 90° around the view axis. The camera keeps its position;
   * its up vector turns, and attached OrbitControls keep orbiting around the
   * new up.
   *
   * @param direction - `1` rolls the on-screen image clockwise, `-1` counterclockwise
   *
   * @returns The gizmo instance for method chaining
   */
  roll(direction: 1 | -1 = 1) {
    if (this.animating || !this.enabled) return this;

    const camera = this.camera;

    this._distance = camera.position.distanceTo(this.target);
    this._quaternionStart.copy(camera.quaternion);

    // Turning the camera by +θ about its local view axis rotates the image
    // clockwise by θ.
    _quat.setFromAxisAngle(_zAxis, direction * (Math.PI / 2));
    this._quaternionEnd.copy(this._quaternionStart).multiply(_quat);
    this._targetQuaternion.copy(this._quaternionEnd);

    snapToAxis(
      this._upEnd.copy(_yAxis).applyQuaternion(this._quaternionEnd)
    );

    this.dispatchEvent({ type: "roll", direction });

    this.animating = true;
    this._clock.start();
    this.dispatchEvent({ type: "start" });
    this.dispatchEvent({ type: "change" });

    return this;
  }

  /**
   * Returns to the home view. With a configured `homeView` option the camera
   * animates there; the `home` event fires either way, so the host application
   * can implement its own reset.
   *
   * @returns The gizmo instance for method chaining
   */
  home() {
    this.dispatchEvent({ type: "home" });

    const homeView = this._options.homeView;
    if (homeView) this.view(homeView);

    return this;
  }

  /**
   * Connects OrbitControls with the gizmo, handling interaction states and updates.
   * Automatically detaches any previously attached controls.
   *
   * @param controls - The scene's {@link https://threejs.org/docs/#examples/en/controls/OrbitControls OrbitControls}
   */
  attachControls(controls: OrbitControls) {
    this.detachControls();

    this.target = controls.target;

    this._controlsListeners = {
      start: () => (controls.enabled = false),
      end: () => (controls.enabled = true),
      change: () => this.update(false),
    };

    this.addEventListener("start", this._controlsListeners.start);
    this.addEventListener("end", this._controlsListeners.end);
    controls.addEventListener("change", this._controlsListeners.change);

    this._controls = controls;

    return this;
  }

  /** Removes all control event listeners and references. Safe to call multiple times. */
  detachControls() {
    if (!this._controlsListeners || !this._controls) return;

    this.target = new Vector3().copy(this._controls.target);

    this.removeEventListener("start", this._controlsListeners.start);
    this.removeEventListener("end", this._controlsListeners.end);

    this._controls.removeEventListener(
      "change",
      this._controlsListeners.change
    );

    this._controlsListeners = undefined;
    this._controls = undefined;

    return this;
  }

  /** Cleans up all resources including geometries, materials, textures, and event listeners. */
  dispose() {
    this.detachControls();

    this.animating = false;

    this.children.slice().forEach((child) => {
      this.remove(child);
      const mesh = child as Mesh<any, MeshBasicMaterial>;
      mesh.material?.dispose();
      mesh.material?.map?.dispose();
      mesh.geometry?.dispose();
    });

    this._domElement?.remove();
  }

  /**
   * Updates the gizmo's orientation either based on the camera or internal state.
   *
   * @private
   * @param fromCamera - Whether to update based on camera orientation (true) or internal state (false)
   */
  private _updateOrientation(fromCamera: boolean = true) {
    if (fromCamera) {
      this.quaternion.copy(this.camera.quaternion).invert();
      this.updateMatrixWorld();
    }
  }

  /**
   * Starts an animated transition to the view given by `direction` (unit
   * vector from the target to the camera) and `up` (requested screen-up; may
   * be world up for tilted directions — the camera orientation
   * re-orthogonalizes it, while `camera.up` receives it as passed).
   *
   * @private
   */
  private _startTransition(direction: Vector3, up: Vector3) {
    this._distance = this.camera.position.distanceTo(this.target);

    viewQuaternion(direction, up, this._quaternionEnd);
    this._targetQuaternion.copy(this._quaternionEnd);
    this._quaternionStart.copy(this.camera.quaternion);
    this._upEnd.copy(up);

    this.animating = true;
    this._clock.start();
    this.dispatchEvent({ type: "start" });
  }

  /**
   * Completes a view transition: applies the final camera up vector, refreshes
   * the attached controls to orbit around it, and re-enables them.
   *
   * @private
   */
  private _finishTransition() {
    this.camera.up.copy(this._upEnd);
    this._syncControlsUp();

    if (this._controls) {
      this._controls.update();
      this._controls.enabled = true;
    }

    this.animating = false;
    this.dispatchEvent({ type: "end" });
  }

  /**
   * OrbitControls captures its up axis once, in its constructor. After the
   * gizmo changes `camera.up` (pole views, rolls) the private quaternions must
   * be refreshed or orbiting keeps rotating around the old up.
   *
   * @private
   */
  private _syncControlsUp() {
    const controls = this._controls as unknown as {
      _quat?: Quaternion;
      _quatInverse?: Quaternion;
    };
    if (!controls?._quat?.setFromUnitVectors) return;

    controls._quat.setFromUnitVectors(this.camera.up, _yAxis);
    controls._quatInverse?.copy(controls._quat).invert();
  }

  /**
   * Handles the animation of camera position and orientation changes.
   *
   * @private
   */
  private _animate() {
    const { position, quaternion } = this.camera;

    position.set(0, 0, 1);

    if (!this.animated) {
      position
        .applyQuaternion(this._quaternionEnd)
        .multiplyScalar(this._distance)
        .add(this.target);

      quaternion.copy(this._targetQuaternion);

      this._updateOrientation();
      this.dispatchEvent({ type: "change" });
      this._finishTransition();
      return;
    }

    if (this._controls) this._controls.enabled = false;

    const delta = this._clock.getDelta();

    const step = delta * GIZMO_TURN_RATE * this.speed;

    this._quaternionStart.rotateTowards(this._quaternionEnd, step);

    position
      .applyQuaternion(this._quaternionStart)
      .multiplyScalar(this._distance)
      .add(this.target);

    quaternion.rotateTowards(this._targetQuaternion, step);

    this._updateOrientation();
    requestAnimationFrame(() => this.dispatchEvent({ type: "change" }));

    if (this._quaternionStart.angleTo(this._quaternionEnd) < GIZMO_EPSILON) {
      this._finishTransition();
    }
  }

  /**
   * Sets the camera orientation to look at the target from a clicked gizmo
   * object's position, with the screen-up resolved by the poleUp rule.
   *
   * @private
   * @param position - The clicked object's position (face, edge or corner)
   */
  private _setOrientation(position: Vector3) {
    _vec3.copy(position).normalize();
    resolveViewUp(_vec3, this._options.poleUp, _vec3b);
    this._startTransition(_vec3, _vec3b);
  }

  /**
   * Handles the pointer down event for starting drag operations.
   *
   * @private
   * @param e - The pointer event
   */
  private _onPointerDown(e: PointerEvent) {
    if (!this.enabled) return;

    const drag = (e: PointerEvent) => {
      if (!this._dragging) {
        if (isClick(e, this._pointerStart)) return;
        this._dragging = true;
      }

      const pointerAngle = _vec2
        .set(e.clientX, e.clientY)
        .sub(this._pointerStart)
        .multiplyScalar((1 / this._domRect.width) * Math.PI);

      const direction = _vec3.subVectors(this.camera.position, this.target);

      const spherical = _spherical.setFromVector3(direction);

      spherical.theta = initialTheta - pointerAngle.x;
      spherical.phi = clamp(
        initialPhi - pointerAngle.y,
        GIZMO_EPSILON,
        Math.PI - GIZMO_EPSILON
      );

      this.camera.position.setFromSpherical(spherical).add(this.target);

      this.camera.lookAt(this.target);

      this.quaternion.copy(this.camera.quaternion).invert();

      this._updateOrientation(false);
      this.dispatchEvent({ type: "change" });
    };

    const endDrag = () => {
      document.removeEventListener("pointermove", drag, false);
      document.removeEventListener("pointerup", endDrag, false);

      if (!this._dragging) return this._handleClick(e);

      if (this._focus) {
        axisHover(this._focus, false);
        this._focus = null;
      }

      this._dragging = false;
      this.dispatchEvent({ type: "end" });
    };

    if (this.animating) return;

    e.preventDefault();
    this._pointerStart.set(e.clientX, e.clientY);

    const direction = _vec3.subVectors(this.camera.position, this.target);

    const initialSpherical = _spherical.setFromVector3(direction);
    const initialTheta = initialSpherical.theta;
    const initialPhi = initialSpherical.phi;
    this._distance = initialSpherical.radius;

    document.addEventListener("pointermove", drag, false);
    document.addEventListener("pointerup", endDrag, false);

    this.dispatchEvent({ type: "start" });
  }

  /**
   * Handles pointer move events for hover effects and drag operations.
   *
   * @private
   * @param e - The pointer event
   */
  private _onPointerMove(e: PointerEvent) {
    if (!this.enabled || this._dragging) return;

    if (this._background) updateBackground(this._background, true);

    this._handleHover(e);
  }

  /**
   * Handles pointer leave events to reset hover states.
   *
   * @private
   */
  private _onPointerLeave() {
    if (!this.enabled || this._dragging) return;

    if (this._background) updateBackground(this._background, false);
    if (this._focus) axisHover(this._focus, false);

    this._domElement.style.cursor = "";
  }

  /**
   * Handles click events for axis selection.
   *
   * @private
   * @param e - The pointer event
   */
  private _handleClick(e: PointerEvent) {
    const intersection = intersectedObjects(
      e,
      this._domRect,
      this._camera,
      this._intersections
    );

    if (this._focus) {
      axisHover(this._focus, false);
      this._focus = null;
    }

    if (!intersection) return;

    this._setOrientation(intersection.object.position);

    this.dispatchEvent({ type: "change" });
  }

  /**
   * Handles hover effects for interactive elements.
   *
   * @private
   * @param e - The pointer event
   */
  private _handleHover(e: PointerEvent) {
    const intersection = intersectedObjects(
      e,
      this._domRect,
      this._camera,
      this._intersections
    );

    const object = intersection?.object || null;

    if (this._focus === object) return;

    this._domElement.style.cursor = object ? "pointer" : "";

    if (this._focus) axisHover(this._focus, false);

    if ((this._focus = object)) axisHover(object, true);
  }
}

/**
 * Snaps near-axis unit vectors to the exact axis. 90° roll results carry
 * floating point noise; OrbitControls behaves best with an exact up axis.
 */
function snapToAxis(v: Vector3) {
  const threshold = 1e-6;
  if (Math.abs(v.x) < threshold) v.x = 0;
  if (Math.abs(v.y) < threshold) v.y = 0;
  if (Math.abs(v.z) < threshold) v.z = 0;
  return v.normalize();
}
