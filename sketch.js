// ============================================================
// EcoITC - Minijuego de Reciclaje
// Escuela Tecnológica Instituto Técnico Central
// Desarrollado con p5.js
// ============================================================

// --- ESTADOS DEL JUEGO ---
const STATE_INTRO = 0;
const STATE_TUTORIAL = 1;
const STATE_PLAYING = 2;
const STATE_WIN = 3;
const STATE_LOSE = 4;

let gameState = STATE_INTRO;

// --- CONFIGURACIÓN ---
const CANVAS_W = 1024;
const CANVAS_H = 640;
const GAME_TIME = 120; // 2 minutos

// --- VARIABLES DE JUEGO ---
let timer;
let score = 0;
let errors = 0;
let totalItems;
let collectedItems = 0;

// --- OBJETOS ---
let bins = [];
let trashItems = [];
let feedbackMsg = "";
let feedbackTimer = 0;
let feedbackCorrect = false;

// --- JUGADOR ---
let player;
const PLAYER_SPEED = 3.5;
const PLAYER_W = 48;
const PLAYER_H = 64;
let carriedItem = null;

// --- PROFESOR (aparece en error) ---
let profesorObj = {
  x: -100, y: 0,
  targetX: -100,
  visible: false,
  timer: 0,
  msg: "",
  walkFrame: 0,
  facingRight: true
};

// --- TIPOS DE CANECA ---
const BIN_AZUL = "azul";
const BIN_VERDE = "verde";
const BIN_NEGRA = "negra";

// --- ZONAS PROHIBIDAS (techo/estructura negra del fondo) ---
// Basado en la imagen del colegio: zona negra superior-derecha
const EXCLUDED_ZONES = [
  { x: 490, y: 50, w: 534, h: 310 },  // Pizarrón/techo negro
  { x: 0, y: 0, w: 1024, h: 55 }       // Franja superior (estante)
];

function isInExcludedZone(px, py, margin) {
  margin = margin || 0;
  for (let z of EXCLUDED_ZONES) {
    if (px + margin > z.x && px - margin < z.x + z.w &&
        py + margin > z.y && py - margin < z.y + z.h) {
      return true;
    }
  }
  return false;
}

// --- ANIMACIÓN INTRO ---
let introParticles = [];
let introAngle = 0;

// --- IMÁGENES ---
let imgFondo;
let imgMujerPresentacion;
let imgMujerFrente, imgMujerFrenteCamD, imgMujerFrenteCamI;
let imgMujerEspaldas, imgMujerEspaldasCamD, imgMujerEspaldasCamI;
let imgMujerLado, imgMujerLadoCamD, imgMujerLadoCamI;
let imgProfesorPresentacion;
let imgProfesorFrente, imgProfesorCamD, imgProfesorCamI;
let imgProfesorLadoDer, imgProfesorLadoDerCamD, imgProfesorLadoDerCamI;
let imgProfesorLadoIzq, imgProfesorLadoIzqCamD, imgProfesorLadoIzqCamI;
let imgProfesorEspaldasQuieto, imgProfesorEspaldasCamD, imgProfesorEspaldasCamI;
let imgCanecaAzul, imgCanecaVerde, imgCanecaNegra, imgCanecaRoja, imgCanecaAmarilla;
let imgResiduos = {};

// --- DEFINICIÓN DE RESIDUOS ---
const TRASH_DEFINITIONS = [
  // Caneca Azul: Reciclables
  { name: "Botella Plástica", bin: BIN_AZUL, img: "botella_plastica.png" },
  { name: "Botella Plástica 2", bin: BIN_AZUL, img: "botella_plastica2.png" },
  { name: "Botella de Vidrio", bin: BIN_AZUL, img: "botella_de_vidrio.png" },
  { name: "Botella Vidrio 3", bin: BIN_AZUL, img: "botella_vidrio3.png" },
  { name: "Lata de Aluminio", bin: BIN_AZUL, img: "lata_aluminio.png" },
  { name: "Lata Aluminio 2", bin: BIN_AZUL, img: "lata_aluminio2.png" },
  { name: "Periódico", bin: BIN_AZUL, img: "periodico.png" },
  { name: "Caja de Cartón", bin: BIN_AZUL, img: "caja_carton.png" },
  { name: "Caja Cartón 2", bin: BIN_AZUL, img: "caja_carton2.png" },
  { name: "Botella", bin: BIN_AZUL, img: "botella.png" },

  // Caneca Verde: Orgánicos
  { name: "Banana", bin: BIN_VERDE, img: "banana.png" },

  // Caneca Negra: No reciclables
  { name: "Vaso de Icopor", bin: BIN_NEGRA, img: "vaso_icopor.png" },
];

// ==========================================================
// CLASE CANECA
// ==========================================================
class Bin {
  constructor(x, y, w, h, type, label, sprite) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.label = label;
    this.sprite = sprite;
    this.highlight = 0;
  }

  draw() {
    push();
    if (this.highlight > 0) {
      tint(255, 255, 150);
      this.highlight--;
    }
    if (this.sprite) {
      image(this.sprite, this.x, this.y, this.w, this.h);
    } else {
      fill(150);
      stroke(0);
      strokeWeight(2);
      rect(this.x, this.y, this.w, this.h, 8);
    }
    noTint();

    // Etiqueta
    noStroke();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(11);
    textStyle(BOLD);

    // Fondo del texto
    let tw = textWidth(this.label) + 10;
    fill(0, 140);
    rect(this.x + this.w / 2 - tw / 2, this.y + this.h + 2, tw, 16, 4);
    fill(255);
    text(this.label, this.x + this.w / 2, this.y + this.h + 4);
    pop();
  }

  contains(px, py) {
    return px > this.x && px < this.x + this.w && py > this.y && py < this.y + this.h;
  }

  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }
}

