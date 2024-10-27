// api/move.js
const https = require('https');
const { Octokit } = require("@octokit/rest");

const REPO_OWNER = 'jehoonje';
const REPO_NAME = 'omok-server'; // 서버 레포지토리 이름
const FILE_PATH = 'board.json';
const BRANCH = 'main';
const GITHUB_TOKEN = process.env.MY_GITHUB_TOKEN;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// 게임 보드 초기화
async function getBoard() {
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (error) {
    // 파일이 없을 경우 초기화
    if (error.status === 404) {
      const initialBoard = Array.from({ length: 15 }, () => Array(15).fill('⬜️'));
      await updateBoard(initialBoard);
      return initialBoard;
    }
    throw error;
  }
}

async function updateBoard(board) {
  try {
    // 현재 파일 SHA 가져오기
    const { data: currentData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const sha = currentData.sha;

    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: "Update board state",
      content: Buffer.from(JSON.stringify(board)).toString('base64'),
      sha: sha,
      branch: BRANCH,
    });
  } catch (error) {
    // 파일이 없을 경우 생성
    if (error.status === 404) {
      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
        message: "Initialize board state",
        content: Buffer.from(JSON.stringify(board)).toString('base64'),
        branch: BRANCH,
      });
    } else {
      throw error;
    }
  }
}

function checkWin(board, x, y, stone) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ];

  for (const { dx, dy } of directions) {
    let count = 1;

    for (let step = 1; step < 5; step++) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (nx < 0 || ny < 0 || nx >= 15 || ny >= 15) break;
      if (board[ny][nx] !== stone) break;
      count++;
    }

    for (let step = 1; step < 5; step++) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (nx < 0 || ny < 0 || nx >= 15 || ny >= 15) break;
      if (board[ny][nx] !== stone) break;
      count++;
    }

    if (count >= 5) return true;
  }

  return false;
}

async function triggerGithubAction() {
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'Omok-Server',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 204) {
      console.log('GitHub Actions workflow triggered successfully.');
    } else {
      console.error(`Failed to trigger GitHub Actions: ${res.statusCode}`);
    }
  });

  req.on('error', (error) => {
    console.error('Error triggering GitHub Action:', error);
  });

  req.write(JSON.stringify({ event_type: 'update_readme' }));
  req.end();
}

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { x, y } = req.body;

    if (x < 0 || y < 0 || x >= 15 || y >= 15) {
      res.status(400).json({ message: '잘못된 위치입니다.' });
      return;
    }

    try {
      const board = await getBoard();
      const currentTurn = board.currentTurn || '⚫️';

      if (board[y][x] !== '⬜️') {
        res.status(400).json({ message: '이미 돌이 놓인 자리입니다.' });
        return;
      }

      board[y][x] = currentTurn;

      if (checkWin(board, x, y, currentTurn)) {
        res.json({ message: `${currentTurn} 승리! 게임이 리셋됩니다.`, reset: true });
        // 보드 리셋
        const resetBoard = Array.from({ length: 15 }, () => Array(15).fill('⬜️'));
        resetBoard.currentTurn = '⚫️';
        await updateBoard(resetBoard);
        await triggerGithubAction();
        return;
      }

      // 턴 변경
      const nextTurn = currentTurn === '⚫️' ? '⚪️' : '⚫️';
      board.currentTurn = nextTurn;
      await updateBoard(board);

      res.json({ message: `${currentTurn} 돌을 (${x}, ${y})에 놓았습니다.`, reset: false });
      await triggerGithubAction();
    } catch (error) {
      console.error('Error processing move:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  } else if (req.method === 'GET') {
    try {
      const board = await getBoard();
      res.json({ board: board.slice(0, 15) }); // currentTurn 제외
    } catch (error) {
      console.error('Error fetching board:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};
