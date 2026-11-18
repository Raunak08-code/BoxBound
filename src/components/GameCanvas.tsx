import React, { useEffect, useRef } from 'react';
import { LEVEL_THEMES, LevelThemePalette } from '../engine/levels.ts';
import { isBoxCornerDeadlocked, isTargetTile } from '../engine/sokoban.ts';
import { Direction, GameBoardState, LevelThemeId } from '../engine/types.ts';

interface GameCanvasProps {
  board: GameBoardState;
  themeId: LevelThemeId;
}

interface VisualEntity {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ board, themeId }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<GameBoardState>(board);
  const themeRef = useRef<LevelThemePalette>(LEVEL_THEMES[themeId]);

  // Smooth interpolated visual positions in grid units
  const visualRef = useRef<{
    levelId: number;
    player: VisualEntity;
    boxes: VisualEntity[];
    bumpOffset: { x: number; y: number; decay: number };
    particles: Particle[];
    lastActionTimestamp: number;
  }>({
    levelId: board.levelId,
    player: {
      x: board.player.x,
      y: board.player.y,
      targetX: board.player.x,
      targetY: board.player.y,
    },
    boxes: board.boxes.map((b) => ({
      x: b.x,
      y: b.y,
      targetX: b.x,
      targetY: b.y,
    })),
    bumpOffset: { x: 0, y: 0, decay: 0 },
    particles: [],
    lastActionTimestamp: 0,
  });

  // Sync incoming board state to visual targets & spawn feedback particles
  useEffect(() => {
    boardRef.current = board;
    themeRef.current = LEVEL_THEMES[themeId];
    const vis = visualRef.current;

    const isLevelChanged =
      vis.levelId !== board.levelId ||
      vis.boxes.length !== board.boxes.length ||
      board.lastAction.type === 'reset';

    if (isLevelChanged) {
      vis.levelId = board.levelId;
      vis.player = {
        x: board.player.x,
        y: board.player.y,
        targetX: board.player.x,
        targetY: board.player.y,
      };
      vis.boxes = board.boxes.map((b) => ({
        x: b.x,
        y: b.y,
        targetX: b.x,
        targetY: b.y,
      }));
      vis.bumpOffset = { x: 0, y: 0, decay: 0 };
      vis.particles = [];
      vis.lastActionTimestamp = board.lastAction.timestamp;
      return;
    }

    vis.player.targetX = board.player.x;
    vis.player.targetY = board.player.y;
    board.boxes.forEach((b, idx) => {
      if (vis.boxes[idx]) {
        vis.boxes[idx].targetX = b.x;
        vis.boxes[idx].targetY = b.y;
      }
    });

    if (board.lastAction.timestamp !== vis.lastActionTimestamp) {
      vis.lastActionTimestamp = board.lastAction.timestamp;
      const action = board.lastAction;

      if (action.type === 'bump') {
        const dx = action.direction === 'L' ? -1 : action.direction === 'R' ? 1 : 0;
        const dy = action.direction === 'U' ? -1 : action.direction === 'D' ? 1 : 0;
        vis.bumpOffset = { x: dx * 0.18, y: dy * 0.18, decay: 1 };
      } else if (action.type === 'move' || action.type === 'push') {
        // Subtle footstep dust
        for (let i = 0; i < (action.type === 'push' ? 6 : 3); i++) {
          vis.particles.push({
            x: board.player.x + 0.5 + (Math.random() - 0.5) * 0.3,
            y: board.player.y + 0.72 + (Math.random() - 0.5) * 0.15,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -0.3 - Math.random() * 0.6,
            life: 1,
            maxLife: 0.38,
            size: 3 + Math.random() * 2,
            color: 'rgba(226, 232, 240, 0.75)',
          });
        }
        if (action.type === 'push' && action.reachedTarget && action.pushedBoxIndex !== null) {
          const box = board.boxes[action.pushedBoxIndex];
          if (box) {
            for (let i = 0; i < 14; i++) {
              const angle = (Math.PI * 2 * i) / 14;
              const speed = 1.2 + Math.random() * 1.4;
              vis.particles.push({
                x: box.x + 0.5,
                y: box.y + 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 0.55,
                size: 4,
                color: themeRef.current.targetRing,
              });
            }
          }
        }
      }
    }
  }, [board, themeId]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animId = 0;
    let lastTime = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let viewW = container.clientWidth;
    let viewH = container.clientHeight;

    const resize = () => {
      if (!container || !canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = Math.max(200, container.clientWidth);
      viewH = Math.max(200, container.clientHeight);
      canvas.width = Math.floor(viewW * dpr);
      canvas.height = Math.floor(viewH * dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const renderFrame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const b = boardRef.current;
      const theme = themeRef.current;
      const vis = visualRef.current;

      // Smooth exponential interpolation (~95ms settle)
      const lerpAlpha = 1 - Math.exp(-26 * dt);
      vis.player.x += (vis.player.targetX - vis.player.x) * lerpAlpha;
      vis.player.y += (vis.player.targetY - vis.player.y) * lerpAlpha;
      vis.boxes.forEach((box) => {
        box.x += (box.targetX - box.x) * lerpAlpha;
        box.y += (box.targetY - box.y) * lerpAlpha;
      });

      if (vis.bumpOffset.decay > 0) {
        vis.bumpOffset.decay = Math.max(0, vis.bumpOffset.decay - dt * 8);
      }

      for (let i = vis.particles.length - 1; i >= 0; i--) {
        const p = vis.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          vis.particles.splice(i, 1);
        }
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, viewW, viewH);

        const pad = 20;
        const tileSize = Math.floor(
          Math.min((viewW - pad * 2) / b.width, (viewH - pad * 2) / b.height),
        );
        const boardW = tileSize * b.width;
        const boardH = tileSize * b.height;
        const offsetX = Math.floor((viewW - boardW) / 2);
        const offsetY = Math.floor((viewH - boardH) / 2);

        const timeSec = now / 1000;

        // 1. Floor and Target Tiles
        for (let y = 0; y < b.height; y++) {
          for (let x = 0; x < b.width; x++) {
            const tile = b.tiles[y][x];
            if (tile === 'void') continue;
            const px = offsetX + x * tileSize;
            const py = offsetY + y * tileSize;

            if (tile === 'floor' || tile === 'target') {
              const isChecker = (x + y) % 2 === 0;
              ctx.fillStyle = isChecker ? theme.floorA : theme.floorB;
              ctx.fillRect(px, py, tileSize, tileSize);

              // Subtle pixel stone bevel
              ctx.strokeStyle = theme.floorBorder;
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);

              // Micro stone pixel accent
              if ((x * 7 + y * 13) % 5 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.fillRect(
                  px + Math.floor(tileSize * 0.25),
                  py + Math.floor(tileSize * 0.3),
                  Math.max(2, Math.floor(tileSize * 0.1)),
                  Math.max(2, Math.floor(tileSize * 0.08)),
                );
              }
            }

            if (tile === 'target') {
              drawTargetPad(ctx, px, py, tileSize, theme, timeSec);
            }
          }
        }

        // 2. Walls (2.5D extruded pixel blocks)
        for (let y = 0; y < b.height; y++) {
          for (let x = 0; x < b.width; x++) {
            if (b.tiles[y][x] !== 'wall') continue;
            const px = offsetX + x * tileSize;
            const py = offsetY + y * tileSize;
            const hasWallBelow = b.tiles[y + 1]?.[x] === 'wall';
            drawWallBlock(ctx, px, py, tileSize, theme, hasWallBelow);
          }
        }

        // 3. Boxes (sorted top-to-bottom for clean overlap)
        const boxEntries = b.boxes.map((coord, index) => ({
          coord,
          vis: vis.boxes[index] ?? { x: coord.x, y: coord.y },
          onTarget: isTargetTile(b.tiles, coord),
          deadlocked: isBoxCornerDeadlocked(b.tiles, coord),
        }));
        boxEntries.sort((a, c) => a.vis.y - c.vis.y);

        for (const entry of boxEntries) {
          const px = offsetX + entry.vis.x * tileSize;
          const py = offsetY + entry.vis.y * tileSize;
          drawCrate(
            ctx,
            px,
            py,
            tileSize,
            theme,
            entry.onTarget,
            entry.deadlocked,
            timeSec,
          );
        }

        // 4. Player Character (Keeper)
        const playerPx =
          offsetX +
          (vis.player.x + vis.bumpOffset.x * vis.bumpOffset.decay) * tileSize;
        const playerPy =
          offsetY +
          (vis.player.y + vis.bumpOffset.y * vis.bumpOffset.decay) * tileSize;

        const isMoving =
          Math.abs(vis.player.targetX - vis.player.x) > 0.04 ||
          Math.abs(vis.player.targetY - vis.player.y) > 0.04;
        const isPushing =
          isMoving && b.lastAction.type === 'push';

        drawKeeperCharacter(
          ctx,
          playerPx,
          playerPy,
          tileSize,
          b.facing,
          isMoving,
          isPushing,
          timeSec,
        );

        // 5. Particles
        for (const p of vis.particles) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          const sx = offsetX + p.x * tileSize - p.size / 2;
          const sy = offsetY + p.y * tileSize - p.size / 2;
          ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(p.size), Math.round(p.size));
        }
        ctx.globalAlpha = 1;

        ctx.restore();
      }

      animId = window.requestAnimationFrame(renderFrame);
    };

    animId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-label={`Puzzle board for level ${board.levelId}`}
      />
    </div>
  );
};

