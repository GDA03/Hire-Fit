import { afterEach, describe, expect, test } from "vitest";
import { readEnv } from "./env";

const ORIGINAL_ENV = process.env;

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("readEnv", () => {
  test("strips byte order marks from copied environment values", () => {
    process.env = { ...ORIGINAL_ENV, QSTASH_TOKEN: "﻿qs﻿tash-token" };

    expect(readEnv("QSTASH_TOKEN")).toBe("qstash-token");
  });

  test("trims copied environment values before SDKs use them in headers", () => {
    process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: "  gemini-key\n" };

    expect(readEnv("GEMINI_API_KEY")).toBe("gemini-key");
  });

  test("returns undefined for missing environment values", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DOES_NOT_EXIST;

    expect(readEnv("DOES_NOT_EXIST")).toBeUndefined();
  });

  test("produces bearer tokens accepted by Fetch headers", () => {
    process.env = { ...ORIGINAL_ENV, QSTASH_TOKEN: "﻿qstash-token" };
    const token = readEnv("QSTASH_TOKEN");

    expect(() => new Headers({ Authorization: `Bearer ${token}` })).not.toThrow();
  });

  test("produces URLs accepted by URL parsing", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: "﻿https://hire-fit-one.vercel.app" };
    const appUrl = readEnv("NEXT_PUBLIC_APP_URL");

    expect(() => new URL(`${appUrl}/api/process-review`)).not.toThrow();
  });

  test("documents production failure when raw BOM-prefixed tokens reach Fetch headers", () => {
    expect(() => new Headers({ Authorization: "Bearer ﻿qstash-token" })).toThrow(/ByteString|Cannot convert argument/);
  });
});
