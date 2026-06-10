const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

const gravity = 0.5

const fases = [
  {
    numero: 1,
    nome: 'Fase 1 - Portão do Dojo',
    historia: 'Sobreviva ao duelo da fase 1.',
    background: './img/background1.png',
    enemySpeed: 4.0,
    attackDistance: 112,
    safeDistance: 48,
    attackCooldown: 820,
    reactionDelay: 10,
    jumpChance: 0.005,
    retreatLife: 34,
    dodgeChance: 0.55,
    dodgeDistance: 175,
    dodgeDuration: 430,
    counterChance: 0.72,
    pressureChance: 0.62
  },
  {
    numero: 2,
    nome: 'Fase 2 - Ponte da Tempestade',
    historia: 'Sobreviva ao duelo da fase 2.',
    background: './img/background2.png',
    enemySpeed: 4.4,
    attackDistance: 118,
    safeDistance: 50,
    attackCooldown: 740,
    reactionDelay: 9,
    jumpChance: 0.006,
    retreatLife: 36,
    dodgeChance: 0.64,
    dodgeDistance: 185,
    dodgeDuration: 460,
    counterChance: 0.80,
    pressureChance: 0.70
  },
  {
    numero: 3,
    nome: 'Fase 3 - Floresta do Amanhecer',
    historia: 'Sobreviva ao duelo da fase 3.',
    background: './img/background3.png',
    enemySpeed: 4.8,
    attackDistance: 124,
    safeDistance: 52,
    attackCooldown: 660,
    reactionDelay: 8,
    jumpChance: 0.007,
    retreatLife: 38,
    dodgeChance: 0.72,
    dodgeDistance: 195,
    dodgeDuration: 490,
    counterChance: 0.86,
    pressureChance: 0.78
  },
  {
    numero: 4,
    nome: 'Fase 4 - Templo das Sombras',
    historia: 'Sobreviva ao duelo da fase 4.',
    background: './img/background4.png',
    enemySpeed: 5.3,
    attackDistance: 132,
    safeDistance: 54,
    attackCooldown: 580,
    reactionDelay: 7,
    jumpChance: 0.008,
    retreatLife: 40,
    dodgeChance: 0.80,
    dodgeDistance: 210,
    dodgeDuration: 520,
    counterChance: 0.92,
    pressureChance: 0.86
  }
]

let faseAtual = 0
let enemyNextAttack = 0
let enemyBrainTick = 0
let enemyDecision = 'idle'
let enemyRetreatUntil = 0
let storyStarted = false
let deathSongPlayed = false
let enemyNextDodge = 0
let playerAttackRecoveryUntil = 0
let playerLastAttackTime = 0

const background = new Sprite({
  position: { x: 0, y: 0 },
  imageSrc: fases[faseAtual].background
})

const shop = new Sprite({
  position: { x: 600, y: 128 },
  imageSrc: './img/shop.png',
  scale: 2.75,
  framesMax: 6
})

let player
let enemy

const SAMURAIS_PLAYER = [
  { name: 'Mack Vermelho', dir: 'samuraiMack', take: 'Take Hit - white silhouette.png' },
  { name: 'Mack Azul', dir: 'samurai_azul', take: 'Take Hit - white silhouette.png' },
  { name: 'Mack Verde', dir: 'samurai_verde', take: 'Take Hit - white silhouette.png' },
  { name: 'Mack Roxo', dir: 'samurai_roxo', take: 'Take Hit - white silhouette.png' }
]

const SAMURAIS_ENEMY = [
  { name: 'Kenji Original', dir: 'kenji', take: 'Take hit.png' },
  { name: 'Kenji Dourado', dir: 'kenji_dourado', take: 'Take hit.png' },
  { name: 'Kenji Sombra', dir: 'kenji_sombra', take: 'Take hit.png' },
  { name: 'Kenji Carmesim', dir: 'kenji_carmesim', take: 'Take hit.png' }
]

