const TILE_LABELS = {
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬', '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬',
  '1p': '①筒', '2p': '②筒', '3p': '③筒', '4p': '④筒', '5p': '⑤筒', '6p': '⑥筒', '7p': '⑦筒', '8p': '⑧筒', '9p': '⑨筒',
  '1s': '1索', '2s': '2索', '3s': '3索', '4s': '4索', '5s': '5索', '6s': '6索', '7s': '7索', '8s': '8索', '9s': '9索',
  '1z': '東', '2z': '南', '3z': '西', '4z': '北', '5z': '白', '6z': '發', '7z': '中'
};

const PLAYERS = [
  { name: '你', wind: '南' },
  { name: '机器人 A', wind: '西' },
  { name: '机器人 B', wind: '北' },
  { name: '机器人 C', wind: '東' }
];

const state = {
  players: [],
  wall: [],
  current: 0,
  round: 1,
  gameOver: false,
  waitingHuman: false,
  lastDiscard: null,
  lastDiscardBy: null
};

const els = {
  scoreboard: document.querySelector('#scoreboard'),
  opponents: document.querySelector('#opponents'),
  river: document.querySelector('#river'),
  hand: document.querySelector('#hand'),
  log: document.querySelector('#log'),
  wallCount: document.querySelector('#wallCount'),
  statusText: document.querySelector('#statusText'),
  tsumoBtn: document.querySelector('#tsumoBtn'),
  riichiBtn: document.querySelector('#riichiBtn'),
  sortBtn: document.querySelector('#sortBtn'),
  newRoundBtn: document.querySelector('#newRoundBtn'),
  helpBtn: document.querySelector('#helpBtn'),
  helpDialog: document.querySelector('#helpDialog')
};

function createWall() {
  const tiles = [];
  for (const suit of ['m', 'p', 's']) {
    for (let n = 1; n <= 9; n += 1) {
      for (let c = 0; c < 4; c += 1) tiles.push(`${n}${suit}`);
    }
  }
  for (let n = 1; n <= 7; n += 1) {
    for (let c = 0; c < 4; c += 1) tiles.push(`${n}z`);
  }
  return shuffle(tiles);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tileIndex(tile) {
  const n = Number(tile[0]);
  const suit = tile[1];
  if (suit === 'm') return n - 1;
  if (suit === 'p') return 9 + n - 1;
  if (suit === 's') return 18 + n - 1;
  return 27 + n - 1;
}

function fromIndex(idx) {
  if (idx < 9) return `${idx + 1}m`;
  if (idx < 18) return `${idx - 8}p`;
  if (idx < 27) return `${idx - 17}s`;
  return `${idx - 26}z`;
}

function sortTiles(tiles) {
  return tiles.sort((a, b) => tileIndex(a) - tileIndex(b));
}

function initGame() {
  state.players = PLAYERS.map((player, index) => ({
    ...player,
    score: 25000,
    hand: [],
    discards: [],
    riichi: false,
    dealer: index === 3
  }));
  state.round = 1;
  startRound('东风战开始。');
}

function startRound(message = '新一局开始。') {
  state.wall = createWall();
  state.current = 3;
  state.gameOver = false;
  state.waitingHuman = false;
  state.lastDiscard = null;
  state.lastDiscardBy = null;
  state.players.forEach((player) => {
    player.hand = [];
    player.discards = [];
    player.riichi = false;
    for (let i = 0; i < 13; i += 1) player.hand.push(state.wall.pop());
    sortTiles(player.hand);
  });
  clearLog();
  addLog(`<strong>${message}</strong> 第 ${state.round} 局，机器人 C 为庄家。`);
  render();
  setTimeout(playTurn, 350);
}

function playTurn() {
  if (state.gameOver) return;
  if (state.wall.length === 0) return exhaustiveDraw();

  const player = state.players[state.current];
  const drawn = state.wall.pop();
  player.hand.push(drawn);
  sortTiles(player.hand);

  if (state.current === 0) {
    state.waitingHuman = true;
    addLog(`<strong>你摸牌</strong>，请选择一张牌切出。`);
    render();
    return;
  }

  if (canWin(player.hand)) {
    finishRound(state.current, '自摸', drawn);
    return;
  }

  const discard = chooseBotDiscard(player.hand);
  discardTile(state.current, discard);
  if (!state.gameOver) setTimeout(nextTurn, 500);
}

function discardTile(playerIndex, tile) {
  const player = state.players[playerIndex];
  const idx = player.hand.indexOf(tile);
  if (idx < 0) return;

  const [discarded] = player.hand.splice(idx, 1);
  player.discards.push(discarded);
  state.lastDiscard = discarded;
  state.lastDiscardBy = playerIndex;
  addLog(`${player.name} 切出 ${tileText(discarded)}。`);

  for (let i = 0; i < state.players.length; i += 1) {
    if (i === playerIndex) continue;
    const test = [...state.players[i].hand, discarded];
    if (canWin(test)) {
      finishRound(i, '荣和', discarded, playerIndex);
      return;
    }
  }

  render();
}

function nextTurn() {
  state.current = (state.current + 1) % state.players.length;
  playTurn();
}

function humanDiscard(tile) {
  if (!state.waitingHuman || state.current !== 0 || state.gameOver) return;
  state.waitingHuman = false;
  discardTile(0, tile);
  if (!state.gameOver) {
    state.current = 1;
    render();
    setTimeout(playTurn, 500);
  }
}

function chooseBotDiscard(hand) {
  const scored = hand.map((tile) => ({ tile, score: keepValue(tile, hand) }));
  scored.sort((a, b) => a.score - b.score || tileIndex(b.tile) - tileIndex(a.tile));
  return scored[0].tile;
}

function keepValue(tile, hand) {
  const counts = toCounts(hand);
  const idx = tileIndex(tile);
  const suit = tile[1];
  const number = Number(tile[0]);
  let value = 0;

  if (counts[idx] >= 2) value += 18;
  if (counts[idx] >= 3) value += 12;
  if (suit !== 'z') {
    if (number > 1 && counts[idx - 1] > 0) value += 8;
    if (number < 9 && counts[idx + 1] > 0) value += 8;
    if (number > 2 && counts[idx - 2] > 0) value += 4;
    if (number < 8 && counts[idx + 2] > 0) value += 4;
  }
  if (suit === 'z') value -= 3;
  if (number === 1 || number === 9) value -= 1;
  return value + Math.random() * 2;
}

function toCounts(tiles) {
  const counts = Array(34).fill(0);
  tiles.forEach((tile) => { counts[tileIndex(tile)] += 1; });
  return counts;
}

function canWin(tiles) {
  if (tiles.length % 3 !== 2) return false;
  const counts = toCounts(tiles);
  return isSevenPairs(counts) || isStandardHand(counts);
}

function isSevenPairs(counts) {
  let pairs = 0;
  for (const count of counts) {
    if (count === 2) pairs += 1;
    else if (count !== 0) return false;
  }
  return pairs === 7;
}

function isStandardHand(counts) {
  for (let i = 0; i < counts.length; i += 1) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      if (canMakeSets(counts)) {
        counts[i] += 2;
        return true;
      }
      counts[i] += 2;
    }
  }
  return false;
}

