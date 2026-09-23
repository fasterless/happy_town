import { describe, it, expect, vi, afterEach } from "vitest";
import { createDefaultState, mergeState, CURRENT_VERSION } from "../src/core/state.js";
import { migrateState } from "../src/core/migrations.js";
import { seasonalEvents } from "../src/config/seasons.js";
import { getFestivalTasks, claimFestivalTask, claimFestivalReward, getFestivalHistory } from "../src/systems/seasons.js";
import { getCount } from "../src/core/inventory.js";

afterEach(() => vi.useRealTimers());

function stateAt(month) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, month - 1, 15, 12));
  const state = createDefaultState();
  state.wallet.level = 10;
  return state;
}

describe("季节庆典任务", () => {
  it("活动开始前的历史次数不计入进度", () => {
    const state = stateAt(9);
    state.analytics.harvest_crop = 20;
    const event = seasonalEvents.find((item) => item.id === "autumn_harvest");
    const task = getFestivalTasks(state, event).find((item) => item.id === "harvest");
    expect(task.progress).toBe(0);
    state.analytics.harvest_crop += 5;
    const done = getFestivalTasks(state, event).find((item) => item.id === "harvest");
    expect(done.done).toBe(true);
  });

  it("完成后只能领取一次，未开放活动不能领取", () => {
    const state = stateAt(9);
    const before = getCount(state, "coin");
    getFestivalTasks(state, seasonalEvents.find((item) => item.id === "autumn_harvest"));
    state.analytics.harvest_crop = 5;
    const first = claimFestivalTask(state, "autumn_harvest", "harvest");
    expect(first.success).toBe(true);
    expect(getCount(state, "coin")).toBe(before + 150);
    expect(claimFestivalTask(state, "autumn_harvest", "harvest").success).toBe(false);
    expect(claimFestivalTask(state, "spring_bloom", "plant").success).toBe(false);
  });

  it("v22 存档补上庆典进度且不改变已领礼物", () => {
    const saved = createDefaultState();
    saved.version = 22;
    saved.seasons = { claimedEventId: "autumn_harvest" };
    const merged = mergeState(createDefaultState(), saved);
    merged.version = 22;
    delete merged.seasons.festivals;
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.seasons.claimedEventId).toBe("autumn_harvest");
    expect(merged.seasons.festivals).toEqual({});
  });
});

describe("庆典纪念物", () => {
  it("完成任务获得纪念物，集满三枚兑换一次且保留收藏记录", () => {
    const state = stateAt(9);
    const event = seasonalEvents.find((item) => item.id === "autumn_harvest");
    getFestivalTasks(state, event);
    event.tasks.forEach((task) => { state.analytics[task.stat] = (state.analytics[task.stat] || 0) + task.target; });
    event.tasks.forEach((task) => expect(claimFestivalTask(state, event.id, task.id).success).toBe(true));
    expect(state.inventory.token_autumn).toBe(3);
    const result = claimFestivalReward(state, event.id);
    expect(result.success).toBe(true);
    expect(state.inventory.token_autumn).toBe(0);
    expect(state.seasons.festivalRewards).toEqual(["autumn_harvest"]);
    state.inventory.token_autumn = 3;
    expect(claimFestivalReward(state, event.id).success).toBe(false);
    expect(claimFestivalReward(state, "spring_bloom").success).toBe(false);
  });
});

describe("历年返场", () => {
  it("新年重新计任务，但保留去年记录、纪念物和收藏", () => {
    const state = stateAt(9);
    const event = seasonalEvents.find((item) => item.id === "autumn_harvest");
    state.seasons.festivals["autumn_harvest:2025"] = { baseline: {}, claimed: ["harvest", "order"] };
    state.inventory.token_autumn = 2;
    state.seasons.festivalRewards = ["autumn_harvest"];
    getFestivalTasks(state, event);
    state.analytics.harvest_crop = 5;
    expect(getFestivalTasks(state, event).find((task) => task.id === "harvest").done).toBe(true);
    const history = getFestivalHistory(state, event);
    expect(history.years).toEqual([{ year: 2025, completed: 2 }]);
    expect(history.rewardClaimed).toBe(true);
    expect(state.inventory.token_autumn).toBe(2);
  });
});
