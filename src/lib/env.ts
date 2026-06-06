const BOM_PATTERN = /﻿/g;

export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;

  return value.replace(BOM_PATTERN, "").trim();
}