function pickSamurai(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function updateFighterNames(playerName, enemyName) {
  const names = document.querySelectorAll('.name')
  if (names[0]) names[0].innerHTML = `P1 - ${playerName}`
  if (names[1]) names[1].innerHTML = `F${fases[faseAtual].numero} - ${enemyName}`
}

function updateStoryText() {
  const faseName = document.querySelector('#faseName')
  const storyText = document.querySelector('#storyText')
  if (faseName) faseName.innerHTML = fases[faseAtual].nome
  if (storyText) storyText.innerHTML = fases[faseAtual].historia
}

function startBackgroundMusic() {
  const bg = document.querySelector('#bgMusic')
  const death = document.querySelector('#deathMusic')
  if (!bg) return
  if (death) {
    death.pause()
    death.currentTime = 0
  }
  bg.volume = 0.35
  bg.play().catch(() => {})
}

function playDeathMusic() {
  if (deathSongPlayed) return
  deathSongPlayed = true

  const bg = document.querySelector('#bgMusic')
  const death = document.querySelector('#deathMusic')

  if (bg) bg.pause()
  if (death) {
    death.volume = 0.75
    death.currentTime = 0
    death.play().catch(() => {})
  }
}

function setBackgroundForCurrentPhase() {
  background.image.src = fases[faseAtual].background
  updateStoryText()
}

function distanciaEntreLutadores() {
  return Math.abs((player.position.x + player.width / 2) - (enemy.position.x + enemy.width / 2))
}

function playerAttackIsDangerous(distance) {
  if (!player || !enemy) return false
  if (!player.isAttacking) return false

  const playerFacingRight = player.lastKey !== 'a'
  const enemyIsInFront =
    (playerFacingRight && enemy.position.x > player.position.x) ||
    (!playerFacingRight && enemy.position.x < player.position.x)

  return enemyIsInFront && distance < fases[faseAtual].dodgeDistance
}


function playerIsOpenForCounter(distance, now) {
  if (!player || !enemy || gameOver) return false

  const playerAttackFinished = playerAttackRecoveryUntil > now
  const playerLanding = !player.onGround && player.velocity.y > 1 && distance < 150
  const playerBackTurned =
    (player.lastKey === 'a' && enemy.position.x > player.position.x) ||
    (player.lastKey === 'd' && enemy.position.x < player.position.x)

  return distance < fases[faseAtual].attackDistance + 24 &&
    (playerAttackFinished || playerLanding || playerBackTurned)
}

function enemyLooksAtPlayer() {
  if (!enemy || !player) return

  if (enemy.position.x > player.position.x) {
    enemy.lastKey = 'ArrowLeft'
    enemy.attackBox.offset.x = -170
  } else {
    enemy.lastKey = 'ArrowRight'
    enemy.attackBox.offset.x = 85
  }
}

function handleStoryResult(winner) {
  const title = document.querySelector('#resultTitle')
  const sub = document.querySelector('#resultSub')
  const btn = document.querySelector('#restartBtn')

  if (winner === 'player') {
    if (faseAtual < fases.length - 1) {
      title.innerHTML = `FASE ${fases[faseAtual].numero} CONCLUÍDA!`
      sub.innerHTML = 'Você venceu este duelo. Clique para ir para a próxima fase.'
      btn.innerHTML = 'PRÓXIMA FASE'
    } else {
      title.innerHTML = 'MODO HISTÓRIA CONCLUÍDO!'
      sub.innerHTML = 'Você derrotou todos os inimigos e finalizou as 3 fases.'
      btn.innerHTML = 'JOGAR NOVAMENTE'
    }
  } else if (winner === 'enemy') {
    title.innerHTML = 'VOCÊ PERDEU!'
    sub.innerHTML = 'O inimigo venceu. Clique para tentar novamente esta fase.'
    btn.innerHTML = 'TENTAR NOVAMENTE'
  } else {
    title.innerHTML = 'EMPATE!'
    sub.innerHTML = 'Ninguém venceu. Clique para repetir esta fase.'
    btn.innerHTML = 'REPETIR FASE'
  }
}


const keys = {
  a: { pressed: false },
  d: { pressed: false },
  ArrowRight: { pressed: false },
  ArrowLeft: { pressed: false }
}

function createPlayer() {
  const samurai = pickSamurai(SAMURAIS_PLAYER)
  const base = `./img/${samurai.dir}`
  return new Fighter({
    name: samurai.name,
    position: { x: 120, y: 0 },
    velocity: { x: 0, y: 0 },
    imageSrc: `${base}/Idle.png`,
    framesMax: 8,
    scale: 2.5,
    offset: { x: 215, y: 157 },
    sprites: {
      idle: { imageSrc: `${base}/Idle.png`, framesMax: 8 },
      run: { imageSrc: `${base}/Run.png`, framesMax: 8 },
      jump: { imageSrc: `${base}/Jump.png`, framesMax: 2 },
      fall: { imageSrc: `${base}/Fall.png`, framesMax: 2 },
      attack1: { imageSrc: `${base}/Attack1.png`, framesMax: 6 },
      takeHit: { imageSrc: `${base}/${samurai.take}`, framesMax: 4 },
      death: { imageSrc: `${base}/Death.png`, framesMax: 6 }
    },
    attackBox: {
      offset: { x: 85, y: 45 },
      width: 165,
      height: 55
    }
  })
}

function createEnemy() {
  const samurai = pickSamurai(SAMURAIS_ENEMY)
  const base = `./img/${samurai.dir}`
  return new Fighter({
    name: samurai.name,
    position: { x: 820, y: 100 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    imageSrc: `${base}/Idle.png`,
    framesMax: 4,
    scale: 2.5,
    offset: { x: 215, y: 167 },
    sprites: {
      idle: { imageSrc: `${base}/Idle.png`, framesMax: 4 },
      run: { imageSrc: `${base}/Run.png`, framesMax: 8 },
      jump: { imageSrc: `${base}/Jump.png`, framesMax: 2 },
      fall: { imageSrc: `${base}/Fall.png`, framesMax: 2 },
      attack1: { imageSrc: `${base}/Attack1.png`, framesMax: 4 },
      takeHit: { imageSrc: `${base}/${samurai.take}`, framesMax: 3 },
      death: { imageSrc: `${base}/Death.png`, framesMax: 7 }
    },
    attackBox: {
      offset: { x: -170, y: 45 },
      width: 170,
      height: 55
    }
  })
}

function resetFight() {
  clearTimeout(timerId)
  timer = 60
  gameOver = false
  enemyNextAttack = 0
  enemyBrainTick = 0
  enemyDecision = 'idle'
  enemyRetreatUntil = 0
  enemyNextDodge = 0
  playerAttackRecoveryUntil = 0
  playerLastAttackTime = 0
  deathSongPlayed = false
  setBackgroundForCurrentPhase()
  player = createPlayer()
  enemy = createEnemy()
  player.position.x = 120
  enemy.position.x = 820
  enemyLooksAtPlayer()
  updateFighterNames(player.name, enemy.name)
  keys.a.pressed = false
  keys.d.pressed = false
  resetHud()
  decreaseTimer()
}

function drawArenaEffects() {
  c.save()
  c.fillStyle = 'rgba(255, 255, 255, 0.10)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  const gradient = c.createLinearGradient(0, 330, 0, canvas.height)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)')
  c.fillStyle = gradient
  c.fillRect(0, 330, canvas.width, canvas.height)

  c.fillStyle = 'rgba(255, 255, 255, 0.08)'
  for (let i = 0; i < 18; i++) {
    c.fillRect((i * 80 + timer * 2) % canvas.width, 90 + (i % 5) * 46, 3, 3)
  }
  c.restore()
}

function updatePlayerMovement() {
  player.velocity.x = 0

  if (gameOver || player.dead) {
    player.switchSprite('idle')
    return
  }

  if (keys.a.pressed && player.lastKey === 'a') {
    player.velocity.x = -6
    player.switchSprite('run')
  } else if (keys.d.pressed && player.lastKey === 'd') {
    player.velocity.x = 6
    player.switchSprite('run')
  } else {
    player.switchSprite('idle')
  }

  if (player.velocity.y < 0) player.switchSprite('jump')
  else if (player.velocity.y > 0) player.switchSprite('fall')
}

function updateEnemyMovement() {
  enemy.velocity.x = 0

  if (gameOver || enemy.dead || player.dead) {
    enemy.switchSprite('idle')
    return
  }

  const fase = fases[faseAtual]
  const now = performance.now()
  const distance = distanciaEntreLutadores()
  const enemyCenter = enemy.position.x + enemy.width / 2
  const playerCenter = player.position.x + player.width / 2
  const directionToPlayer = enemyCenter > playerCenter ? -1 : 1

  enemyLooksAtPlayer()

  // ESQUIVA INTELIGENTE:
  // Se o jogador atacou e o inimigo está na frente do golpe, ele tenta ir para trás.
  if (
    playerAttackIsDangerous(distance) &&
    now > enemyNextDodge &&
    !enemy.isAttacking &&
    Math.random() < fase.dodgeChance
  ) {
    enemyDecision = 'retreat'
    enemyRetreatUntil = now + fase.dodgeDuration
    enemyNextDodge = now + 850
  }

  // A IA não decide a cada frame para parecer mais natural
  enemyBrainTick++
  if (enemyBrainTick >= fase.reactionDelay && !(enemyDecision === 'retreat' && now < enemyRetreatUntil)) {
    enemyBrainTick = 0

    const playerOpen = playerIsOpenForCounter(distance, now)

    if (playerOpen && Math.random() < fase.counterChance) {
      // Contra-ataca quando o jogador erra golpe, cai de um pulo ou vira de costas.
      enemyDecision = 'attack'
      enemyNextAttack = Math.min(enemyNextAttack, now + 80)
    } else if (enemy.health <= fase.retreatLife && distance < 130 && Math.random() < 0.34) {
      enemyDecision = 'retreat'
      enemyRetreatUntil = now + 360
    } else if (distance < fase.safeDistance && !playerOpen) {
      enemyDecision = 'retreat'
      enemyRetreatUntil = now + 220
    } else if (distance > fase.attackDistance) {
      enemyDecision = 'chase'
    } else {
      // Mais agressivo: pressiona e ataca quando encontra abertura.
      enemyDecision = Math.random() < fase.pressureChance ? 'attack' : 'chase'
    }
  }

  if (enemyDecision === 'retreat' && now < enemyRetreatUntil) {
    enemy.velocity.x = -directionToPlayer * fase.enemySpeed * 1.35
    enemy.switchSprite('run')
  } else if (enemyDecision === 'chase') {
    enemy.velocity.x = directionToPlayer * fase.enemySpeed
    enemy.switchSprite('run')
  } else if (enemyDecision === 'attack') {
    // Pequeno avanço antes do golpe para punir melhor as aberturas do jogador.
    if (distance > fase.safeDistance + 8 && distance < fase.attackDistance + 42 && !enemy.isAttacking) {
      enemy.velocity.x = directionToPlayer * fase.enemySpeed * 0.55
      enemy.switchSprite('run')
    } else {
      enemy.switchSprite('idle')
    }

    if (!enemy.isAttacking && now > enemyNextAttack) {
      enemyLooksAtPlayer()
      enemy.attack()
      enemyNextAttack = now + fase.attackCooldown + Math.random() * 150
    }
  } else {
    enemy.switchSprite('idle')
  }

  // Na esquiva, ele pode dar um pulo curto para dificultar acertar
  if (
    enemy.onGround &&
    enemyDecision === 'retreat' &&
    now < enemyRetreatUntil &&
    distance < fase.dodgeDistance &&
    Math.random() < fase.jumpChance * 2
  ) {
    enemy.velocity.y = -10
  }

  if (enemy.onGround && distance < 180 && Math.random() < fase.jumpChance) {
    enemy.velocity.y = -12
  }

  if (enemy.position.x <= 18 && enemy.velocity.x < 0) enemy.velocity.x = fase.enemySpeed
  if (enemy.position.x >= canvas.width - enemy.width - 18 && enemy.velocity.x > 0) enemy.velocity.x = -fase.enemySpeed

  if (enemy.velocity.y < 0) enemy.switchSprite('jump')
  else if (enemy.velocity.y > 0) enemy.switchSprite('fall')
}

function checkAttacks() {
  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.isAttacking &&
    player.framesCurrent === 4
  ) {
    enemy.takeHit()
    player.isAttacking = false
    setBar('#enemyHealth', enemy.health)
  }

  if (player.isAttacking && player.framesCurrent === 4) {
    player.isAttacking = false
    playerAttackRecoveryUntil = performance.now() + 330
  }

  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking &&
    enemy.framesCurrent === 2
  ) {
    player.takeHit()
    enemy.isAttacking = false
    setBar('#playerHealth', player.health)
  }

  if (enemy.isAttacking && enemy.framesCurrent === 2) enemy.isAttacking = false

  if (enemy.health <= 0 || player.health <= 0) {
    determineWinner({ player, enemy, timerId })
  }
}

