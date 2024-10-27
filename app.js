const express = require('express');
const bodyParser = require('body-parser');
const { onGameMove } = require('./update_github_readme');

const app = express();
app.use(bodyParser.json());

let board = initializeBoard(); // 보드 초기화 함수

// 예시: 돌을 놓는 엔드포인트
app.post('/move', (req, res) => {
  const { x, y, stone } = req.body;

  if (isValidMove(x, y, board)) {
    board[y][x] = stone;
    const gameOver = checkWin(x, y, stone, board);

    // GitHub README 업데이트
    onGameMove(board);

    if (gameOver) {
      resetBoard();
      return res.json({ message: `${stone} 승리! 게임이 리셋됩니다.` });
    } else {
      return res.json({ message: `${stone} 돌을 (${x}, ${y})에 놓았습니다.` });
    }
  } else {
    return res.status(400).json({ message: '잘못된 위치입니다.' });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
