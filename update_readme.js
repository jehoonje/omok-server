const fs = require('fs');

// README 파일의 시작과 끝 부분 설정
const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

function updateReadme() {
  const boardData = JSON.parse(fs.readFileSync('board.json', 'utf8'));
  const board = boardData.board || boardData; // boardData.board가 없으면 boardData 사용

  // 보드 상태를 문자열로 변환
  const boardString = board.map(row => row.join(' ')).join('\n');

  const readmeContent = fs.readFileSync('README.md', 'utf8');
  const newContent = `${START}\n\n\`\`\`\n${boardString}\n\`\`\`\n\n${END}`;
  const updatedReadme = readmeContent.replace(
    new RegExp(`${START}[\\s\\S]*${END}`),
    newContent
  );

  fs.writeFileSync('README.md', updatedReadme);
}

updateReadme();
