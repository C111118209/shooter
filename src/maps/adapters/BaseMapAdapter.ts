import type { MapAdapter, MapData, MapTile } from "../MapTypes";

/**
 * 共用邏輯：統一的 parse 流程，子類只需關注 parseRaw。
 */
export abstract class BaseMapAdapter implements MapAdapter {
  parse(content: string): MapData {
    const rawGrid = this.parseRaw(content);
    return this.normalizeGrid(rawGrid);
  }

  protected abstract parseRaw(content: string): any[][];

  protected normalizeGrid(raw: any[][]): MapData {
    if (!raw.length || !raw[0]?.length) {
      throw new Error("地圖不可為空。");
    }

    const grid: MapTile[][] = raw.map((row) =>
      row.map((cell) => this.tokenToTile(cell))
    );

    return { grid };
  }

  protected tokenToTile(value: any): MapTile {
    const normalized = String(value).trim().toLowerCase();
    if (["1", "#", "w", "wall"].includes(normalized)) {
      return "wall";
    }
    return "grass";
  }
}

