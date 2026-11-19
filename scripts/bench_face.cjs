/**
 * BANCO DE ENSAIO DO COMPARADOR FACIAL — v1 (antigo) vs v2 (novo)
 * -------------------------------------------------------------------------
 * Mede a TAXA DE FALSOS NEGATIVOS e a SEPARAÇÃO entre pessoas com o MESMO
 * rosto em condições diferentes (três luzes × duas câmaras), que era o
 * problema real: «funcionou algumas vezes e depois deixou de funcionar».
 *
 *   node scripts/bench_face.cjs                 # corpus sintético em memória
 *   node scripts/bench_face.cjs fotos/          # pasta com JPG/PNG reais
 *
 * Com a pasta, o ficheiro é o rosto e cada variação (luz/ruído/blur/escala)
 * simula uma sessão diferente. Sem pasta, gera um rosto sintético.
 *
 * Saída: tabela de distâncias, taxa de falsos negativos por condição e o
 * limiar recomendado para cada algoritmo.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const E = (ms) => new Promise((r) => setTimeout(r, ms));

// ── código dos comparadores (extraído do faceAuth.ts para correr no browser) ─
const CODIGO = `
window.__bench = (() => {
  const computeSobelGradients = (gray, width, height) => {
    const gradients = new Array(width * height).fill(0);
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const tl = gray[(y-1)*width+(x-1)]||0, tc = gray[(y-1)*width+x]||0, tr = gray[(y-1)*width+(x+1)]||0;
        const ml = gray[y*width+(x-1)]||0, mr = gray[y*width+(x+1)]||0;
        const bl = gray[(y+1)*width+(x-1)]||0, bc = gray[(y+1)*width+x]||0, br = gray[(y+1)*width+(x+1)]||0;
        const gx = -tl + tr - 2*ml + 2*mr - bl + br;
        const gy = -tl - 2*tc - tr + bl + 2*bc + br;
        gradients[y*width+x] = Math.min(255, Math.round(Math.sqrt(gx*gx+gy*gy)/4));
      }
    return gradients;
  };
  const normalizeIllumination = (gray) => {
    if (!gray.length) return [];
    const mean = gray.reduce((s,v)=>s+v,0)/gray.length;
    const sd = Math.sqrt(gray.reduce((s,v)=>s+(v-mean)**2,0)/gray.length)||1;
    return gray.map(v => Math.min(255, Math.max(0, Math.round(128+((v-mean)/sd)*50))));
  };
  const equalizeHistogram = (gray) => {
    if (!gray.length) return [];
    const hist = new Array(256).fill(0);
    for (const v of gray) hist[Math.max(0,Math.min(255,Math.round(v)))] += 1;
    const cdf = new Array(256).fill(0); let acc = 0;
    for (let i=0;i<256;i++){ acc += hist[i]; cdf[i] = acc; }
    const total = cdf[255]||1;
    return gray.map(v => Math.round((cdf[Math.max(0,Math.min(255,Math.round(v)))]/total)*255));
  };
  const pool2x2 = (src, size) => {
    const out = [];
    for (let y=0;y<size;y+=2) for (let x=0;x<size;x+=2)
      out.push(((src[y*size+x]||0)+(src[y*size+x+1]||0)+(src[(y+1)*size+x]||0)+(src[(y+1)*size+x+1]||0))/4);
    return out;
  };
  const zScore = (vals) => {
    if (!vals.length) return [];
    const m = vals.reduce((s,v)=>s+v,0)/vals.length;
    const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-m)**2,0)/vals.length)||1;
    return vals.map(v => (v-m)/sd);
  };

  const grayFrom = (canvas) => {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0,0,canvas.width,canvas.height);
    const g = [];
    for (let i=0;i<data.length;i+=4) g.push(Math.round((data[i]+data[i+1]+data[i+2])/3));
    return g;
  };

  // v1 — recorte central em 32x32, cinza equalizado por média/desvio + Sobel
  const sigV1 = (source) => {
    const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const lado = Math.min(sw, sh) * 0.7;
    const sx = Math.max(0, Math.floor((sw-lado)/2)), sy = Math.max(0, Math.floor((sh-lado)/2));
    c.getContext('2d').drawImage(source, sx, sy, lado, lado, 0, 0, 32, 32);
    const eq = normalizeIllumination(grayFrom(c));
    return [...eq, ...computeSobelGradients(eq, 32, 32)];
  };

  // v2 — recorte central 24x24, histograma, pooling 12x12, z-score, cosseno
  const sigV2 = (source) => {
    const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
    const c = document.createElement('canvas'); c.width = 24; c.height = 24;
    const lado = Math.min(sw, sh) * 0.7;
    const sx = Math.max(0, Math.floor((sw-lado)/2)), sy = Math.max(0, Math.floor((sh-lado)/2));
    c.getContext('2d').drawImage(source, sx, sy, lado, lado, 0, 0, 24, 24);
    const eq = equalizeHistogram(grayFrom(c));
    return [...zScore(pool2x2(eq,24)), ...zScore(pool2x2(computeSobelGradients(eq,24,24),24))];
  };

  // ── v3: DCT 2D (8x8) sobre bloco 16x16 normalizado, só coeficientes AC ──
  const dctBase = (() => {
    const N = 8, m = [];
    for (let k = 0; k < N; k++) {
      const row = [];
      for (let n = 0; n < N; n++) row.push(Math.cos((Math.PI * (2*n + 1) * k) / (2*N)) * (k === 0 ? Math.sqrt(1/N) : Math.sqrt(2/N)));
      m.push(row);
    }
    return m;
  })();
  const dct8 = (bloco) => { // bloco: array 64 (8x8)
    const out = new Array(64).fill(0);
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
      let soma = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) soma += bloco[y*8+x] * dctBase[u][y] * dctBase[v][x];
      out[u*8+v] = soma;
    }
    return out;
  };
  const sigV3 = (source) => {
    const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const lado = Math.min(sw, sh) * 0.62;
    const sx = Math.max(0, Math.floor((sw-lado)/2)), sy = Math.max(0, Math.floor((sh-lado)/2));
    c.getContext('2d').drawImage(source, sx, sy, lado, lado, 0, 0, 16, 16);
    const eq = equalizeHistogram(grayFrom(c));
    // 4 blocos 8x8, média dos coeficientes AC (descarta DC = brilho)
    const acc = new Array(64).fill(0);
    for (const [ox, oy] of [[0,0],[8,0],[0,8],[8,8]]) {
      const bloco = [];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bloco.push(eq[(y+oy)*16 + (x+ox)]);
      const d = dct8(bloco);
      for (let i = 0; i < 64; i++) acc[i] += d[i] / 4;
    }
    // 63 coeficientes AC (sem o DC) + normalização L2
    const ac = acc.slice(1);
    const norma = Math.sqrt(ac.reduce((s,v)=>s+v*v,0)) || 1;
    return ac.map(v => v / norma);
  };
  const cosV3 = (a, b) => {
    let dot = 0; for (let i=0;i<a.length;i++) dot += a[i]*b[i];
    return Math.round((1 - Math.max(-1, Math.min(1, dot)))*1000)/10;
  };
  // ── v4: LBP uniforme (8,1) em grelha 3x3 de blocos 16x16, histogramas L1 ──
  const mapaUniforme = (() => {
    const map = new Array(256).fill(0); let prox = 0;
    for (let i = 0; i < 256; i++) {
      const bits = i.toString(2).padStart(8, '0');
      let trans = 0;
      for (let b = 0; b < 8; b++) if (bits[b] !== bits[(b + 1) % 8]) trans++;
      map[i] = trans <= 2 ? prox++ : (map[i] = 58);
      if (trans <= 2) map[i] = prox - 1;
    }
    return map;
  })();
  const sigV4 = (source) => {
    const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
    const lado = Math.min(sw, sh) * 0.62;
    const sx = Math.max(0, Math.floor((sw - lado) / 2)), sy = Math.max(0, Math.floor((sh - lado) / 2));
    const c = document.createElement('canvas'); c.width = 72; c.height = 72;
    c.getContext('2d').drawImage(source, sx, sy, lado, lado, 0, 0, 72, 72);
    const g = equalizeHistogram(grayFrom(c));
    const hist = new Array(9 * 59).fill(0);
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 3; bx++) {
      const base = (by * 3 + bx) * 59;
      for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) {
        const px = bx * 24 + x, py = by * 24 + y;
        let codigo = 0;
        const viz = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
        for (let k = 0; k < 8; k++) {
          const v = g[(py + viz[k][1]) * 72 + (px + viz[k][0])];
          if (v >= g[py * 72 + px]) codigo |= (1 << k);
        }
        hist[base + mapaUniforme[codigo]] += 1;
      }
    }
    // normalizar cada histograma de bloco (soma 1) → invariante ao tamanho
    for (let b = 0; b < 9; b++) {
      let soma = 0;
      for (let i = 0; i < 59; i++) soma += hist[b * 59 + i];
      if (soma) for (let i = 0; i < 59; i++) hist[b * 59 + i] /= soma;
    }
    return hist;
  };
  const lbpDistV4 = (a, b) => {
    let l1 = 0; for (let i = 0; i < a.length; i++) l1 += Math.abs(a[i] - b[i]);
    return Math.round((l1 / 9) * 100 * 10) / 10; // média L1 por bloco ×100
  };
  const maeV1 = (a, b) => (a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length) / 255 * 100;
  const cosV2 = (a, b) => {
    let dot=0, na=0, nb=0;
    for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
    return Math.round((1 - dot/(Math.sqrt(na)*Math.sqrt(nb)))*1000)/10;
  };

  return { sigV1, sigV2, sigV3, sigV4, maeV1, cosV2, cosV3, lbpDistV4 };
})();
`;

/**
 * Gera um "rosto" sintético com GEOMETRIA distinta por pessoa (é isso que os
 * impostores têm de diferir) e variações de sessão: brilho, contraste,
 * direcção da luz, ruído, desfoque, escala e pequena rotação/translação.
 */
