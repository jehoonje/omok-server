// update_github_readme.js
const https = require('https');

// GitHub 레포지토리 정보
const REPO_OWNER = 'jehoonje';
const REPO_NAME = 'jehoonje'; // 프로필 레포지토리 이름
const FILE_PATH = 'README.md';
const BRANCH = 'main'; // 기본 브랜치 이름

// GitHub Personal Access Token (환경 변수에서 가져오기)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
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
function updateReadmeOnGitHub(boardMarkdown, callback) {
  // 먼저 현재 README.md의 내용을 가져와야 합니다 (SHA 필요)
  const getOptions = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js',
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3.raw'
    }
  };

  const getReq = https.request(getOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const fileData = JSON.parse(data);
        const sha = fileData.sha;
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');

        // 새로운 README.md 내용 생성
        const newContent = content.replace(
          /<!-- BOARD START -->[\s\S]*<!-- BOARD END -->/,
          `<!-- BOARD START -->\n\`\`\`markdown\n${boardMarkdown}\n\`\`\`\n<!-- BOARD END -->`
        );

        // 업데이트할 데이터 준비
        const updateData = JSON.stringify({
          message: "Update board state in README",
          content: Buffer.from(newContent).toString('base64'),
          sha: sha,
          branch: BRANCH
        });

        // README.md 업데이트 요청 옵션
        const updateOptions = {
          hostname: 'api.github.com',
          path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
          method: 'PUT',
          headers: {
            'User-Agent': 'Node.js',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateData)
          }
        };

        const updateReq = https.request(updateOptions, (updateRes) => {
          let updateResponse = '';
          updateRes.on('data', chunk => updateResponse += chunk);
          updateRes.on('end', () => {
            if (updateRes.statusCode === 200 || updateRes.statusCode === 201) {
              console.log('README.md updated successfully on GitHub.');
              callback(null);
            } else {
              console.error(`Failed to update README.md: ${updateRes.statusCode}`);
              callback(new Error(`GitHub API responded with status code ${updateRes.statusCode}`));
            }
          });
        });

        updateReq.on('error', (e) => {
          console.error(`Problem with update request: ${e.message}`);
          callback(e);
        });

        updateReq.write(updateData);
        updateReq.end();

      } else {
        console.error(`Failed to fetch README.md: ${res.statusCode}`);
        callback(new Error(`GitHub API responded with status code ${res.statusCode}`));
      }
    });
  });

  getReq.on('error', (e) => {
    console.error(`Problem with GET request: ${e.message}`);
    callback(e);
  });

  getReq.end();
}

// 게임의 턴이 변경될 때마다 호출되는 함수 예시
function onGameMove(board) {
  const boardMarkdown = generateMarkdownTable(board);
  updateReadmeOnGitHub(boardMarkdown, (err) => {
    if (err) {
      console.error('Error updating README.md:', err);
    }
  });
}

module.exports = { onGameMove };
