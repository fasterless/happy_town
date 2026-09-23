import { describe, it, expect } from "vitest";
import { createDefaultState, mergeState, CURRENT_VERSION } from "../src/core/state.js";
import { migrateState } from "../src/core/migrations.js";
import { explorePlace, getExploreBoard } from "../src/systems/explore.js";
import { getCount } from "../src/core/inventory.js";
function state(level=10){ const value=createDefaultState(); value.wallet.level=level; return value; }
describe("周边探索", () => {
  it("每次都有稳定收获，稀有发现不会取消稳定收获", () => {
    const value=state(); const random=Math.random; Math.random=()=>0.99;
    const result=explorePlace(value,"grove");
    expect(result.success).toBe(true);
    expect(getCount(value,"twig")).toBe(2);
    expect(getCount(value,"resin")).toBe(0);
    Math.random=()=>0; value.explore.date="2000-01-01";
    explorePlace(value,"grove");
    expect(getCount(value,"twig")).toBe(4);
    expect(getCount(value,"resin")).toBe(1);
    Math.random=random;
  });
  it("每个地点每天只能探索一次，等级不足不能进入", () => {
    const value=state(7);
    expect(explorePlace(value,"shore").success).toBe(false);
    expect(explorePlace(value,"grove").success).toBe(true);
    expect(explorePlace(value,"grove").success).toBe(false);
  });
  it("v24 存档补上探索记录", () => {
    const saved=createDefaultState(); saved.version=24; delete saved.explore;
    const merged=mergeState(createDefaultState(), saved); delete merged.explore; merged.version=24;
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.explore.found).toEqual([]);
  });
});

import { dishes } from "../src/config/dishes.js";
import { craftingRecipes } from "../src/config/crafting.js";
import { commissionJobs, getCommissionCoin } from "../src/config/commissions.js";
describe("探索物用途", () => {
  it("分别进入料理、加工和委托，并产生正报酬", () => {
    expect(dishes.find((item) => item.id === 7011).requires.map((item) => item.item)).toEqual(["twig", "resin"]);
    expect(craftingRecipes.find((item) => item.id === 5012).result.key).toBe("goods_5012");
    const job = commissionJobs.find((item) => item.id === 9011);
    expect(getCommissionCoin(job)).toBeGreaterThan(100);
  });
});

describe("地点小故事", () => {
  it("按已发现物品逐步解锁并可回看", () => {
    const value = state();
    value.explore.found = ["twig"];
    expect(getExploreBoard(value).find((place) => place.id === "grove").tales).toHaveLength(1);
    value.explore.found.push("resin");
    expect(getExploreBoard(value).find((place) => place.id === "grove").tales).toHaveLength(2);
  });
});
