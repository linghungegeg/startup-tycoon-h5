import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../../apps/api/src/repository.ts", import.meta.url), "utf8");
const httpSource = readFileSync(new URL("../../../apps/api/src/http.ts", import.meta.url), "utf8");

test("phase 51 market competition closes exhausted competitor action state", () => {
  assert.match(repositorySource, /availableCompetitorActionCount/, "market center should expose remaining competitor action count");
  assert.match(appSource, /availableCompetitorActionCount/, "client should read remaining competitor action count");
  assert.match(appSource, /本赛道竞品行动已处理完/, "client should explain exhausted competitor actions in Chinese");
  assert.match(appSource, /disabled=\{!selectedMarket \|\| !hasAvailableCompetitorAction\}/, "competitor action button should be disabled when no new action is available");
  assert.match(appSource, /暂无新的竞品行动/, "client should not surface backend English errors to players");
  assert.doesNotMatch(httpSource, /No competitor action is available\./, "market API should not return player-visible English copy");
});
