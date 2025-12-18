import { BaseMapAdapter } from "./BaseMapAdapter";

export class TxtMapAdapter extends BaseMapAdapter {
  protected parseRaw(content: string): any[][] {
    return content
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(""));
  }
}