// ==========================================================
// CLASE RESIDUO
// ==========================================================
class TrashItem {
  constructor(def, x, y, spriteImg) {
    this.name = def.name;
    this.bin = def.bin;
    this.imgFile = def.img;
    this.sprite = spriteImg;
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
    this.collected = false;
    this.pickedUp = false;
    this.bobPhase = random(TWO_PI);
  }

  draw() {
    if (this.collected || this.pickedUp) return;
    push();
    let bob = sin(frameCount * 0.05 + this.bobPhase) * 2;

    if (this.sprite) {
      image(this.sprite, this.x - this.w / 2, this.y - this.h / 2 + bob, this.w, this.h);
    } else {
      fill(200, 100, 100);
      stroke(0);
      rectMode(CENTER);
      rect(this.x, this.y + bob, this.w, this.h, 4);
      rectMode(CORNER);
    }

    // Nombre
    noStroke();
    textAlign(CENTER, TOP);
    textSize(9);
    textStyle(BOLD);
    let labelW = textWidth(this.name) + 6;
    fill(0, 160);
    rect(this.x - labelW / 2, this.y + this.h / 2 + bob + 2, labelW, 14, 3);
    fill(255);
    text(this.name, this.x, this.y + this.h / 2 + bob + 3);
    pop();
  }

  contains(px, py) {
    return px > this.x - this.w / 2 && px < this.x + this.w / 2 &&
           py > this.y - this.h / 2 && py < this.y + this.h / 2;
  }
}

// ==========================================================
// CLASE JUGADOR
// ==========================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.direction = "down";
    this.walking = false;
    this.walkFrame = 0;
    this.walkTimer = 0;
  }

  update() {
    let moving = false;
    let dx = 0, dy = 0;

    if (keyIsDown(LEFT_ARROW) || keyIsDown(65))  { dx -= PLAYER_SPEED; this.direction = "left";  moving = true; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { dx += PLAYER_SPEED; this.direction = "right"; moving = true; }
    if (keyIsDown(UP_ARROW) || keyIsDown(87))    { dy -= PLAYER_SPEED; this.direction = "up";    moving = true; }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83))  { dy += PLAYER_SPEED; this.direction = "down";  moving = true; }

    // Normalizar diagonal
    if (dx !== 0 && dy !== 0) {
      let len = sqrt(dx * dx + dy * dy);
      dx = (dx / len) * PLAYER_SPEED;
      dy = (dy / len) * PLAYER_SPEED;
    }

    let newX = this.x + dx;
    let newY = this.y + dy;

    // Limitar a bordes
    newX = constrain(newX, this.w / 2, CANVAS_W - this.w / 2);
    newY = constrain(newY, 55 + this.h / 2, CANVAS_H - this.h / 2);

    // Evitar zonas prohibidas (techo/estructura negra)
    if (!isInExcludedZone(newX, newY, this.w / 2)) {
      this.x = newX;
      this.y = newY;
    } else {
      // Intentar solo un eje
      if (!isInExcludedZone(newX, this.y, this.w / 2)) {
        this.x = newX;
      } else if (!isInExcludedZone(this.x, newY, this.h / 2)) {
        this.y = newY;
      }
    }

    this.walking = moving;
    if (moving) {
      this.walkTimer++;
      if (this.walkTimer % 10 === 0) {
        this.walkFrame = (this.walkFrame + 1) % 2;
      }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }
  }

  getSprite() {
    switch (this.direction) {
      case "down":
        if (!this.walking) return imgMujerFrente;
        return this.walkFrame === 0 ? imgMujerFrenteCamD : imgMujerFrenteCamI;
      case "up":
        if (!this.walking) return imgMujerEspaldas;
        return this.walkFrame === 0 ? imgMujerEspaldasCamD : imgMujerEspaldasCamI;
      case "left":
        if (!this.walking) return imgMujerLado;
        return this.walkFrame === 0 ? imgMujerLadoCamD : imgMujerLadoCamI;
      case "right":
        if (!this.walking) return imgMujerLado;
        return this.walkFrame === 0 ? imgMujerLadoCamD : imgMujerLadoCamI;
      default:
        return imgMujerFrente;
    }
  }

  render() {
    push();
    let sprite = this.getSprite();
    if (sprite) {
      if (this.direction === "right") {
        // Espejar horizontalmente para la derecha
        push();
        translate(this.x, this.y);
        scale(-1, 1);
        imageMode(CENTER);
        image(sprite, 0, 0, this.w, this.h);
        imageMode(CORNER);
        pop();
      } else {
        imageMode(CENTER);
        image(sprite, this.x, this.y, this.w, this.h);
        imageMode(CORNER);
      }
    }

    // Residuo que lleva encima
    if (carriedItem) {
      let iw = 28, ih = 28;
      if (carriedItem.sprite) {
        image(carriedItem.sprite, this.x - iw / 2, this.y - this.h / 2 - ih - 4, iw, ih);
      }
      noStroke();
      fill(255, 255, 100, 220);
      textAlign(CENTER, BOTTOM);
      textSize(9);
      textStyle(BOLD);
      text(carriedItem.name, this.x, this.y - this.h / 2 - ih - 6);
    }
    pop();
  }

  overlaps(item) {
    return abs(this.x - item.x) < (this.w / 2 + item.w / 2 - 5) &&
           abs(this.y - item.y) < (this.h / 2 + item.h / 2 - 5);
  }

  overlapsBin(bin) {
    return this.x > bin.x - 15 && this.x < bin.x + bin.w + 15 &&
           this.y > bin.y - 25 && this.y < bin.y + bin.h + 25;
  }
}

