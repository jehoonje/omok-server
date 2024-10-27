const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const BOARD_SIZE = 15;

// 게임 보드 초기화 또는 로드
let board;
try {
  board = JSON.parse(fs.readFileSync('board.json', 'utf8'));
} catch (e) {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('⬜️'));
}

// 보드 저장 함수
function saveBoard() {
  fs.writeFileSync('board.json', JSON.stringify(board));
}

// 현재 플레이어 계산
function getCurrentPlayer() {
  const flatBoard = board.flat();
  const blackCount = flatBoard.filter(cell => cell === '⚫️').length;
  const whiteCount = flatBoard.filter(cell => cell === '⚪️').length;
  return blackCount <= whiteCount ? '⚫️' : '⚪️';
}

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
  const stone = getCurrentPlayer();

  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
    return res.status(400).json({ message: '잘못된 위치입니다.' });
  }

  if (board[y][x] !== '⬜️') {
    return res.status(400).json({ message: '이미 돌이 놓인 자리입니다.' });
  }

  board[y][x] = stone;
  saveBoard();

  if (checkWin(x, y, stone)) {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('⬜️'));
    saveBoard();
    return res.json({ message: `${stone} 승리! 게임이 리셋됩니다.` });
  }

  res.json({ message: `${stone} 돌을 (${x}, ${y})에 놓았습니다.` });
});

// 보드 상태 가져오기 엔드포인트
app.get('/board', (req, res) => {
  res.json({ board });
});

// Root route to respond to GET requests at '/'
app.get('/', (req, res) => {
  res.send('Welcome to the Omok Game!');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
