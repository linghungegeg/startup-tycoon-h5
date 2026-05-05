import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");
const crossServerArtHandoff = readFileSync(new URL("../../../docs/cross-server-art-handoff.md", import.meta.url), "utf8");
const uiOverlayGuidelines = readFileSync(new URL("../../../docs/ui-overlay-guidelines.md", import.meta.url), "utf8");
const gameUiReplicationPlaybook = readFileSync(new URL("../../../docs/game-ui-replication-playbook.md", import.meta.url), "utf8");
const crossServerHomeSource = source.slice(
  source.indexOf('data-testid="cross-server-arena-panel"'),
  source.indexOf('data-testid="cross-server-personal-board"')
);
const crossServerAvatarImageStyle = styles.slice(
  styles.indexOf(".cross-server-static-avatar img"),
  styles.indexOf(".cross-server-static-challenge")
);

test("phase 61 cross-server reads like a personal arena ladder instead of a mixed report page", () => {
  for (const copy of [
    "跨服竞技",
    "战报回放",
    "规则说明",
    "可挑战对手",
    "挑战次数",
    "上阵员工",
    "挑战",
    "回合",
    "排名提升",
    "挑战次数不足，稍后再来。"
  ]) {
    assert.ok(source.includes(copy), `missing cross-server arena copy: ${copy}`);
  }

  assert.match(source, /crossServerCenter\?\.arena/, "cross-server should render arena data from the API");
  assert.match(source, /data-testid="cross-server-arena-panel"/, "cross-server arena panel should stay testable");
  assert.match(crossServerHomeSource, /slice\(0,\s*4\)\.map\(\(opponent/, "cross-server home should render four challenge opponents");
  assert.match(crossServerHomeSource, /data-testid="cross-server-opponent-avatar-placeholder"/, "opponent portrait anchors should stay testable");
  assert.match(crossServerHomeSource, /data-testid="cross-server-lineup-avatar-placeholder"/, "lineup portrait anchors should stay testable");
  assert.match(source, /challengeCrossServerOpponent/, "player frontend should challenge arena opponents");
  assert.match(source, /recoverCrossServerAttempts/, "player frontend should support VIP attempt recovery");
  assert.match(source, /phase14Error \? 3200 : 2200/, "cross-server feedback should keep the centered auto-dismiss overlay");
  assert.doesNotMatch(crossServerHomeSource, /奖励邮件发放|赛季说明|三回合战报/, "cross-server home should not keep reward, season, or battle-report copy as persistent content");
  assert.doesNotMatch(crossServerHomeSource, /portraitUrl \? <img/, "cross-server prototype shell should not render existing mismatched portraits");
  assert.doesNotMatch(source, /setActiveCrossServerMode\("history"\);\s*setPhase14Notice/, "challenge result should not jump to battle report");
  assert.doesNotMatch(source, /"guild", "商会战"/, "personal cross-server tabs should not include guild battle");
  assert.doesNotMatch(source, />\s*报名商会赛季\s*</, "personal cross-server action bar should not register guild cross-server");
  assert.doesNotMatch(source, />\s*结算跨服\s*</, "player cross-server action bar should not expose settlement");
  assert.doesNotMatch(source, /onClick=\{\(\) => void settleCrossServer\(\)\}/, "player frontend should not call cross-server settlement directly");
  assert.doesNotMatch(source, /跨服创业赛|跨服经营战/, "cross-server title should no longer read like a generic ranking event");
  assert.doesNotMatch(source, /手动结算|自动结算|候选|快照|算法|实时战斗|即时开打/, "player cross-server copy should avoid operation and combat overpromise wording");
});

test("phase 61 cross-server uses the cleaned 1:1 static artboard with live data overlays", () => {
  assert.ok(existsSync(new URL("../public/game-ui/cross-server/cross-server-main.png", import.meta.url)), "cross-server should ship the cleaned 1:1 main artboard asset");
  assert.ok(existsSync(new URL("../public/game-ui/cross-server/kuafu.png", import.meta.url)), "cross-server should ship the reference screenshot for debug-only alignment checks");
  assert.ok(existsSync(new URL("../public/game-ui/cross-server/kuafujixian.png", import.meta.url)), "cross-server should ship the 941x1672 marked coordinate reference for debug-only alignment checks");
  assert.ok(existsSync(new URL("../public/game-ui/cross-server/lineup-portrait-1.png", import.meta.url)), "cross-server should ship tall lineup portrait cards for the lower card frame");
  assert.match(source, /cross-server-static-artboard/, "cross-server should use a fixed-ratio static artboard shell");
  assert.match(styles, /aspect-ratio:\s*941\s*\/\s*1672/, "cross-server artboard should preserve the real prototype portrait ratio");
  assert.match(source, /cross-server-main\.png/, "cross-server canvas should draw the cleaned artboard as the live main background");
  assert.match(source, /CROSS_SERVER_OPPONENT_COORDS/, "cross-server live opponent overlays should be driven by the prototype pixel coordinate table");
  assert.match(source, /CROSS_SERVER_LINEUP_COORDS/, "cross-server lineup overlays should be driven by the prototype pixel coordinate table");
  assert.match(source, /"avatar" \| "name" \| "power" \| "rank" \| "challengeHotspot"/, "opponent overlays should split avatar, name, power, rank, and challenge hotspot pixel layers");
  assert.doesNotMatch(source, /"medal" \||opponentMedals|opponent-medal-\$\{index \+ 1\}\.png|coords\.medal/, "cross-server should not keep the removed left-side medal canvas layer");
  assert.doesNotMatch(source, /challengeButton:\s*\{/, "cross-server should not redraw challenge buttons that are already baked into the cleaned artboard");
  assert.match(source, /CROSS_SERVER_RANK_VALUE_COORD:\s*CrossServerCoord\s*=\s*\{\s*x:\s*144,\s*y:\s*366,\s*w:\s*152,\s*h:\s*78\s*\}/, "cross-server personal rank number should align with the desktop 1:1 coordinate table");
  assert.match(source, /CROSS_SERVER_ATTEMPTS_COORD:\s*CrossServerCoord\s*=\s*\{\s*x:\s*665,\s*y:\s*366,\s*w:\s*151,\s*h:\s*78\s*\}/, "cross-server attempts number should align with the desktop 1:1 coordinate table");
  assert.match(source, /avatar:\s*\{\s*x:\s*157,\s*y:\s*625,\s*w:\s*142,\s*h:\s*142\s*\}/, "cross-server opponent avatars should use the desktop 1:1 cyan frame coordinates");
  assert.match(source, /name:\s*\{\s*x:\s*319,\s*y:\s*697,\s*w:\s*230,\s*h:\s*2\s*\}/, "cross-server opponent name should keep the desktop 1:1 baseline with a bounded text width");
  assert.match(source, /rank:\s*\{\s*x:\s*558,\s*y:\s*695,\s*w:\s*122,\s*h:\s*2\s*\},\s*challengeHotspot:\s*\{\s*x:\s*688,\s*y:\s*648,\s*w:\s*208,\s*h:\s*86\s*\}/, "cross-server opponent rank should stay left of the challenge hotspot");
  assert.match(source, /\{\s*x:\s*42,\s*y:\s*1321,\s*w:\s*157,\s*h:\s*294\s*\}/, "cross-server lineup cards should use the desktop 1:1 marked lower employee card frame coordinates");
  assert.match(styles, /left:\s*calc\(var\(--x\) \/ 941 \* 100%\)/, "cross-server overlay x positions should convert 941px prototype coordinates");
  assert.match(styles, /top:\s*calc\(var\(--y\) \/ 1672 \* 100%\)/, "cross-server overlay y positions should convert 1672px prototype coordinates");
  assert.match(styles, /\.cross-server-pixel-layer[\s\S]*width:\s*100%[\s\S]*height:\s*100%/, "cross-server pixel layer should scale with the fixed artboard instead of separate DOM typography");
  assert.doesNotMatch(styles, /kuafu-base\.png/, "cross-server should not keep the failed cleaned screenshot background");
  assert.doesNotMatch(styles, /url\(\"\/game-ui\/cross-server\/kuafu\.png\"\)/, "cross-server should not use the text-filled prototype screenshot as the live main background");
  assert.doesNotMatch(styles, /hero-static\.png|opponent-medal-\d\.png|challenge-button\.png/, "cross-server CSS should not depend on sliced prototype shell assets");
  assert.match(apiSource, /avatarUrl:\s*string \| null/, "cross-server arena opponents should expose our avatar asset URL through the API");
  assert.match(apiSource, /portraitUrl:\s*string \| null/, "cross-server arena lineup should expose our employee portrait URL through the API");
  assert.match(apiSource, /avatarUrl:\s*`\$\{CROSS_SERVER_ASSET_BASE\}\/opponent-avatar-clean-\$\{index \+ 1\}\.png`/, "current cross-server bot opponents should map to our local clean avatar assets");
  assert.match(apiSource, /portraitUrl:\s*employee\.portraitUrl/, "cross-server fallback lineup should reuse employee config portraitUrl");
  assert.match(source, /avatarUrl:\s*string \| null/, "cross-server frontend opponent type should keep avatarUrl as live data");
  assert.match(source, /portraitUrl:\s*string \| null/, "cross-server frontend lineup type should keep portraitUrl as live data");
  assert.match(source, /crossServerImageCacheRef/, "cross-server canvas should cache dynamic image URLs instead of recreating images every redraw");
  assert.match(source, /loadCrossServerDynamicImages/, "cross-server canvas should load opponent and lineup images from hot data URLs");
  assert.match(source, /endsWith\("\.svg"\)/, "cross-server canvas should reject SVG portrait URLs and fall back to calibrated PNG lineup cards");
  assert.match(source, /opponent\.avatarUrl/, "cross-server canvas should use opponent.avatarUrl as the primary opponent portrait source");
  assert.match(source, /employee\.portraitUrl/, "cross-server canvas should use employee.portraitUrl as the primary lineup portrait source");
  assert.match(source, /opponent-avatar-\$\{index \+ 1\}\.png/, "cross-server canvas should keep old opponent avatar assets only as fallback");
  assert.doesNotMatch(source, /challenge-button\.png/, "cross-server canvas should not redraw the baked challenge button asset");
  assert.doesNotMatch(source, /options\.assets\?\.challengeButton|coords\.challengeButton|challengeLabel/, "cross-server should not keep the duplicate challenge button canvas layer");
  assert.match(source, /drawCrossServerCirclePortrait/, "cross-server should crop opponent avatar assets into the baked circle frame instead of drawing a second source frame");
  assert.match(source, /lineup-portrait-\$\{index \+ 1\}\.png/, "cross-server canvas should draw lineup portrait assets");
  assert.match(source, /lineup-portrait-\$\{index \+ 1\}\.png/, "cross-server canvas should keep old lineup portrait assets only as fallback");
  assert.doesNotMatch(crossServerHomeSource, /lineup-photo-\$\{index \+ 1\}\.png/, "cross-server lineup cards should not use the short photo asset that cannot fill the card frame");
  assert.doesNotMatch(crossServerHomeSource, /<img src=\{`\/game-ui\/cross-server\/opponent-avatar-\$\{index \+ 1\}\.png`\}/, "opponent avatars should not render as visible DOM image layers");
  assert.doesNotMatch(crossServerHomeSource, /<img src=\{`\/game-ui\/cross-server\/lineup-portrait-\$\{index \+ 1\}\.png`\}/, "lineup portraits should not render as visible DOM image layers");
  assert.match(source, /drawCrossServerLineupPortrait/, "cross-server should draw only the portrait content into the baked lineup card frame");
  assert.match(source, /drawCrossServerLineupTextBackplate/, "cross-server should cover baked lineup role and level text before drawing live text");
  assert.doesNotMatch(source, /fillRect\(card\.x,\s*card\.y,\s*role\.w \+ 24,\s*role\.h \+ 10\)/, "cross-server lineup backplate should not paint a large black strip over the top of the portrait");
  assert.match(source, /portraitUrl:\s*collectionEntry\?\.portraitUrl \?\? member\.portraitUrl \?\? null/, "cross-server main should prefer our employee collection portraitUrl and fall back to API portraitUrl");
  assert.doesNotMatch(source, /cross-server-game-artboard|cross-server-game-hero|cross-server-game-emblem|cross-server-game-opponent-card|cross-server-game-lineup-card/, "cross-server should not keep the native css/dom draft shell");
  assert.match(source, /cross-server-static-opponent/, "cross-server should place live opponents on top of the cleaned artboard");
  assert.match(source, /cross-server-static-lineup/, "cross-server should place live lineup cards on top of the cleaned artboard");
  assert.doesNotMatch(source, /opponentMedals:\s*Array<HTMLImageElement \| null>|opponent-medal-\$\{index \+ 1\}\.png|drawCrossServerImage\(context,\s*options\.assets\?\.opponentMedals\[index\]/, "cross-server should not load or draw removed left-side opponent medal assets");
  assert.doesNotMatch(source, /cross-server-static-rank/, "cross-server should not add visible DOM rank slots over the artboard");
  assert.doesNotMatch(styles, /\.cross-server-static-rank/, "cross-server styles should not draw DOM rank markers over the artboard");
  assert.doesNotMatch(source, /cross-server-dynamic-layer/, "cross-server should not overlay live data on top of a text-filled screenshot");
  assert.match(source, /personalCrossRank/, "cross-server should render the live personal rank");
  assert.match(source, /attemptsRemaining/, "cross-server should render live challenge attempts");
  assert.match(source, /attemptLimit/, "cross-server should render the live challenge attempt limit");
  assert.match(source, /drawCrossServerPixelLayer[\s\S]*attemptsRemaining[\s\S]*attemptLimit/, "challenge attempts should be drawn inside the fixed canvas pixel layer");
  assert.match(source, /opponentRank:[\s\S]*fontSize:\s*24,/, "cross-server opponent rank should use the desktop 1:1 right-side rank copy size");
  assert.match(source, /while\s*\(fontSize > minFontSize && context\.measureText\(text\)\.width > options\.maxWidth\)/, "cross-server dynamic text should shrink to fit its calibrated maxWidth before drawing");
  assert.match(source, /fillText\(text,\s*x,\s*y,\s*options\.maxWidth\)/, "cross-server dynamic text should pass maxWidth into canvas text drawing");
  assert.match(source, /drawCrossServerText\(context,\s*`排名： \$\{opponent\.rank\}`,\s*coords\.rank\.x,\s*coords\.rank\.y/, "cross-server opponent rank should render as bounded right-side rank copy on the desktop baseline");
  assert.match(source, /hasLiveArenaData/, "cross-server canvas should explicitly know whether arena hot data is ready");
  assert.match(source, /if\s*\(!options\.hasLiveArenaData\)\s*\{\s*return;\s*\}/, "cross-server canvas should draw only the clean background while arena hot data is missing");
  assert.doesNotMatch(source, /attemptsRemaining:\s*crossServerCenter\?\.arena\.attemptsRemaining\s*\?\?\s*0/, "cross-server should not turn missing arena data into a misleading 0/0 visual state");
  assert.match(source, /CROSS_SERVER_PIXEL_TEXT_STYLES/, "cross-server pixel text effects should be centralized for screenshot-level calibration");
  assert.doesNotMatch(source, /strokeWidth:\s*4/, "cross-server pixel text should not keep the first-pass heavy canvas stroke");
  assert.match(styles, /--lineup-image-top/, "cross-server lineup image crop should be explicitly calibrated against kuafu.png");
  assert.match(styles, /--lineup-image-top:\s*0%/, "cross-server lineup portraits should start at the calibrated card top instead of floating inside the frame");
  assert.match(styles, /--lineup-image-left:\s*0%/, "cross-server lineup portraits should start at the calibrated card left instead of floating inside the frame");
  assert.match(styles, /--lineup-image-width:\s*100%/, "cross-server lineup portraits should fill the calibrated 160px card width");
  assert.match(styles, /--lineup-image-height:\s*100%/, "cross-server lineup portraits should fill the calibrated 213px card height");
  assert.match(source, /crossServerLineupCards/, "cross-server should render live lineup cards");
  assert.match(crossServerHomeSource, /slice\(0,\s*4\)\.map\(\(opponent/, "cross-server should still render four live opponents");
  assert.match(source, /drawCrossServerPixelLayer/, "cross-server should render live text through a 941x1672 pixel layer instead of visible DOM text");
  assert.match(source, /drawCrossServerImage/, "cross-server should render main visual image assets through the canvas pixel layer");
  assert.match(source, /CROSS_SERVER_LINEUP_SOURCE_RECTS/, "cross-server lineup portraits should use fixed source crop rectangles instead of one stretched crop");
  assert.doesNotMatch(source, /const sourceY = 24;\s*const sourceHeight = 148;/, "cross-server lineup portraits should not use a single hard-coded crop for every card");
  assert.match(source, /coord\.x \+ 2,\s*coord\.y \+ 3,\s*coord\.w - 4,\s*coord\.h - 6/, "cross-server lineup portrait target should fill kuafujixian.png's marked employee card frame with only a thin inset");
  assert.match(source, /<canvas[^>]+width=\{941\}[^>]+height=\{1672\}/, "cross-server should use a fixed prototype-size canvas overlay");
  assert.match(source, /data-testid="cross-server-pixel-layer"/, "cross-server pixel layer should stay testable in browser QA");
  assert.match(source, /crossServerDebug/, "cross-server should expose a debug-only reference overlay switch for fast screenshot calibration");
  assert.match(source, /data-testid="cross-server-reference-overlay"/, "cross-server debug reference overlay should stay testable in Browser QA");
  assert.match(source, /\/game-ui\/cross-server\/kuafujixian\.png/, "cross-server should load kuafujixian.png as the debug-only coordinate reference overlay image");
  assert.match(crossServerArtHandoff, /941x1672/, "cross-server art handoff should lock every exported asset and annotation to the prototype canvas");
  assert.match(crossServerArtHandoff, /当前跨服主页标记为中间稿/, "cross-server art handoff should mark the current page as an intermediate draft instead of a final replication template");
  assert.match(crossServerArtHandoff, /game-ui-replication-playbook\.md/, "cross-server art handoff should route future rebuilds through the batch replication playbook");
  assert.match(crossServerArtHandoff, /通过 API URL 进入 Canvas/, "cross-server art handoff should define our assets as dynamic URLs, not fixed front-end slots");
  assert.match(crossServerArtHandoff, /不按固定 4 张对手或固定 5 张员工定义最终交付/, "cross-server art handoff should explicitly reject fixed opponent or lineup slots as the final delivery");
  assert.match(crossServerArtHandoff, /本轮不保留左侧 `1\/2\/3\/4` 徽章/, "cross-server art handoff should follow the current accepted scope without left-side medals");
  assert.match(styles, /\.cross-server-reference-overlay[\s\S]*pointer-events:\s*none/, "cross-server reference overlay should not block transparent gameplay hotspots");
  assert.match(source, /setActiveCrossServerMode\("season"\);\s*setNativeHomePage\("cross-server"\)/, "opening cross-server should reset the page to the main arena state");
  assert.match(source, /\},\s*\[[^\]]*nativeHomePage[^\]]*activeCrossServerMode[^\]]*\]\);/, "cross-server canvas should redraw when the page and mode mount, not only when data changes");
  assert.match(styles, /\.page-container\[data-testid="native-cross-server"\][\s\S]*position:\s*fixed/, "cross-server should use a dedicated full-screen activity layer instead of the narrow app shell");
  assert.match(styles, /\.cross-server-static-close[\s\S]*background:\s*transparent/, "cross-server close should be a transparent hotspot so the clean artboard stays 1:1");
  assert.match(styles, /\.cross-server-static-close svg[\s\S]*display:\s*block/, "cross-server close should show the gold return arrow instead of hiding the SVG");
  assert.doesNotMatch(styles, /\.cross-server-static-close svg\s*\{\s*display:\s*none;\s*\}/, "cross-server close should not hide the return arrow");
  assert.match(styles, /width:\s*min\(100vw,\s*calc\(100dvh \* 941 \/ 1672\)\)/, "cross-server artboard should fit narrow viewports without horizontal cropping");
  assert.match(styles, /height:\s*min\(100dvh,\s*calc\(100vw \* 1672 \/ 941\)\)/, "cross-server artboard should preserve the prototype ratio while respecting viewport height");
  assert.doesNotMatch(styles, /cross-server-dynamic-mask/, "cross-server should not mask screenshot text areas in the privilege-style shell");
  assert.doesNotMatch(crossServerAvatarImageStyle, /transform:/, "cross-server opponent avatars should not use secondary CSS transform after matching the 132px source frame");
  assert.doesNotMatch(source, /cross-server-center-badge|cross-server-opponent-card|cross-server-rank-badge/, "cross-server should not keep the failed CSS self-drawn badge and card shell");
  assert.doesNotMatch(styles, /\.cross-server-center-badge|\.cross-server-opponent-card|\.cross-server-rank-badge/, "cross-server styles should not keep the failed CSS self-drawn badge and card shell");
  assert.doesNotMatch(source, /cross-server-prototype-shell/, "cross-server should not keep the previous fluid prototype shell");
  assert.doesNotMatch(source, /cross-server-static-opponent-copy/, "opponent text should not use one merged copy box because it causes visual layer drift");
  assert.doesNotMatch(crossServerHomeSource, /cross-server-live-rank|cross-server-live-attempts|cross-server-static-opponent-name|cross-server-static-opponent-power|cross-server-static-opponent-rank/, "cross-server main visual text should no longer be rendered as visible DOM text layers");
  assert.doesNotMatch(crossServerHomeSource, /<strong>\{employee\.name\}<\/strong>/, "lineup cards should not render employee names as visible card text in the high-fidelity artboard");
});

test("phase 61 locks the game UI replication stop-loss workflow", () => {
  assert.match(gameUiReplicationPlaybook, /静态复刻[\s\S]*最小动态化[\s\S]*素材动态化/, "game UI replication should use the three-stage stop-loss workflow");
  assert.match(gameUiReplicationPlaybook, /同一阶段只能有一个主准/, "game UI replication should forbid competing primary references during one stage");
  assert.match(gameUiReplicationPlaybook, /测试通过只证明结构没坏，不能替代视觉验收/, "game UI replication should keep visual screenshot acceptance separate from structural tests");
  assert.match(gameUiReplicationPlaybook, /单张页面静态复刻超过半天仍不像/, "game UI replication should stop long-running static replication instead of continuing patch loops");
  assert.match(uiOverlayGuidelines, /docs\/game-ui-replication-playbook\.md/, "overlay guidelines should require the shared replication playbook for batch UI work");
  assert.match(uiOverlayGuidelines, /静态截图不像参考图时不得进入动态化/, "overlay guidelines should block dynamic layering before static replication passes");
  assert.match(uiOverlayGuidelines, /不能同时作为主准/, "overlay guidelines should reject mixing HTML coordinates, PNG references, JSON, and browser screenshots as equal sources");
});

test("phase 61 guild page owns guild cross-server", () => {
  assert.match(source, /data-testid="guild-cross-server-section"/, "guild page should expose guild cross-server");
  assert.match(source, /商会跨服/, "guild cross-server copy should live in guild page");
  assert.match(source, /registerCrossServerGuild/, "guild page should keep guild cross-server registration action");
});
