/** The iPad parent rail: icon tabs stacked down the left edge, handoff at the foot. */
export const RAIL_WIDTH = 100;

export function tabletLayout(isTablet: boolean, width: number, contentWidth = width, height = width) {
  const landscape = width > height;
  return {
    sidebar: isTablet && width >= 768,
    landscape,
    // Lists stay on the left and the picked item opens beside them (iPad 11"
    // design: 420pt list in landscape, 340pt in portrait).
    split: isTablet && width >= 768,
    listWidth: landscape ? 420 : 340,
    dashboardColumns: isTablet && contentWidth >= 720,
    // 900 rather than 1000 so a 13" iPad in portrait (~976pt of content) gets a
    // third column instead of two 480pt cards — every tablet then lands on a
    // card roughly 310-390pt wide.
    videoColumns: isTablet && contentWidth >= 600 ? (contentWidth >= 900 ? 3 : 2) : 1,
  };
}
