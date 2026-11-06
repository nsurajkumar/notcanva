import { makeDoc, makeEl } from "./editor/factory";
import type { Doc, El } from "./editor/types";

export interface Template {
  id: string;
  name: string;
  hint: string;
  build: () => Doc;
}

function doc(kind: "design" | "board", title: string, w: number, h: number, bg: string, els: El[]): Doc {
  const d = makeDoc(kind, title, w, h);
  d.background = bg;
  d.elements = els;
  return d;
}

const t = (x: number, y: number, text: string, size: number, color: string, o: Partial<El> = {}) =>
  makeEl("text", x, y, { text, fontSize: size, textColor: color, height: size * 1.3, ...o });

function caseBoard(): Doc {
  const center = makeEl("card", 760, 380, { width: 320, height: 200, fill: "#c79a12", stroke: "#e6b420", textColor: "#1b1400", fontSize: 20, fontStyle: "bold", text: "MAIN IDEA\nDrop your central question here" });
  const leaves: El[] = [
    makeEl("card", 300, 120, { text: "Research\n• sources\n• interviews" }),
    makeEl("card", 300, 420, { text: "Suspects\n• option A\n• option B" }),
    makeEl("card", 300, 720, { text: "Timeline\n• day 1\n• day 2" }),
    makeEl("card", 1300, 160, { fill: "#0f4c47", stroke: "#1b7a71", text: "Evidence\n• photos\n• links" }),
    makeEl("card", 1300, 460, { text: "Questions\n• why?\n• who?" }),
    makeEl("card", 1300, 760, { text: "Next steps\n• call\n• follow up" }),
  ];
  const conns = leaves.map((l) => makeEl("connector", 0, 0, { from: center.id, to: l.id }));
  const notes = [
    makeEl("sticky", 820, 700, { text: "Sticky notes are great for loose thoughts." }),
    makeEl("sticky", 1700, 400, { fill: "#f5a3c7", textColor: "#3d0820", text: "Press N for a note, C for connector" }),
  ];
  const title = t(300, 20, "CASE BOARD", 48, "#f2f2f2", { fontFamily: "Bebas Neue", fontStyle: "normal", width: 600 });
  return doc("board", "Case Board", 1920, 1080, "#141416", [title, center, ...leaves, ...conns, ...notes]);
}

export const TEMPLATES: Template[] = [
  { id: "board", name: "Case Board (mind map)", hint: "Infinite whiteboard", build: caseBoard },
  {
    id: "poster", name: "Event Poster", hint: "A4 2480×3508",
    build: () => doc("design", "Event Poster", 2480, 3508, "#10203f", [
      makeEl("ellipse", 1240, 300, { width: 1800, height: 1800, fill: "#f7b733", opacity: 0.9 }),
      t(180, 2100, "NIGHT MARKET", 360, "#ffffff", { width: 2200, fontFamily: "Bebas Neue", fontStyle: "normal", height: 420 }),
      t(190, 2540, "Saturday · 7 PM · Old Harbour", 110, "#f7b733", { width: 2200, height: 150 }),
      makeEl("rect", 190, 3000, { width: 900, height: 200, fill: "#f7b733", cornerRadius: 30 }),
      t(250, 3045, "FREE ENTRY", 100, "#10203f", { width: 800, height: 120 }),
    ]),
  },
  {
    id: "thumb", name: "YouTube Thumbnail", hint: "1280×720",
    build: () => doc("design", "Thumbnail", 1280, 720, "#ff3d3d", [
      makeEl("rect", 0, 480, { width: 1280, height: 240, fill: "#111111" }),
      t(60, 80, "I TRIED IT", 200, "#ffffff", { width: 1100, fontFamily: "Bebas Neue", fontStyle: "normal", height: 220, stroke: "#000000" }),
      t(60, 520, "for 30 days…", 110, "#ffe14d", { width: 1100, height: 140 }),
      makeEl("ellipse", 1050, 100, { width: 220, height: 220, fill: "#ffe14d" }),
    ]),
  },
  {
    id: "insta", name: "Instagram Quote", hint: "1080×1080",
    build: () => doc("design", "Quote Post", 1080, 1080, "#f4efe6", [
      makeEl("rect", 80, 80, { width: 920, height: 920, fill: "transparent", stroke: "#1d1d1d", strokeWidth: 6 }),
      t(160, 360, "“Make it simple,\nmake it yours.”", 80, "#1d1d1d", { width: 760, height: 240, fontFamily: "Georgia", fontStyle: "italic", align: "center" }),
      t(160, 700, "— notcanva", 40, "#8a6a3a", { width: 760, align: "center" }),
    ]),
  },
  {
    id: "invite", name: "Party Invite", hint: "1080×1920",
    build: () => doc("design", "Invite", 1080, 1920, "#fde2e4", [
      makeEl("ellipse", -200, -200, { width: 700, height: 700, fill: "#fbb1bd" }),
      makeEl("ellipse", 700, 1500, { width: 600, height: 600, fill: "#cde7d8" }),
      t(100, 700, "You're invited!", 130, "#5a1f2b", { width: 880, align: "center", fontFamily: "Georgia", height: 170 }),
      t(100, 920, "Maya turns 7 · June 14 · 3 PM", 56, "#5a1f2b", { width: 880, align: "center", fontStyle: "normal" }),
    ]),
  },
  {
    id: "card", name: "Business Card", hint: "1050×600",
    build: () => doc("design", "Business Card", 1050, 600, "#ffffff", [
      makeEl("rect", 0, 0, { width: 24, height: 600, fill: "#2a5bd7" }),
      t(90, 170, "Alex Rivera", 72, "#111111", { width: 800, height: 90 }),
      t(90, 270, "Private Investigator", 36, "#2a5bd7", { width: 800, fontStyle: "normal" }),
      t(90, 420, "alex@example.com  ·  555-0142", 28, "#555555", { width: 800, fontStyle: "normal", fontFamily: "Space Mono" }),
    ]),
  },
  {
    id: "slide", name: "Presentation Slide", hint: "1920×1080",
    build: () => doc("design", "Slide", 1920, 1080, "#0d1b2a", [
      t(140, 380, "Quarterly Findings", 140, "#e0e1dd", { width: 1600, height: 180, fontFamily: "Bebas Neue", fontStyle: "normal" }),
      makeEl("rect", 140, 580, { width: 300, height: 12, fill: "#f4a261" }),
      t(140, 640, "What we discovered and what's next", 52, "#a9b4c2", { width: 1600, fontStyle: "normal" }),
    ]),
  },
];
