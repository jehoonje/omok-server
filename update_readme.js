const fs = require('fs');
const https = require('https');
const { Octokit } = require("@octokit/rest");

// GitHub 레포지토리 정보
const REPO_OWNER = 'jehoonje';  // 자신의 GitHub 사용자명
const REPO_NAME = 'jehoonje';   // 자신의 리포지토리 이름
const FILE_PATH = 'README.md';
const BRANCH = 'main';           // 기본 브랜치 이름

// GitHub Personal Access Token (환경 변수에서 가져오기)
const GITHUB_TOKEN = process.env.MY_GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Error: MY_GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// README 파일의 시작과 끝 부분 설정
const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

// 보드 상태를 가져오는 함수
async function fetchBoard() {
  return new Promise((resolve, reject) => {
    https.get('https://omok-game-app-ea4b1b706acd.herokuapp.com/board', (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch board: ${res.statusCode}`));
        res.resume();
        return;
      }

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const boardData = JSON.parse(data).board;
          resolve(boardData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 보드 데이터를 마크다운 테이블로 변환하는 함수
function generateMarkdownTable(board) {
  // 열 머리글 (A-O)
  const headers = ['   ', ...Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i))];
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;

  // 각 행 생성
  const rows = board.map((row, index) => {
    const rowNumber = index + 1;
    const formattedRowNumber = rowNumber < 10 ? ` ${rowNumber}` : `${rowNumber}`;
    const rowContent = row.map(cell => {
      if (cell === '⚪️') return '◯'; // 흰돌
      if (cell === '⚫️') return '●'; // 검은돌
      return '⬜️'; // 빈 칸
    }).join(' | ');
    return `| ${formattedRowNumber} | ${rowContent} |`;
  });

  // 전체 테이블
  return [headerRow, separatorRow, ...rows].join('\n');
}

// GitHub API를 사용하여 README.md 업데이트
async function updateReadme() {
  try {
    // 보드 상태 가져오기
    const board = await fetchBoard();
    const boardMarkdown = generateMarkdownTable(board);

    // README.md 파일 가져오기
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const sha = fileData.sha;
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');

    // 새로운 README.md 내용 생성
    const newContent = content.replace(
      new RegExp(`${START}[\\s\\S]*${END}`),
      `<!-- BOARD START -->\n\`\`\`markdown\n${boardMarkdown}\n\`\`\`\n<!-- BOARD END -->`
    );

    // 업데이트할 데이터 준비
    const encodedContent = Buffer.from(newContent, 'utf8').toString('base64');

    // README.md 업데이트 요청
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: "Update board state in README",
      content: encodedContent,
      sha: sha,
      branch: BRANCH,
    });

    console.log('README.md updated successfully on GitHub.');
  } catch (error) {
    console.error('Error updating README.md:', error);
    process.exit(1);
  }
}

updateReadme();
