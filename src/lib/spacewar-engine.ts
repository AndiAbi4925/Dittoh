export type SpacewarFaction = "ally" | "enemy";

export type SpacewarSpriteKind = "fighter" | "dart" | "invader" | "cruiser";

export type PixelCell = "." | "#" | "R";

export interface SpacewarSprite {
  rows: readonly string[];
  width: number;
  height: number;
}

/**
 * Crisp retro pixel sprites facing +X (right) at rotation 0.
 * '#' = primary hull ink, 'R' = Nothing Red accent pixel, '.' = empty.
 */
const SPRITES: Record<SpacewarSpriteKind, SpacewarSprite> = {
  fighter: {
    width: 9,
    height: 7,
    rows: [
      "..#......",
      "..###....",
      ".##R###..",
      "R######R.",
      ".##R###..",
      "..###....",
      "..#......",
    ],
  },
  dart: {
    width: 7,
    height: 5,
    rows: [
      ".#.....",
      ".###...",
      "R#R###.",
      ".###...",
      ".#.....",
    ],
  },
  invader: {
    width: 9,
    height: 7,
    rows: [
      ".##...##.",
      "..#...#..",
      ".#######.",
      "##R###R##",
      "#########",
      "#.#####.#",
      "...#.#...",
    ],
  },
  cruiser: {
    width: 9,
    height: 7,
    rows: [
      "..#####..",
      ".##R#R##.",
      "#########",
      "##.###.##",
      "#########",
      ".#.#.#.#.",
      "..#...#..",
    ],
  },
};

export interface SpaceShip {
  id: number;
  faction: SpacewarFaction;
  kind: SpacewarSpriteKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  depth: number;
  cooldown: number;
  evadeTimer: number;
  flashTimer: number;
  hp: number;
}

export interface SpaceMissile {
  faction: SpacewarFaction;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface SpaceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: "primary" | "accent" | "muted";
  glyph: string;
}

export interface SpaceStar {
  xFrac: number;
  yFrac: number;
  depth: number;
}

export interface SpacewarState {
  width: number;
  height: number;
  ships: SpaceShip[];
  missiles: SpaceMissile[];
  particles: SpaceParticle[];
  stars: SpaceStar[];
  nextShipId: number;
  time: number;
  seed: number;
}

export interface SpacewarThemePalette {
  background: string | null;
  hullNear: string;
  hullFar: string;
  enemyNear: string;
  enemyFar: string;
  accent: string;
  starColor: string;
  mutedGlyph: string;
  alphaMultiplier: number;
}

const MAX_MISSILES = 48;
const MAX_PARTICLES = 140;
const DEBRIS_GLYPHS = ["+", "*", "#", ".", "-"] as const;

function nextRand(state: SpacewarState): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function spawnShip(
  state: SpacewarState,
  faction: SpacewarFaction,
  fromEdge: boolean
): SpaceShip {
  const depth = 0.45 + nextRand(state) * 0.55;
  const kind: SpacewarSpriteKind =
    faction === "ally"
      ? nextRand(state) < 0.65
        ? "fighter"
        : "dart"
      : nextRand(state) < 0.6
        ? "invader"
        : "cruiser";

  const margin = 28;
  let x = nextRand(state) * Math.max(120, state.width);
  let y = nextRand(state) * Math.max(120, state.height);
  let angle = faction === "ally" ? 0 : Math.PI;

  if (fromEdge) {
    const edge = Math.floor(nextRand(state) * 4);
    if (edge === 0) {
      x = -margin;
      y = (0.12 + nextRand(state) * 0.76) * state.height;
      angle = (nextRand(state) - 0.5) * 0.6;
    } else if (edge === 1) {
      x = state.width + margin;
      y = (0.12 + nextRand(state) * 0.76) * state.height;
      angle = Math.PI + (nextRand(state) - 0.5) * 0.6;
    } else if (edge === 2) {
      x = (0.12 + nextRand(state) * 0.76) * state.width;
      y = -margin;
      angle = Math.PI * 0.5 + (nextRand(state) - 0.5) * 0.7;
    } else {
      x = (0.12 + nextRand(state) * 0.76) * state.width;
      y = state.height + margin;
      angle = -Math.PI * 0.5 + (nextRand(state) - 0.5) * 0.7;
    }
  } else {
    angle = (faction === "ally" ? 0 : Math.PI) + (nextRand(state) - 0.5) * 1.1;
  }

  const speed = (68 + nextRand(state) * 44) * depth;

  return {
    id: state.nextShipId++,
    faction,
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    depth,
    cooldown: 0.35 + nextRand(state) * 1.2,
    evadeTimer: 0,
    flashTimer: 0,
    hp: faction === "ally" ? 2 : 2,
  };
}

