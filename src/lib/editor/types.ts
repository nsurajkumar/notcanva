export type ElType = "rect" | "ellipse" | "triangle" | "line" | "arrow" | "text" | "image" | "sticky" | "card" | "pen" | "connector" | "frame" | "star";

export interface El {
  id: string;
  type: ElType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  cornerRadius?: number | undefined;
  text?: string | undefined;
  fontSize?: number | undefined;
  fontFamily?: string | undefined;
  fontStyle?: string | undefined; // "normal" | "bold" | "italic" | "bold italic"
  align?: string | undefined;
  textColor?: string | undefined;
  points?: number[] | undefined; // pen/line relative points
  assetId?: string | undefined; // image blob id
  from?: string | undefined; // connector source element id
  to?: string | undefined;
  letterSpacing?: number | undefined;
  lineHeight?: number | undefined;
  underline?: boolean | undefined;
  uppercase?: boolean | undefined;
  shadow?: boolean | undefined;
  flipX?: boolean | undefined;
  flipY?: boolean | undefined;
}

export type DocKind = "design" | "board";

export interface Doc {
  id: string;
  title: string;
  kind: DocKind;
  width: number;
  height: number;
  background: string;
  elements: El[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null | undefined;
  thumbnail?: string | undefined;
}

export const SIZE_PRESETS = [
  { label: "Instagram Post (1080×1080)", w: 1080, h: 1080 },
  { label: "Instagram Story (1080×1920)", w: 1080, h: 1920 },
  { label: "YouTube Thumbnail (1280×720)", w: 1280, h: 720 },
  { label: "Presentation (1920×1080)", w: 1920, h: 1080 },
  { label: "A4 Poster (2480×3508)", w: 2480, h: 3508 },
  { label: "Business Card (1050×600)", w: 1050, h: 600 },
];

export const FONTS = ["Tahoma", "Arial", "Georgia", "Courier New", "Bebas Neue", "Space Mono", "Verdana", "Times New Roman"];
