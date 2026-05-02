// Downloads US state flag PNG thumbnails (96px wide) from Wikipedia.
// We use PNG thumbs instead of full SVGs because some state flags include
// detailed seals that exceed 600KB as SVG; the rendered icon is ~12-20px.
// Wikipedia rate-limits parallel requests, so we fetch sequentially with a delay.

import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { STATE_TO_CODE } from "../shared/flags.ts";

const OUT_DIR = join(import.meta.dir, "..", "web", "public", "state-flags");
const UA = "frc-champs-brackets/2.0 (https://github.com/Filip-Kin/frc-champs-brackets; me@filipkin.com)";
const WIDTH = 96;
const DELAY_MS = 250;

await mkdir(OUT_DIR, { recursive: true });

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

let ok = 0;
let fail = 0;
for (const [stateName, code] of Object.entries(STATE_TO_CODE)) {
  const target = join(OUT_DIR, `${code}.png`);
  if (existsSync(target)) {
    console.log(`skip ${code} (${stateName})`);
    ok++;
    continue;
  }
  // DC uses "Flag_of_the_District_of_Columbia" on Wikipedia.
  const wikiName = stateName === "District of Columbia" ? "the_District_of_Columbia" : stateName.replace(/ /g, "_");
  const url = `https://en.wikipedia.org/wiki/Special:FilePath/Flag_of_${wikiName}.svg?width=${WIDTH}`;
  let attempt = 0;
  while (attempt < 4) {
    attempt++;
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      await Bun.write(target, buf);
      console.log(`ok   ${code} (${stateName}) - ${(buf.byteLength / 1024).toFixed(1)}kb`);
      ok++;
      break;
    }
    if (res.status === 429) {
      console.log(`rate-limited on ${code}, backing off ${attempt * 1000}ms...`);
      await sleep(attempt * 1000);
      continue;
    }
    console.error(`FAIL ${code} (${stateName}): ${res.status} ${res.statusText}`);
    fail++;
    break;
  }
  await sleep(DELAY_MS);
}

console.log(`done: ${ok} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
