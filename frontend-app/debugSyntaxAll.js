const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const screensDir = 'src/screens';

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const code = fs.readFileSync(fullPath, 'utf8');
            try {
                parser.parse(code, {
                    sourceType: 'module',
                    plugins: ['jsx', 'flow'] // Adding some common plugins
                });
                console.log(`OK: ${fullPath}`);
            } catch (e) {
                console.error(`ERROR in ${fullPath}: ${e.message}`);
                console.error(`at line ${e.loc?.line}, column ${e.loc?.column}`);
            }
        }
    });
}

checkDir(screensDir);
