export type VKey = string | number | undefined;
export type VNodeProperty = string | number | boolean | null | undefined;
export interface VNodeData {
  key?: VKey;
  props?: Record<string, VNodeProperty>;
  attrs?: Record<string, string | number | boolean>;
  style?: Record<string, string>;
  class?: Record<string, boolean>;
  on?: Record<string, unknown>;
}
export type VNode =
  | {
      kind: "text";
      text: string;
      key?: VKey;
    }
  | {
      kind: "element";
      tag: string;
      data: VNodeData;
      children: ReadonlyArray<VNode>;
    };
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
export function text(content: string, key?: VKey): VNode {
  return { kind: "text", text: content, key };
}
export interface Renderer<Snapshot> {
  render(snapshot: Snapshot, dispatch: (msg: unknown) => void): void;
  unmount(): void;
}
