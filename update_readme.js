const fs = require('fs');
const path = require('path');

// board.json 파일 로드
let boardData;
try {
  const data = fs.readFileSync('board.json', 'utf8');
  boardData = JSON.parse(data);
} catch (error) {
  console.error('Error reading board.json:', error);
  process.exit(1);
}

const board = boardData.board;
const BOARD_SIZE = 15;

// 보드 상태 생성
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
  `<!-- BOARD START -->\n${boardTable}<!-- BOARD END -->`
);

// README.md 파일 쓰기
try {
  fs.writeFileSync('README.md', updatedReadme, 'utf8');
  console.log('README.md updated successfully.');
} catch (error) {
  console.error('Error writing README.md:', error);
  process.exit(1);
}
