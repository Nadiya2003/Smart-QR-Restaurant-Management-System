const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/screens/steward/StewardDashboard.js', 'utf8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('Syntax OK');
} catch (e) {
  console.error(e);
}