function animate() {
  window.requestAnimationFrame(animate)

  if (!storyStarted) {
    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    return
  }

  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)

  background.update()
  shop.update()
  drawArenaEffects()

  player.update()
  enemy.update()

  updatePlayerMovement()
  updateEnemyMovement()
  checkAttacks()
}

window.addEventListener('keydown', (event) => {
  if (!storyStarted) return

  if (event.key.toLowerCase() === 'r') {
    if (gameOver && player && enemy && player.health > enemy.health) {
      if (faseAtual < fases.length - 1) faseAtual++
      else faseAtual = 0
    }
    resetFight()
    return
  }

  if (!player.dead && !gameOver) {
    switch (event.key) {
      case 'd':
        keys.d.pressed = true
        player.lastKey = 'd'
        break
      case 'a':
        keys.a.pressed = true
        player.lastKey = 'a'
        break
      case 'w':
        if (player.onGround) player.velocity.y = -14
        break
      case ' ':
        playerLastAttackTime = performance.now()
        player.attack()
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break

  }
})

document.querySelector('#restartBtn').addEventListener('click', () => {
  if (gameOver && player && enemy && player.health > enemy.health) {
    if (faseAtual < fases.length - 1) faseAtual++
    else faseAtual = 0
  }
  resetFight()
  startBackgroundMusic()
})

const startStoryBtn = document.querySelector('#startStoryBtn')
if (startStoryBtn) {
  startStoryBtn.addEventListener('click', () => {
    storyStarted = true
    const menu = document.querySelector('#startMenu')
    if (menu) menu.style.display = 'none'
    resetFight()
    startBackgroundMusic()
  })
}

resetFight()
animate()