export function createSpacewarState(
  width: number,
  height: number,
  shipCount = 10,
  starCount = 28
): SpacewarState {
  const safeW = Math.max(240, width);
  const safeH = Math.max(180, height);
  const state: SpacewarState = {
    width: safeW,
    height: safeH,
    ships: [],
    missiles: [],
    particles: [],
    stars: [],
    nextShipId: 1,
    time: 0,
    seed: 20261116,
  };

  for (let i = 0; i < starCount; i += 1) {
    state.stars.push({
      xFrac: nextRand(state),
      yFrac: nextRand(state),
      depth: 0.25 + nextRand(state) * 0.75,
    });
  }

  const total = Math.max(4, Math.min(20, shipCount));
  for (let i = 0; i < total; i += 1) {
    const faction: SpacewarFaction = i % 2 === 0 ? "ally" : "enemy";
    state.ships.push(spawnShip(state, faction, false));
  }

  // Advance slightly upfront so initial paint shows natural trails and active flight
  for (let step = 0; step < 32; step += 1) {
    stepSpacewar(state, 1 / 30);
  }

  return state;
}

export function resizeSpacewarState(
  state: SpacewarState,
  width: number,
  height: number
): void {
  state.width = Math.max(240, width);
  state.height = Math.max(180, height);
}

function addBurstParticles(
  state: SpacewarState,
  x: number,
  y: number,
  count: number,
  color: SpaceParticle["color"],
  speedScale = 1
): void {
  for (let i = 0; i < count; i += 1) {
    if (state.particles.length >= MAX_PARTICLES) {
      state.particles.shift();
    }
    const ang = nextRand(state) * Math.PI * 2;
    const spd = (32 + nextRand(state) * 95) * speedScale;
    const glyph =
      DEBRIS_GLYPHS[Math.floor(nextRand(state) * DEBRIS_GLYPHS.length)] ?? "*";
    const maxLife = 0.28 + nextRand(state) * 0.35;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: maxLife,
      maxLife,
      color,
      glyph,
    });
  }
}

export function triggerSpacewarSalvo(
  state: SpacewarState,
  targetX: number,
  targetY: number,
  maxBurst = 3
): void {
  let closest: SpaceShip | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const ship of state.ships) {
    if (ship.faction !== "ally") continue;
    const d = Math.hypot(ship.x - targetX, ship.y - targetY);
    if (d < bestDist) {
      bestDist = d;
      closest = ship;
    }
  }

  if (closest) {
    const aimAngle = Math.atan2(targetY - closest.y, targetX - closest.x);
    closest.angle = aimAngle;
    for (let i = 0; i < maxBurst; i += 1) {
      if (state.missiles.length >= MAX_MISSILES) {
        state.missiles.shift();
      }
      const spread = (i - (maxBurst - 1) / 2) * 0.14;
      const fireAng = aimAngle + spread;
      const speed = 340;
      state.missiles.push({
        faction: "ally",
        x: closest.x + Math.cos(fireAng) * 14,
        y: closest.y + Math.sin(fireAng) * 14,
        vx: Math.cos(fireAng) * speed,
        vy: Math.sin(fireAng) * speed,
        life: 1.5,
      });
    }
    addBurstParticles(state, closest.x, closest.y, 4, "accent", 0.55);
  }

  // Startle nearby ships similar to interactive click reaction
  for (const ship of state.ships) {
    const dist = Math.hypot(ship.x - targetX, ship.y - targetY);
    if (dist < 130 && ship.faction === "enemy") {
      ship.evadeTimer = 0.9;
      ship.angle = Math.atan2(ship.y - targetY, ship.x - targetX);
    }
  }

  addBurstParticles(state, targetX, targetY, 6, "accent", 0.8);
}

