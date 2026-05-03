import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const productSource = source.slice(
  source.indexOf('{(activeNav === "产品"'),
  source.indexOf('{activeNav === "市场"')
);
const marketSource = source.slice(
  source.indexOf('{activeNav === "市场"'),
  source.indexOf('{activeNav === "融资"')
);
const operationToastStyle = styleSource.match(/\.operation-toast \{[\s\S]*?\n\}/)?.[0] ?? "";
const productToastStyle = styleSource.match(/\.operation-toast\.is-product \{[\s\S]*?\n\}/)?.[0] ?? "";
const marketToastStyle = styleSource.match(/\.operation-toast\.is-market \{[\s\S]*?\n\}/)?.[0] ?? "";
const operationToastErrorStyle = styleSource.match(/\.operation-toast\.is-error \{[\s\S]*?\n\}/)?.[0] ?? "";

test("phase 30 product and market action feedback uses compact in-panel toasts", () => {
  assert.match(productSource, /operation-toast is-product/, "product feedback should use a product toast");
  assert.match(marketSource, /operation-toast is-market/, "market feedback should use a market toast");
  assert.doesNotMatch(productSource, /<p className="funding-notice"|<p className="funding-error"/, "product feedback should not take layout space");
  assert.doesNotMatch(marketSource, /<p className="funding-notice"|<p className="funding-error"/, "market feedback should not take layout space");

  assert.match(operationToastStyle, /position:\s*absolute/, "operation toast should overlay the current panel");
  assert.match(operationToastStyle, /top:\s*42%/, "operation toast should sit near the panel center");
  assert.match(operationToastStyle, /width:\s*min\(70%, 300px\)/, "operation toast should stay compact on H5");
  assert.match(operationToastStyle, /border-radius:\s*8px/, "operation toast should use a rectangular game popup shape");
  assert.match(productToastStyle, /background:\s*rgba\(18, 35, 28, 0\.96\)/, "product success toast should use a restrained product palette");
  assert.match(marketToastStyle, /background:\s*rgba\(28, 26, 44, 0\.96\)/, "market success toast should use a restrained market palette");
  assert.match(operationToastErrorStyle, /background:\s*rgba\(48, 20, 20, 0\.96\)/, "operation error toast should use a restrained dark red palette");
  assert.match(source, /setTimeout\(\(\) => \{\s*setProductNotice\(""\);\s*setProductError\(""\);[\s\S]*2200/, "product toast should auto dismiss");
  assert.match(source, /setTimeout\(\(\) => \{\s*setMarketNotice\(""\);\s*setMarketError\(""\);[\s\S]*2200/, "market toast should auto dismiss");
});
