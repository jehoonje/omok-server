const fs = require('fs');

// README 파일의 시작과 끝 부분 설정
const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

function updateReadme() {
  let board;
  try {
    board = JSON.parse(fs.readFileSync('board.json', 'utf8'));
  } catch (error) {
    console.error('Error reading board.json:', error);
    process.exit(1);
  }

  // 보드 상태를 문자열로 변환
  const BOARD_SIZE = 15;
  let boardTable = "|   | " + Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i)).join(" | ") + " |\n";
  boardTable += "|---" + "|---".repeat(BOARD_SIZE) + "|\n";

  board.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowContent = row.join(" | ");
    boardTable += `| ${rowNumber < 10 ? ' ' + rowNumber : rowNumber} | ${rowContent} |\n`;
  });

  // README.md 파일 읽기
  let readme;
  try {
    readme = fs.readFileSync('README.md', 'utf8');
  } catch (error) {
    console.error('Error reading README.md:', error);
    process.exit(1);
  }

  // 보드 상태로 README 업데이트
  const updatedReadme = readme.replace(
    /<!-- BOARD START -->[\s\S]*<!-- BOARD END -->/,
    `<!-- BOARD START -->\n\`\`\`\n${boardTable}\n\`\`\`\n<!-- BOARD END -->`
  );

  // README.md 파일 쓰기
  try {
    fs.writeFileSync('README.md', updatedReadme, 'utf8');
    console.log('README.md updated successfully.');
  } catch (error) {
    console.error('Error writing README.md:', error);
    process.exit(1);
  }
}

updateReadme();
