export const SIDEBAR_WIDTH = 200;

export function tabletLayout(isTablet: boolean, width: number, contentWidth = width) {
  return {
    sidebar: isTablet && width >= 768,
    dashboardColumns: isTablet && contentWidth >= 720,
    // 900 rather than 1000 so a 13" iPad in portrait (~976pt of content) gets a
    // third column instead of two 480pt cards — every tablet then lands on a
    // card roughly 310-390pt wide.
    videoColumns: isTablet && contentWidth >= 600 ? (contentWidth >= 900 ? 3 : 2) : 1,
  };
}
