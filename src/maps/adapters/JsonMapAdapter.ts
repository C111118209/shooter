import { BaseMapAdapter } from "./BaseMapAdapter";

export class JsonMapAdapter extends BaseMapAdapter {
  protected parseRaw(content: string): any[][] {
    const parsed = JSON.parse(content);
    const grid = Array.isArray(parsed) ? parsed : parsed?.grid;
    if (!Array.isArray(grid)) {
      throw new Error("JSON 地圖格式錯誤，需為二維陣列或包含 grid 欄位。");
    }
    return grid;
  }
}

