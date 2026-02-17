import { describe, it, expect, beforeEach } from "vitest";
import { createSnabbdomRenderer } from "../renderer.js";
import { h, VNode } from "@causaloop/core";

describe("VDOM Extreme Stress", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  it("Node Explosion: renders 10,000 nodes", () => {
    const COUNT = 10_000;
    const view = () =>
      h(
        "div",
        { attrs: { id: "container" } },
        Array.from({ length: COUNT }, (_, i) =>
          h("span", { key: i }, [`Node ${i}`]),
        ),
      );

    const renderer = createSnabbdomRenderer(root, view);

    renderer.render({}, () => {});

    const container = document.getElementById("container");
    expect(container).not.toBeNull();
    expect(container!.querySelectorAll("span").length).toBe(COUNT);
  });

  it("Deep Nesting: handles 1,000 level deep structure", () => {
    const DEPTH = 1000;
    const buildDeep = (depth: number): VNode => {
      if (depth === 0)
        return h("span", { attrs: { id: "deepest" } }, ["Deepest"]);
      return h("div", { class: { nest: true } }, [buildDeep(depth - 1)]);
    };

    const renderer = createSnabbdomRenderer(root, () => buildDeep(DEPTH));
    renderer.render({}, () => {});

    expect(document.getElementById("deepest")).not.toBeNull();
    expect(document.querySelectorAll(".nest").length).toBe(DEPTH);
  });

  it("Rapid Patching: updates large list with key shuffling", () => {
    const COUNT = 1000;
    const items = Array.from({ length: COUNT }, (_, i) => i);

    const view = (model: number[]) =>
      h(
        "ul",
        { attrs: { id: "list" } },
        model.map((i) =>
          h("li", { key: i, class: { item: true } }, [`Item ${i}`]),
        ),
      );
    const renderer = createSnabbdomRenderer(root, view);

    renderer.render(items, () => {});

    const shuffled = [...items].sort(() => Math.random() - 0.5);
    renderer.render(shuffled, () => {});

    const list = document.getElementById("list");
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll(".item").length).toBe(COUNT);
  });

  it("Correctness: Event handlers remain bound after patching", () => {
    let clickCount = 0;
    const view = (count: number) =>
      h("div", {}, [
        h(
          "button",
          {
            attrs: { id: "btn" },
            on: {
              click: () => {
                clickCount++;
              },
            },
          },
          [`Clicked ${count}`],
        ),
      ]);
    const renderer = createSnabbdomRenderer(root, view);

    renderer.render(0, () => {});
    const btn = document.getElementById("btn") as HTMLButtonElement;
    btn.click();
    expect(clickCount).toBe(1);

    renderer.render(1, () => {});
    const btnAfter = document.getElementById("btn") as HTMLButtonElement;
    btnAfter.click();
    expect(clickCount).toBe(2);
    expect(btnAfter.textContent).toBe("Clicked 1");
  });
});
