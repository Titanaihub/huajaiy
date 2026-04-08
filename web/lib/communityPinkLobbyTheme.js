import { mergeGameLobbyFromApi } from "./gameLobbyThemeDefaults";

/**
 * ธีมหน้าชุมชน — พื้นหลังไล่ชมพูอ่อน + การ์ดขาวคมชัดบนพื้นชมพู
 * @param {Record<string, unknown> | null | undefined} rawFromApi
 */
export function mergeCommunityPinkLobbyTheme(rawFromApi) {
  const base = mergeGameLobbyFromApi(rawFromApi);
  return {
    ...base,
    backgroundImageUrl: "",
    bgGradientTop: "#fdf2f8",
    bgGradientMid: "#fce7f3",
    bgGradientBottom: "#fbcfe8",
    imageOverlayPercent: 0,
    pageHeadingColor: "#831843",
    searchLabelColor: "#9d174d",
    searchInputBackground: "#ffffff",
    searchInputBorder: "#f9a8d4",
    searchInputText: "#3f172f",
    searchPlaceholderColor: "#c084a8",
    cardBackground: "#ffffff",
    cardBorder: "#f9a8d4",
    cardMediaBackground: "#fdf2f8",
    cardTitleColor: "#9d174d",
    cardMutedColor: "#a21a5c",
    cardBodyColor: "#4a044e",
    cardHeartColor: "#db2777",
    cardCtaColor: "#be185d",
    cardCtaHoverColor: "#9d174d",
    footerNavColor: "#831843",
    footerNavHoverColor: "#be185d"
  };
}
