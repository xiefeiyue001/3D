/* 纯净录屏版构建：shell + vendor/three + src-en/*.js + film 层 → engine-3d-film.html */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const parts = ['10-util.js', '12-tex.js', '20-studio.js', '30-engine.js', '40-actions.js', '50-ui.js', '70-post.js', '90-boot.js'];

const shell = fs.readFileSync(path.join(ROOT, 'shell.html'), 'utf8');
const three = fs.readFileSync(path.join(ROOT, 'vendor', 'three.classic.js'), 'utf8');
const app = parts.map(f => fs.readFileSync(path.join(ROOT, 'src-en', f), 'utf8')).join('\n');
const filmCss = fs.readFileSync(path.join(ROOT, 'film.css'), 'utf8');
const filmJs = fs.readFileSync(path.join(ROOT, 'film.js'), 'utf8');

let out = shell.replace('/*__THREE__*/', () => three).replace('/*__APP__*/', () => app);
out = out.replace('</head>', '<style>\n' + filmCss + '</style>\n</head>');
out = out.replace('</body>', '<script>\n' + filmJs + '\n</script>\n</body>');

fs.writeFileSync(path.join(ROOT, 'engine-3d-film.html'), out);
console.log('engine-3d-film.html', (Buffer.byteLength(out) / 1024).toFixed(0) + ' KB');
