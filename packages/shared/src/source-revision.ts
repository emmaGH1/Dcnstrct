import crypto from "crypto";
import fs from "fs";
import path from "path";
import { SOURCE_ALLOWLIST } from "./contracts";

/** Hash the bytes MCP is permitted to expose. Missing source fails closed. */
export function computeSourceRevision(repoRoot: string): string {
  const hash = crypto.createHash("sha256");

  for (const relativePath of SOURCE_ALLOWLIST) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const root = path.resolve(repoRoot) + path.sep;
    if (!absolutePath.startsWith(root)) {
      throw new Error(`Allowlisted source escaped repository root: ${relativePath}`);
    }
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(absolutePath));
    hash.update("\0");
  }

  return hash.digest("hex");
}
