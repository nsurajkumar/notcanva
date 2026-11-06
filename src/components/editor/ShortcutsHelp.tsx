const ROWS: [string, string][] = [
  ["V / H", "Select / Hand"], ["T", "Text"], ["R / O / Y", "Rectangle / Ellipse / Triangle"], ["S", "Star"], ["L / A", "Line / Arrow"],
  ["N / K / F", "Sticky note / Card / Frame"], ["P / E", "Pen / Eraser"], ["C", "Connector (click two items)"],
  ["Space + drag", "Pan"], ["Ctrl + scroll", "Zoom"], ["Ctrl + 0", "Zoom to fit"], ["Ctrl + 1", "Zoom 100%"],
  ["Ctrl + Z / Y", "Undo / Redo"], ["Ctrl + C / V / X", "Copy / Paste / Cut"], ["Ctrl + D", "Duplicate"], ["Ctrl + A", "Select all"],
  ["Ctrl + Alt + C / V", "Copy / paste style"], ["Ctrl + ] / [", "Forward / backward"], ["Ctrl + Shift + ] / [", "To front / back"],
  ["Ctrl + L", "Lock / unlock"], ["Ctrl + B / I / U", "Bold / italic / underline"], ["Shift + H / V", "Flip"],
  ["Arrows", "Nudge 1px (Shift = 10px)"], ["Alt + drag", "Move without snapping"], ["Del", "Delete"], ["Esc", "Deselect"], ["?", "This help"],
];

export function ShortcutsHelp() {
  return (
    <table className="nc-keys">
      <tbody>
        {ROWS.map(([k, v]) => (
          <tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