// ==========================================================
// PRELOAD
// ==========================================================
function preload() {
  imgFondo = loadImage("assets/colegio_fondo/colegio_fondo.png");

  // Mujer
  imgMujerPresentacion = loadImage("assets/mujer/mujer_presentacion.png");
  imgMujerFrente       = loadImage("assets/mujer/mujer_de_frente_quieta.png");
  imgMujerFrenteCamD   = loadImage("assets/mujer/mujer_de_frente_caminando_pie_derecho.png");
  imgMujerFrenteCamI   = loadImage("assets/mujer/mujer_de_frente_caminando_pie_izquierdo.png");
  imgMujerEspaldas     = loadImage("assets/mujer/mujer_de_espaldas_quieta.png");
  imgMujerEspaldasCamD = loadImage("assets/mujer/mujer_de_espaldas_caminando_pie_derecho.png");
  imgMujerEspaldasCamI = loadImage("assets/mujer/mujer_de_espaldas_caminando_pie_izquierdo.png");
  imgMujerLado         = loadImage("assets/mujer/mujer_de_lado_quieta.png");
  imgMujerLadoCamD     = loadImage("assets/mujer/mujer_de_lado_caminando_pie_derecho.png");
  imgMujerLadoCamI     = loadImage("assets/mujer/mujer_de_lado_caminando_pie_izquierdo.png");

  // Profesor
  imgProfesorPresentacion = loadImage("assets/profesor/profesor_de_pie_presentacion.png");
  imgProfesorFrente       = loadImage("assets/profesor/profesor_quieto_de_frente.png");
  imgProfesorCamD         = loadImage("assets/profesor/profesor_caminando_pie_derecho.png");
  imgProfesorCamI         = loadImage("assets/profesor/profesor_caminando_pie_izquierdo.png");
  imgProfesorLadoDer      = loadImage("assets/profesor/profesor_quieto_de_lado_derecho.png");
  imgProfesorLadoDerCamD  = loadImage("assets/profesor/profesor_caminando_de_lado_derecho_pie_derecho.png");
  imgProfesorLadoDerCamI  = loadImage("assets/profesor/profesor_caminando_de_lado_derecho_pie_izquierdo.png");
  imgProfesorLadoIzq      = loadImage("assets/profesor/profesor_quieto_de_lado_izquierdo.png");
  imgProfesorLadoIzqCamD  = loadImage("assets/profesor/profesor_caminando_de_lado_izquierdo_pie_derecho.png");
  imgProfesorLadoIzqCamI  = loadImage("assets/profesor/profesor_caminando_de_lado_izquierdo_pie_izquierdo.png");
  imgProfesorEspaldasQuieto = loadImage("assets/profesor/profesor_espaldas_quieto.png");
  imgProfesorEspaldasCamD = loadImage("assets/profesor/profesor_de_espaldas_caminando_pie_derecho.png");
  imgProfesorEspaldasCamI = loadImage("assets/profesor/profesor_de_espaldas_caminando_pie_izquierdo.png");

  // Canecas
  imgCanecaAzul     = loadImage("assets/canecas/caneca_azul.png");
  imgCanecaVerde    = loadImage("assets/canecas/caneca_verde.png");
  imgCanecaNegra    = loadImage("assets/canecas/caneca_negra.png");
  imgCanecaRoja     = loadImage("assets/canecas/caneca_roja.png");
  imgCanecaAmarilla = loadImage("assets/canecas/caneca_amarilla.png");

  // Residuos
  for (let def of TRASH_DEFINITIONS) {
    if (!imgResiduos[def.img]) {
      imgResiduos[def.img] = loadImage("assets/residuos/" + def.img);
    }
  }
}

// ==========================================================
// SETUP
// ==========================================================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont("Arial");
  player = new Player(CANVAS_W / 2, CANVAS_H - 100);
  initGame();
}

// ==========================================================
// INIT GAME
// ==========================================================
function initGame() {
  timer = GAME_TIME;
  score = 0;
  errors = 0;
  collectedItems = 0;
  feedbackMsg = "";
  feedbackTimer = 0;
  carriedItem = null;

  profesorObj.visible = false;
  profesorObj.timer = 0;
  profesorObj.x = -100;

  player = new Player(CANVAS_W / 2, CANVAS_H - 100);

  // Canecas en la parte inferior
  let binW = 75;
  let binH = 90;
  let binY = CANVAS_H - binH - 20;
  let binGap = 25;
  let totalBinW = 3 * binW + 2 * binGap;
  let binStartX = (CANVAS_W - totalBinW) / 2;

  bins = [
    new Bin(binStartX, binY, binW, binH, BIN_AZUL, "Reciclables", imgCanecaAzul),
    new Bin(binStartX + binW + binGap, binY, binW, binH, BIN_VERDE, "Orgánicos", imgCanecaVerde),
    new Bin(binStartX + (binW + binGap) * 2, binY, binW, binH, BIN_NEGRA, "No Reciclables", imgCanecaNegra)
  ];

  // Residuos
  trashItems = [];
  let usedDefs = shuffleArray([...TRASH_DEFINITIONS]);
  totalItems = usedDefs.length;

  let positions = generateTrashPositions(usedDefs.length);
  for (let i = 0; i < usedDefs.length; i++) {
    let spriteImg = imgResiduos[usedDefs[i].img] || null;
    trashItems.push(new TrashItem(usedDefs[i], positions[i].x, positions[i].y, spriteImg));
  }
}

function generateTrashPositions(count) {
  let positions = [];
  let minX = 55, maxX = CANVAS_W - 55;
  let minY = 90, maxY = CANVAS_H - 190;

  for (let i = 0; i < count; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      let x = random(minX, maxX);
      let y = random(minY, maxY);
      // Evitar zona prohibida (techo/estructura negra)
      if (isInExcludedZone(x, y, 30)) { attempts++; continue; }
      let tooClose = false;
      for (let p of positions) {
        if (dist(x, y, p.x, p.y) < 75) { tooClose = true; break; }
      }
      if (!tooClose) { positions.push({ x, y }); placed = true; }
      attempts++;
    }
    if (!placed) {
      // Fallback: colocar en zona izquierda (siempre válida)
      positions.push({ x: random(60, 450), y: random(120, maxY) });
    }
  }
  return positions;
}

