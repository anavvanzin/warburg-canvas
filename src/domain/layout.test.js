import { describe, expect, it } from "vitest";
import {
  addConnection,
  createLayout,
  filterCorpus,
  mergeNodePositions,
  parseCorpusText,
  reconcileLayout,
} from "./layout.js";

const items = [
  { id: "FR-001", title: "Marianne", country: "FR", regime: "FUNDACIONAL" },
  { id: "DE-001", title: "Germania", country: "DE", regime: "MILITAR" },
  { id: "BR-001", title: "República", country: "BR", regime: "NORMATIVO" },
];

describe("layout preservation", () => {
  it("preserves hidden nodes when a visible node moves", () => {
    const layout = createLayout(items);
    const hiddenBefore = layout.nodes["DE-001"];
    const next = mergeNodePositions(layout, {
      "FR-001": { x: 999, y: 444 },
    });

    expect(next.nodes["FR-001"]).toEqual({ x: 999, y: 444 });
    expect(next.nodes["DE-001"]).toEqual(hiddenBefore);
    expect(Object.keys(next.nodes)).toHaveLength(3);
  });

  it("adds new corpus items without resetting curated positions", () => {
    const layout = createLayout(items.slice(0, 2));
    layout.nodes["FR-001"] = { x: 321, y: 654 };
    const next = reconcileLayout(layout, items);

    expect(next.nodes["FR-001"]).toEqual({ x: 321, y: 654 });
    expect(next.nodes["BR-001"]).toBeDefined();
  });

  it("filters the view without mutating the full layout", () => {
    const layout = createLayout(items);
    const visible = filterCorpus(items, { country: "FR", regime: "", query: "" });

    expect(visible.map((item) => item.id)).toEqual(["FR-001"]);
    expect(Object.keys(layout.nodes)).toHaveLength(3);
  });
});

describe("corpus and connections", () => {
  it("accepts JSONL input", () => {
    const parsed = parseCorpusText(
      '{"id":"A","title":"Alpha"}\n{"id":"B","title":"Beta"}',
    );
    expect(parsed.map((item) => item.id)).toEqual(["A", "B"]);
  });

  it("does not duplicate the same directed connection", () => {
    const layout = createLayout(items);
    const once = addConnection(layout, "FR-001", "DE-001", "gesto");
    const twice = addConnection(once, "FR-001", "DE-001", "gesto");
    expect(twice.connections).toHaveLength(1);
  });
});
