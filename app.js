// app.js

const express = require('express');
const fs = require('fs');
const path = require('path'); // 한 번만 선언
const { onGameMove } = require('./update_github_readme'); // 추가된 부분
const app = express();
app.use(express.json());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

const BOARD_SIZE = 15;

// 보드 초기화 함수
function initializeBoard() {
  try {
    const data = fs.readFileSync('board.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('⬜️'));
  }
}

// 게임 보드 초기화 또는 로드
let board = initializeBoard();

// 보드 저장 함수
function saveBoard() {
  fs.writeFileSync('board.json', JSON.stringify(board));
}

// 현재 턴 추적
let currentTurn = '⚫️';

// 승리 조건 검사 함수
function checkWin(x, y, stone) {
  const directions = [
    { dx: 1, dy: 0 },  // 가로
    { dx: 0, dy: 1 },  // 세로
    { dx: 1, dy: 1 },  // 대각선 \
    { dx: 1, dy: -1 }  // 대각선 /
  ];

  for (const { dx, dy } of directions) {
    let count = 1;

    // 한 방향 체크
    for (let step = 1; step < 5; step++) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] !== stone) break;
      count++;
    }

    // 반대 방향 체크
    for (let step = 1; step < 5; step++) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
      if (board[ny][nx] !== stone) break;
      count++;
    }

    if (count >= 5) return true;
  }

  return false;
}

// 돌 놓기 엔드포인트
app.post('/move', (req, res) => {
  const { x, y } = req.body;
  const stone = currentTurn;

  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
    return res.status(400).json({ message: '잘못된 위치입니다.' });
  }

  if (board[y][x] !== '⬜️') {
    return res.status(400).json({ message: '이미 돌이 놓인 자리입니다.' });
  }

  board[y][x] = stone;
  saveBoard();

  // GitHub README 업데이트
  onGameMove(board); // 추가된 부분

  if (checkWin(x, y, stone)) {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('⬜️'));
    saveBoard();
    res.json({ message: `${stone} 승리! 게임이 리셋됩니다.`, reset: true });
    currentTurn = '⚫️'; // 게임 리셋 후 초기 플레이어로 설정
    return;
  }

  // 턴 전환
  currentTurn = currentTurn === '⚫️' ? '⚪️' : '⚫️';
  res.json({ message: `${stone} 돌을 (${x}, ${y})에 놓았습니다.`, reset: false });
});

// 보드 상태 가져오기 엔드포인트
app.get('/board', (req, res) => {
  res.json({ board });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
