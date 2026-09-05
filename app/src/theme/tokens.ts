/**
 * App-shell design tokens: bright, glossy, tactile — the actual TCG Pocket
 * look (light sky chrome, chunky 3D "candy" buttons, bold outlined type),
 * not the moody-dark direction the reveal engine's own category configs
 * use. The reveal is a separate visual world per category (see
 * engine/categories/*.config.tsx) and deliberately does NOT read from
 * these tokens — Watches especially needs to stay dark regardless of how
 * bright the shelf around it is.
 */

export const colors = {
  skyTop: "#eaf4ff",
  skyBottom: "#cfe6ff",
  surface: "#ffffff",
  surfaceElevated: "#f2f8ff",
  outline: "#2f5fb3",
  outlineSoft: "#c3d9f5",
  textPrimary: "#12294f",
  textSecondary: "#5b7196",
  textMuted: "#93a5c2",
  gold: "#ffc933",
  goldDeep: "#e0a012",
  blue: "#2f6fed",
  blueDeep: "#1f4fc4",
  success: "#2fa563",
  danger: "#e6483c",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: "900" as const, letterSpacing: -0.3 },
  title: { fontSize: 20, fontWeight: "800" as const },
  body: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "800" as const, letterSpacing: 0.4 },
  price: { fontSize: 16, fontWeight: "900" as const, fontVariant: ["tabular-nums" as const] },
};

export const shadow = {
  tile: {
    shadowColor: "#1f4fc4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
};
