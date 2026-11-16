import { describe, expect, it } from "vitest";
import {
  createSpacewarState,
  resizeSpacewarState,
  stepSpacewar,
  triggerSpacewarSalvo,
} from "@/lib/spacewar-engine";

describe("retro pixel Spacewar simulation engine", () => {
  it("spawns balanced allied fighters and enemy invaders within viewport bounds", () => {
    const state = createSpacewarState(800, 400, 10, 24);
    expect(state.ships).toHaveLength(10);
    expect(state.stars).toHaveLength(24);
    expect(state.ships.some((s) => s.faction === "ally")).toBe(true);
    expect(state.ships.some((s) => s.faction === "enemy")).toBe(true);
  });

  it("advances ship movement, fires missiles on salvo click, and bounds entity pools", () => {
    const state = createSpacewarState(640, 320, 8, 12);
    const initialX = state.ships[0]?.x ?? 0;

    triggerSpacewarSalvo(state, 320, 160, 3);
    expect(state.missiles.length).toBeGreaterThanOrEqual(3);
    expect(state.particles.length).toBeGreaterThan(0);

    for (let i = 0; i < 60; i += 1) {
      stepSpacewar(state, 1 / 60, { x: 400, y: 180, active: true });
    }

    expect(state.ships[0]?.x).not.toBe(initialX);
    expect(state.missiles.length).toBeLessThanOrEqual(48);
    expect(state.particles.length).toBeLessThanOrEqual(140);
  });

  it("updates dimensions smoothly on resize", () => {
    const state = createSpacewarState(400, 300, 6, 8);
    resizeSpacewarState(state, 1200, 720);
    expect(state.width).toBe(1200);
    expect(state.height).toBe(720);
  });
});