// ==========================================================
// DRAW
// ==========================================================
function draw() {
  background(30);
  switch (gameState) {
    case STATE_INTRO:   drawIntroScreen();   break;
    case STATE_TUTORIAL: drawTutorialScreen(); break;
    case STATE_PLAYING: drawPlayingState();  break;
    case STATE_WIN:     drawWinScreen();     break;
    case STATE_LOSE:    drawLoseScreen();    break;
  }
}

// ==========================================================
// PANTALLA 1: INTRODUCCIÓN (Mejorada)
// ==========================================================
function drawIntroScreen() {
  introAngle += 0.008;

  // Fondo con degradado radial simulado
  for (let i = 0; i < CANVAS_H; i++) {
    let inter = map(i, 0, CANVAS_H, 0, 1);
    stroke(lerpColor(color(10, 40, 20), color(25, 85, 45), inter));
    line(0, i, CANVAS_W, i);
  }

  // Partículas flotantes de hojas/reciclaje
  push();
  noStroke();
  for (let i = 0; i < 25; i++) {
    let px = (CANVAS_W * 0.1 + i * 42 + sin(introAngle + i * 0.7) * 60) % CANVAS_W;
    let py = (CANVAS_H * 0.1 + i * 31 + cos(introAngle + i * 0.5) * 40) % CANVAS_H;
    let sz = 4 + sin(introAngle * 2 + i) * 2;
    let alpha = 40 + sin(introAngle + i * 0.3) * 25;
    fill(100, 220, 100, alpha);
    ellipse(px, py, sz, sz);
  }
  pop();

  // Marco exterior con brillo pulsante
  push();
  let glowAlpha = 150 + sin(introAngle * 3) * 60;
  noFill();
  stroke(255, 200, 50, glowAlpha); strokeWeight(4);
  rect(30, 30, CANVAS_W - 60, CANVAS_H - 60, 20);
  stroke(255, 220, 80, glowAlpha * 0.4); strokeWeight(2);
  rect(38, 38, CANVAS_W - 76, CANVAS_H - 76, 17);

  // Decoración esquinas
  noStroke();
  fill(255, 200, 50, 80);
  ellipse(45, 45, 20, 20);
  ellipse(CANVAS_W - 45, 45, 20, 20);
  ellipse(45, CANVAS_H - 45, 20, 20);
  ellipse(CANVAS_W - 45, CANVAS_H - 45, 20, 20);
  pop();

  push();
  textAlign(CENTER, CENTER);
  noStroke();

  // Sombra del título
  fill(0, 80);
  textSize(52); textStyle(BOLD);
  text("♻ EcoITC ♻", CANVAS_W / 2 + 3, 93);

  // Título principal con efecto
  fill(255, 230, 60);
  textSize(52); textStyle(BOLD);
  text("♻ EcoITC ♻", CANVAS_W / 2, 90);

  // Línea decorativa
  stroke(255, 200, 50, 120); strokeWeight(1);
  line(CANVAS_W / 2 - 180, 120, CANVAS_W / 2 + 180, 120);
  noStroke();

  // Subtítulo
  fill(255, 255, 255, 230);
  textSize(20); textStyle(NORMAL);
  text("Minijuego de Reciclaje", CANVAS_W / 2, 142);

  // Institución con badge
  fill(0, 0, 0, 60);
  rect(CANVAS_W / 2 - 200, 162, 400, 26, 13);
  fill(180, 230, 180);
  textSize(13); textStyle(ITALIC);
  text("Escuela Tecnológica Instituto Técnico Central", CANVAS_W / 2, 175);

  // Plataforma para personajes
  fill(0, 0, 0, 40);
  ellipse(CANVAS_W / 2 - 130, 405, 160, 25);
  ellipse(CANVAS_W / 2 + 130, 405, 160, 25);

  // Mujer presentación
  if (imgMujerPresentacion) {
    imageMode(CENTER);
    let bobW = sin(introAngle * 1.5) * 3;
    image(imgMujerPresentacion, CANVAS_W / 2 - 130, 315 + bobW, 130, 170);
    imageMode(CORNER);
  }

  // Profesor presentación
  if (imgProfesorPresentacion) {
    imageMode(CENTER);
    let bobP = sin(introAngle * 1.5 + 1) * 3;
    image(imgProfesorPresentacion, CANVAS_W / 2 + 130, 315 + bobP, 130, 170);
    imageMode(CORNER);
  }

  // Panel de descripción
  fill(0, 0, 0, 80);
  rect(CANVAS_W / 2 - 250, 425, 500, 70, 12);
  fill(255, 245, 220);
  textSize(15); textLeading(22); textStyle(NORMAL);
  text(
    "¡Ayuda a clasificar los residuos correctamente!\n" +
    "Aprende sobre las canecas y contribuye al cuidado\n" +
    "del medio ambiente en el ITC.",
    CANVAS_W / 2, 458
  );

  // Botón JUGAR mejorado
  drawButtonFancy(CANVAS_W / 2 - 110, 510, 220, 55, "▶  JUGAR", introAngle);

  pop();
}

