import { useEffect, useState } from "react";

const TIPS = [
  "Hold Space and drag to pan. Ctrl + scroll to zoom.",
  "Case Boards are endless. Double-click empty space for a sticky note.",
  "Press C, then click two cards to link them with a connector.",
  "Ctrl+D duplicates. Arrow keys nudge, Shift+arrow nudges 10px.",
  "Your work lives only in this browser. Make a .notcanva backup now and then!",
  "Drop an image file straight onto the canvas.",
  "Shift-click to select several things at once.",
  "Ctrl+0 fits everything on screen.",
];

/** Detective Pixel: an original pixel-art detective. */
function PixelDetective() {
  const px = [
    "....HHHHHH....",
    "...HHHHHHHH...",
    "..BBBBBBBBBB..",
    "....SSSSSS....",
    "...SSEESEES...",
    "...SSSSSSSS...",
    "....SSMMSS....",
    "...CCCCCCCC...",
    "..CCCCTTCCCC..",
    "..CCCCTTCCCC.G",
    "..CCCCCCCCCGGG",
    "...CC....CC.G.",
    "...KK....KK...",
  ];
  const col: Record<string, string> = { H: "#6b4a2b", B: "#4a321c", S: "#f2c49b", E: "#1a1a1a", M: "#b5523b", C: "#c9a46b", T: "#8a6a3a", K: "#2b2b2b", G: "#7fb3ff" };
  return (
    <svg width={56} height={52} viewBox="0 0 14 13" shapeRendering="crispEdges" aria-label="Detective Pixel">
      {px.flatMap((row, y) => [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={col[c]} />)))}
    </svg>
  );
}

export function Mascot() {
  const [hidden, setHidden] = useState(true);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setHidden(localStorage.getItem("nc-mascot-off") === "1");
    setI(Math.floor(Math.random() * TIPS.length));
    if (localStorage.getItem("nc-mascot-greeted") !== "1") {
      localStorage.setItem("nc-mascot-greeted", "1");
      setOpen(true);
    }
  }, []);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 45000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 9000);
    return () => clearTimeout(t);
  }, [open, i]);
  if (hidden) return null;
  return (
    <div className="nc-mascot">
      {open && (
        <div className="nc-bubble" role="status">
          <b>Detective Pixel:</b> {TIPS[i]}
          <div className="nc-row">
            <button className="nc-mini" onClick={() => setI((i + 1) % TIPS.length)}>Next tip</button>
            <button className="nc-mini" onClick={() => setOpen(false)}>Close</button>
            <button className="nc-mini" onClick={() => { localStorage.setItem("nc-mascot-off", "1"); setHidden(true); }}>Hide for good</button>
          </div>
        </div>
      )}
      <button className="nc-mascot-btn" onClick={() => setOpen((o) => !o)} aria-label="Detective Pixel tips">
        <PixelDetective />
      </button>
    </div>
  );
}

export function showMascotAgain() {
  localStorage.removeItem("nc-mascot-off");
}
