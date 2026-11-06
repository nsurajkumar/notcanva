import { describe, it, expect, beforeEach } from "vitest";
import { useEditor } from "@/lib/editor/store";
import { makeDoc, makeEl } from "@/lib/editor/factory";

describe("editor store", () => {
  beforeEach(() => useEditor.getState().setDoc(makeDoc("board", "t")));
  it("undo removes the last added element and redo restores it", () => {
    const s = useEditor.getState();
    s.addEl(makeEl("sticky", 0, 0));
    expect(useEditor.getState().doc!.elements).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().doc!.elements).toHaveLength(0);
    useEditor.getState().redo();
    expect(useEditor.getState().doc!.elements).toHaveLength(1);
  });
  it("deleting a card also deletes connectors attached to it", () => {
    const a = makeEl("card", 0, 0), b = makeEl("card", 400, 0);
    const s = useEditor.getState();
    s.addEl(a); s.addEl(b);
    s.addEl(makeEl("connector", 0, 0, { from: a.id, to: b.id }));
    useEditor.getState().removeIds([a.id]);
    expect(useEditor.getState().doc!.elements.map((e) => e.id)).toEqual([b.id]);
  });
});

import { align } from "@/lib/editor/actions";
describe("align", () => {
  it("centres a single item on the page", () => {
    const d = makeDoc("design", "p", 1000, 800);
    useEditor.getState().setDoc(d);
    const el = makeEl("rect", 10, 10, { width: 200, height: 100 });
    useEditor.getState().addEl(el);
    align("hcenter"); align("vcenter");
    const e = useEditor.getState().doc!.elements[0]!;
    expect([e.x, e.y]).toEqual([400, 350]);
  });
});
