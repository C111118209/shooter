import type { MapAdapter, MapData } from "./MapTypes";
import { CsvMapAdapter } from "./adapters/CsvMapAdapter";
import { JsonMapAdapter } from "./adapters/JsonMapAdapter";
import { TxtMapAdapter } from "./adapters/TxtMapAdapter";

/**
 * 單一入口（Context / Factory）
 * 依副檔名選擇對應的 Adapter。
 */
export class MapFileAdapter {
  private adapters: Record<string, MapAdapter> = {
    txt: new TxtMapAdapter(),
    csv: new CsvMapAdapter(),
    json: new JsonMapAdapter(),
  };

  async parseFile(file: File): Promise<MapData> {
    const content = await file.text();
    const ext = this.extractExtension(file.name) ?? "txt";
    return this.parse(content, ext);
  }

  parse(content: string, extension: string): MapData {
    const adapter = this.adapters[extension.toLowerCase()];
    if (!adapter) {
      throw new Error(`不支援的地圖格式: ${extension}`);
    }
    return adapter.parse(content);
  }

  private extractExtension(name: string): string | null {
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : null;
  }
}

