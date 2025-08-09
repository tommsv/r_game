# setup_project.py

import os

# Conteúdos dos arquivos
index_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Stony & the Quest for $RED</title>
  <style>
    body { margin: 0; }
    canvas { display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
"""

main_js = """window.onload = function() {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 1000 }, debug: false }
    },
    scene: { preload, create, update }
  };

  const game = new Phaser.Game(config);
  let player, cursors, tokens, score = 0, scoreText;

  function preload() {
    this.load.image('ground', 'assets/tile.png');
    this.load.image('token', 'assets/token.png');
    this.load.spritesheet('stony', 'assets/stony.png', {
      frameWidth: 64, frameHeight: 64
    });
  }

  function create() {
    const platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 800; x += 64) {
      platforms.create(x + 32, 568, 'ground').refreshBody();
    }

    player = this.physics.add.sprite(100, 450, 'stony');
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('stony', { start: 0, end: 3 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({
      key: 'turn',
      frames: [{ key: 'stony', frame: 4 }],
      frameRate: 20
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('stony', { start: 5, end: 8 }),
      frameRate: 10, repeat: -1
    });

    tokens = this.physics.add.group({
      key: 'token',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });
    tokens.children.iterate(child => {
      child.setBounceY(Phaser.Math.FloatBetween(0.2, 0.5));
    });
    this.physics.add.collider(tokens, platforms);
    this.physics.add.overlap(player, tokens, collectToken, null, this);

    scoreText = this.add.text(16, 16, 'Tokens: 0', {
      fontSize: '24px', fill: '#fff'
    });
    cursors = this.input.keyboard.createCursorKeys();
  }

  function update() {
    if (cursors.left.isDown) {
      player.setVelocityX(-200);
      player.anims.play('left', true);
    } else if (cursors.right.isDown) {
      player.setVelocityX(200);
      player.anims.play('right', true);
    } else {
      player.setVelocityX(0);
      player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down) {
      player.setVelocityY(-500);
    }
  }

  function collectToken(player, token) {
    token.disableBody(true, true);
    score++;
    scoreText.setText('Tokens: ' + score);
  }
};
"""

# Estrutura de diretórios e arquivos
project_root = "projeto-stony"
files = {
    "index.html": index_html,
    os.path.join("js", "main.js"): main_js
}

# Cria pastas e arquivos
for relative_path, content in files.items():
    full_path = os.path.join(project_root, relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

# Instrução para criar a pasta de assets (vazia, só pra você colocar as imagens)
assets_path = os.path.join(project_root, "assets")
os.makedirs(assets_path, exist_ok=True)

print(f"Projeto criado em ./{project_root}/")
print("Coloque suas imagens em assets/ (stony.png, token.png, tile.png) e abra a pasta no VSCode.")