export function stepSpacewar(
  state: SpacewarState,
  rawDt: number,
  pointer?: { x: number; y: number; active: boolean }
): void {
  const dt = Math.max(0.001, Math.min(0.05, rawDt));
  state.time += dt;

  const w = state.width;
  const h = state.height;
  const margin = 36;

  // Update ships
  for (let i = 0; i < state.ships.length; i += 1) {
    const ship = state.ships[i]!;
    ship.cooldown = Math.max(0, ship.cooldown - dt);
    ship.evadeTimer = Math.max(0, ship.evadeTimer - dt);
    ship.flashTimer = Math.max(0, ship.flashTimer - dt);

    // Find nearest enemy target
    let targetShip: SpaceShip | null = null;
    let targetDist = Number.POSITIVE_INFINITY;
    for (let j = 0; j < state.ships.length; j += 1) {
      const other = state.ships[j]!;
      if (other.faction === ship.faction) continue;
      const d = Math.hypot(other.x - ship.x, other.y - ship.y);
      if (d < targetDist) {
        targetDist = d;
        targetShip = other;
      }
    }

    let desiredAngle = ship.angle;
    if (ship.evadeTimer > 0) {
      desiredAngle += dt * 1.4;
    } else if (
      ship.faction === "ally" &&
      pointer?.active &&
      nextRand(state) < 0.35
    ) {
      desiredAngle = Math.atan2(pointer.y - ship.y, pointer.x - ship.x);
    } else if (targetShip) {
      desiredAngle = Math.atan2(targetShip.y - ship.y, targetShip.x - ship.x);
    }

    // Gentle separation from nearby flockmates
    let sepX = 0;
    let sepY = 0;
    for (let j = 0; j < state.ships.length; j += 1) {
      if (i === j) continue;
      const mate = state.ships[j]!;
      const dx = ship.x - mate.x;
      const dy = ship.y - mate.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1 && dist < 56) {
        sepX += dx / dist;
        sepY += dy / dist;
      }
    }
    if (sepX !== 0 || sepY !== 0) {
      const sepAngle = Math.atan2(sepY, sepX);
      desiredAngle = wrapAngle(
        desiredAngle + wrapAngle(sepAngle - desiredAngle) * 0.25
      );
    }

    // Softly steer back toward playfield interior if wandering near border
    if (ship.x < 40 || ship.x > w - 40 || ship.y < 36 || ship.y > h - 36) {
      const centerAngle = Math.atan2(h * 0.5 - ship.y, w * 0.5 - ship.x);
      desiredAngle = centerAngle;
    }

    const maxTurn = 2.6 * dt;
    const diff = wrapAngle(desiredAngle - ship.angle);
    ship.angle = wrapAngle(
      ship.angle + Math.max(-maxTurn, Math.min(maxTurn, diff))
    );

    const cruiseSpeed =
      (ship.evadeTimer > 0 ? 128 : 82) * (0.55 + ship.depth * 0.55);
    ship.vx = Math.cos(ship.angle) * cruiseSpeed;
    ship.vy = Math.sin(ship.angle) * cruiseSpeed;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // Downstream wrap (similar to ascii-animals edge re-entry)
    if (ship.x < -margin) ship.x = w + margin;
    if (ship.x > w + margin) ship.x = -margin;
    if (ship.y < -margin) ship.y = h + margin;
    if (ship.y > h + margin) ship.y = -margin;

    // Thruster spark dot behind tail
    if (nextRand(state) < 0.28 && state.particles.length < MAX_PARTICLES) {
      const tailX = ship.x - Math.cos(ship.angle) * 10 * ship.depth;
      const tailY = ship.y - Math.sin(ship.angle) * 10 * ship.depth;
      state.particles.push({
        x: tailX,
        y: tailY,
        vx: -ship.vx * 0.18,
        vy: -ship.vy * 0.18,
        life: 0.22,
        maxLife: 0.22,
        color: ship.evadeTimer > 0 ? "accent" : "muted",
        glyph: ".",
      });
    }

    // Fire missile when aligned with target
    if (
      targetShip &&
      ship.cooldown <= 0 &&
      targetDist < Math.max(w, h) * 0.65 &&
      Math.abs(wrapAngle(desiredAngle - ship.angle)) < 0.36 &&
      state.missiles.length < MAX_MISSILES
    ) {
      ship.cooldown = ship.faction === "ally" ? 0.95 + nextRand(state) * 0.6 : 1.35 + nextRand(state) * 0.9;
      const boltSpeed = 290;
      state.missiles.push({
        faction: ship.faction,
        x: ship.x + Math.cos(ship.angle) * 12,
        y: ship.y + Math.sin(ship.angle) * 12,
        vx: Math.cos(ship.angle) * boltSpeed,
        vy: Math.sin(ship.angle) * boltSpeed,
        life: 1.45,
      });
    }
  }

  // Update missiles and resolve pixel hits
  const hitThreshold = 15;
  for (let m = state.missiles.length - 1; m >= 0; m -= 1) {
    const bolt = state.missiles[m]!;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;

    if (
      bolt.life <= 0 ||
      bolt.x < -20 ||
      bolt.x > w + 20 ||
      bolt.y < -20 ||
      bolt.y > h + 20
    ) {
      state.missiles.splice(m, 1);
      continue;
    }

    let impacted = false;
    for (let s = 0; s < state.ships.length; s += 1) {
      const ship = state.ships[s]!;
      if (ship.faction === bolt.faction) continue;
      if (Math.hypot(ship.x - bolt.x, ship.y - bolt.y) <= hitThreshold * ship.depth + 4) {
        impacted = true;
        ship.hp -= 1;
        ship.flashTimer = 0.16;
        if (ship.hp <= 0) {
          addBurstParticles(state, ship.x, ship.y, 12, "accent", 1.15);
          state.ships[s] = spawnShip(state, ship.faction, true);
        } else {
          ship.evadeTimer = 0.65;
          addBurstParticles(state, bolt.x, bolt.y, 5, "primary", 0.7);
        }
        break;
      }
    }

    if (impacted) {
      state.missiles.splice(m, 1);
    }
  }

  // Update debris & thruster particles
  for (let p = state.particles.length - 1; p >= 0; p -= 1) {
    const pt = state.particles[p]!;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) {
      state.particles.splice(p, 1);
    }
  }
}

