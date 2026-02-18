import { h, VNode, Dispatcher, Model, Msg } from "@causaloop/core";
import { createSnabbdomRenderer } from "@causaloop/platform-browser";

export interface DevToolsOptions<M extends Model, G extends Msg> {
    readonly dispatcher: Dispatcher<M, G>;
    readonly container: HTMLElement;
}

export function createDevTools<M extends Model, G extends Msg>(
    options: DevToolsOptions<M, G>,
) {
    const { dispatcher, container } = options;

    const view = (snapshot: M): VNode => {
        const metrics = dispatcher.getMetrics();
        const log = dispatcher.getMsgLog();

        return h(
            "div",
            {
                style: {
                    position: "fixed",
                    bottom: "10px",
                    right: "10px",
                    width: "300px",
                    background: "rgba(0,0,0,0.8)",
                    color: "#0f0",
                    padding: "10px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    zIndex: "9999",
                    borderRadius: "8px",
                    border: "1px solid #0f0",
                    pointerEvents: "auto",
                },
            },
            [
                h("div", { style: { fontWeight: "bold", marginBottom: "5px" } }, [
                    "CAUSALOOP DEVTOOLS",
                ]),
                h("div", {}, [`FPS: ${metrics.fps}`]),
                h("div", {}, [`Avg Update: ${metrics.avgUpdateMs.toFixed(3)}ms`]),
                h("div", {}, [`Avg Commit: ${metrics.avgCommitMs.toFixed(3)}ms`]),
                h("div", { style: { marginTop: "5px", borderTop: "1px solid #0f0" } }, [
                    `Msg Log (${log.length}):`,
                ]),
                h(
                    "div",
                    {
                        style: {
                            maxHeight: "100px",
                            overflowY: "auto",
                            marginTop: "5px",
                        },
                    },
                    log
                        .slice(-10)
                        .reverse()
                        .map((entry) =>
                            h("div", { style: { opacity: "0.7" } }, [
                                `> ${entry.msg.kind}`,
                            ]),
                        ),
                ),
                h(
                    "button",
                    {
                        on: {
                            click: () => {
                                const result = dispatcher.verifyDeterminism();
                                alert(
                                    result.isMatch
                                        ? "Determinism Match! ✅"
                                        : "DETERRMINISM FAILED! ❌",
                                );
                            },
                        },
                        style: {
                            marginTop: "10px",
                            width: "100%",
                            background: "#0f0",
                            color: "#000",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                        },
                    },
                    ["Verify Determinism"],
                ),
            ],
        );
    };

    const renderer = createSnabbdomRenderer(container, view);
    dispatcher.subscribe((snapshot: M) => renderer.render(snapshot, () => { }));
}