// ==========================================================
// PANTALLA 2: TUTORIAL (Mejorada)
// ==========================================================
function drawTutorialScreen() {
  // Fondo con patrón
  for (let i = 0; i < CANVAS_H; i++) {
    let inter = map(i, 0, CANVAS_H, 0, 1);
    stroke(lerpColor(color(15, 45, 25), color(25, 75, 40), inter));
    line(0, i, CANVAS_W, i);
  }

  push();
  textAlign(CENTER, CENTER);

  // Panel principal con sombra
  noStroke();
  fill(0, 0, 0, 60);
  rect(55, 20, CANVAS_W - 105, CANVAS_H - 35, 18);
  fill(25, 55, 35, 245);
  stroke(100, 200, 120, 100); strokeWeight(2);
  rect(50, 15, CANVAS_W - 100, CANVAS_H - 30, 18);

  // Línea decorativa superior
  stroke(255, 200, 50, 150); strokeWeight(2);
  line(80, 50, CANVAS_W - 80, 50);
  noStroke();

  // Profesor presentación
  if (imgProfesorPresentacion) {
    // Plataforma
    fill(0, 0, 0, 40);
    ellipse(128, 165, 90, 15);
    imageMode(CENTER);
    image(imgProfesorPresentacion, 128, 118, 85, 115);
    imageMode(CORNER);
  }

  // Burbuja de diálogo del profesor
  fill(255, 250, 235, 230);
  stroke(200, 180, 100); strokeWeight(1);
  rect(185, 65, 420, 40, 10);
  noStroke();
  fill(255, 250, 235, 230);
  triangle(180, 85, 190, 78, 190, 92);

  fill(70, 50, 20);
  textSize(12); textStyle(ITALIC);
  text("\"¡Bienvenido estudiante! Te enseñaré a clasificar los residuos.\"", 395, 85);

  noStroke();
  fill(255, 220, 50);
  textSize(26); textStyle(BOLD);
  text("📚 Tutorial de Reciclaje", CANVAS_W / 2 + 80, 40);

  // Tarjetas de canecas mejoradas
  let startY = 145;
  let cardW = 268;
  let cardH = 148;
  let gap = 10;
  let startX = (CANVAS_W - (cardW * 3 + gap * 2)) / 2;

  drawBinCardWithSprite(startX, startY, cardW, cardH,
    "CANECA AZUL", [70, 130, 220], "RECICLABLES", imgCanecaAzul,
    ["Plástico", "Vidrio", "Metal", "Papel", "Cartón"]);

  drawBinCardWithSprite(startX + cardW + gap, startY, cardW, cardH,
    "CANECA VERDE", [60, 160, 60], "ORGÁNICOS", imgCanecaVerde,
    ["Restos de comida", "Cáscaras de fruta", "Hojas secas"]);

  drawBinCardWithSprite(startX + (cardW + gap) * 2, startY, cardW, cardH,
    "CANECA NEGRA", [100, 100, 100], "NO RECICLABLES", imgCanecaNegra,
    ["Icopor / Espuma", "Servilletas usadas", "Bolsas de mecato"]);

  // Sección de instrucciones con panel
  fill(0, 0, 0, 50);
  rect(90, 310, CANVAS_W - 180, 170, 12);

  fill(255, 230, 150);
  textSize(16); textStyle(BOLD);
  text("🎮 ¿Cómo jugar?", CANVAS_W / 2, 332);

  // Línea decorativa
  stroke(255, 230, 150, 80); strokeWeight(1);
  line(CANVAS_W / 2 - 100, 345, CANVAS_W / 2 + 100, 345);
  noStroke();

  // Iconos de teclas
  fill(220, 240, 220);
  textSize(13); textStyle(NORMAL); textLeading(21);
  textAlign(CENTER, CENTER);
  text(
    "⬆⬇⬅➡  Usa las FLECHAS del teclado (o WASD) para moverte.\n" +
    "[ESPACIO]  Acércate a un residuo y presiona para recogerlo.\n" +
    "[ESPACIO]  Llévalo a la caneca correcta y presiona para depositarlo.\n" +
    "❌  Si te equivocas, el profesor aparecerá con una pista.\n" +
    "⏱  ¡Tienes 2 minutos para clasificar toda la basura!",
    CANVAS_W / 2, 415
  );

  // Botón Comenzar mejorado
  drawButtonFancy(CANVAS_W / 2 - 120, 495, 240, 52, "🚀 ¡COMENZAR!", frameCount * 0.01);
  pop();
}

function drawBinCardWithSprite(x, y, w, h, title, col, subtitle, spriteImg, items) {
  push();
  // Sombra de la tarjeta
  noStroke();
  fill(0, 0, 0, 30);
  rect(x + 3, y + 3, w, h, 12);

  // Fondo de la tarjeta
  fill(col[0], col[1], col[2], 30);
  stroke(col[0], col[1], col[2], 160); strokeWeight(2);
  rect(x, y, w, h, 12);

  // Barra de color superior
  noStroke();
  fill(col[0], col[1], col[2], 100);
  rect(x, y, w, 5, 12, 12, 0, 0);

  // Sprite de la caneca
  if (spriteImg) {
    fill(0, 0, 0, 20);
    ellipse(x + w - 36, y + 70, 55, 12);
    image(spriteImg, x + w - 65, y + 12, 56, 66);
  }

  noStroke();
  fill(col[0], col[1], col[2]);
  textAlign(CENTER, TOP);
  textSize(14); textStyle(BOLD);
  text(title, x + (w - 65) / 2, y + 12);

  fill(255, 210);
  textSize(10); textStyle(ITALIC);
  text(subtitle, x + (w - 65) / 2, y + 30);

  fill(255, 240);
  textSize(11); textStyle(NORMAL);
  textAlign(LEFT, TOP);
  for (let i = 0; i < items.length; i++) {
    text("• " + items[i], x + 14, y + 50 + i * 18);
  }
  pop();
}