export function renderSpacewarCanvas(
  ctx: CanvasRenderingContext2D,
  state: SpacewarState,
  palette: SpacewarThemePalette,
  pixelScale = 2.5,
  pointer?: { x: number; y: number; active: boolean }
): void {
  const { width, height } = state;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (palette.background) {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // Crisp blocky starfield
  for (const star of state.stars) {
    const twinkle = 0.45 + 0.55 * Math.sin(state.time * 1.8 * star.depth + star.xFrac * 18);
    ctx.globalAlpha = palette.alphaMultiplier * star.depth * twinkle * 0.65;
    ctx.fillStyle = palette.starColor;
    const size = star.depth > 0.78 ? 2 : 1;
    ctx.fillRect(
      Math.round(star.xFrac * width),
      Math.round(star.yFrac * height),
      size,
      size
    );
  }

  // Debris & ASCII burst particles
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const pt of state.particles) {
    const fade = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    ctx.globalAlpha = palette.alphaMultiplier * fade;
    ctx.fillStyle =
      pt.color === "accent"
        ? palette.accent
        : pt.color === "primary"
          ? palette.hullNear
          : palette.mutedGlyph;
    if (pt.glyph === ".") {
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
    } else {
      ctx.fillText(pt.glyph, Math.round(pt.x), Math.round(pt.y));
    }
  }

  // Pixelated missiles with crisp 2-segment laser core
  for (const bolt of state.missiles) {
    ctx.globalAlpha = palette.alphaMultiplier * 0.95;
    ctx.fillStyle = bolt.faction === "ally" ? palette.accent : palette.enemyNear;
    const stepX = (bolt.vx / 290) * 3.5;
    const stepY = (bolt.vy / 290) * 3.5;
    const px = Math.round(bolt.x);
    const py = Math.round(bolt.y);
    const block = Math.max(2, Math.round(pixelScale));
    ctx.fillRect(px, py, block, block);
    ctx.globalAlpha = palette.alphaMultiplier * 0.55;
    ctx.fillRect(Math.round(px - stepX), Math.round(py - stepY), block, block);
    if (bolt.faction === "ally") {
      ctx.fillStyle = palette.hullNear;
      ctx.globalAlpha = palette.alphaMultiplier * 0.9;
      ctx.fillRect(px, py, Math.max(1, block - 1), Math.max(1, block - 1));
    }
  }

  // Ships rendered onto snapped integer blocks aligned with ship heading
  const sortedShips = [...state.ships].sort((a, b) => a.depth - b.depth);
  for (const ship of sortedShips) {
    const sprite = SPRITES[ship.kind];
    const block = Math.max(2, Math.round(pixelScale * (0.75 + ship.depth * 0.5)));
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    const cx = (sprite.width - 1) / 2;
    const cy = (sprite.height - 1) / 2;

    const primaryColor =
      ship.flashTimer > 0
        ? palette.accent
        : ship.faction === "ally"
          ? ship.depth > 0.72
            ? palette.hullNear
            : palette.hullFar
          : ship.depth > 0.72
            ? palette.enemyNear
            : palette.enemyFar;

    ctx.globalAlpha = palette.alphaMultiplier * (0.45 + ship.depth * 0.55);

    for (let r = 0; r < sprite.height; r += 1) {
      const row = sprite.rows[r] ?? "";
      for (let c = 0; c < sprite.width; c += 1) {
        const cell = row[c];
        if (!cell || cell === ".") continue;
        const lx = (c - cx) * block;
        const ly = (r - cy) * block;
        const wx = Math.round(ship.x + lx * cos - ly * sin);
        const wy = Math.round(ship.y + lx * sin + ly * cos);
        ctx.fillStyle = cell === "R" ? palette.accent : primaryColor;
        ctx.fillRect(wx, wy, block, block);
      }
    }
  }

  // Crisp pixel reticle around active cursor
  if (pointer?.active && palette.background !== null) {
    const rx = Math.round(pointer.x);
    const ry = Math.round(pointer.y);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(rx - 8, ry - 1, 5, 2);
    ctx.fillRect(rx + 4, ry - 1, 5, 2);
    ctx.fillRect(rx - 1, ry - 8, 2, 5);
    ctx.fillRect(rx - 1, ry + 4, 2, 5);
  }

  ctx.restore();
}