const FACE_GEN = `
window.__face = (p, s) => {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 480;
  const x = c.getContext('2d');
  x.fillStyle = 'hsl(0,0%,' + s.fundo + '%)';
  x.fillRect(0, 0, 480, 480);

  // câmara 2 = mais baixa resolução + desfoque + ruído
  x.save();
  x.translate(240 + s.desvioX, 240 + s.desvioY);
  x.rotate(s.rot);

  // CABEÇA — proporções e tom por pessoa
  const W = 120 * p.largura, H = 165 * p.altura;
  x.fillStyle = 'hsl(' + p.pele + ',35%,' + (52 + s.brilho * 0.4) + '%)';
  x.beginPath(); x.ellipse(0, 0, W, H, 0, 0, 2 * Math.PI); x.fill();
  // queixo
  x.beginPath(); x.ellipse(0, H * 0.55, W * 0.72, H * 0.32, 0, 0, Math.PI); x.fill();

  const dx = p.olhos * W;            // distância inter-ocular
  const ey = -H * 0.18;              // altura dos olhos
  // SOBRANCELHAS
  x.fillStyle = 'hsl(215,18%,' + (14 + s.brilho * 0.3) + '%)';
  x.fillRect(-dx - 34, ey - 46, 62, p.sobrancelha);
  x.fillRect(dx - 28, ey - 46, 62, p.sobrancelha);
  // OLHOS
  x.fillStyle = 'hsl(220,14%,' + (16 + s.brilho * 0.3) + '%)';
  x.beginPath(); x.ellipse(-dx, ey, p.olhoT, p.olhoT * 0.62, 0, 0, 2 * Math.PI); x.fill();
  x.beginPath(); x.ellipse(dx, ey, p.olhoT, p.olhoT * 0.62, 0, 0, 2 * Math.PI); x.fill();
  // pupila
  x.fillStyle = '#0b1220';
  x.beginPath(); x.arc(-dx, ey, p.olhoT * 0.34, 0, 2 * Math.PI); x.fill();
  x.beginPath(); x.arc(dx, ey, p.olhoT * 0.34, 0, 2 * Math.PI); x.fill();
  // NARIZ — comprimento e largura por pessoa
  x.fillStyle = 'hsl(' + p.pele + ',30%,' + (40 + s.brilho * 0.4) + '%)';
  x.beginPath();
  x.moveTo(0, ey + 24);
  x.lineTo(-p.narizL * 0.42, ey + p.narizC);
  x.lineTo(p.narizL * 0.42, ey + p.narizC);
  x.closePath(); x.fill();
  // BOCA — largura e altura por pessoa
  x.fillStyle = 'hsl(348,' + p.bocaTom + '%,' + (34 + s.brilho * 0.3) + '%)';
  x.beginPath(); x.ellipse(0, ey + p.bocaY, p.boca, 13, 0, 0, 2 * Math.PI); x.fill();
  // BARBA (só algumas pessoas)
  if (p.barba) {
    x.fillStyle = 'hsla(215,20%,12%,' + (p.barba / 100) + ')';
    x.beginPath(); x.ellipse(0, H * 0.42, W * 0.82, H * 0.42, 0, 0, Math.PI); x.fill();
  }
  // ORELHAS
  x.fillStyle = 'hsl(' + p.pele + ',32%,' + (46 + s.brilho * 0.4) + '%)';
  x.beginPath(); x.ellipse(-W - 6, 6, p.orelha, p.orelha * 1.6, 0, 0, 2 * Math.PI); x.fill();
  x.beginPath(); x.ellipse(W + 6, 6, p.orelha, p.orelha * 1.6, 0, 0, 2 * Math.PI); x.fill();
  x.restore();

  // LUZ: gradiente direccional + contraste global da sessão
  const g = x.createLinearGradient(0, 0, 480, 60);
  g.addColorStop(0, 'rgba(0,0,0,' + (s.sombra / 100) + ')');
  g.addColorStop(0.55, 'rgba(128,128,128,' + (s.contraste / 100) + ')');
  g.addColorStop(1, 'rgba(255,255,255,' + (s.luz / 100) + ')');
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = g; x.fillRect(0, 0, 480, 480);
  x.globalCompositeOperation = 'source-over';
  return c;
};
`;
(async () => {
  const pasta = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0"></body></html>');
  await page.addScriptTag({ content: CODIGO });
  await page.addScriptTag({ content: FACE_GEN });

  // ── modo FOTOS REAIS: cada ficheiro é um rosto, cada variação é uma sessão ─
  if (pasta) {
    const ficheiros = fs.readdirSync(pasta).filter((f) => /\.(jpe?g|png)$/i.test(f));
    if (!ficheiros.length) { console.error('Sem imagens em ' + pasta); process.exit(1); }
    const dados = ficheiros.map((f) => 'data:image/' + (/\.png$/i.test(f) ? 'png' : 'jpeg') +
      ';base64,' + fs.readFileSync(path.join(pasta, f)).toString('base64'));
    const linhas = await page.evaluate(async ({ dados }) => {
      const { sigV1, sigV2, sigV3, sigV4, maeV1, cosV2, cosV3, lbpDistV4 } = window.__bench;
      const carregar = (src) => new Promise((ok) => {
        const im = new Image(); im.onload = () => ok(im); im.src = src;
      });
      // variações de sessão aplicadas à MESMA fotografia (luz/câmara simuladas)
      const variar = (img, v) => {
        const c = document.createElement('canvas'); c.width = 480; c.height = 480;
        const x = c.getContext('2d');
        x.filter = 'brightness(' + v.brilho + ') contrast(' + v.contraste + ')' + (v.blur ? ' blur(' + v.blur + 'px)' : '');
        x.drawImage(img, v.dx, v.dy, 480 - v.dx * 2, 480 - v.dy * 2);
        x.filter = 'none';
        const g = x.createLinearGradient(0, 0, 480, 60);
        g.addColorStop(0, 'rgba(0,0,0,' + v.sombra + ')');
        g.addColorStop(1, 'rgba(255,255,255,' + v.luz + ')');
        x.globalCompositeOperation = 'multiply'; x.fillStyle = g; x.fillRect(0, 0, 480, 480);
        x.globalCompositeOperation = 'source-over';
        if (v.ruido) {
          const im = x.getImageData(0, 0, 480, 480);
          for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - 0.5) * v.ruido; im.data[i] += n; im.data[i+1] += n; im.data[i+2] += n; }
          x.putImageData(im, 0, 0);
        }
        return c;
      };
      const SES = [
        { nome: 'luz-boa/cam1', brilho: 1.0, contraste: 1.0, dx: 0, dy: 0, sombra: 0.03, luz: 0.05, ruido: 0, blur: 0 },
        { nome: 'luz-fraca/cam1', brilho: 0.72, contraste: 0.9, dx: 4, dy: 4, sombra: 0.16, luz: 0.02, ruido: 6, blur: 0 },
        { nome: 'contra-luz/cam2', brilho: 0.65, contraste: 0.95, dx: 0, dy: 0, sombra: 0.30, luz: 0.12, ruido: 8, blur: 1.2 },
        { nome: 'luz-boa/cam2', brilho: 0.95, contraste: 1.05, dx: 3, dy: 3, sombra: 0.10, luz: 0.06, ruido: 6, blur: 1.0 },
        { nome: 'luz-fraca/cam2', brilho: 0.7, contraste: 0.92, dx: -3, dy: 2, sombra: 0.20, luz: 0.03, ruido: 8, blur: 1.2 },
      ];
      const out = [];
      const guardar = {};
      for (let i = 0; i < dados.length; i++) {
        const img = await carregar(dados[i]);
        for (const v of SES) {
          const c = variar(img, v);
          guardar[i + '|' + v.nome] = { v1: sigV1(c), v2: sigV2(c), v3: sigV3(c), v4: sigV4(c) };
        }
      }
      const ref = SES[0].nome;
      for (let i = 0; i < dados.length; i++) {
        for (const v of SES) {
          if (v.nome === ref) continue;
          const a = guardar[i + '|' + ref], b = guardar[i + '|' + v.nome];
          out.push({ tipo: 'mesma-pessoa', pessoa: 'foto' + i, sessao: v.nome,
            v1: Math.round(maeV1(a.v1, b.v1) * 10) / 10, v2: cosV2(a.v2, b.v2), v3: cosV3(a.v3, b.v3), v4: lbpDistV4(a.v4, b.v4) });
        }
      }
      for (let i = 0; i < dados.length; i++) for (let j = i + 1; j < dados.length; j++) {
        for (const v of SES) {
          const a = guardar[i + '|' + v.nome], b = guardar[j + '|' + v.nome];
          out.push({ tipo: 'impostor', pessoa: i + '×' + j, sessao: v.nome,
            v1: Math.round(maeV1(a.v1, b.v1) * 10) / 10, v2: cosV2(a.v2, b.v2), v3: cosV3(a.v3, b.v3), v4: lbpDistV4(a.v4, b.v4) });
        }
      }
      return out;
    }, { dados });
    relatar(linhas, 'FOTOS REAIS (' + ficheiros.length + ' rostos)');
    await browser.close();
    return;
  }

  // ── pessoas ────────────────────────────────────────────────────────────
  const PESSOAS = [
    { id: 'A', pele: 30, largura: 1.00, altura: 1.00, olhos: 0.42, olhoT: 17, narizL: 34, narizC: 70,
      boca: 40, bocaY: 88, bocaTom: 45, sobrancelha: 9, barba: 0, orelha: 11 },
    { id: 'B', pele: 19, largura: 0.87, altura: 1.08, olhos: 0.33, olhoT: 12, narizL: 26, narizC: 58,
      boca: 30, bocaY: 96, bocaTom: 55, sobrancelha: 14, barba: 45, orelha: 9 },
    { id: 'C', pele: 40, largura: 1.13, altura: 0.93, olhos: 0.50, olhoT: 21, narizL: 42, narizC: 82,
      boca: 52, bocaY: 79, bocaTom: 35, sobrancelha: 7, barba: 0, orelha: 14 },
  ];
  // três luzes × duas câmaras (câmara = resolução/ruído diferente)
  const SESSOES = [
    { nome: 'luz-boa/cam1',  fundo: 72, brilho: 10, sombra: 4,  luz: 10, contraste: 0,   desvioX: 0,  desvioY: 0,  rot: 0,     ruido: 0, escala: 480, tipo: 'cam1' },
    { nome: 'luz-fraca/cam1', fundo: 30, brilho: -12, sombra: 16, luz: 4, contraste: -15, desvioX: 4,  desvioY: 3,  rot: 0.02,  ruido: 5, escala: 480, tipo: 'cam1' },
    { nome: 'contra-luz/cam2', fundo: 90, brilho: -18, sombra: 30, luz: 5, contraste: -10, desvioX: -5, desvioY: 4,  rot: -0.03, ruido: 8, escala: 360, tipo: 'cam2' },
    { nome: 'luz-boa/cam2',   fundo: 68, brilho: 6,  sombra: 10, luz: 8, contraste: 5,   desvioX: 3,  desvioY: -3, rot: 0.02,  ruido: 6, escala: 360, tipo: 'cam2' },
    { nome: 'luz-fraca/cam2', fundo: 33, brilho: -10, sombra: 20, luz: 5, contraste: -12, desvioX: -3, desvioY: 2,  rot: 0.01,  ruido: 7, escala: 360, tipo: 'cam2' },
  ];

  const res = await page.evaluate(async ({ PESSOAS, SESSOES, pasta }) => {
    const { sigV1, sigV2, sigV3, sigV4, maeV1, cosV2, cosV3, lbpDistV4 } = window.__bench;
    const { __face } = window;
    const base = {};
    const sess = {};
    for (const p of PESSOAS) {
      for (const s of SESSOES) {
        const canvas = __face(p, s);
        // simular ruído/resolução da câmara
        if (s.ruido) {
          const x = canvas.getContext('2d');
          const im = x.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < im.data.length; i += 4) {
            const n = (Math.random() - 0.5) * s.ruido * 3;
            im.data[i] += n; im.data[i+1] += n; im.data[i+2] += n;
          }
          x.putImageData(im, 0, 0);
        }
        let alvo = canvas;
        if (s.escala !== 480) {
          const t = document.createElement('canvas'); t.width = s.escala; t.height = s.escala;
          t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
          alvo = t;
        }
        base[p.id + '|' + s.nome] = sigV1(alvo);
        sess[p.id + '|' + s.nome] = sigV2(alvo);
        sess[p.id + '|v3|' + s.nome] = sigV3(alvo);
        sess[p.id + '|v4|' + s.nome] = sigV4(alvo);
      }
    }
    const ref = SESSOES[0].nome; // referência = luz boa / câmara 1
    const linhas = [];
    for (const p of PESSOAS) {
      for (const s of SESSOES) {
        if (s.nome === ref) continue;
        const d1 = maeV1(base[p.id + '|' + ref], base[p.id + '|' + s.nome]);
        const d2 = cosV2(sess[p.id + '|' + ref], sess[p.id + '|' + s.nome]);
        const d3 = cosV3(sess[p.id + '|v3|' + ref], sess[p.id + '|v3|' + s.nome]);
        const d4 = lbpDistV4(sess[p.id + '|v4|' + ref], sess[p.id + '|v4|' + s.nome]);
        linhas.push({ tipo: 'mesma-pessoa', pessoa: p.id, sessao: s.nome, v1: Math.round(d1*10)/10, v2: d2, v3: d3, v4: d4 });
      }
    }
    // impostores: todas as combinações entre pessoas diferentes, mesma sessão
    for (const s of SESSOES) {
      for (let i = 0; i < PESSOAS.length; i++) {
        for (let j = i + 1; j < PESSOAS.length; j++) {
          const a = PESSOAS[i].id, b = PESSOAS[j].id;
          const d1 = maeV1(base[a + '|' + s.nome], base[b + '|' + s.nome]);
          const d2 = cosV2(sess[a + '|' + s.nome], sess[b + '|' + s.nome]);
          const d3 = cosV3(sess[a + '|v3|' + s.nome], sess[b + '|v3|' + s.nome]);
          const d4 = lbpDistV4(sess[a + '|v4|' + s.nome], sess[b + '|v4|' + s.nome]);
          linhas.push({ tipo: 'impostor', pessoa: a + '×' + b, sessao: s.nome, v1: Math.round(d1*10)/10, v2: d2, v3: d3, v4: d4 });
        }
      }
    }
    return linhas;
  }, { PESSOAS, SESSOES, pasta });

  relatar(res, 'CORPUS SINTÉTICO');
  await browser.close();
})().catch((e) => { console.error('FALHA:', e); process.exit(1); });