// ==========================================================
// PANTALLA 3: JUEGO
// ==========================================================
function drawPlayingState() {
  // Fondo del colegio
  if (imgFondo) {
    image(imgFondo, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    background(100, 160, 100);
  }

  // Canecas
  for (let bin of bins) { bin.draw(); }

  // Residuos
  for (let item of trashItems) { item.draw(); }

  // Jugador
  player.update();
  player.render();

  // Profesor
  updateProfesor();
  drawProfesorInGame();

  // HUD
  drawHUD();

  // Feedback
  drawFeedback();

  // Indicador de acción
  drawActionIndicator();

  // Temporizador
  if (frameCount % 60 === 0 && timer > 0) { timer--; }

  // Fin
  if (collectedItems >= totalItems) { gameState = STATE_WIN; }
  else if (timer <= 0) { gameState = STATE_LOSE; }
}

function drawActionIndicator() {
  push();
  textAlign(CENTER, BOTTOM);
  textSize(12); textStyle(BOLD); noStroke();

  if (carriedItem === null) {
    for (let item of trashItems) {
      if (!item.collected && !item.pickedUp && player.overlaps(item)) {
        let msg = "[ESPACIO] Recoger " + item.name;
        let tw = textWidth(msg) + 14;
        fill(0, 0, 0, 170);
        rect(player.x - tw / 2, player.y - player.h / 2 - 32, tw, 22, 6);
        fill(255, 255, 100);
        text(msg, player.x, player.y - player.h / 2 - 13);
        break;
      }
    }
  } else {
    for (let bin of bins) {
      if (player.overlapsBin(bin)) {
        let msg = "[ESPACIO] Depositar en " + bin.label;
        let tw = textWidth(msg) + 14;
        fill(0, 0, 0, 170);
        rect(player.x - tw / 2, player.y - player.h / 2 - 55, tw, 22, 6);
        fill(255, 255, 100);
        text(msg, player.x, player.y - player.h / 2 - 36);
        break;
      }
    }
  }
  pop();
}

// --- HUD ---
function drawHUD() {
  push();
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, CANVAS_W, 50);

  textAlign(LEFT, CENTER);
  textSize(12); fill(255, 200); textStyle(NORMAL);
  text("⏱ TIEMPO", 15, 12);
  textSize(20); textStyle(BOLD);
  fill(timer <= 30 ? color(255, 80, 80) : color(255));
  text(nf(floor(timer / 60), 2) + ":" + nf(floor(timer % 60), 2), 15, 34);

  // Barra de progreso
  let barX = 145, barY = 17, barW = 310, barH = 20;
  let progress = totalItems > 0 ? collectedItems / totalItems : 0;

  fill(255, 200); textSize(11); textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  text("📦 PROGRESO", barX, 9);

  fill(50, 50, 50, 200);
  rect(barX, barY, barW, barH, 10);

  fill(lerpColor(color(255, 150, 50), color(50, 200, 80), progress));
  rect(barX, barY, barW * progress, barH, 10);

  fill(255); textAlign(CENTER, CENTER);
  textSize(10); textStyle(BOLD);
  text(collectedItems + " / " + totalItems, barX + barW / 2, barY + barH / 2);

  textAlign(RIGHT, CENTER);
  textSize(12); textStyle(NORMAL);
  fill(255, 200);
  text("✅ Correctos: " + score, CANVAS_W - 15, 12);
  fill(255, 130, 130);
  text("❌ Errores: " + errors, CANVAS_W - 15, 34);
  pop();
}

function drawFeedback() {
  if (feedbackTimer <= 0) return;
  push();
  let alpha = map(feedbackTimer, 0, 90, 0, 255);
  let bgColor = feedbackCorrect ? color(40, 160, 60, alpha * 0.85) : color(200, 50, 50, alpha * 0.85);

  textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD);
  rectMode(CENTER);
  let tw = max(textWidth(feedbackMsg) + 30, 400);
  fill(bgColor); noStroke();
  rect(CANVAS_W / 2, 72, tw, 36, 10);
  fill(255, alpha);
  text(feedbackMsg, CANVAS_W / 2, 72);
  rectMode(CORNER);
  feedbackTimer--;
  pop();
}

// ==========================================================
// PROFESOR - Aparece caminando cuando hay error
// ==========================================================
function triggerProfesor(message) {
  profesorObj.visible = true;
  profesorObj.timer = 380;
  profesorObj.msg = message;
  profesorObj.x = -60;
  profesorObj.y = CANVAS_H - 160;
  profesorObj.targetX = player.x - 80;
  profesorObj.targetX = constrain(profesorObj.targetX, 60, CANVAS_W - 120);
  profesorObj.walkFrame = 0;
  profesorObj.facingRight = true;
}

function updateProfesor() {
  if (!profesorObj.visible) return;

  if (profesorObj.timer > 0) {
    profesorObj.timer--;
    if (abs(profesorObj.x - profesorObj.targetX) > 3) {
      let dir = profesorObj.targetX > profesorObj.x ? 1 : -1;
      profesorObj.x += dir * 2.5;
      profesorObj.facingRight = dir > 0;
      profesorObj.walkFrame++;
    }
  } else {
    profesorObj.x -= 3;
    profesorObj.walkFrame++;
    profesorObj.facingRight = false;
    if (profesorObj.x < -80) { profesorObj.visible = false; }
  }
}

function drawProfesorInGame() {
  if (!profesorObj.visible) return;
  push();

  let spriteP;
  let frame = floor(profesorObj.walkFrame / 10) % 2;
  let isWalking = abs(profesorObj.x - profesorObj.targetX) > 3 || profesorObj.timer <= 0;

  if (isWalking) {
    if (profesorObj.facingRight) {
      spriteP = frame === 0 ? imgProfesorLadoDerCamD : imgProfesorLadoDerCamI;
    } else {
      spriteP = frame === 0 ? imgProfesorLadoIzqCamD : imgProfesorLadoIzqCamI;
    }
  } else {
    spriteP = imgProfesorFrente;
  }

  if (spriteP) {
    imageMode(CENTER);
    image(spriteP, profesorObj.x, profesorObj.y, 55, 75);
    imageMode(CORNER);
  }

  // Burbuja de diálogo cuando está quieto
  if (profesorObj.timer > 0 && !isWalking) {
    drawSpeechBubble(profesorObj.x, profesorObj.y - 55, profesorObj.msg);
  }
  pop();
}

