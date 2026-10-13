import { MAZE_TILE_SIZE } from "../../shared/maze-core.mjs";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const loadImage = (source) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = source;
});

export class MazeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.pixelRatio = 1;
    this.width = 1;
    this.height = 1;
    this.camera = { x: 0, y: 0 };
    this.playerSprites = null;
    this.labProps = null;
    this.virusPowerAtlas = null;
    this.luckEventAtlas = null;
    this.meteorSprites = null;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    this.ready = Promise.all([
      loadImage("./assets/maze-game/player-sprites.png"),
      loadImage("./assets/maze-game/lab-props.png"),
      loadImage("./assets/maze-game/virus-power-atlas.png"),
      loadImage("./assets/maze-game/maze-luck-event-atlas.png"),
      loadImage("./assets/maze-game/maze-meteor-sprites.png")
    ]).then(([playerSprites, labProps, virusPowerAtlas, luckEventAtlas, meteorSprites]) => {
      this.playerSprites = playerSprites;
      this.labProps = labProps;
      this.virusPowerAtlas = virusPowerAtlas;
      this.luckEventAtlas = luckEventAtlas;
      this.meteorSprites = meteorSprites;
    });
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
  }

  updateCamera(maze, player) {
    const worldWidth = maze.width * MAZE_TILE_SIZE;
    const worldHeight = maze.height * MAZE_TILE_SIZE;
    this.camera.x = clamp(player.x - this.width / 2, 0, Math.max(0, worldWidth - this.width));
    this.camera.y = clamp(player.y - this.height / 2, 0, Math.max(0, worldHeight - this.height));
  }

  draw(maze, player, timestamp = 0, scene = {}) {
    if (!maze || !player) return;
    this.updateCamera(maze, player);
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, this.width, this.height);
    context.fillStyle = "#07131f";
    context.fillRect(0, 0, this.width, this.height);
    context.save();
    context.translate(-this.camera.x, -this.camera.y);
    this.drawTiles(context, maze);
    this.drawSeerPath(context, scene.seerPath);
    this.drawMeteors(context, scene.meteors, timestamp);
    this.drawDecorations(context, maze);
    this.drawChests(context, scene.chests, timestamp);
    this.drawPrizeBits(context, scene.prizeBits, timestamp);
    this.drawMarker(context, maze.start, 14, "ENTRADA", "#62e5c3", timestamp);
    this.drawMarker(context, maze.exit, 13, "SAÍDA", "#ffb84d", timestamp);
    this.drawVirus(context, scene.virus, timestamp, scene.virusFrozen);
    (scene.eventViruses || []).forEach((virus) => this.drawVirus(context, virus, timestamp, scene.virusFrozen));
    this.drawPlayer(context, player, timestamp);
    if (scene.playerShielded) this.drawPlayerShield(context, player, timestamp);
    context.restore();
    if (scene.showCompass) this.drawCompass(context, maze, player, timestamp);
    if (scene.activeEvent?.id === "onda-antivirus") this.drawAntivirusWave(context, scene.activeEvent);
    if (scene.activeEvent?.id === "apagao-digital") this.drawBlackout(context, player, timestamp);
    this.drawVignette(context);
  }

  drawSeerPath(context, path = []) {
    if (!path?.length) return;
    context.save();
    context.strokeStyle = "rgba(92,255,151,.88)";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "#58ff9c";
    context.shadowBlur = 13;
    context.setLineDash([10, 9]);
    context.beginPath();
    path.forEach((cell, index) => {
      const x = (cell.x + 0.5) * MAZE_TILE_SIZE;
      const y = (cell.y + 0.5) * MAZE_TILE_SIZE;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  }

  drawChests(context, chests = [], timestamp = 0) {
    if (!this.virusPowerAtlas) return;
    const tile = MAZE_TILE_SIZE;
    chests.filter((chest) => !chest.opened).forEach((chest) => {
      const centerX = (chest.x + 0.5) * tile;
      const centerY = (chest.y + 0.5) * tile;
      const bob = Math.sin(timestamp / 250 + chest.x) * 3;
      context.save();
      context.globalAlpha = 0.25;
      context.fillStyle = "#52d9e7";
      context.beginPath();
      context.arc(centerX, centerY, 29 + Math.sin(timestamp / 180) * 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
      this.drawAtlasCell(context, this.virusPowerAtlas, 5, centerX - 25, centerY - 23 + bob, 50, 42, 5, 4);
      const bubbleY = centerY - 47 + bob;
      context.save();
      context.fillStyle = "#f5ffff";
      context.strokeStyle = "#19aeb2";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(centerX - 29, bubbleY - 12, 58, 22, 9);
      context.fill();
      context.stroke();
      context.fillStyle = "#07515e";
      context.font = "800 9px Atkinson Hyperlegible, sans-serif";
      context.textAlign = "center";
      context.fillText("PODERES", centerX, bubbleY + 3);
      context.restore();
    });
  }

  drawPrizeBits(context, bits = [], timestamp = 0) {
    if (!this.luckEventAtlas) return;
    bits.filter((bit) => !bit.collected).forEach((bit) => {
      const centerX = (bit.x + 0.5) * MAZE_TILE_SIZE;
      const centerY = (bit.y + 0.5) * MAZE_TILE_SIZE;
      const bob = this.reducedMotion ? 0 : Math.sin(timestamp / 170 + bit.x) * 4;
      context.save();
      context.fillStyle = "rgba(92,239,255,.2)";
      context.beginPath();
      context.arc(centerX, centerY, 18, 0, Math.PI * 2);
      context.fill();
      context.restore();
      this.drawAtlasCell(context, this.luckEventAtlas, 4, centerX - 20, centerY - 20 + bob, 40, 40, 5, 2);
    });
  }

  drawMeteors(context, meteors = [], timestamp = 0) {
    meteors.forEach((meteor) => {
      const centerX = (meteor.x + 0.5) * MAZE_TILE_SIZE;
      const centerY = (meteor.y + 0.5) * MAZE_TILE_SIZE;
      if (meteor.age < 1.2) {
        const pulse = this.reducedMotion ? 0.72 : 0.55 + Math.sin(timestamp / 90) * 0.2;
        context.save();
        context.strokeStyle = `rgba(255,121,55,${pulse})`;
        context.fillStyle = "rgba(255,65,45,.14)";
        context.lineWidth = 4;
        context.beginPath();
        context.arc(centerX, centerY, 15, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
        if (this.meteorSprites) {
          const frame = meteor.age < 0.65 ? 0 : 1;
          this.drawAtlasCell(context, this.meteorSprites, frame, centerX - 34, centerY - 60, 68, 68, 4, 1);
        }
        return;
      }
      if (this.meteorSprites) {
        const frame = meteor.age < 1.48 ? 2 : 3;
        this.drawAtlasCell(context, this.meteorSprites, frame, centerX - 35, centerY - 35, 70, 70, 4, 1);
      }
    });
  }

  drawVirus(context, virus, timestamp = 0, frozen = false) {
    if (!virus || virus.respawnAt > timestamp || !this.virusPowerAtlas) return;
    const frame = Math.floor(timestamp / 115) % 4;
    const size = virus.sprinting ? 64 : 56;
    context.save();
    if (frozen) {
      context.globalAlpha = 0.72;
      context.filter = "hue-rotate(130deg) brightness(1.45)";
    }
    context.shadowColor = virus.sprinting ? "#ff32d2" : "#3fdbe8";
    context.shadowBlur = virus.sprinting ? 18 : 8;
    this.drawAtlasCell(context, this.virusPowerAtlas, frame, virus.x - size / 2, virus.y - size / 2, size, size, 5, 4);
    context.restore();
    if (virus.sprinting && !frozen && !virus.temporary) {
      context.save();
      context.fillStyle = "#ff84e7";
      context.font = "800 10px Atkinson Hyperlegible, sans-serif";
      context.textAlign = "center";
      context.fillText("VÍRUS!", virus.x, virus.y - 34);
      context.restore();
    }
  }

  drawPlayerShield(context, player, timestamp = 0) {
    context.save();
    context.strokeStyle = "rgba(99,240,255,.9)";
    context.fillStyle = "rgba(76,223,238,.12)";
    context.lineWidth = 3;
    context.shadowColor = "#52d9e7";
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(player.x, player.y - 5, 25 + Math.sin(timestamp / 180) * 2, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  drawCompass(context, maze, player, timestamp = 0) {
    const exitX = (maze.exit.x + 0.5) * MAZE_TILE_SIZE;
    const exitY = (maze.exit.y + 0.5) * MAZE_TILE_SIZE;
    const angle = Math.atan2(exitY - player.y, exitX - player.x);
    context.save();
    context.translate(this.width - 64, 72);
    context.fillStyle = "rgba(7,28,42,.86)";
    context.strokeStyle = "#62e5c3";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 34 + Math.sin(timestamp / 220) * 2, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.rotate(angle);
    context.fillStyle = "#ffb14f";
    context.beginPath();
    context.moveTo(22, 0);
    context.lineTo(-10, -9);
    context.lineTo(-5, 0);
    context.lineTo(-10, 9);
    context.closePath();
    context.fill();
    context.restore();
  }

  drawAntivirusWave(context, activeEvent) {
    const progress = Math.min(1, Math.max(0, (activeEvent.elapsed || 0) / 2));
    if (progress >= 1) return;
    context.save();
    context.strokeStyle = `rgba(92,244,255,${0.85 - progress * 0.65})`;
    context.lineWidth = 8;
    context.shadowColor = "#54eaff";
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(this.width / 2, this.height / 2, 30 + progress * Math.max(this.width, this.height), 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  drawBlackout(context, player, timestamp = 0) {
    const playerX = player.x - this.camera.x;
    const playerY = player.y - this.camera.y;
    const flicker = this.reducedMotion ? 0 : Math.sin(timestamp / 83) * 5;
    const radius = MAZE_TILE_SIZE * 4.5 + flicker;
    const gradient = context.createRadialGradient(playerX, playerY, radius * 0.25, playerX, playerY, radius);
    gradient.addColorStop(0, "rgba(0,3,10,0)");
    gradient.addColorStop(0.55, "rgba(0,3,10,.12)");
    gradient.addColorStop(1, "rgba(0,3,10,.94)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawTiles(context, maze) {
    const tile = MAZE_TILE_SIZE;
    const startX = Math.max(0, Math.floor(this.camera.x / tile) - 1);
    const startY = Math.max(0, Math.floor(this.camera.y / tile) - 1);
    const endX = Math.min(maze.width - 1, Math.ceil((this.camera.x + this.width) / tile) + 1);
    const endY = Math.min(maze.height - 1, Math.ceil((this.camera.y + this.height) / tile) + 1);
    const floorColors = ["#17334a", "#183d45", "#25334f", "#2d3049"];
    const wallColors = ["#0b1b2b", "#0a2430", "#111d35", "#191c34"];
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const zone = (x >= maze.width / 2 ? 1 : 0) + (y >= maze.height / 2 ? 2 : 0);
        const screenX = x * tile;
        const screenY = y * tile;
        if (maze.grid[y][x] === 0) {
          context.fillStyle = floorColors[zone];
          context.fillRect(screenX, screenY, tile, tile);
          context.fillStyle = "rgba(255,255,255,.035)";
          context.fillRect(screenX + 2, screenY + 2, tile - 4, 1);
          if ((x + y) % 4 === 0) {
            context.fillStyle = "rgba(98,229,195,.06)";
            context.fillRect(screenX + tile - 7, screenY + tile - 7, 3, 3);
          }
        } else {
          context.fillStyle = wallColors[zone];
          context.fillRect(screenX, screenY, tile, tile);
          context.fillStyle = "#294b64";
          context.fillRect(screenX + 2, screenY + 2, tile - 4, 5);
          context.fillStyle = "rgba(0,0,0,.28)";
          context.fillRect(screenX + 5, screenY + tile - 6, tile - 5, 6);
          context.strokeStyle = "rgba(91,179,205,.12)";
          context.strokeRect(screenX + 1.5, screenY + 1.5, tile - 3, tile - 3);
        }
      }
    }
  }

  drawDecorations(context, maze) {
    if (!this.labProps) return;
    const tile = MAZE_TILE_SIZE;
    const left = this.camera.x - tile;
    const top = this.camera.y - tile;
    const right = this.camera.x + this.width + tile;
    const bottom = this.camera.y + this.height + tile;
    maze.decorations.forEach((decoration) => {
      const x = decoration.x * tile;
      const y = decoration.y * tile;
      if (x < left || y < top || x > right || y > bottom) return;
      this.drawAtlasCell(context, this.labProps, decoration.prop, x + 3, y + 3, tile - 6, tile - 6);
    });
  }

  drawMarker(context, cell, prop, label, color, timestamp) {
    const tile = MAZE_TILE_SIZE;
    const centerX = (cell.x + 0.5) * tile;
    const centerY = (cell.y + 0.5) * tile;
    const pulse = 0.85 + Math.sin(timestamp / 260) * 0.12;
    context.save();
    context.globalAlpha = 0.26;
    context.fillStyle = color;
    context.beginPath();
    context.arc(centerX, centerY, tile * pulse, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (this.labProps) this.drawAtlasCell(context, this.labProps, prop, centerX - 27, centerY - 31, 54, 54);
    context.font = "700 10px Atkinson Hyperlegible, sans-serif";
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.fillText(label, centerX, centerY + 26);
  }

  drawPlayer(context, player, timestamp) {
    const rowByDirection = { down: 0, left: 1, right: 2, up: 3 };
    const row = rowByDirection[player.direction] ?? 0;
    const column = player.moving ? 1 + Math.floor(timestamp / 135) % 3 : 0;
    if (this.playerSprites) {
      const sourceWidth = this.playerSprites.naturalWidth / 4;
      const sourceHeight = this.playerSprites.naturalHeight / 4;
      const size = 65;
      context.drawImage(
        this.playerSprites,
        column * sourceWidth,
        row * sourceHeight,
        sourceWidth,
        sourceHeight,
        Math.round(player.x - size / 2),
        Math.round(player.y - size * 0.67),
        size,
        size
      );
      return;
    }
    context.fillStyle = "#62e5c3";
    context.fillRect(player.x - 10, player.y - 14, 20, 28);
    context.fillStyle = "#ff8f3f";
    context.fillRect(player.x + 5, player.y - 8, 8, 16);
  }

  drawAtlasCell(context, image, index, x, y, width, height, columns = 4, rows = 4) {
    const sourceWidth = image.naturalWidth / columns;
    const sourceHeight = image.naturalHeight / rows;
    const column = index % columns;
    const row = Math.floor(index / columns);
    context.drawImage(image, column * sourceWidth, row * sourceHeight, sourceWidth, sourceHeight, x, y, width, height);
  }

  drawVignette(context) {
    const gradient = context.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.22,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.72
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,6,14,.42)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }
}
