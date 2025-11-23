import * as BABYLON from 'babylonjs';
import ProfileTranslations from '../languages/ProfileLanguages';

export function startGame(
  onMatchEnd: (winnerId: string, winnerDisplay: string) => void,
  settings: {
    winScore: number;
    ballSpeed: number;
    paddleSpeed: number;
  },
  p1: string,
  p2: string,
  displayNames?: { p1?: string; p2?: string }
) {
  const canvas = document.getElementById('pong') as HTMLCanvasElement;
  if (!canvas) return;

  // === RESPONSIVE CANVAS SETUP ===
  const container = canvas.parentElement;
  const DEFAULT_ASPECT_RATIO = 4 / 3; // 640:480 ratio
  let engine: BABYLON.Engine;
  let camera: BABYLON.FreeCamera;

  const computeCanvasSize = () => {
    const containerWidth = container?.clientWidth || window.innerWidth || 800;
    const viewportHeight = window.innerHeight || 600;
    let targetWidth = Math.min(containerWidth * 0.95, 960);
    let targetHeight = targetWidth / DEFAULT_ASPECT_RATIO;

    // Cap height to avoid overflowing small mobile viewports
    const maxHeight = viewportHeight * 0.65;
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = targetHeight * DEFAULT_ASPECT_RATIO;
    }

    return { targetWidth, targetHeight };
  };

  const updateCameraBounds = () => {
    if (!camera) return;
    const aspect = (canvas.width || 1) / (canvas.height || 1);
    camera.orthoLeft = -orthoSize * aspect;
    camera.orthoRight = orthoSize * aspect;
    camera.orthoTop = orthoSize;
    camera.orthoBottom = -orthoSize;
  };

  const applyCanvasSize = () => {
    const { targetWidth, targetHeight } = computeCanvasSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.width = Math.round(targetWidth * dpr);
    canvas.height = Math.round(targetHeight * dpr);

    if (engine) {
      engine.setSize(canvas.width, canvas.height, false);
      engine.resize();
      updateCameraBounds();
    }
  };

  // Initial sizing (before engine is created)
  applyCanvasSize();

  // Load mode and AI settings
  const opponentSettings = JSON.parse(localStorage.getItem('opponent_settings') || '{}');
  const mode = localStorage.getItem('mode') || 'multi';
  const aiLevel = opponentSettings.aiLevel || 'medium';

  const isAIMatch = mode === 'singleplayer' || mode === 'profile-singleplayer';

  const AI_PREDICTION_INTERVAL_MS = 1000;
  let aiErrorFactor = 0.20;
  let aiMissChance = 0.20;
  let aiViewInterval = AI_PREDICTION_INTERVAL_MS;
  let aiHoldScale = 1.0;
  let aiPaddleSpeedScale = 1.0;
  switch (aiLevel) {
    case 'easy':
      aiErrorFactor = 1;
      aiMissChance = 0.7;
      aiHoldScale = 0.6;
      aiViewInterval = 1000;
      aiPaddleSpeedScale = 0.45;
      break;
    case 'medium':
      aiErrorFactor = 0.6;
      aiMissChance = 0.4;
      aiHoldScale = 0.85;
      aiViewInterval = 1000;
      aiPaddleSpeedScale = 0.7;
      break;
    case 'hard':
      aiErrorFactor = 0.1;
      aiMissChance = 0.1;
      aiHoldScale = 1.05;
      aiViewInterval = 1000;
      aiPaddleSpeedScale = 1.0;
      break;
  }

  engine = new BABYLON.Engine(canvas, true, { 
    preserveDrawingBuffer: true, 
    stencil: true,
    antialias: true 
  });
  
  const scene = new BABYLON.Scene(engine);
  
  // Camera setup with proper FOV for consistent view
  camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 0, -100), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  
  // Set orthographic bounds to match game field
  const orthoSize = 35;
  updateCameraBounds();

  new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  const glow = new BABYLON.GlowLayer('glow', scene, { blurKernelSize: 48 });
  glow.intensity = 0.55;

  const WIN_SCORE = settings.winScore;
  const BALL_SPEED = settings.ballSpeed / 2;
  const PADDLE_SPEED = settings.paddleSpeed / 2;
  const AI_PADDLE_SPEED = isAIMatch ? PADDLE_SPEED * aiPaddleSpeedScale : PADDLE_SPEED;

  const fieldWidth = 100;
  const fieldHeight = 60;
  const paddleSize = { width: 3, height: 14, depth: 2 };
  const ballSize = 4;

  const playerOneName = displayNames?.p1 ?? p1;
  const playerTwoName = displayNames?.p2 ?? p2;

  // Translation helper for scoreboard text
  const currentLang = localStorage.getItem('lang') || 'eng';
  const t = (key: keyof typeof ProfileTranslations['eng']): string => {
    const pack = ProfileTranslations[currentLang as keyof typeof ProfileTranslations] || ProfileTranslations.eng;
    return pack[key] || ProfileTranslations.eng[key];
  };

  const scoreboardHost = document.getElementById('app') || document.body;
  let scoreDiv = document.getElementById('scoreDisplay') as HTMLDivElement | null;
  let leftScoreValueEl: HTMLSpanElement | null = null;
  let rightScoreValueEl: HTMLSpanElement | null = null;

  function mountScoreboard() {
    if (!scoreDiv) {
      scoreDiv = document.createElement('div');
      scoreDiv.id = 'scoreDisplay';
    }

    scoreDiv.className = 'game-scoreboard';
    scoreDiv.innerHTML = '';
    scoreDiv.setAttribute('role', 'status');
    scoreDiv.setAttribute('aria-live', 'polite');

    const panel = document.createElement('div');
    panel.className = 'game-scoreboard-panel';

    const leftPlayer = document.createElement('div');
    leftPlayer.className = 'game-scoreboard-player';
    const leftLabel = document.createElement('span');
    leftLabel.className = 'game-scoreboard-label';
    leftLabel.textContent = t('scoreboardPlayerOne');
    const leftName = document.createElement('span');
    leftName.className = 'game-scoreboard-name';
    leftName.textContent = playerOneName;
    leftPlayer.append(leftLabel, leftName);

    const scoresGroup = document.createElement('div');
    scoresGroup.className = 'game-scoreboard-scores';
    const leftScoreSpan = document.createElement('span');
    leftScoreSpan.className = 'game-scoreboard-score';
    leftScoreSpan.textContent = '00';
    const divider = document.createElement('span');
    divider.className = 'game-scoreboard-divider';
    divider.textContent = ':';
    const rightScoreSpan = document.createElement('span');
    rightScoreSpan.className = 'game-scoreboard-score';
    rightScoreSpan.textContent = '00';
    scoresGroup.append(leftScoreSpan, divider, rightScoreSpan);

    const rightPlayer = document.createElement('div');
    rightPlayer.className = 'game-scoreboard-player game-scoreboard-player--right';
    const rightLabel = document.createElement('span');
    rightLabel.className = 'game-scoreboard-label';
    rightLabel.textContent = isAIMatch ? t('scoreboardAIOpponent') : t('scoreboardPlayerTwo');
    const rightName = document.createElement('span');
    rightName.className = 'game-scoreboard-name';
    rightName.textContent = playerTwoName;
    rightPlayer.append(rightLabel, rightName);

    panel.append(leftPlayer, scoresGroup, rightPlayer);

    const subtext = document.createElement('p');
    subtext.className = 'game-scoreboard-subtext';
    const descriptor = isAIMatch ? t('scoreboardDescriptorAI') : t('scoreboardDescriptorPvp');
    subtext.textContent = `${t('scoreboardFirstTo')} ${WIN_SCORE} | ${descriptor}`;

    scoreDiv.append(panel, subtext);
    scoreboardHost.appendChild(scoreDiv);

    leftScoreValueEl = leftScoreSpan;
    rightScoreValueEl = rightScoreSpan;
  }

  mountScoreboard();

  const ground = BABYLON.MeshBuilder.CreateGround(
    'ground',
    { width: fieldWidth, height: fieldHeight },
    scene
  );
  const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.1);
  groundMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.04);
  ground.material = groundMat;

  function buildGlowingBlockPaddle(base: BABYLON.AbstractMesh, color: BABYLON.Color3) {
    base.isVisible = false;

    const holder = new BABYLON.TransformNode(base.name + '-block-holder', scene);
    holder.parent = base;

    const shell = BABYLON.MeshBuilder.CreateBox(base.name + '-shell', {
      width: paddleSize.width,
      height: paddleSize.height,
      depth: paddleSize.depth,
    }, scene);
    shell.parent = holder;
    shell.isPickable = false;
    const shellMat = new BABYLON.StandardMaterial(base.name + '-shell-mat', scene);
    shellMat.diffuseColor = color.scale(0.15);
    shellMat.emissiveColor = color.scale(0.22);
    shellMat.specularColor = new BABYLON.Color3(0.9, 0.9, 1);
    shellMat.alpha = 0.42;
    shell.material = shellMat;

    const core = BABYLON.MeshBuilder.CreateBox(base.name + '-core', {
      width: paddleSize.width * 0.72,
      height: paddleSize.height * 0.92,
      depth: paddleSize.depth * 0.72,
    }, scene);
    core.parent = holder;
    core.isPickable = false;
    const coreMat = new BABYLON.StandardMaterial(base.name + '-core-mat', scene);
    coreMat.diffuseColor = color.scale(0.08);
    coreMat.emissiveColor = color.clone();
    coreMat.specularColor = new BABYLON.Color3(1, 1, 1);
    coreMat.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    coreMat.emissiveFresnelParameters.bias = 0.18;
    coreMat.emissiveFresnelParameters.power = 2.0;
    core.material = coreMat;

    const phase = Math.random() * Math.PI * 2;
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.2 + phase);
      coreMat.emissiveColor = color.scale(pulse);
      shellMat.emissiveColor = color.scale(0.18 * pulse);
    });
  }

  const paddleLeft = BABYLON.MeshBuilder.CreateBox('paddleLeft', paddleSize, scene);
  paddleLeft.position.x = -fieldWidth / 2 + 5;
  const paddleRight = BABYLON.MeshBuilder.CreateBox('paddleRight', paddleSize, scene);
  paddleRight.position.x = fieldWidth / 2 - 5;

  buildGlowingBlockPaddle(paddleLeft, new BABYLON.Color3(0.2, 0.95, 1.0));
  buildGlowingBlockPaddle(paddleRight, new BABYLON.Color3(0.7, 0.3, 1.0));

  const ballMat = new BABYLON.StandardMaterial('ballMat', scene);
  ballMat.emissiveColor = new BABYLON.Color3(1.0, 0.3, 0.3);
  const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: ballSize }, scene);
  ball.material = ballMat;

  const mirror = new BABYLON.MirrorTexture('mirror', 256, scene, true);
  mirror.mirrorPlane = new BABYLON.Plane(0, -1, 0, 0);
  mirror.level = 0.22;
  mirror.renderList = [paddleLeft, paddleRight, ball];
  groundMat.reflectionTexture = mirror;
  groundMat.reflectionFresnelParameters = new BABYLON.FresnelParameters();
  groundMat.reflectionFresnelParameters.bias = 0.25;

  let leftScore = 0;
  let rightScore = 0;
  let gameOver = false;

  const left = { x: paddleLeft.position.x, y: 0, dy: 0, mesh: paddleLeft };
  const right = { x: paddleRight.position.x, y: 0, dy: 0, mesh: paddleRight };

  const ballObj = {
    x: 0,
    y: 0,
    dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  };

  const keys: Record<string, boolean> = {};
  const clampPaddleY = (value: number) =>
    Math.max(-fieldHeight / 2 + 7, Math.min(fieldHeight / 2 - 7, value));

  function updateScoreText() {
    if (leftScoreValueEl) {
      leftScoreValueEl.textContent = leftScore.toString().padStart(2, '0');
    }
    if (rightScoreValueEl) {
      rightScoreValueEl.textContent = rightScore.toString().padStart(2, '0');
    }
  }

  function resetBall() {
    ballObj.x = 0;
    ballObj.y = 0;
    ballObj.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ballObj.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  }

  function checkPaddleCollision(paddle: typeof left | typeof right, isLeft: boolean) {
    const ballHalf = ballSize / 2;
    const paddleHalfH = paddleSize.height / 2;
    const paddleHalfW = paddleSize.width / 2;

    const withinX = isLeft
      ? ballObj.x - ballHalf <= paddle.x + paddleHalfW && ballObj.x > paddle.x
      : ballObj.x + ballHalf >= paddle.x - paddleHalfW && ballObj.x < paddle.x;

    const withinY =
      ballObj.y + ballHalf >= paddle.y - paddleHalfH && ballObj.y - ballHalf <= paddle.y + paddleHalfH;

    if (withinX && withinY) {
      const relY = ballObj.y - paddle.y;
      const normY = relY / paddleHalfH;
      const bounceAngle = (normY * Math.PI) / 4;
      const speed = Math.sqrt(ballObj.dx ** 2 + ballObj.dy ** 2);
      const dir = isLeft ? 1 : -1;

      ballObj.dx = speed * Math.cos(bounceAngle) * dir;
      ballObj.dy = speed * Math.sin(bounceAngle);
      ballObj.x = isLeft ? paddle.x + paddleHalfW + ballHalf : paddle.x - paddleHalfW - ballHalf;
    }
  }

  function predictBallYAtX(targetX: number) {
    if (ballObj.dx === 0) return 0;

    const dirToTarget = Math.sign(targetX - ballObj.x);
    const ballMovingTowardsTarget = Math.sign(ballObj.dx) === dirToTarget;

    if (!ballMovingTowardsTarget) {
      return 0;
    }

    const t = (targetX - ballObj.x) / ballObj.dx;
    let projY = ballObj.y + ballObj.dy * t;

    const H = fieldHeight;
    const top = H / 2;
    let shifted = projY + top;
    const period = 2 * H;
    shifted = ((shifted % period) + period) % period;
    if (shifted > H) shifted = 2 * H - shifted;
    const finalY = shifted - top;
    return finalY;
  }

  let aiTimer: number | null = null;
  let aiTargetY: number | null = null;
  let aiMoveDuration = 0;
  let aiMoveStartTime = 0;
  let aiStartY = 0;
  let lastPredictionTime = 0;

  function startAIController() {
    if (!isAIMatch) return;

    aiTimer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPredictionTime < aiViewInterval - 5) {
        return;
      } // ensures that ai makes predictions at most every interval
      lastPredictionTime = now;
      if (gameOver) return;
      const aiX = right.x;
      let targetY = predictBallYAtX(aiX);

      const error = (Math.random() * 2 - 1) * (aiErrorFactor * fieldHeight / 10);
      targetY += error;

      if (Math.random() < aiMissChance) {
        targetY += (Math.random() > 0.5 ? 1 : -1) * (0.2 * fieldHeight);
      }

      const delta = targetY - right.y;
      const tolerance = 1.2;

      if (Math.abs(delta) <= tolerance) {
        aiTargetY = null;
        return;
      }

      aiTargetY = targetY;
      aiStartY = right.y;
      const distance = Math.abs(delta);
      const framesNeeded = distance / Math.max(0.0001, AI_PADDLE_SPEED);
      aiMoveDuration = framesNeeded * (1000 / 60) * aiHoldScale;
      aiMoveDuration = Math.max(80, Math.min(aiMoveDuration, aiViewInterval - 50));
      aiMoveStartTime = Date.now();
    }, aiViewInterval);
  }

  function stopAIController() {
    if (aiTimer != null) {
      clearInterval(aiTimer);
      aiTimer = null;
    }
  }

  function update() {
    if (gameOver) return;

    left.y += left.dy;
    left.y = clampPaddleY(left.y);

    if (isAIMatch && aiTargetY !== null) {
      const elapsed = Date.now() - aiMoveStartTime;
      if (elapsed < aiMoveDuration) {
        const t = Math.max(0, Math.min(1, elapsed / aiMoveDuration));
        right.y = clampPaddleY(aiStartY + (aiTargetY - aiStartY) * t);
      } else {
        right.y = clampPaddleY(aiTargetY);
        aiTargetY = null;
      }
      right.dy = 0;
    } else {
      right.y += right.dy;
      right.y = clampPaddleY(right.y);
    }

    left.mesh.position.y = left.y;
    right.mesh.position.y = right.y;

    ballObj.x += ballObj.dx;
    ballObj.y += ballObj.dy;
    ball.position.x = ballObj.x;
    ball.position.y = ballObj.y;

    if (ballObj.y <= -fieldHeight / 2 || ballObj.y >= fieldHeight / 2) ballObj.dy *= -1;

    checkPaddleCollision(left, true);
    checkPaddleCollision(right, false);

    if (ballObj.x < -fieldWidth / 2) {
      rightScore++;
      updateScoreText();
      checkWinner();
      resetBall();
    }
    if (ballObj.x > fieldWidth / 2) {
      leftScore++;
      updateScoreText();
      checkWinner();
      resetBall();
    }
  }

  function checkWinner() {
    if (leftScore >= WIN_SCORE) {
      gameOver = true;
      stopAIController();
      onMatchEnd(p1, playerOneName);
    } else if (rightScore >= WIN_SCORE) {
      gameOver = true;
      stopAIController();
      onMatchEnd(p2, playerTwoName);
    }
  }

  function loop() {
    update();
    scene.render();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (keys['w']) left.dy = PADDLE_SPEED;
    if (keys['s']) left.dy = -PADDLE_SPEED;

    if (!isAIMatch) {
      if (keys['ArrowUp']) right.dy = PADDLE_SPEED;
      if (keys['ArrowDown']) right.dy = -PADDLE_SPEED;
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (!keys['w'] && !keys['s']) left.dy = 0;

    if (!isAIMatch) {
      if (!keys['ArrowUp'] && !keys['ArrowDown']) right.dy = 0;
    }
  });

  // Touch/drag controls for mobile
  canvas.style.touchAction = 'none';
  function clientToFieldY(clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    // Invert Y to match on-screen direction (drag up moves paddle up)
    return clampPaddleY((0.5 - ratio) * fieldHeight);
  }
  function applyDragControl(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const leftSide = clientX < rect.left + rect.width / 2;
    const targetY = clientToFieldY(clientY);
    if (leftSide) {
      left.y = targetY;
      left.dy = 0;
    } else if (!isAIMatch) {
      right.y = targetY;
      right.dy = 0;
    }
  }
  const handleTouch = (evt: TouchEvent) => {
    evt.preventDefault();
    for (let i = 0; i < evt.touches.length; i++) {
      const touch = evt.touches.item(i);
      if (!touch) continue;
      applyDragControl(touch.clientX, touch.clientY);
    }
  };
  const handlePointer = (evt: PointerEvent) => {
    if (evt.pointerType !== 'touch') return;
    evt.preventDefault();
    applyDragControl(evt.clientX, evt.clientY);
  };
  canvas.addEventListener('touchstart', handleTouch, { passive: false });
  canvas.addEventListener('touchmove', handleTouch, { passive: false });
  canvas.addEventListener('pointerdown', handlePointer, { passive: false });
  canvas.addEventListener('pointermove', handlePointer, { passive: false });

  if (isAIMatch) {
    startAIController();
  }

  updateScoreText();
  resetBall();
  loop();
  
  // Use engine.resize() for BabylonJS responsive handling
  window.addEventListener('resize', () => {
    applyCanvasSize();
  });

  window.addEventListener(
    'beforeunload',
    () => {
      stopAIController();
      try {
        engine.dispose();
      } catch (e) {}
    },
    { once: true }
  );
}
