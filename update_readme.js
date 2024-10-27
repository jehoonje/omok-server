const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// README 파일의 시작과 끝 부분 설정
const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

function updateReadme() {
  // Heroku 애플리케이션의 /board 엔드포인트 호출
  https.get('https://omok-game-app-ea4b1b706acd.herokuapp.com/board', (res) => {
    let data = '';

    if (res.statusCode !== 200) {
      console.error(`Failed to fetch board: ${res.statusCode}`);
      process.exit(1);
    }

    // 데이터 수신
    res.on('data', (chunk) => (data += chunk));

    // 데이터 수신 완료 후 처리
    res.on('end', () => {
      try {
        const boardData = JSON.parse(data).board;

        // 보드 상태를 문자열로 변환 (마크다운 테이블 형식)
        let boardTable = "|   | " + Array.from({ length: boardData[0].length }, (_, i) => String.fromCharCode(65 + i)).join(" | ") + " |\n";
        boardTable += "|---" + "|---".repeat(boardData[0].length) + "|\n";
        boardData.forEach((row, index) => {
          boardTable += `| ${index + 1} | ${row.join(" | ")} |\n`;
        });

        // README.md 파일 읽기
        let readme = fs.readFileSync('README.md', 'utf8');

        // 보드 상태로 README 업데이트
        const updatedReadme = readme.replace(new RegExp(`${START}[\\s\\S]*${END}`), `${START}\n\`\`\`markdown\n${boardTable}\`\`\`\n${END}`);
        fs.writeFileSync('README.md', updatedReadme, 'utf8');
        console.log('README.md updated successfully.');

        // GitHub에 커밋 및 푸시
        execSync('git add README.md');
        execSync(`git commit -m "Update board state"`);
        execSync(`git push https://${process.env.MY_GITHUB_TOKEN}@github.com/jehoonje/jehoonje.git main`);
      } catch (error) {
        console.error('Error updating README.md:', error);
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching board data:', err);
    process.exit(1);
  });
}

updateReadme();
