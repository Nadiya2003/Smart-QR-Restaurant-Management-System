import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mappings = [
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/lamprais_1769526883660.png', dest: 'lamprais.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/chicken_kottu_1769527143919.png', dest: 'chicken_kottu.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/rice_and_curry_1769527337910.png', dest: 'rice_and_curry.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/egg_hoppers_1769527550382.png', dest: 'egg_hoppers.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/fried_rice_1769527747234.png', dest: 'fried_rice.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/pizza_margherita_1769528043870.png', dest: 'pizza_margherita.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/carbonara_1769528213537.png', dest: 'carbonara.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/lasagna_1769528321777.png', dest: 'lasagna.png' },
    { src: 'C:/Users/USER/.gemini/antigravity/brain/5aaae6e7-0632-4775-b0e1-c38a35465ae3/risotto_1769528437451.png', dest: 'risotto.png' }
];

const targetDir = path.join(__dirname, 'public', 'food');

if (!fs.existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
}

mappings.forEach(map => {
    try {
        const targetPath = path.join(targetDir, map.dest);
        fs.copyFileSync(map.src, targetPath);
        console.log(`Copied ${map.dest}`);
    } catch (err) {
        console.error(`Error copying ${map.dest}:`, err.message);
    }
});
