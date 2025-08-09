window.onload = function() {
  // solicita o nome do miner
  let minerName = prompt("Informe o nome do miner:", "Miner");

  const config = {
    type: Phaser.AUTO,
    width: 350,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1000 },
        debug: false
      }
    },
    scene: { preload, create, update }
  };

  const game = new Phaser.Game(config);

  // game objects & state
  let player, cursors, platforms;
  let tokens, bolts, atoms, rocks;
  let score = 0, scoreText, nameText, levelText;
  let scoreMultiplier = 1;
  let multiplierTimer = null;
  let isRatomActive = false;
  let gameOver = false;

  // double jump
  let jumpCount = 0, maxJumps = 2;

  // speeds e timers
  let tokenFallSpeed = 100, playerSpeed = 200;
  let speedBoostTimer = null,
      movementBoostTimer = null,
      flashTimer = null;

  // bolt timing
  const boltPhaseDuration = 10000;
  let nextBoltDelay = 1000;

  // level & spawn difficulty
  let level = 1;
  let spawnDelay = 1000;       // intervalo inicial entre spawns
  const minSpawnDelay = 300;   // limite mínimo do intervalo
  const levelUpTime   = 15000; // tempo (ms) para subir de nível

  function preload() {
    this.load.image('fundo',   'assets/fundo.png');
    this.load.image('ground',  'assets/tile.png');
    this.load.image('token',   'assets/token.png');
    this.load.image('bolt',    'assets/bolt.png');
    this.load.image('Rbolt',   'assets/Rbolt.png');
    this.load.image('atom',    'assets/atom.png');
    this.load.image('Ratom',   'assets/Ratom.png');
    this.load.image('rocha',   'assets/rocha.png');
    this.load.image('reset',   'assets/reset.png');
    this.load.spritesheet('stony', 'assets/stony.png', {
      frameWidth: 64, frameHeight: 64
    });
  }

  function create() {
    // fundo
    this.add.image(0, 0, 'fundo')
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    // título do jogo
    this.add.text(
      config.width / 2, 10,
      'REDSTONE GAME',
      {
        fontSize: '30px',
        fill: 'rgba(253, 253, 253, 1)',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0);

    // painel de estatísticas
    this.add.rectangle(
      config.width / 2,
      90,
      260,
      100,
      0x000000,
      0.5
    ).setOrigin(0.5);

    // miner name
    nameText = this.add.text(
      config.width / 2,
      60,
      'Miner: ' + minerName,
      { fontSize: '18px', fill: '#fff' }
    ).setOrigin(0.5);

    // score de tokens
    scoreText = this.add.text(
      config.width / 2,
      90,
      'RED: ' + score,
      { fontSize: '18px', fill: '#fff' }
    ).setOrigin(0.5);

    // level display
    levelText = this.add.text(
      config.width / 2,
      120,
      'Level: ' + level,
      { fontSize: '18px', fill: '#fff' }
    ).setOrigin(0.5);

    // plataformas
    platforms = this.physics.add.staticGroup();
    for (let x = 0; x < config.width; x += 64) {
      platforms.create(x + 32, config.height - 32, 'ground').refreshBody();
    }

    // player
    player = this.physics.add.sprite(100, config.height - 150, 'stony');
    player.setBounce(0.1).setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // animações stony
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('stony', { start: 0, end: 1 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({
      key: 'turn',
      frames: [{ key: 'stony', frame: 4 }],
      frameRate: 20
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('stony', { start: 0, end: 1 }),
      frameRate: 10, repeat: -1
    });

    // grupos
    tokens = this.physics.add.group();
    bolts  = this.physics.add.group();
    atoms  = this.physics.add.group();
    rocks  = this.physics.add.group();

    // colisões & overlaps
    this.physics.add.collider(tokens, platforms, t => t.disableBody(true, true));
    this.physics.add.collider(bolts, platforms,  b => b.disableBody(true, true));
    this.physics.add.collider(atoms, platforms,  a => a.disableBody(true, true));
    this.physics.add.collider(rocks, platforms,  r => r.disableBody(true, true));

    this.physics.add.overlap(player, tokens, collectToken, null, this);
    this.physics.add.overlap(player, bolts,  collectBolt,  null, this);
    this.physics.add.overlap(player, atoms,  collectAtom,  null, this);
    this.physics.add.overlap(player, rocks,  collectRock,  null, this);

    // spawn dinâmico de objetos
    this.time.delayedCall(spawnDelay, spawnLoop, null, this);

    // bolts aleatórios e exponenciais
    const initialBoltDelay = Phaser.Math.Between(0, boltPhaseDuration);
    this.time.delayedCall(initialBoltDelay, spawnBolt, null, this);
    this.time.delayedCall(boltPhaseDuration, () => scheduleNextBolt.call(this), null, this);

    // timer para subida de nível
    this.time.addEvent({
      delay: levelUpTime,
      callback: levelUp,
      callbackScope: this,
      loop: true
    });

    cursors = this.input.keyboard.createCursorKeys();
  }

  function update() {
    if (gameOver) return;

    if (player.body.touching.down) jumpCount = 0;

    if (cursors.left.isDown) {
      player.setVelocityX(-playerSpeed).anims.play('left', true);
    }
    else if (cursors.right.isDown) {
      player.setVelocityX(playerSpeed).anims.play('right', true);
    }
    else {
      player.setVelocityX(0).anims.play('turn');
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.up) && jumpCount < maxJumps) {
      player.setVelocityY(-500);
      jumpCount++;
    }
  }

  // loop recursivo de spawn
  function spawnLoop() {
    spawnFallingObject.call(this);
    this.time.delayedCall(spawnDelay, spawnLoop, null, this);
  }

  // ao subir de nível
  function levelUp() {
    level++;
    // reduz spawnDelay até o mínimo
    spawnDelay = Math.max(minSpawnDelay, spawnDelay * 0.9);
    // acelera a queda dos tokens
    tokenFallSpeed += 20;
    // atualiza UI
    levelText.setText('Level: ' + level);
  }

  function spawnFallingObject() {
    const x = Phaser.Math.Between(16, config.width - 16);

    if (Phaser.Math.Between(1, 6) === 1) {
      const r = rocks.create(x, -20, 'rocha');
      r.setVelocityY(tokenFallSpeed).setDisplaySize(30, 30);
    }
    else if (!isRatomActive && Phaser.Math.Between(1, 20) === 1) {
      const a = atoms.create(x, -20, 'atom');
      a.setVelocityY(tokenFallSpeed).setDisplaySize(30, 30);
    }
    else {
      const t = tokens.create(x, -20, 'token');
      t.setVelocityY(tokenFallSpeed).setDisplaySize(30, 30);
    }
  }

  function spawnBolt() {
    const x = Phaser.Math.Between(16, config.width - 16);
    const b = bolts.create(x, -50, 'bolt');
    b.setVelocityY(300).setDisplaySize(30, 50);
  }

  function scheduleNextBolt() {
    this.time.delayedCall(nextBoltDelay, () => {
      spawnBolt.call(this);
      nextBoltDelay *= 2;
      scheduleNextBolt.call(this);
    }, null, this);
  }

  function collectToken(player, token) {
    token.disableBody(true, true);
    score += 1 * scoreMultiplier;
    scoreText.setText('Tokens: ' + score + (scoreMultiplier > 1 ? '  (×3)' : ''));
  }

  function collectAtom(player, atom) {
    atom.disableBody(true, true);
    clearAllFalling();
    flashCollect.call(this, 'Ratom', activateRatomMultiplier);
  }

  function collectBolt(player, bolt) {
    bolt.disableBody(true, true);
    clearAllFalling();
    flashCollect.call(this, 'Rbolt', activateBoltBoost);
  }

  function collectRock(player, rock) {
    rock.disableBody(true, true);
    gameOver = true;
    clearAllFalling();
    this.physics.pause();
    player.setTint(0xff0000);

    // Game Over UI
    this.add.image(0, 0, 'fundo')
        .setOrigin(0).setDisplaySize(config.width, config.height);

    this.add.text(
      config.width / 2, config.height / 2 - 40,
      'Game Over',
      { fontSize: '32px', fill: '#fff' }
    ).setOrigin(0.5);

    this.add.text(
      config.width / 2, config.height / 2 + 0,
      `Miner: ${minerName}`,
      { fontSize: '20px', fill: '#fff' }
    ).setOrigin(0.5);

    this.add.text(
      config.width / 2, config.height / 2 + 40,
      `Tokens Collected: ${score}`,
      { fontSize: '20px', fill: '#fff' }
    ).setOrigin(0.5);

    const restartButton = this.add.image(
      config.width / 2,
      config.height / 2 + 100,
      'reset'
    )
      .setOrigin(0.5)
      .setInteractive({ cursor: 'pointer' });

    restartButton.on('pointerover', () => restartButton.setTint(0x44ff44));
    restartButton.on('pointerout',  () => restartButton.clearTint());
    restartButton.on('pointerdown', () => {
      resetGameState();
      this.scene.restart();
    });
  }

  // utilitários
  function flashCollect(imageKey, onComplete) {
    this.physics.pause();
    const img = this.add.image(
      config.width / 2, config.height / 2,
      imageKey
    ).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      img.destroy();
      this.physics.resume();
      if (onComplete) onComplete.call(this);
    }, null, this);
  }

  function activateRatomMultiplier() {
    isRatomActive = true;
    scoreMultiplier = 3;
    if (multiplierTimer) multiplierTimer.remove();
    multiplierTimer = this.time.delayedCall(20000, () => {
      isRatomActive = false;
      scoreMultiplier = 1;
      scoreText.setText('Tokens: ' + score);
    }, null, this);
  }

  function activateBoltBoost() {
    tokenFallSpeed = 600;
    playerSpeed   = 400;

    if (speedBoostTimer)    speedBoostTimer.remove();
    if (movementBoostTimer) movementBoostTimer.remove();
    if (flashTimer)         flashTimer.remove();

    speedBoostTimer = this.time.delayedCall(10000, () => {
      tokenFallSpeed = 100;
    }, null, this);

    movementBoostTimer = this.time.delayedCall(10000, () => {
      playerSpeed = 200;
    }, null, this);

    flashTimer = this.time.addEvent({
      delay: 500,
      callback: () => this.cameras.main.flash(100),
      repeat: Math.floor(10000 / 500) - 1
    });
  }

  function clearAllFalling() {
    tokens.clear(true, true);
    atoms.clear(true, true);
    bolts.clear(true, true);
    rocks.clear(true, true);
  }

  function resetGameState() {
    score = 0;
    scoreMultiplier = 1;
    isRatomActive = false;
    gameOver = false;
    tokenFallSpeed = 100;
    playerSpeed = 200;
    nextBoltDelay = 1000;
    jumpCount = 0;
    level = 1;
    spawnDelay = 1000;
    if (multiplierTimer) multiplierTimer.remove();
    if (speedBoostTimer)    speedBoostTimer.remove();
    if (movementBoostTimer) movementBoostTimer.remove();
    if (flashTimer)         flashTimer.remove();
  }
};
