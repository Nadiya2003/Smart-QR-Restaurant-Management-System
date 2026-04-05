const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');

function checkFile(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        parser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'dynamicImport']
        });
        console.log(`✅ ${filePath}: Syntax OK`);
        return true;
    } catch (e) {
        console.error(`❌ ${filePath}: Syntax Error!`);
        console.error(e.message);
        if (e.loc) {
            console.error(`At line ${e.loc.line}, column ${e.loc.column}`);
        }
        return false;
    }
}

const screensDir = './src/screens';
const files = [];

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            walk(file);
        } else {
            if (file.endsWith('.js')) {
                files.push(file);
            }
        }
    });
}

walk(screensDir);
let allOk = true;
files.forEach(f => {
    if (!checkFile(f)) allOk = false;
});

if (!allOk) process.exit(1);