function drawSpeechBubble(x, y, msg) {
  push();
  textSize(11); textStyle(BOLD);
  let lines = msg.split("\n");
  let maxW = 0;
  for (let l of lines) { maxW = max(maxW, textWidth(l)); }
  let bw = maxW + 20;
  let bh = lines.length * 16 + 14;

  let bx = constrain(x - bw / 2, 5, CANVAS_W - bw - 5);
  let by = y - bh;

  fill(255, 250); stroke(80); strokeWeight(2);
  rect(bx, by, bw, bh, 8);

  fill(255, 250); noStroke();
  triangle(x - 6, by + bh, x + 6, by + bh, x, by + bh + 10);
  stroke(80); strokeWeight(2);
  line(x - 6, by + bh, x, by + bh + 10);
  line(x + 6, by + bh, x, by + bh + 10);

  noStroke(); fill(50);
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], bx + 10, by + 7 + i * 16);
  }
  pop();
}

// ==========================================================
// PANTALLA FINAL (Mejorada)
// ==========================================================
function drawWinScreen() { drawEndScreen(true); }
function drawLoseScreen() { drawEndScreen(false); }

function drawEndScreen(won) {
  // Fondo
  for (let i = 0; i < CANVAS_H; i++) {
    let inter = map(i, 0, CANVAS_H, 0, 1);
    stroke(won
      ? lerpColor(color(12, 55, 28), color(22, 100, 50), inter)
      : lerpColor(color(65, 20, 15), color(40, 15, 10), inter));
    line(0, i, CANVAS_W, i);
  }

  // Partículas de celebración (o de derrota)
  push();
  noStroke();
  let t = frameCount * 0.015;
  for (let i = 0; i < 20; i++) {
    let px = (i * 53 + sin(t + i * 0.8) * 80) % CANVAS_W;
    let py = (i * 37 + cos(t + i * 0.6) * 50) % CANVAS_H;
    let sz = 3 + sin(t * 2 + i) * 2;
    if (won) {
      fill(255, 220, 50, 50 + sin(t + i) * 30);
    } else {
      fill(200, 80, 60, 35 + sin(t + i) * 20);
    }
    ellipse(px, py, sz, sz);
  }
  pop();

  push();
  textAlign(CENTER, CENTER);

  // Panel principal con sombra
  noStroke();
  fill(0, 0, 0, 50);
  rect(55, 22, CANVAS_W - 105, CANVAS_H - 42, 20);
  fill(won ? color(20, 50, 30, 230) : color(50, 20, 15, 230));
  stroke(255, 200, 50, 120); strokeWeight(2);
  rect(50, 18, CANVAS_W - 100, CANVAS_H - 36, 20);

  noStroke();

  // Banner del título
  if (won) {
    // Fondo dorado del banner
    fill(255, 200, 50, 30);
    rect(CANVAS_W / 2 - 250, 38, 500, 55, 12);
    fill(255, 230, 60);
    textSize(38); textStyle(BOLD);
    text("🎉 ¡MISIÓN CUMPLIDA! 🎉", CANVAS_W / 2, 65);
  } else {
    fill(200, 50, 50, 30);
    rect(CANVAS_W / 2 - 220, 38, 440, 55, 12);
    fill(255, 110, 110);
    textSize(38); textStyle(BOLD);
    text("⏰ ¡TIEMPO AGOTADO!", CANVAS_W / 2, 65);
  }

  // Profesor con plataforma
  fill(0, 0, 0, 35);
  ellipse(CANVAS_W / 2, 225, 110, 18);
  if (imgProfesorPresentacion) {
    imageMode(CENTER);
    image(imgProfesorPresentacion, CANVAS_W / 2, 165, 100, 130);
    imageMode(CORNER);
  }

  // Panel de estadísticas
  fill(0, 0, 0, 50);
  rect(CANVAS_W / 2 - 220, 240, 440, 130, 12);

  fill(255, 255, 255, 200);
  textSize(16); textStyle(BOLD);
  text("📊 Estadísticas de tu sesión", CANVAS_W / 2, 258);

  // Línea
  stroke(255, 255, 255, 40); strokeWeight(1);
  line(CANVAS_W / 2 - 150, 272, CANVAS_W / 2 + 150, 272);
  noStroke();

  let total = score + errors;
  let accuracy = total > 0 ? floor((score / total) * 100) : 0;

  let sy = 290;
  textSize(15); textStyle(NORMAL);
  fill(120, 255, 150); text("✅ Clasificaciones correctas: " + score, CANVAS_W / 2, sy);
  fill(255, 140, 140); text("❌ Errores cometidos: " + errors, CANVAS_W / 2, sy + 24);
  fill(255, 225, 110); text("🎯 Precisión: " + accuracy + "%", CANVAS_W / 2, sy + 48);
  fill(180, 200, 255); text("📦 Residuos clasificados: " + collectedItems + " / " + totalItems, CANVAS_W / 2, sy + 72);

  // Panel de mensaje
  fill(0, 0, 0, 40);
  rect(CANVAS_W / 2 - 260, 395, 520, 90, 12);

  fill(255, 245, 210); textSize(13); textStyle(ITALIC); textLeading(19);
  let message;
  if (accuracy >= 90) {
    message = "\"¡Excelente trabajo! Eres un verdadero guardián del medio ambiente.\nCada residuo bien clasificado es un paso hacia un ITC más limpio.\n¡Sigue así, el planeta te lo agradece!\"";
  } else if (accuracy >= 60) {
    message = "\"¡Buen esfuerzo! Vas por buen camino aprendiendo a reciclar.\nRecuerda: Azul para reciclables, Verde para orgánicos, Negra para no reciclables.\n¡Practica un poco más y serás todo un experto!\"";
  } else {
    message = "\"¡No te rindas! Aprender a reciclar toma práctica.\nRecuerda: Plástico y papel en la Azul,\nrestos de comida en la Verde, y lo demás en la Negra.\n¡Inténtalo de nuevo!\"";
  }
  text(message, CANVAS_W / 2, 440);

  // Botón mejorado
  drawButtonFancy(CANVAS_W / 2 - 120, 510, 240, 50, "🔄 JUGAR DE NUEVO", frameCount * 0.01);
  pop();
}

