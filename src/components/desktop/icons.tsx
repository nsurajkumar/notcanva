// Original hand-made SVG icons for notcanva.
type P = { size?: number };

export const IconFolder = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <path d="M2 8h11l3 3h14v16H2z" fill="#f5c542" stroke="#a87b0c" />
    <path d="M2 13h28v14H2z" fill="#ffd970" stroke="#a87b0c" />
    <circle cx="20" cy="20" r="4" fill="none" stroke="#5a3d00" strokeWidth="1.6" />
    <path d="M23 23l4 4" stroke="#5a3d00" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
export const IconBin = ({ size = 32, full = false }: P & { full?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <path d="M8 9h16l-2 20H10z" fill="#cfe3f5" stroke="#4a6f94" />
    <path d="M6 7h20v3H6z" fill="#9fc0e0" stroke="#4a6f94" />
    {full && <path d="M11 6l4-3 3 3 4-2" stroke="#e8a33b" strokeWidth="2" fill="none" />}
    <path d="M13 13v12M16 13v12M19 13v12" stroke="#4a6f94" />
  </svg>
);
export const IconTemplates = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect x="4" y="4" width="16" height="20" fill="#fff" stroke="#3b5a8a" />
    <rect x="12" y="8" width="16" height="20" fill="#e9f1ff" stroke="#3b5a8a" />
    <rect x="15" y="11" width="10" height="6" fill="#ff8a5c" />
    <path d="M15 20h10M15 23h7" stroke="#3b5a8a" />
  </svg>
);
export const IconBoard = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect x="2" y="4" width="28" height="22" rx="2" fill="#1d1d22" stroke="#555" />
    <rect x="12" y="11" width="8" height="6" fill="#d4a017" />
    <rect x="4" y="6" width="6" height="4" fill="#3a3a44" />
    <rect x="22" y="6" width="6" height="4" fill="#0f4c47" />
    <rect x="4" y="19" width="6" height="4" fill="#3a3a44" />
    <rect x="22" y="19" width="6" height="4" fill="#f7d154" />
    <path d="M10 8C12 8 12 13 12 13M22 8C20 8 20 13 20 13M10 21C12 21 12 16 12 16M22 21C20 21 20 16 20 16" stroke="#aaa" fill="none" />
  </svg>
);
export const IconDesign = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect x="4" y="3" width="24" height="26" fill="#fff" stroke="#3b5a8a" />
    <circle cx="12" cy="11" r="4" fill="#f76b4f" />
    <rect x="16" y="14" width="9" height="9" fill="#4f8ef7" />
    <path d="M7 25h12" stroke="#222" strokeWidth="2" />
  </svg>
);
export const IconInfo = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <circle cx="16" cy="16" r="13" fill="#3a7bd5" stroke="#1d4b8f" />
    <circle cx="16" cy="9.5" r="2" fill="#fff" />
    <path d="M16 14v10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
export const IconLogo = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
    <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d="M12 12l5 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="8" cy="8" r="2" fill="#ffd970" />
  </svg>
);
