/* EN-01 构建：shell.html + vendor/three + src-en/*.js → engine-3d.html */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const parts = ['10-util.js', '12-tex.js', '20-studio.js', '30-engine.js', '40-actions.js', '50-ui.js', '70-post.js', '90-boot.js'];

const shell = fs.readFileSync(path.join(ROOT, 'shell.html'), 'utf8');
const three = fs.readFileSync(path.join(ROOT, 'vendor', 'three.classic.js'), 'utf8');
const app = parts.map(f => fs.readFileSync(path.join(ROOT, 'src-en', f), 'utf8')).join('\n');

let out = shell.replace('/*__THREE__*/', () => three).replace('/*__APP__*/', () => app);
fs.writeFileSync(path.join(ROOT, 'engine-3d.html'), out);

const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
const appKb = (Buffer.byteLength(app) / 1024).toFixed(0);
console.log('engine-3d.html', kb + ' KB', '(app ' + appKb + ' KB)');
