/* build-df.js —— 拼接分片源码 + 内联 three.js → 单文件 digital-factory-3d.html */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FILES = [
  '10-util.js', '20-studio.js', '30-building.js', '40-process.js',
  '45-logistics.js', '50-assembly.js', '60-data.js', '70-post.js', '90-boot.js',
];

const shell = fs.readFileSync(path.join(ROOT, 'shell.html'), 'utf8');
const three = fs.readFileSync(path.join(ROOT, 'vendor/three.classic.js'), 'utf8');

if (three.includes('</script')) {
  throw new Error('three.classic.js 含有 </script 字面量，需转义');
}

const app = FILES.map(f => {
  const code = fs.readFileSync(path.join(ROOT, 'src-df', f), 'utf8');
  if (code.includes('</script')) throw new Error(f + ' 含有 </script 字面量');
  return '/* ================= ' + f + ' ================= */\n' + code;
}).join('\n\n');

const out = shell
  .split('/*__THREE__*/').join(three)
  .split('/*__APP__*/').join(app);

const target = path.join(ROOT, 'digital-factory-3d.html');
fs.writeFileSync(target, out, 'utf8');
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log('[build] OK →', target, kb + ' KB', '| app', (Buffer.byteLength(app) / 1024).toFixed(0) + ' KB');