// ==========================================================
// BOTONES
// ==========================================================
function drawButton(bx, by, bw, bh, label) {
  push();
  let hover = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  fill(hover ? color(80, 200, 80) : color(50, 170, 50));
  stroke(255, 200, 50); strokeWeight(2);
  rect(bx, by, bw, bh, 12);
  fill(255); noStroke();
  textAlign(CENTER, CENTER);
  textSize(18); textStyle(BOLD);
  text(label, bx + bw / 2, by + bh / 2);
  pop();
}

function drawButtonFancy(bx, by, bw, bh, label, anim) {
  push();
  let hover = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  let pulse = hover ? 1.0 : 0.7 + sin(anim * 3) * 0.15;

  // Sombra
  noStroke();
  fill(0, 0, 0, 50);
  rect(bx + 3, by + 3, bw, bh, 14);

  // Brillo exterior
  if (hover) {
    fill(100, 230, 100, 40);
    rect(bx - 3, by - 3, bw + 6, bh + 6, 16);
  }

  // Botón
  let baseR = hover ? 75 : 45;
  let baseG = hover ? 210 : 165;
  let baseB = hover ? 75 : 45;
  fill(baseR * pulse, baseG * pulse, baseB * pulse);
  stroke(255, 210, 60, 180); strokeWeight(2);
  rect(bx, by, bw, bh, 14);

  // Reflejo superior
  noStroke();
  fill(255, 255, 255, 35);
  rect(bx + 4, by + 2, bw - 8, bh * 0.4, 12, 12, 0, 0);

  // Texto
  fill(255); noStroke();
  textAlign(CENTER, CENTER);
  textSize(19); textStyle(BOLD);
  // Sombra del texto
  fill(0, 0, 0, 80);
  text(label, bx + bw / 2 + 1, by + bh / 2 + 1);
  fill(255);
  text(label, bx + bw / 2, by + bh / 2);
  pop();
}

// ==========================================================
// INTERACCIÓN
// ==========================================================
function mousePressed() {
  switch (gameState) {
    case STATE_INTRO:   handleIntroClick();   break;
    case STATE_TUTORIAL: handleTutorialClick(); break;
    case STATE_WIN:
    case STATE_LOSE:    handleEndClick();     break;
  }
}

function keyPressed() {
  if (gameState === STATE_PLAYING && (key === " " || keyCode === 32)) {
    handleSpaceAction();
  }
}

function handleSpaceAction() {
  if (carriedItem === null) {
    // Recoger residuo
    for (let item of trashItems) {
      if (!item.collected && !item.pickedUp && player.overlaps(item)) {
        carriedItem = item;
        item.pickedUp = true;
        break;
      }
    }
  } else {
    // Depositar en caneca
    for (let bin of bins) {
      if (player.overlapsBin(bin)) {
        depositInBin(bin);
        return;
      }
    }
    // Soltar en el suelo
    carriedItem.pickedUp = false;
    carriedItem.x = player.x;
    carriedItem.y = player.y + 25;
    carriedItem = null;
  }
}

function depositInBin(bin) {
  if (carriedItem.bin === bin.type) {
    // Correcto
    carriedItem.collected = true;
    carriedItem.pickedUp = false;
    collectedItems++;
    score++;
    feedbackMsg = "✅ ¡Correcto! \"" + carriedItem.name + "\" → " + getBinDisplayName(bin.type);
    feedbackCorrect = true;
    feedbackTimer = 90;
    bin.highlight = 15;
    carriedItem = null;
  } else {
    // Incorrecto
    errors++;
    let correctBin = getBinDisplayName(carriedItem.bin);
    feedbackMsg = "❌ \"" + carriedItem.name + "\" no va aquí → " + correctBin;
    feedbackCorrect = false;
    feedbackTimer = 120;

    carriedItem.pickedUp = false;
    carriedItem.x = player.x + random(-30, 30);
    carriedItem.y = player.y + 30;

    // Profesor aparece
    triggerProfesor(getHintForItem(carriedItem));
    carriedItem = null;
  }
}

function getHintForItem(item) {
  switch (item.bin) {
    case BIN_AZUL:  return "\"" + item.name + "\" es reciclable.\nDebe ir en la caneca AZUL.";
    case BIN_VERDE: return "\"" + item.name + "\" es orgánico.\nDebe ir en la caneca VERDE.";
    case BIN_NEGRA: return "\"" + item.name + "\" no es reciclable.\nDebe ir en la caneca NEGRA.";
    default: return "Revisa la clasificación.";
  }
}

function getBinDisplayName(type) {
  switch (type) {
    case BIN_AZUL:  return "AZUL (Reciclables)";
    case BIN_VERDE: return "VERDE (Orgánicos)";
    case BIN_NEGRA: return "NEGRA (No Reciclables)";
    default: return type;
  }
}

function handleIntroClick() {
  let bx = CANVAS_W / 2 - 110, by = 510, bw = 220, bh = 55;
  if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
    gameState = STATE_TUTORIAL;
  }
}

function handleTutorialClick() {
  let bx = CANVAS_W / 2 - 120, by = 495, bw = 240, bh = 52;
  if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
    initGame();
    gameState = STATE_PLAYING;
  }
}

function handleEndClick() {
  let bx = CANVAS_W / 2 - 120, by = 510, bw = 240, bh = 50;
  if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
    initGame();
    gameState = STATE_INTRO;
  }
}

// ==========================================================
// UTILIDADES
// ==========================================================
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
