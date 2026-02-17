import {
  init,
  h as snabbdomH,
  VNode as SnabbdomVNode,
  VNodeData as SnabbdomVNodeData,
  On as SnabbdomOn,
  propsModule,
  styleModule,
  eventListenersModule,
  attributesModule,
  classModule,
} from "snabbdom";
import { VNode, Renderer } from "@causaloop/core";
const patch = init([
  propsModule,
  styleModule,
  eventListenersModule,
  attributesModule,
  classModule,
]);
export function createSnabbdomRenderer<Snapshot>(
  container: Element,
  view: (snapshot: Snapshot, dispatch: (msg: unknown) => void) => VNode,
): Renderer<Snapshot> {
  let oldVNode: SnabbdomVNode | Element = container;
  function toSnabbdom(
    v: VNode,
    dispatch: (msg: unknown) => void,
  ): SnabbdomVNode | string {
    if (v.kind === "text") {
      return v.text;
    }
    const on: SnabbdomOn = {};
    if (v.data.on) {
      for (const [event, msg] of Object.entries(v.data.on)) {
        on[event] = (ev: Event) => {
          if (event === "submit") ev.preventDefault();
          if (typeof msg === "function") {
            msg(ev);
          } else if (msg) {
            dispatch(msg);
          }
        };
      }
    }
    const snabbdomData: SnabbdomVNodeData = { on };
    if (v.data.key !== undefined)
      snabbdomData.key = v.data.key as string | number;
    if (v.data.props) snabbdomData.props = v.data.props;
    if (v.data.attrs) snabbdomData.attrs = v.data.attrs;
    if (v.data.style) snabbdomData.style = v.data.style;
    if (v.data.class) snabbdomData.class = v.data.class;
    const children = v.children.map((c: VNode) => toSnabbdom(c, dispatch));
    return snabbdomH(
      v.tag,
      snabbdomData,
      children as Array<SnabbdomVNode | string>,
    );
  }
  return {
    render(snapshot: Snapshot, dispatch: (msg: unknown) => void) {
      const vnode = view(snapshot, dispatch);
      const newVNode = toSnabbdom(vnode, dispatch);
      if (typeof newVNode !== "string") {
        oldVNode = patch(oldVNode, newVNode);
      }
    },
    unmount() {},
  };
}
