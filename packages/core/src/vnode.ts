/**
 * Platform-agnostic Virtual DOM node types.
 * These are pure data structures that describe the UI state.
 */

export type VKey = string | number | undefined;

export type VNodeProperty = string | number | boolean | null | undefined;

export interface VNodeData {
  key?: VKey;
  props?: Record<string, VNodeProperty>;
  attrs?: Record<string, string | number | boolean>;
  style?: Record<string, string>;
  class?: Record<string, boolean>;
  on?: Record<string, unknown>; // Dispatched Msg
}

export type VNode =
  | { kind: "text"; text: string; key?: VKey }
  | {
      kind: "element";
      tag: string;
      data: VNodeData;
      children: ReadonlyArray<VNode>;
    };

/**
 * Functional helper to create VNodes (HyperScript style).
 */
export function h(
  tag: string,
  data: VNodeData = {},
  children: Array<VNode | string> = [],
): VNode {
  return {
    kind: "element",
    tag,
    data: {
      ...data,
      key: data.key,
    },
    children: children.map((c) =>
      typeof c === "string" ? { kind: "text", text: c, key: undefined } : c,
    ),
  };
}

/**
 * Helper to create text nodes explicitly.
 */
export function text(content: string, key?: VKey): VNode {
  return { kind: "text", text: content, key };
}

/**
 * Minimal renderer interface for platform-specific implementations.
 */
export interface Renderer<Snapshot> {
  render(snapshot: Snapshot, dispatch: (msg: unknown) => void): void;
  unmount(): void;
}