function relatar(res, titulo) {
  const mesmo = res.filter((r) => r.tipo === 'mesma-pessoa');
  const impos = res.filter((r) => r.tipo === 'impostor');
  const stats = (arr, campo) => {
    const v = arr.map((r) => r[campo]).sort((a, b) => a - b);
    return { min: v[0], max: v[v.length - 1], media: Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 };
  };
  console.log(`\n══════════ ${titulo} ══════════`);
  console.log('\n── MESMA PESSOA, condições diferentes (menor = melhor) ──');
  console.log('   pessoa · sessão           v1       v2       v3       v4');
  mesmo.forEach((r) => console.log(`   ${(r.pessoa + ' · ' + r.sessao).padEnd(22)} ${String(r.v1).padStart(6)}   ${String(r.v2).padStart(6)}   ${String(r.v3).padStart(6)}   ${String(r.v4).padStart(6)}`));
  const s1 = stats(mesmo, 'v1'), s2 = stats(mesmo, 'v2'), s3 = stats(mesmo, 'v3'), s4 = stats(mesmo, 'v4');
  console.log(`   ${'média / pior'.padEnd(22)} ${String(s1.media + ' / ' + s1.max).padStart(6)}   ${String(s2.media + ' / ' + s2.max).padStart(6)}   ${String(s3.media + ' / ' + s3.max).padStart(6)}   ${String(s4.media + ' / ' + s4.max).padStart(6)}`);

  console.log('\n── PESSOAS DIFERENTES (maior = melhor) ──');
  const i1 = stats(impos, 'v1'), i2 = stats(impos, 'v2'), i3 = stats(impos, 'v3'), i4 = stats(impos, 'v4');
  console.log(`   ${'mínima / média'.padEnd(22)} ${String(i1.min + ' / ' + i1.media).padStart(6)}   ${String(i2.min + ' / ' + i2.media).padStart(6)}   ${String(i3.min + ' / ' + i3.media).padStart(6)}   ${String(i4.min + ' / ' + i4.media).padStart(6)}`);

  const limiar = (campo) => {
    const piorGenuino = Math.max(...mesmo.map((r) => r[campo]));
    const melhorImpostor = Math.min(...impos.map((r) => r[campo]));
    return { piorGenuino, melhorImpostor, meio: Math.round(((piorGenuino + melhorImpostor) / 2) * 10) / 10, separavel: piorGenuino < melhorImpostor };
  };
  const falsoNeg = (arr, campo, th) => Math.round((arr.filter((r) => r[campo] > th).length / arr.length) * 1000) / 10;
  const falsoPos = (arr, campo, th) => Math.round((arr.filter((r) => r[campo] <= th).length / arr.length) * 1000) / 10;

  console.log('\n── SEPARAÇÃO E LIMIAR ──');
  for (const [nome, campo, emUso] of [['v1', 'v1', 10.2], ['v2', 'v2', 34], ['v3', 'v3', null], ['v4', 'v4', null]]) {
    const l = limiar(campo);
    const th = emUso ?? l.meio;
    console.log(`   ${nome}: pior genuíno ${l.piorGenuino} · melhor impostor ${l.melhorImpostor} · separável=${l.separavel}`);
    console.log(`       limiar ${th}: falsos negativos ${falsoNeg(mesmo, campo, th)}% · falsos positivos ${falsoPos(impos, campo, th)}%`);
  }
}