function canMakeSets(counts) {
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) return true;

  if (counts[first] >= 3) {
    counts[first] -= 3;
    if (canMakeSets(counts)) {
      counts[first] += 3;
      return true;
    }
    counts[first] += 3;
  }

  const tile = fromIndex(first);
  const suit = tile[1];
  const number = Number(tile[0]);
  if (suit !== 'z' && number <= 7) {
    const second = first + 1;
    const third = first + 2;
    if (counts[second] > 0 && counts[third] > 0 && fromIndex(second)[1] === suit && fromIndex(third)[1] === suit) {
      counts[first] -= 1;
      counts[second] -= 1;
      counts[third] -= 1;
      if (canMakeSets(counts)) {
        counts[first] += 1;
        counts[second] += 1;
        counts[third] += 1;
        return true;
      }
      counts[first] += 1;
      counts[second] += 1;
      counts[third] += 1;
    }
  }
  return false;
}

function isTenpai(hand) {
  const uniqueTiles = Object.keys(TILE_LABELS);
  return uniqueTiles.some((tile) => canWin([...hand, tile]));
}

function finishRound(winnerIndex, method, tile, loserIndex = null) {
  state.gameOver = true;
  const winner = state.players[winnerIndex];
  const base = method === '自摸' ? 2000 : 3000;
  const bonus = winner.riichi ? 1200 : 0;
  const dealerBonus = winner.dealer ? 800 : 0;
  const gain = base + bonus + dealerBonus;

  if (method === '荣和' && loserIndex !== null) {
    state.players[loserIndex].score -= gain;
    winner.score += gain;
    addLog(`<span class="win"><strong>${winner.name}</strong> 荣和 ${tileText(tile)}，+${gain} 点。</span>`);
  } else {
    const payment = Math.ceil(gain / 3);
    state.players.forEach((player, index) => {
      if (index !== winnerIndex) player.score -= payment;
    });
    winner.score += payment * 3;
    addLog(`<span class="win"><strong>${winner.name}</strong> 自摸 ${tileText(tile)}，+${payment * 3} 点。</span>`);
  }

  state.round += 1;
  render();
  setTimeout(() => {
    if (state.round > 4) endGame();
    else addLog('<span class="warn">点击“重新开局”可以立即重开；系统不会自动覆盖当前结果。</span>');
  }, 250);
}

