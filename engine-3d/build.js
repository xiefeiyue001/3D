/* EN-01 构建：shell.html + app.js + vendor/three.classic.js -> engine-3d.html */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const shell = fs.readFileSync(path.join(ROOT, 'shell.html'), 'utf8');
const app   = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
let three;
const vp = path.join(ROOT, 'vendor', 'three.classic.js');
if (fs.existsSync(vp)) three = fs.readFileSync(vp, 'utf8');
else { console.error('缺少 vendor/three.classic.js（three r149 UMD），见 README'); process.exit(1); }

const out = shell.replace('/*__THREE__*/', () => three).replace('/*__APP__*/', () => app);
fs.writeFileSync(path.join(ROOT, 'engine-3d.html'), out);
console.log('engine-3d.html', (Buffer.byteLength(out)/1024).toFixed(0) + ' KB', '(app ' + (Buffer.byteLength(app)/1024).toFixed(0) + ' KB)');
