import assert from "node:assert/strict";
import test from "node:test";

import { getVariantImageUrl } from "../lib/productImage.ts";

test("catalogue titles without local assets receive a relevant stock photo", () => {
  const buckle = getVariantImageUrl({
    title: "Nimbus Aurora Belt Buckle",
    category: "Accessories",
  });
  const belt = getVariantImageUrl({
    title: "Meridian Aurora Leather Belt",
    category: "Accessories",
  });

  assert.match(buckle, /\/belt-buckle\?/);
  assert.match(belt, /\/belt\?/);
});

test("stock-photo selection remains deterministic for the same product type", () => {
  const first = getVariantImageUrl({ title: "Nimbus Aurora Wireless Earbuds", category: "Audio" });
  const second = getVariantImageUrl({ title: "Aster Quartz Wireless Earbuds", category: "Audio" });

  assert.equal(first, second);
  assert.match(first, /\/earbuds\?/);
});
