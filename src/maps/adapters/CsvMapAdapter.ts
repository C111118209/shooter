import { BaseMapAdapter } from "./BaseMapAdapter";

export class CsvMapAdapter extends BaseMapAdapter {
  protected parseRaw(content: string): any[][] {
    return content
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(","));
  }
}

