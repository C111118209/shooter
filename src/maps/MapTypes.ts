export type MapTile = "wall" | "grass";

export interface MapData {
  grid: MapTile[][];
}

/**
 * Target 介面：統一對外行為
 */
export interface MapAdapter {
  parse(content: string): MapData;
}

