import { describe, expect, it } from "vitest";
import { en } from "../locales/en";
import { zhHans } from "../locales/zh-Hans";

function flatten(value: object, prefix = ""): Map<string, string> {
  const messages = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof child === "string") {
      messages.set(path, child);
    } else if (typeof child === "object" && child !== null) {
      for (const [nested, message] of flatten(child, path)) {
        messages.set(nested, message);
      }
    } else {
      throw new Error(`unexpected locale value at ${path}`);
    }
  }
  return messages;
}

describe("locale resources", () => {
  const english = flatten(en);
  const chinese = flatten(zhHans);

  it("define the same message keys", () => {
    expect([...chinese.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("provide a non-empty message for every key", () => {
    for (const [key, message] of [...english, ...chinese]) {
      expect(message.trim(), key).not.toBe("");
    }
  });
});
