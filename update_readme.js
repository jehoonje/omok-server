const fs = require('fs');
const https = require('https');

// README 파일의 시작과 끝 부분 설정
const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

function updateReadme() {
  // Heroku 애플리케이션의 /board 엔드포인트 호출
  https.get('https://omok-game-app-ea4b1b706acd.herokuapp.com/board', (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);

    // 응답의 Content-Type 확인
    const contentType = res.headers['content-type'];
    console.log(`Content-Type: ${contentType}`);

    // 상태 코드와 Content-Type 검증
    if (res.statusCode !== 200) {
      console.error(`Failed to fetch board: ${res.statusCode}`);
      res.resume(); // 응답 데이터를 소비하여 연결을 해제
      process.exit(1);
    }

    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Invalid content-type. Expected application/json but received ${contentType}`);
      res.resume();
      process.exit(1);
    }

    // 데이터 수신
    res.on('data', (chunk) => {
      data += chunk;
    });

    // 데이터 수신 완료
    res.on('end', () => {
      try {
        const boardData = JSON.parse(data);
        const board = boardData.board;

        // 보드 상태를 문자열로 변환 (마크다운 테이블 형식)
        let boardTable = "|   | " + Array.from({ length: board[0].length }, (_, i) => String.fromCharCode(65 + i)).join(" | ") + " |\n";
        boardTable += "|---" + "|---".repeat(board[0].length) + "|\n";

        board.forEach((row, index) => {
          const rowNumber = index + 1;
          const rowContent = row.join(" | ");
          boardTable += `| ${rowNumber < 10 ? ' ' + rowNumber : rowNumber} | ${rowContent} |\n`;
        });

        // README.md 파일 읽기
        let readme = fs.readFileSync('README.md', 'utf8');

        // 보드 상태로 README 업데이트
        const updatedReadme = readme.replace(
          new RegExp(`${START}[\\s\\S]*${END}`),
          `<!-- BOARD START -->\n\`\`\`markdown\n${boardTable}\`\`\`\n<!-- BOARD END -->`
        );

        // README.md 파일 쓰기
        fs.writeFileSync('README.md', updatedReadme, 'utf8');
        console.log('README.md updated successfully.');
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
