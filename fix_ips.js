import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_IP = '192.168.1.4';
const TARGET_PORT = '5000';
const OLD_IPS = ['172.19.61.23', '192.168.1.3'];
const NEW_IP = TARGET_IP;

const DIRS = [
    path.join(__dirname, 'front_customer/src'),
    path.join(__dirname, 'frontend/src'),
    path.join(__dirname, 'frontend-app/src'),
    path.join(__dirname, 'frontend-app/web-legacy'),
    path.join(__dirname, 'backend'),
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const stats = fs.statSync(dir);
    if (stats.isDirectory()) {
        if (dir.includes('node_modules') || dir.includes('.git')) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            walk(path.join(dir, file));
        }
    } else if (dir.endsWith('.js') || dir.endsWith('.jsx') || dir.endsWith('.env') || dir.endsWith('.json')) {
        let content = fs.readFileSync(dir, 'utf8');
        let changed = false;

        OLD_IPS.forEach(oldIp => {
            if (content.includes(oldIp)) {
                console.log(`Replacing ${oldIp} in ${dir}...`);
                content = content.replace(new RegExp(oldIp, 'g'), NEW_IP);
                changed = true;
            }
        });

        if (content.includes('localhost:5000')) {
            console.log(`Replacing localhost:5000 in ${dir}...`);
            content = content.replace(/localhost:5000/g, `${NEW_IP}:5000`);
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(dir, content, 'utf8');
        }
    }
}

console.log(`Starting replacement... Targeting IP: ${NEW_IP}`);
for (const dir of DIRS) {
    console.log(`Processing: ${dir}`);
    walk(dir);
}
console.log('Replacement complete!');
