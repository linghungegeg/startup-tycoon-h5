import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 27 client reports commercial analytics telemetry", () => {
  for (const eventName of [
    "commercial_entry_click",
    "paid_product_entry_click",
    "long_term_goal_click",
    "business_clock_briefing_open",
    "business_clock_todo_handled"
  ]) {
    assert.match(source, new RegExp(eventName), `${eventName} should be reported by client flows`);
  }
});