function exhaustiveDraw() {
  state.gameOver = true;
  addLog('<span class="warn"><strong>流局。</strong> 牌山已摸完。</span>');
  render();
}

function endGame() {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  addLog(`<span class="win"><strong>东风战结束。</strong> 第一名：${ranked[0].name}（${ranked[0].score} 点）。</span>`);
}

function declareRiichi() {
  const human = state.players[0];
  if (!state.waitingHuman || human.riichi) return;
  if (!isTenpai(human.hand)) {
    addLog('<span class="danger">当前还没有听牌，不能立直。</span>');
    return;
  }
  human.riichi = true;
  addLog('<span class="warn"><strong>你宣布立直！</strong> 胡牌时获得额外加分。</span>');
  render();
}

function declareTsumo() {
  const human = state.players[0];
  if (!state.waitingHuman) return;
  if (!canWin(human.hand)) {
    addLog('<span class="danger">当前手牌还不能自摸。</span>');
    return;
  }
  finishRound(0, '自摸', human.hand[human.hand.length - 1]);
}

function tileText(tile) {
  return `<span class="tile small ${tileClass(tile)}">${TILE_LABELS[tile]}</span>`;
}

function tileClass(tile) {
  if (tile.endsWith('m')) return 'man';
  if (tile.endsWith('p')) return 'pin';
  if (tile.endsWith('s')) return 'sou';
  return 'honor';
}

function render() {
  els.wallCount.textContent = state.wall.length;
  renderScoreboard();
  renderOpponents();
  renderRiver();
  renderHand();
  renderControls();
}

function renderScoreboard() {
  els.scoreboard.innerHTML = state.players.map((player, index) => `
    <article class="score ${index === state.current && !state.gameOver ? 'active' : ''}">
      <span class="name">${player.wind}家 · ${player.name}</span>
      <span class="points">${player.score.toLocaleString()}</span>
      ${player.riichi ? '<span class="badge">立直</span>' : ''}
      ${player.dealer ? '<span class="badge">庄家</span>' : ''}
    </article>
  `).join('');
}

function renderOpponents() {
  els.opponents.innerHTML = state.players.slice(1).map((player) => `
    <article class="opponent">
      <div class="opponent-title"><strong>${player.name}</strong><span>${player.hand.length} 张手牌</span></div>
      <div class="back-tiles">${Array.from({ length: player.hand.length }, () => '<span class="back-tile"></span>').join('')}</div>
    </article>
  `).join('');
}

function renderRiver() {
  const allDiscards = state.players.flatMap((player) => player.discards.map((tile) => ({ tile, player })));
  els.river.innerHTML = allDiscards.map(({ tile, player }) => `
    <span title="${player.name} 切出" class="tile small from-bot ${tileClass(tile)}">${TILE_LABELS[tile]}</span>
  `).join('');
}

function renderHand() {
  const human = state.players[0];
  els.hand.innerHTML = human.hand.map((tile, index) => `
    <button class="tile clickable ${tileClass(tile)} ${index === human.hand.length - 1 && state.waitingHuman ? 'drawn' : ''}" data-tile="${tile}" aria-label="切出 ${TILE_LABELS[tile]}">${TILE_LABELS[tile]}</button>
  `).join('');
  els.hand.querySelectorAll('[data-tile]').forEach((button) => {
    button.addEventListener('click', () => humanDiscard(button.dataset.tile));
  });
}

function renderControls() {
  const human = state.players[0];
  const humanTurn = state.waitingHuman && state.current === 0 && !state.gameOver;
  els.statusText.textContent = state.gameOver
    ? '本局结束。可以点击重新开局。'
    : humanTurn
      ? '轮到你。点击手牌切牌，或在可胡时点击自摸。'
      : `当前轮到 ${state.players[state.current].name}。`;
  els.tsumoBtn.disabled = !humanTurn || !canWin(human.hand);
  els.riichiBtn.disabled = !humanTurn || human.riichi || !isTenpai(human.hand);
}

function addLog(html) {
  const item = document.createElement('li');
  item.innerHTML = html;
  els.log.prepend(item);
}

function clearLog() {
  els.log.innerHTML = '';
}

els.tsumoBtn.addEventListener('click', declareTsumo);
els.riichiBtn.addEventListener('click', declareRiichi);
els.sortBtn.addEventListener('click', () => {
  sortTiles(state.players[0].hand);
  render();
});
els.newRoundBtn.addEventListener('click', initGame);
els.helpBtn.addEventListener('click', () => els.helpDialog.showModal());

initGame();
