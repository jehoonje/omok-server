const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const START = '<!-- BOARD START -->';
const END = '<!-- BOARD END -->';

function updateReadme() {
  https.get('https://omok-game-app-ea4b1b706acd.herokuapp.com/board', (res) => {
    let data = '';

    if (res.statusCode !== 200) {
      console.error(`Failed to fetch board: ${res.statusCode}`);
      process.exit(1);
    }

    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      const boardData = JSON.parse(data).board;
      let boardTable = "|   | " + Array.from({ length: boardData[0].length }, (_, i) => String.fromCharCode(65 + i)).join(" | ") + " |\n";
      boardTable += "|---" + "|---".repeat(boardData[0].length) + "|\n";

      boardData.forEach((row, index) => {
        boardTable += `| ${index + 1} | ${row.join(" | ")} |\n`;
      });

      let readme = fs.readFileSync('README.md', 'utf8');
      const updatedReadme = readme.replace(new RegExp(`${START}[\\s\\S]*${END}`), `${START}\n\`\`\`markdown\n${boardTable}\`\`\`\n${END}`);
      fs.writeFileSync('README.md', updatedReadme, 'utf8');

      console.log('README.md updated successfully.');

      // GitHub Actions 트리거 요청
      triggerGithubAction();
    });
  });
}

function triggerGithubAction() {
  const token = process.env.MY_GITHUB_TOKEN;
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/YOUR_USERNAME/YOUR_REPOSITORY/dispatches',  // 트리거할 레포지토리와 맞춤
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'request',
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

updateReadme();
