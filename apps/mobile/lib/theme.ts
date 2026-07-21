import { THEME } from "@gate-force/shared";

/** Re-exported so RN components import one theme module; values stay identical to web. */
export const colors = { ...THEME.colors, accentInk: THEME.colors.accentOrangeText };

export const fonts = {
  display: "BarlowCondensed_700Bold",
  displayExtraBold: "BarlowCondensed_800ExtraBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};
