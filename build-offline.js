/**
 * build-offline.js
 * 將 pdf-editor.html 打包成單一離線版（所有 CDN library 內嵌）
 * 用法：node build-offline.js
 */
const fs   = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.join(__dirname, 'dist');

// CDN library 清單
const LIBS = [
  { key: 'pdfjs',       url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' },
  { key: 'pdfjsWorker', url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
  { key: 'pdflib',      url: 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js' },
  { key: 'sortable',    url: 'https://unpkg.com/sortablejs@1.15.2/Sortable.min.js' },
  { key: 'mammoth',     url: 'https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js' },
  { key: 'html2canvas', url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' },
  { key: 'jspdf',       url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
];

// CDN 標籤對應（不含 worker，worker 用 blob URL 處理）
const TAG_MAP = {
  pdfjs:       'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdflib:      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  sortable:    'https://unpkg.com/sortablejs@1.15.2/Sortable.min.js',
  mammoth:     'https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${u}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
    get(url);
  });
}

// 讀取 library，轉義 </script> 防止 HTML 解析截斷
function safeLib(src) {
  return src.replace(/<\/script>/gi, '<\\/script>');
}

async function build() {
  console.log('📦 下載 libraries...');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  const libs = {};
  await Promise.all(LIBS.map(async ({ key, url }) => {
    process.stdout.write(`  ↓ ${path.basename(url)}...`);
    libs[key] = safeLib(await fetch(url));
    console.log(` ${(libs[key].length / 1024).toFixed(0)} KB`);
  }));

  console.log('\n🔧 組裝離線版...');
  let html = fs.readFileSync(path.join(__dirname, 'pdf-editor.html'), 'utf8');

  // 替換各 CDN 標籤（使用函式形式避免 $& 特殊展開）
  for (const [key, url] of Object.entries(TAG_MAP)) {
    const tag = `<script src="${url}"></script>`;
    if (!html.includes(tag)) { console.error(`❌ 找不到：${tag}`); process.exit(1); }
    html = html.replace(tag, () => `<script>${libs[key]}</script>`);
    console.log(`  ✅ ${key}`);
  }

  // pdf.js worker → blob URL
  const workerCode =
    `(function(){var b=new Blob([${JSON.stringify(libs.pdfjsWorker)}],` +
    `{type:'application/javascript'});` +
    `pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(b);})();`;
  html = html.replace(
    /pdfjsLib\.GlobalWorkerOptions\.workerSrc\s*=\s*'[^']+';/,
    () => workerCode
  );
  console.log('  ✅ worker blob URL');

  // 寫出
  const outPath = path.join(OUT_DIR, 'pdf-editor-offline.html');
  fs.writeFileSync(outPath, html, 'utf8');
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);

  // 驗證
  const built   = fs.readFileSync(outPath, 'utf8');
  const stripped = built.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const ok = {
    noCDN:   !/<script\s+src="https:/i.test(stripped),
    pdfLib:  built.includes('PDFLib={}'),
    sortable: built.includes('SortableJS'),
    worker:  built.includes('createObjectURL'),
  };

  console.log('\n── 驗證 ──');
  Object.entries(ok).forEach(([k,v]) => console.log(` ${v?'✅':'❌'} ${k}`));

  if (Object.values(ok).every(Boolean)) {
    console.log(`\n✅ 完成！${sizeMB} MB → ${outPath}`);
  } else {
    console.error('\n❌ 驗證失敗，請檢查以上項目');
    process.exit(1);
  }
}

build().catch(e => { console.error(e); process.exit(1); });
