import { type Command } from "./Command";

export class CommandHistory {
  private stack: Command[] = [];

  execute(cmd: Command) {
    cmd.execute();
    this.stack.push(cmd);
  }

  undo() {
    const cmd = this.stack.pop();
    if (cmd) cmd.undo();
  }

  get count(): number {
    return this.stack.length;
  }

  clear() {
    this.stack = [];
  }
}
