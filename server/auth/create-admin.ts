import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { closeDatabaseConnection } from "../db/index.js";
import { createAuth } from "./index.js";

function readPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Admin creation must be run from an interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(prompt);
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("keypress", onKeypress);
      stdout.write("\n");
    };

    const onKeypress = (input: string, key: { name?: string; ctrl?: boolean; meta?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        finish();
        reject(new Error("Admin creation cancelled."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        finish();
        resolve(value);
        return;
      }

      if (key.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        value += input;
        stdout.write("•");
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

async function main() {
  const prompt = createInterface({ input: stdin, output: stdout });
  const name = (await prompt.question("Admin name: ")).trim();
  const email = (await prompt.question("Admin email: ")).trim();
  prompt.close();
  const password = await readPassword("Admin password: ");

  if (!name || !email || password.length < 8) {
    throw new Error("Name and email are required; password must be at least 8 characters.");
  }

  const bootstrapAuth = createAuth({ allowSignUp: true });
  const result = await bootstrapAuth.api.signUpEmail({
    body: { name, email, password },
  });

  stdout.write(`Created Studio K2 admin account for ${result.user.email}.\n`);
}

try {
  await main();
} finally {
  await closeDatabaseConnection();
}