function drawTargetPad(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  theme: LevelThemePalette,
  timeSec: number,
) {
  const pulse = 0.72 + Math.sin(timeSec * 3.5) * 0.28;
  const inset = Math.floor(size * 0.16);
  const inner = size - inset * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(px + inset, py + inset, inner, inner);

  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillStyle = theme.targetGlow;
  ctx.fillRect(px + inset + 2, py + inset + 2, inner - 4, inner - 4);

  ctx.globalAlpha = 0.85 * pulse;
  ctx.strokeStyle = theme.targetRing;
  ctx.lineWidth = Math.max(2, Math.floor(size * 0.05));
  ctx.strokeRect(
    px + inset + 2,
    py + inset + 2,
    inner - 4,
    inner - 4,
  );

  // Center diamond marker
  const cx = px + size / 2;
  const cy = py + size / 2;
  const r = Math.max(3, Math.floor(size * 0.12));
  ctx.fillStyle = theme.targetRing;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWallBlock(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  theme: LevelThemePalette,
  hasWallBelow: boolean,
) {
  const faceHeight = hasWallBelow ? 0 : Math.max(6, Math.floor(size * 0.24));
  const topHeight = size - faceHeight;

  // Drop shadow on floor below wall
  if (!hasWallBelow) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(px, py + size, size, Math.max(4, Math.floor(size * 0.1)));
  }

  // Front face
  if (faceHeight > 0) {
    ctx.fillStyle = theme.wallFace;
    ctx.fillRect(px, py + topHeight, size, faceHeight);
    ctx.fillStyle = theme.wallShadow;
    ctx.fillRect(px, py + size - 3, size, 3);
  }

  // Top surface
  ctx.fillStyle = theme.wallTop;
  ctx.fillRect(px, py, size, topHeight);

  // Top rim highlight
  ctx.fillStyle = theme.wallHighlight;
  ctx.fillRect(px + 2, py + 2, size - 4, Math.max(2, Math.floor(size * 0.07)));

  // Brick seam lines
  ctx.fillStyle = theme.wallShadow;
  ctx.globalAlpha = 0.32;
  ctx.fillRect(px + Math.floor(size * 0.48), py + 4, 2, Math.max(4, topHeight - 8));
  ctx.fillRect(px + 2, py + Math.floor(topHeight * 0.52), size - 4, 2);
  ctx.globalAlpha = 1;
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  theme: LevelThemePalette,
  onTarget: boolean,
  deadlocked: boolean,
  timeSec: number,
) {
  const margin = Math.max(3, Math.floor(size * 0.09));
  const bx = Math.round(px + margin);
  const by = Math.round(py + margin);
  const bw = size - margin * 2;
  const bh = size - margin * 2;

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(bx + 2, by + 4, bw, bh);

  // Outer crate frame
  ctx.fillStyle = onTarget ? theme.crateLockedTrim : theme.crateTrim;
  ctx.fillRect(bx, by, bw, bh);

  // Inner wood panel
  const frame = Math.max(3, Math.floor(bw * 0.14));
  ctx.fillStyle = onTarget ? theme.crateLocked : theme.crateWood;
  ctx.fillRect(bx + frame, by + frame, bw - frame * 2, bh - frame * 2);

  // Diagonal plank brace
  ctx.strokeStyle = onTarget ? theme.crateLockedTrim : theme.crateTrim;
  ctx.lineWidth = Math.max(2, Math.floor(bw * 0.1));
  ctx.beginPath();
  ctx.moveTo(bx + frame + 2, by + frame + 2);
  ctx.lineTo(bx + bw - frame - 2, by + bh - frame - 2);
  ctx.stroke();

  // Top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.fillRect(bx + 2, by + 2, bw - 4, Math.max(2, Math.floor(frame * 0.7)));

  // Corner iron rivets
  const rivet = Math.max(2, Math.floor(bw * 0.08));
  ctx.fillStyle = onTarget ? '#ECFDF5' : '#FDE68A';
  ctx.fillRect(bx + 3, by + 3, rivet, rivet);
  ctx.fillRect(bx + bw - rivet - 3, by + 3, rivet, rivet);
  ctx.fillRect(bx + 3, by + bh - rivet - 3, rivet, rivet);
  ctx.fillRect(bx + bw - rivet - 3, by + bh - rivet - 3, rivet, rivet);

  // Checkmark emblem when locked onto target
  if (onTarget) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2.5, Math.floor(bw * 0.09));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.28, by + bh * 0.52);
    ctx.lineTo(bx + bw * 0.45, by + bh * 0.68);
    ctx.lineTo(bx + bw * 0.73, by + bh * 0.34);
    ctx.stroke();
  } else if (deadlocked) {
    // Gentle amber warning pulse when wedged in a non-target corner
    const blink = 0.45 + Math.sin(timeSec * 5) * 0.3;
    ctx.strokeStyle = `rgba(251, 146, 60, ${blink})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
  }
}

function drawKeeperCharacter(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  facing: Direction,
  isMoving: boolean,
  isPushing: boolean,
  timeSec: number,
) {
  const cx = px + size / 2;
  const cy = py + size / 2;
  const bob = isMoving ? Math.sin(timeSec * 22) * (size * 0.04) : Math.sin(timeSec * 3) * (size * 0.018);

  const unit = size / 16;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, py + size * 0.84, size * 0.28, size * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  const drawY = cy + bob;

  // Feet (animated stride when moving)
  const stride = isMoving ? Math.sin(timeSec * 22) * unit * 1.3 : 0;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(cx - unit * 3.2, drawY + unit * 3.4 + stride, unit * 2.4, unit * 2);
  ctx.fillRect(cx + unit * 0.8, drawY + unit * 3.4 - stride, unit * 2.4, unit * 2);

  // Terracotta vest torso (matches generated emblem)
  ctx.fillStyle = '#C2410C';
  ctx.fillRect(cx - unit * 3.8, drawY - unit * 0.6, unit * 7.6, unit * 4.4);
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(cx - unit * 2.8, drawY - unit * 0.2, unit * 5.6, unit * 3.2);

  // Arms (extended toward facing direction when pushing!)
  ctx.fillStyle = '#FDBA74';
  const armReach = isPushing ? unit * 2.4 : unit * 0.4;
  if (facing === 'L') {
    ctx.fillRect(cx - unit * 5.2 - armReach, drawY, unit * 2.2, unit * 2);
  } else if (facing === 'R') {
    ctx.fillRect(cx + unit * 3 + armReach, drawY, unit * 2.2, unit * 2);
  } else {
    ctx.fillRect(cx - unit * 5, drawY + (facing === 'U' ? -armReach : armReach * 0.5), unit * 1.8, unit * 2.2);
    ctx.fillRect(cx + unit * 3.2, drawY + (facing === 'U' ? -armReach : armReach * 0.5), unit * 1.8, unit * 2.2);
  }

  // Head
  ctx.fillStyle = '#FDBA74';
  ctx.fillRect(cx - unit * 3.4, drawY - unit * 4.8, unit * 6.8, unit * 4.6);

  // Cobalt Cap + Brass Goggles
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(cx - unit * 3.8, drawY - unit * 6.2, unit * 7.6, unit * 3.2);
  ctx.fillStyle = '#1D4ED8';
  const brimOffset = facing === 'L' ? -unit * 1.4 : facing === 'R' ? unit * 1.4 : 0;
  ctx.fillRect(cx - unit * 3.4 + brimOffset, drawY - unit * 3.6, unit * 6.8, unit * 1.2);

  // Brass goggles on cap
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(cx - unit * 2.8, drawY - unit * 5.2, unit * 2.2, unit * 1.6);
  ctx.fillRect(cx + unit * 0.6, drawY - unit * 5.2, unit * 2.2, unit * 1.6);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(cx - unit * 2.3, drawY - unit * 4.8, unit * 1.2, unit * 0.9);
  ctx.fillRect(cx + unit * 1.1, drawY - unit * 4.8, unit * 1.2, unit * 0.9);

  // Directional eyes (hidden when facing Up)
  if (facing !== 'U') {
    ctx.fillStyle = '#0F172A';
    const eyeShift = facing === 'L' ? -unit * 1.1 : facing === 'R' ? unit * 1.1 : 0;
    ctx.fillRect(cx - unit * 2 + eyeShift, drawY - unit * 2.1, unit * 1.1, unit * 1.4);
    ctx.fillRect(cx + unit * 0.9 + eyeShift, drawY - unit * 2.1, unit * 1.1, unit * 1.4);
  }
}
