/* ===================================================================
   widgets.js: simuladores e calculadoras interativas
   Uso nas páginas: <div data-widget="nome"></div>
   Fenômenos de Transporte / LFCA–URCA
   =================================================================== */

(function () {
  'use strict';

  /* ---------- utilitários de DOM ---------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'texto') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function moldura(raiz, titulo) {
    raiz.classList.add('widget');
    raiz.appendChild(el('div', { class: 'widget-cabeca', texto: titulo }));
    var corpo = el('div', { class: 'widget-corpo' });
    raiz.appendChild(corpo);
    return corpo;
  }

  /* Devolve o <input type=range>, para que o chamador possa movê-lo por código. */
  function deslizante(pai, rot, min, max, passo, inicial, aoMudar, formata) {
    var campo = el('div', { class: 'campo' });
    var lab = el('label');
    var val = el('span', { class: 'valor' });
    var inp = el('input', { type: 'range', min: min, max: max, step: passo, value: inicial });
    function mostrar() {
      val.innerHTML = formata ? formata(Number(inp.value)) : String(inp.value).replace('.', ',');
    }
    lab.innerHTML = rot + ' ';
    lab.appendChild(val);
    campo.appendChild(lab);
    campo.appendChild(inp);
    pai.appendChild(campo);
    inp.addEventListener('input', function () { mostrar(); aoMudar(Number(inp.value)); });
    mostrar();
    return inp;
  }

  /* Botões mutuamente exclusivos. Devolve uma função que troca a seleção. */
  function opcoes(pai, lista, inicial, aoMudar) {
    var cx = el('div', { class: 'botoes' });
    var bs = lista.map(function (o, i) {
      var b = el('button', { type: 'button', texto: o.rot });
      if (i !== inicial) b.classList.add('sec');
      b.addEventListener('click', function () {
        bs.forEach(function (x) { x.classList.add('sec'); });
        b.classList.remove('sec');
        aoMudar(o.v, o);
      });
      cx.appendChild(b);
      return b;
    });
    pai.appendChild(cx);
    return function (i) { bs[i].click(); };
  }

  function cartoes(pai, lista) {
    var g = el('div', { class: 'grade-num' });
    lista.forEach(function (c) {
      g.appendChild(el('div', { class: 'cartao-num', html:
        '<span class="rot">' + c.rot + '</span><span class="val" data-k="' + c.k + '">·</span>' }));
    });
    pai.appendChild(g);
    return function (vals) {
      Object.keys(vals).forEach(function (k) {
        var n = g.querySelector('[data-k="' + k + '"]');
        if (n) n.innerHTML = vals[k];
      });
    };
  }

  function tipografar(no) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([no]).catch(function () {});
    }
  }

  var REGISTRO = {};


  /* Seta com ponta, usada por quase todo widget de cinemática. */
  function seta(ct, xa, ya, xb, yb, cor, esp, tracejado) {
    var dx = xb - xa, dy = yb - ya, r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1.5) return;
    var ux = dx / r, uy = dy / r, p = Math.min(8, r * 0.42);
    ct.save();
    ct.strokeStyle = cor; ct.fillStyle = cor;
    ct.lineWidth = esp || 2; ct.lineCap = 'round'; ct.lineJoin = 'round';
    if (tracejado) ct.setLineDash(tracejado);
    ct.beginPath(); ct.moveTo(xa, ya); ct.lineTo(xb - ux * p * 0.8, yb - uy * p * 0.8);
    ct.stroke();
    ct.setLineDash([]);
    ct.beginPath();
    ct.moveTo(xb, yb);
    ct.lineTo(xb - ux * p - uy * p * 0.46, yb - uy * p + ux * p * 0.46);
    ct.lineTo(xb - ux * p + uy * p * 0.46, yb - uy * p - ux * p * 0.46);
    ct.closePath(); ct.fill();
    ct.restore();
  }

  /* Rótulo com halo branco, legível por cima de qualquer desenho. */
  function rotulo(ct, texto, x, y, cor, al, bl, fonte, corHalo) {
    ct.save();
    ct.font = fonte || '600 11px system-ui, sans-serif';
    ct.textAlign = al || 'center'; ct.textBaseline = bl || 'middle';
    ct.lineJoin = 'round'; ct.lineWidth = 3.5; ct.strokeStyle = corHalo || '#fff';
    ct.strokeText(texto, x, y);
    ct.fillStyle = cor; ct.fillText(texto, x, y);
    ct.restore();
  }

  /* Álgebra de matrizes 3×3, usada pelos widgets de rotação. */
  var M3 = (function () {
    function mul(A, B) {
      var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], i, j, k;
      for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
        var s = 0;
        for (k = 0; k < 3; k++) s += A[i][k] * B[k][j];
        C[i][j] = s;
      }
      return C;
    }
    function apl(A, v) {
      return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
              A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
              A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
    }
    function transp(A) {
      return [[A[0][0], A[1][0], A[2][0]],
              [A[0][1], A[1][1], A[2][1]],
              [A[0][2], A[1][2], A[2][2]]];
    }
    function Rx(a) {
      var c = Math.cos(a), s = Math.sin(a);
      return [[1, 0, 0], [0, c, -s], [0, s, c]];
    }
    function Ry(a) {
      var c = Math.cos(a), s = Math.sin(a);
      return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    }
    function Rz(a) {
      var c = Math.cos(a), s = Math.sin(a);
      return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    }
    function det(A) {
      return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
           - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
           + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    }
    function traco(A) { return A[0][0] + A[1][1] + A[2][2]; }
    /* ângulo e eixo de uma rotação própria, pelo traço e pela parte
       antissimétrica. Em φ = π a parte antissimétrica se anula e o eixo
       sai da diagonal de R + 1. */
    function anguloEixo(A) {
      var c = Math.max(-1, Math.min(1, (traco(A) - 1) / 2));
      var ang = Math.acos(c);
      var e = [A[2][1] - A[1][2], A[0][2] - A[2][0], A[1][0] - A[0][1]];
      var n = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);
      if (n > 1e-7) return { ang: ang, eixo: [e[0] / n, e[1] / n, e[2] / n] };
      if (ang < 1e-5) return { ang: 0, eixo: null };
      /* em φ = π vale R = 2nn^T - 1: tira-se a maior componente da
         diagonal e as outras das linhas correspondentes, o que fixa os
         sinais relativos (o sinal global é livre, como deve ser) */
      var k = 0, i2;
      for (i2 = 1; i2 < 3; i2++) if (A[i2][i2] > A[k][k]) k = i2;
      var nk = Math.sqrt(Math.max(1e-12, (A[k][k] + 1) / 2));
      var d = [0, 0, 0];
      d[k] = nk;
      for (i2 = 0; i2 < 3; i2++) if (i2 !== k) d[i2] = A[k][i2] / (2 * nk);
      return { ang: ang, eixo: d };
    }
    /* rotação de ângulo a em torno do versor n, por Rodrigues */
    function eixoPara(n, a) {
      var c = Math.cos(a), s = Math.sin(a), u = 1 - c;
      var x = n[0], y = n[1], z = n[2];
      return [[c + x * x * u, x * y * u - z * s, x * z * u + y * s],
              [y * x * u + z * s, c + y * y * u, y * z * u - x * s],
              [z * x * u - y * s, z * y * u + x * s, c + z * z * u]];
    }
    return { mul: mul, apl: apl, transp: transp, Rx: Rx, Ry: Ry, Rz: Rz,
             det: det, traco: traco, anguloEixo: anguloEixo, eixoPara: eixoPara };
  })();

  /* Desenha um cubo rotulado, visto de um ponto fixo. Compartilhado
     pelos widgets que precisam mostrar uma orientação no espaço. */
  var CUBO_FACES = [
    { v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], c: '#c9e2dc', r: 'D' },
    { v: [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]], c: '#e9e2cf', r: 'E' },
    { v: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], c: '#f0d9d6', r: 'T' },
    { v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], c: '#d9d6ea', r: 'F' },
    { v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], c: '#ffffff', r: 'C' },
    { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], c: '#dfe4e2', r: 'B' }
  ];
  var VISTA = M3.mul(M3.Rz(-0.62), M3.Rx(-1.14));

  function desenhaCubo(ct, cx, cy, s, R) {
    var faces = CUBO_FACES.map(function (f) {
      var pts = f.v.map(function (v) { return M3.apl(M3.mul(VISTA, R), v); });
      var prof = pts.reduce(function (a, p) { return a + p[1]; }, 0) / 4;
      return { pts: pts, prof: prof, c: f.c, r: f.r };
    });
    faces.sort(function (a, b) { return b.prof - a.prof; });
    faces.forEach(function (f) {
      ct.beginPath();
      f.pts.forEach(function (p, i) {
        (i ? ct.lineTo : ct.moveTo).call(ct, cx + p[0] * s, cy - p[2] * s);
      });
      ct.closePath();
      ct.fillStyle = f.c; ct.fill();
      ct.strokeStyle = '#2f3b38'; ct.lineWidth = 1.2; ct.stroke();
      if (f.prof < 0) {
        var mx = 0, my = 0;
        f.pts.forEach(function (p) { mx += cx + p[0] * s; my += cy - p[2] * s; });
        ct.fillStyle = '#2f3b38';
        ct.font = '700 ' + Math.round(s * 0.5) + 'px system-ui, sans-serif';
        ct.textAlign = 'center'; ct.textBaseline = 'middle';
        ct.fillText(f.r, mx / 4, my / 4);
      }
    });
  }

  /* =================================================================
     13. A matriz de rotação no plano
     Mostrar a matriz ao lado da figura que ela move, com o determinante
     e o produto por sua transposta calculados ao vivo, transforma três
     definições abstratas em três números que o aluno vê mudar (ou não
     mudar) enquanto arrasta o deslizante. A vista da reflexão existe
     para que o determinante -1 seja visto, e não apenas afirmado.
     ================================================================= */

  /* =================================================================
     1. Quando a multidão vira um mar de gente
     A hipótese do contínuo não é uma afirmação sobre a matéria, é uma
     afirmação sobre a escala com que se olha para ela. O widget mede a
     flutuação relativa do número de partículas numa célula e mostra
     que ela cai como o inverso da raiz da contagem: a densidade só
     passa a ser uma função bem definida quando a célula é grande o
     bastante para conter muita gente, e ainda pequena o bastante para
     ser considerada um ponto.
     ================================================================= */
  REGISTRO.escalas = function (raiz) {
    var N = 4000, est = { m: 8 };

    /* Pontos fixos: um gerador congruente de semente fixa, para que o
       desenho não mude a cada redesenho da janela. */
    var pts = (function () {
      var s = 20261108, v = [];
      function u() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
      for (var i = 0; i < N; i++) v.push([u(), u()]);
      return v;
    })();

    function contagens(m) {
      var c = new Array(m * m).fill(0), i;
      for (i = 0; i < N; i++) {
        var a = Math.min(m - 1, Math.floor(pts[i][0] * m));
        var b = Math.min(m - 1, Math.floor(pts[i][1] * m));
        c[b * m + a]++;
      }
      return c;
    }

    function estatistica(m) {
      var c = contagens(m), med = N / (m * m), s = 0;
      for (var i = 0; i < c.length; i++) s += (c[i] - med) * (c[i] - med);
      return { c: c, med: med, sig: Math.sqrt(s / c.length) };
    }

    var corpo = moldura(raiz, 'A hipótese do contínuo, medida');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'células por lado', 1, 50, 1, 8,
      function (v) { est.m = Math.round(v); desenhar(); },
      function (v) { return Math.round(v) + ' × ' + Math.round(v); });

    var mostrar = cartoes(corpo, [
      { rot: 'lado da célula', k: 'lado' },
      { rot: 'partículas por célula', k: 'med' },
      { rot: 'flutuação σ', k: 'sig' },
      { rot: 'flutuação relativa σ/⟨n⟩', k: 'rel' },
      { rot: 'previsão 1/√⟨n⟩', k: 'prev' },
      { rot: 'densidade estimada', k: 'dens' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    var MS = [1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50];

    function desenhar() {
      var e = estatistica(est.m);
      var rel = e.med > 0 ? e.sig / e.med : 0;

      /* ---- painel da esquerda: a nuvem e as células ---- */
      var p = G.preparar(cv1, 300);
      var ct = p.ct, lado = Math.min(p.L - 24, p.A - 24);
      var x0 = (p.L - lado) / 2, y0 = (p.A - lado) / 2, h = lado / est.m;
      var maxc = Math.max.apply(null, e.c);
      for (var b = 0; b < est.m; b++) for (var a = 0; a < est.m; a++) {
        var n = e.c[b * est.m + a];
        ct.fillStyle = 'rgba(63,67,145,' + (maxc ? 0.07 + 0.5 * n / maxc : 0) + ')';
        ct.fillRect(x0 + a * h, y0 + b * h, h, h);
      }
      ct.fillStyle = G.COR.tinta;
      for (var i = 0; i < N; i++) {
        ct.fillRect(x0 + pts[i][0] * lado - 0.6, y0 + pts[i][1] * lado - 0.6, 1.2, 1.2);
      }
      ct.strokeStyle = 'rgba(39,42,94,.35)'; ct.lineWidth = 1;
      for (var k = 0; k <= est.m; k++) {
        var q = Math.round(x0 + k * h) + 0.5;
        ct.beginPath(); ct.moveTo(q, y0); ct.lineTo(q, y0 + lado); ct.stroke();
        q = Math.round(y0 + k * h) + 0.5;
        ct.beginPath(); ct.moveTo(x0, q); ct.lineTo(x0 + lado, q); ct.stroke();
      }
      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 1.4;
      ct.strokeRect(x0 + 0.5, y0 + 0.5, lado - 1, lado - 1);
      rotulo(ct, N + ' partículas', x0 + 6, y0 + 10, G.COR.suave, 'left');

      /* ---- painel da direita: a lei de potência ---- */
      var dados = MS.map(function (m) {
        var q = estatistica(m);
        return { x: Math.log10(q.med), y: q.med > 0 ? q.sig / q.med : 0 };
      });
      var gr = G.eixos(cv2, {
        altura: 300, xmin: 0, xmax: Math.log10(N) + 0.1, ymin: 0, ymax: 1.25,
        margem: { e: 54, d: 14, c: 14, b: 42 },
        rotX: 'partículas por célula ⟨n⟩', rotY: 'flutuação relativa σ/⟨n⟩',
        marcasX: [0, 1, 2, 3].map(function (k) {
          return { v: k, r: ['1', '10', '100', '1000'][k] };
        }),
        formataY: function (v) { return F.fmt(v, 2); }
      });
      G.curva(gr, function (x) { return 1 / Math.sqrt(Math.pow(10, x)); },
        G.COR.vinho, 2.2, [6, 4]);
      var gc = gr.ct;
      gc.strokeStyle = G.COR.mestra; gc.lineWidth = 2.4;
      gc.beginPath();
      dados.forEach(function (d, i) {
        var px = gr.X(d.x), py = gr.Y(Math.min(gr.ymax, d.y));
        if (i === 0) gc.moveTo(px, py); else gc.lineTo(px, py);
      });
      gc.stroke();
      gc.fillStyle = G.COR.mestra;
      dados.forEach(function (d) {
        gc.beginPath();
        gc.arc(gr.X(d.x), gr.Y(Math.min(gr.ymax, d.y)), 3, 0, 2 * Math.PI);
        gc.fill();
      });
      if (e.med > 0) {
        var px = gr.X(Math.log10(e.med)), py = gr.Y(Math.min(gr.ymax, rel));
        gc.beginPath(); gc.arc(px, py, 6.5, 0, 2 * Math.PI);
        gc.strokeStyle = G.COR.bronze; gc.lineWidth = 2.6; gc.stroke();
      }
      G.legenda(gr, [
        { texto: 'medido na nuvem', cor: G.COR.mestra },
        { texto: '1/√⟨n⟩', cor: G.COR.vinho }
      ]);

      mostrar({
        lado: F.fmt(1 / est.m, 3) + ' L',
        med: F.fmt(e.med, 2),
        sig: F.fmt(e.sig, 2),
        rel: F.pct(rel, 1),
        prev: e.med > 0 ? F.pct(1 / Math.sqrt(e.med), 1) : '—',
        dens: F.fmt(e.med * est.m * est.m, 0) + ' / L²'
      });

      nota.innerHTML =
        '<p>Para falar de densidade num ponto é preciso escrever</p>'
        + '\\[\\rho=\\frac{dm}{d\\Omega},\\]'
        + '<p>e isso parece inofensivo até se perguntar o que é \\(d\\Omega\\). Se o volume '
        + 'for pequeno de verdade, ele contém uma partícula ou nenhuma, e a razão salta entre '
        + 'um valor enorme e zero conforme se desloca o ponto de medida. Se for grande, a '
        + 'razão é estável mas já não descreve ponto algum: descreve a região inteira.</p>'
        + '<p>O desenho da esquerda é a multidão vista de cima, com a tela dividida em '
        + 'células. O da direita mede, para cada tamanho de célula, a flutuação da contagem '
        + 'em torno da média, dividida pela própria média. Os pontos medidos caem sobre a '
        + 'curva tracejada</p>'
        + '\\[\\frac{\\sigma_n}{\\langle n\\rangle}=\\frac{1}{\\sqrt{\\langle n\\rangle}},\\]'
        + '<p>que é o resultado de contagem independente. Com uma partícula por célula a '
        + 'flutuação é da ordem de 100%, e o conceito de densidade local não significa nada. '
        + 'Com cem partículas ela cai para 10%, com dez mil para 1%.</p>'
        + '<p>A hipótese do contínuo é a afirmação de que existe uma <strong>janela de '
        + 'escalas</strong> em que a célula é ao mesmo tempo grande o bastante para que '
        + '\\(\\sigma_n/\\langle n\\rangle\\) seja desprezível e pequena o bastante para ser '
        + 'tratada como um ponto do problema macroscópico. Num gás à pressão atmosférica um '
        + 'cubo de um micrômetro de lado contém cerca de \\(2{,}5\\times10^{7}\\) moléculas, '
        + 'com flutuação de duas partes em dez mil, e é minúsculo em relação a qualquer '
        + 'tubulação: a janela existe com folga de muitas ordens de grandeza, e é por isso '
        + 'que a mecânica dos meios contínuos funciona.</p>'
        + '<p>Onde a janela se fecha, a teoria falha. É o caso do ar rarefeito das camadas '
        + 'altas da atmosfera, em que o livre caminho médio chega a ser comparável ao tamanho '
        + 'do veículo, e aí o tratamento tem de voltar a ser o de partículas.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     2. A massa da gotinha
     O exemplo do texto, com a integral feita de duas maneiras: a soma
     numérica dos discos, que é como o aluno imagina a integral, e a
     fórmula fechada, que é o que ele tem de obter no papel. Os dois
     números aparecem lado a lado e coincidem.
     ================================================================= */
  REGISTRO.gota = function (raiz) {
    var est = { al: 0.6 };

    var corpo = moldura(raiz, 'A massa de uma gota de densidade variável');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'inclinação da densidade α', 0, 1, 0.02, 0.6,
      function (v) { est.al = v; desenhar(); },
      function (v) { return F.fmt(v, 2); });

    var mostrar = cartoes(corpo, [
      { rot: 'M pela soma dos discos', k: 'num' },
      { rot: 'M pela fórmula fechada', k: 'exa' },
      { rot: 'diferença entre os dois', k: 'dif' },
      { rot: 'M / M da gota uniforme', k: 'raz' },
      { rot: 'densidade no polo', k: 'dm' },
      { rot: 'massa com |z| < R/2', k: 'meio' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* R = 1 e rho_0 = 1: os cartões são razões, de modo que as unidades
       não interessam e a comparação fica limpa. */
    function dens(z) { return 1 - est.al * Math.abs(z); }
    function integrando(z) { return Math.PI * (1 - z * z) * dens(z); }

    function desenhar() {
      var num = F.simpson(integrando, -1, 1, 2000);
      var exa = Math.PI * (8 - 3 * est.al) / 6;
      var meio = F.simpson(integrando, -0.5, 0.5, 1000);

      /* ---- a gota, em discos tingidos pela densidade local ---- */
      var p = G.preparar(cv1, 300);
      var ct = p.ct;
      var cx = p.L / 2, cy = p.A / 2, R = Math.min(p.L, p.A) * 0.40;
      /* o tingimento é feito linha a linha, dentro do recorte do círculo,
         para que não sobrem frestas brancas entre faixas vizinhas */
      ct.save();
      ct.beginPath(); ct.arc(cx, cy, R, 0, 2 * Math.PI); ct.clip();
      var i;
      for (i = -Math.ceil(R); i <= Math.ceil(R); i++) {
        var zm = -i / R;
        ct.fillStyle = 'rgba(63,67,145,' + (0.08 + 0.62 * dens(zm)) + ')';
        ct.fillRect(cx - R - 1, cy + i, 2 * R + 2, 1.05);
      }
      ct.restore();
      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 1.6;
      ct.beginPath(); ct.arc(cx, cy, R, 0, 2 * Math.PI); ct.stroke();
      /* o disco em destaque, com o raio a = √(R² − z²) */
      var zd = 0.45, ad = Math.sqrt(1 - zd * zd);
      ct.strokeStyle = G.COR.bronze; ct.lineWidth = 2;
      ct.beginPath();
      ct.moveTo(cx - ad * R, cy - zd * R); ct.lineTo(cx + ad * R, cy - zd * R);
      ct.stroke();
      seta(ct, cx, cy - zd * R, cx + ad * R, cy - zd * R, G.COR.bronze, 1.6);
      rotulo(ct, 'a = √(R² − z²)', cx + ad * R * 0.5, cy - zd * R - 11,
        G.COR.bronze, 'center', 'bottom');
      seta(ct, cx, cy, cx, cy - R, G.COR.vinho, 1.8);
      rotulo(ct, 'z', cx - 10, cy - R * 0.85, G.COR.vinho, 'right');
      rotulo(ct, 'mais densa no plano equatorial', cx, cy + R + 14,
        G.COR.suave, 'center', 'top');
      rotulo(ct, 'menos densa nos polos', cx, cy - R + 14, G.COR.suave, 'center', 'top');

      /* ---- o integrando, cuja área é a massa ---- */
      var gr = G.eixos(cv2, {
        altura: 300, xmin: -1, xmax: 1, ymin: 0, ymax: Math.PI * 1.3,
        margem: { e: 54, d: 14, c: 14, b: 42 },
        rotX: 'z / R', rotY: 'dM/dz em unidades de ρ₀R²',
        marcasX: G.marcasLineares(-1, 1, 4, 1),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      G.area(gr, integrando, -1, 1, 'rgba(63,67,145,.20)');
      G.curva(gr, function (z) { return Math.PI * (1 - z * z); }, G.COR.suave, 1.6, [5, 4]);
      G.curva(gr, integrando, G.COR.mestra, 2.6);
      G.legenda(gr, [
        { texto: 'π(R²−z²)(1−α|z|/R)', cor: G.COR.mestra },
        { texto: 'gota uniforme', cor: G.COR.suave }
      ]);
      rotulo(gr.ct, 'a área é M', gr.X(0), gr.Y(Math.PI * 0.42),
        G.COR.tinta, 'center', 'middle', '600 12px system-ui, sans-serif');

      mostrar({
        num: F.fmt(num, 5) + ' ρ₀R³',
        exa: F.fmt(exa, 5) + ' ρ₀R³',
        dif: F.fmt(Math.abs(num - exa), 4) + ' ρ₀R³',
        raz: F.fmt(num / (4 * Math.PI / 3), 4),
        dm: F.fmt(1 - est.al, 2) + ' ρ₀',
        meio: F.pct(meio / num, 1)
      });

      nota.innerHTML =
        '<p>A gota é praticamente esférica, de raio \\(R\\), e o sal se concentra na faixa '
        + 'equatorial, de modo que a densidade cai ao se afastar do plano \\(z=0\\) para '
        + 'qualquer um dos lados:</p>'
        + '\\[\\rho=\\rho_0\\left(1-\\frac{\\alpha|z|}{R}\\right).\\]'
        + '<p>A massa é a integral da densidade no volume, e o volume pode ser varrido por '
        + 'discos horizontais de raio \\(a=\\sqrt{R^2-z^2}\\) e área \\(A=\\pi(R^2-z^2)\\). '
        + 'Cada disco contribui com \\(dM=\\rho A\\,dz\\), e o problema de três dimensões '
        + 'virou um de uma só:</p>'
        + '\\[M=\\pi\\rho_0\\int_{-R}^{R}\\left(R^2-z^2\\right)'
        + '\\left(1-\\frac{\\alpha|z|}{R}\\right)dz.\\]'
        + '<p>O módulo no integrando incomoda, e a saída é quebrar a integral em dois '
        + 'pedaços, porque em \\(z<0\\) vale \\(|z|=-z\\) e em \\(z>0\\) vale \\(|z|=z\\). '
        + 'As duas metades dão o mesmo, e o resultado é</p>'
        + '\\[M=\\rho_0\\frac{\\pi}{6}\\left(8-3\\alpha\\right)R^3.\\]'
        + '<p>Os dois primeiros cartões comparam esse valor com a soma numérica dos discos. '
        + 'Eles coincidem até a quinta casa, o que é a verificação de que a conta no papel '
        + 'está certa. Vale conferir os dois limites: com \\(\\alpha=0\\) a gota é uniforme e '
        + 'a fórmula dá \\(\\frac{4}{3}\\pi\\rho_0R^3\\), como tem de dar; com \\(\\alpha=1\\) '
        + 'a densidade chega a zero nos polos e a massa cai a \\(5/8\\) do valor '
        + 'uniforme.</p>'
        + '<p>A curva da direita é o integrando, e a área sob ela é a massa. Ela mostra onde a '
        + 'massa está: o máximo fica no equador, porque ali o disco é largo <em>e</em> o '
        + 'material é denso, e os dois efeitos se reforçam. O último cartão mede a fração da '
        + 'massa na faixa equatorial \\(|z|&lt;R/2\\).</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     3. O fluxo através de uma superfície inclinada
     O produto escalar da definição de fluxo é a única coisa que o
     aluno precisa entender aqui, e ele fica evidente quando se vê o
     volume varrido encolher à medida que a superfície se inclina.
     ================================================================= */
  REGISTRO.fluxo = function (raiz) {
    var est = { th: 35 };

    var corpo = moldura(raiz, 'Fluxo através de uma superfície inclinada');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'ângulo θ entre a normal e a velocidade', 0, 90, 1, 35,
      function (v) { est.th = v; desenhar(); },
      function (v) { return F.fmt(v, 0) + '°'; });

    var mostrar = cartoes(corpo, [
      { rot: 'componente normal u cos θ', k: 'un' },
      { rot: 'volume varrido em δt', k: 'vol' },
      { rot: 'massa que atravessa', k: 'dm' },
      { rot: 'vazão ṁ = ρ u A cos θ', k: 'mp' },
      { rot: 'densidade de corrente j = ρu', k: 'j' },
      { rot: 'fração do fluxo máximo', k: 'fr' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    var RHO = 1000, U = 2, A = 0.05, DT = 0.1;   // água, 2 m/s, 500 cm², 0,1 s

    function desenhar() {
      var th = est.th * Math.PI / 180, c = Math.cos(th);

      /* ---- o volume varrido ---- */
      var p = G.preparar(cv1, 300);
      var ct = p.ct;
      var cx = p.L * 0.42, cy = p.A / 2, L = Math.min(p.L, p.A) * 0.33;
      var ux = 1, uy = 0;                        // a velocidade é horizontal
      var sx = -Math.sin(th), sy = -Math.cos(th);  // direção da superfície
      var d = L * 1.05 * c;                      // deslocamento u δt projetado

      var ax = cx - sx * L, ay = cy - sy * L, bx = cx + sx * L, by = cy + sy * L;
      ct.fillStyle = 'rgba(63,67,145,.16)';
      ct.beginPath();
      ct.moveTo(ax, ay); ct.lineTo(bx, by);
      ct.lineTo(bx + ux * d, by + uy * d); ct.lineTo(ax + ux * d, ay + uy * d);
      ct.closePath(); ct.fill();
      ct.strokeStyle = 'rgba(39,42,94,.45)'; ct.lineWidth = 1;
      ct.setLineDash([4, 3]); ct.stroke(); ct.setLineDash([]);

      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 3.4;
      ct.beginPath(); ct.moveTo(ax, ay); ct.lineTo(bx, by); ct.stroke();
      rotulo(ct, 'superfície de área A', bx + 6, by + 12, G.COR.tinta, 'left', 'top');

      /* a normal e a velocidade, com o ângulo entre elas */
      var nx = Math.cos(th), ny = -Math.sin(th);
      seta(ct, cx, cy, cx + nx * L * 0.8, cy + ny * L * 0.8, G.COR.vinho, 2.4);
      rotulo(ct, 'n̂', cx + nx * L * 0.9, cy + ny * L * 0.9, G.COR.vinho);
      var i;
      for (i = -2; i <= 2; i++) {
        var yy = cy + i * L * 0.42;
        seta(ct, cx - L * 1.25, yy, cx - L * 0.55, yy, G.COR.mestra, 2);
      }
      rotulo(ct, 'u', cx - L * 0.95, cy - L * 0.42 - 12, G.COR.mestra, 'center', 'bottom');
      ct.strokeStyle = G.COR.bronze; ct.lineWidth = 1.6;
      ct.beginPath(); ct.arc(cx, cy, L * 0.42, -th, 0); ct.stroke();
      rotulo(ct, 'θ', cx + L * 0.52 * Math.cos(th / 2), cy - L * 0.52 * Math.sin(th / 2),
        G.COR.bronze);
      seta(ct, cx, cy, cx + ux * d, cy + uy * d, G.COR.ambar, 2.2, [5, 4]);
      rotulo(ct, 'u δt cos θ', cx + d / 2, cy + 13, G.COR.ambar, 'center', 'top');

      /* ---- o fluxo em função do ângulo ---- */
      var gr = G.eixos(cv2, {
        altura: 300, xmin: 0, xmax: 90, ymin: -0.05, ymax: 1.08,
        margem: { e: 54, d: 14, c: 14, b: 42 },
        rotX: 'θ (graus)', rotY: 'ṁ / ṁ máximo',
        marcasX: [0, 15, 30, 45, 60, 75, 90].map(function (v) {
          return { v: v, r: String(v) };
        }),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      G.curva(gr, function (t) { return Math.cos(t * Math.PI / 180); }, G.COR.mestra, 2.6);
      G.vertical(gr, est.th, G.COR.bronze, 'θ');
      var gc = gr.ct;
      gc.fillStyle = G.COR.bronze;
      gc.beginPath(); gc.arc(gr.X(est.th), gr.Y(c), 4.5, 0, 2 * Math.PI); gc.fill();
      rotulo(gc, 'cos θ', gr.X(62), gr.Y(Math.cos(62 * Math.PI / 180)) - 12,
        G.COR.mestra, 'center', 'bottom');

      mostrar({
        un: F.fmt(U * c, 3) + ' m/s',
        vol: F.fmt(A * U * DT * c * 1e6, 0) + ' cm³',
        dm: F.fmt(RHO * A * U * DT * c, 3) + ' kg',
        mp: F.fmt(RHO * A * U * c, 2) + ' kg/s',
        j: F.fmt(RHO * U, 0) + ' kg/m²s',
        fr: F.pct(c, 1)
      });

      nota.innerHTML =
        '<p>O fluxo exige duas coisas: uma quantidade que possa escoar, com a sua densidade '
        + '\\(\\rho\\), e uma superfície atravessada. Em um intervalo \\(\\delta t\\), a massa '
        + 'que cruza um pedaço de superfície de área \\(\\delta A\\) é a que estava no volume '
        + 'varrido, e esse volume é um prisma oblíquo de base \\(\\delta A\\) e altura '
        + '\\(u\\,\\delta t\\cos\\theta\\):</p>'
        + '\\[\\delta m=\\rho\\,\\delta V=\\rho\\,\\delta A\\,u\\,\\delta t\\cos\\theta.\\]'
        + '<p>Dividindo por \\(\\delta t\\) e reconhecendo o cosseno como um produto escalar, '
        + 'a taxa com que a massa atravessa a superfície inteira fica</p>'
        + '\\[\\dot m=\\iint_S\\rho\\,\\vec u\\cdot d\\vec A,\\]'
        + '<p>onde \\(d\\vec A\\) é o elemento de área apontando ao longo da normal. A '
        + 'quantidade \\(\\vec j=\\rho\\vec u\\) é a <strong>densidade de corrente de '
        + 'massa</strong>, e é ela que carrega toda a informação sobre o transporte: o fluxo '
        + 'é o que resta depois de projetá-la na normal e somar sobre a superfície.</p>'
        + '<p>O desenho mostra por que o cosseno aparece. Inclinar a superfície não muda nem a '
        + 'sua área nem a velocidade do fluido, e ainda assim o prisma varrido encolhe, porque '
        + 'o que importa é a distância percorrida <em>na direção da normal</em>. Em '
        + '\\(\\theta=90^\\circ\\) a superfície está deitada ao longo do escoamento, o fluido '
        + 'desliza rente a ela e nada atravessa.</p>'
        + '<p>Os números usam água a \\(2\\) m/s por uma seção de \\(500\\) cm² durante '
        + '\\(0{,}1\\) s. O sinal merece atenção: com \\(d\\vec A\\) apontando para fora de um '
        + 'volume fechado, \\(\\dot m\\) positivo significa massa <em>saindo</em>, e é essa '
        + 'convenção que fixa os sinais da equação da continuidade no módulo seguinte.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     4. Divergência e o balanço numa caixa
     O teorema da divergência é fácil de enunciar e difícil de sentir.
     Aqui o aluno escolhe um campo linear, vê as quatro faces de uma
     caixa com os seus fluxos calculados um a um, e compara a soma com
     a divergência vezes a área. Os dois números são iguais, sempre, e
     é essa igualdade que vira a equação da continuidade.
     ================================================================= */
  REGISTRO.divergencia = function (raiz) {
    var est = { a: 0.8, b: -0.3 };
    var X0 = 0.45, Y0 = 0.30, H = 0.55;   // caixa de controle, em unidades do quadro

    var corpo = moldura(raiz, 'O fluxo que entra, o que sai e a divergência');

    var par = el('div', { class: 'paineis' });
    var cv = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'taxa de abertura em x, ∂j<sub>x</sub>/∂x', -1, 1, 0.05, 0.8,
      function (v) { est.a = v; desenhar(); },
      function (v) { return F.fmt(v, 2); });
    deslizante(ctr, 'taxa de abertura em y, ∂j<sub>y</sub>/∂y', -1, 1, 0.05, -0.3,
      function (v) { est.b = v; desenhar(); },
      function (v) { return F.fmt(v, 2); });

    var mostrar = cartoes(corpo, [
      { rot: 'face direita', k: 'd' },
      { rot: 'face esquerda', k: 'e' },
      { rot: 'face de cima', k: 'c' },
      { rot: 'face de baixo', k: 'b' },
      { rot: 'soma das quatro', k: 's' },
      { rot: '(∇·j) × área', k: 'div' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* Campo linear j = (a x, b y). O fluxo por face sai exato, porque a
       componente normal é constante em cada face. */
    function fluxos() {
      var h = H;
      return {
        d: est.a * (X0 + h / 2) * h,
        e: -est.a * (X0 - h / 2) * h,
        c: est.b * (Y0 + h / 2) * h,
        b: -est.b * (Y0 - h / 2) * h
      };
    }

    function desenhar() {
      var f = fluxos(), soma = f.d + f.e + f.c + f.b, div = (est.a + est.b) * H * H;

      /* ---- o campo e a caixa ---- */
      var p = G.preparar(cv, 320);
      var ct = p.ct;
      var lado = Math.min(p.L - 20, p.A - 20);
      var ox = (p.L - lado) / 2, oy = (p.A + lado) / 2;   // origem no canto de baixo
      function PX(x) { return ox + x * lado; }
      function PY(y) { return oy - y * lado; }

      var i, j, esc = lado * 0.30;
      for (i = 0; i <= 7; i++) for (j = 0; j <= 7; j++) {
        var x = i / 7, y = j / 7;
        var jx = est.a * x, jy = est.b * y;
        var m = Math.sqrt(jx * jx + jy * jy);
        if (m < 1e-6) continue;
        seta(ct, PX(x), PY(y), PX(x) + jx * esc, PY(y) - jy * esc,
          'rgba(63,67,145,.55)', 1.6);
      }

      var cxe = PX(X0 - H / 2), cxd = PX(X0 + H / 2);
      var cyb = PY(Y0 - H / 2), cyc = PY(Y0 + H / 2);
      ct.fillStyle = soma > 0 ? 'rgba(140,47,57,.12)' : 'rgba(63,67,145,.12)';
      ct.fillRect(cxe, cyc, cxd - cxe, cyb - cyc);
      ct.strokeStyle = soma > 0 ? G.COR.vinho : G.COR.mestra;
      ct.lineWidth = 2.2;
      ct.strokeRect(cxe, cyc, cxd - cxe, cyb - cyc);
      rotulo(ct, soma > 0 ? 'ralo: sai mais do que entra'
                          : 'criadouro: entra mais do que sai',
        (cxe + cxd) / 2, cyc - 10, soma > 0 ? G.COR.vinho : G.COR.mestra,
        'center', 'bottom');

      ct.strokeStyle = G.COR.suave; ct.lineWidth = 1.2;
      ct.beginPath();
      ct.moveTo(PX(0), PY(0)); ct.lineTo(PX(1.02), PY(0));
      ct.moveTo(PX(0), PY(0)); ct.lineTo(PX(0), PY(1.02));
      ct.stroke();
      rotulo(ct, 'x', PX(1.0), PY(0) + 12, G.COR.suave, 'center', 'top');
      rotulo(ct, 'y', PX(0) - 12, PY(1.0), G.COR.suave, 'right');

      /* ---- as quatro parcelas em barras ---- */
      var lim = Math.max(0.35, Math.abs(f.d), Math.abs(f.e),
        Math.abs(f.c), Math.abs(f.b), Math.abs(soma)) * 1.2;
      var gr = G.eixos(cv2, {
        altura: 320, xmin: -0.5, xmax: 5.5, ymin: -lim, ymax: lim,
        margem: { e: 56, d: 14, c: 14, b: 44 }, divY: 4,
        rotY: 'fluxo através da face',
        marcasX: [{ v: 0, r: 'dir' }, { v: 1, r: 'esq' }, { v: 2, r: 'cima' },
                  { v: 3, r: 'baixo' }, { v: 4, r: 'soma' }, { v: 5, r: '∇·j A' }],
        formataY: function (v) { return F.fmt(v, 2); }
      });
      G.barras(gr, [{ x: 0, y: f.d }, { x: 1, y: f.e }, { x: 2, y: f.c },
                    { x: 3, y: f.b }], G.COR.clara, 0.6);
      G.barras(gr, [{ x: 4, y: soma }], G.COR.mestra, 0.6);
      G.barras(gr, [{ x: 5, y: div }], G.COR.bronze, 0.6);
      var gc = gr.ct;
      gc.strokeStyle = G.COR.suave; gc.lineWidth = 1.2;
      gc.beginPath(); gc.moveTo(gr.x0, gr.Y(0)); gc.lineTo(gr.x1, gr.Y(0)); gc.stroke();

      mostrar({
        d: F.fmt(f.d, 4), e: F.fmt(f.e, 4), c: F.fmt(f.c, 4), b: F.fmt(f.b, 4),
        s: F.fmt(soma, 4), div: F.fmt(div, 4)
      });

      nota.innerHTML =
        '<p>O campo do desenho é \\(\\vet{j}=(ax,\\,by)\\), com \\(a\\) e \\(b\\) nos '
        + 'deslizantes, e a caixa é um volume de controle quadrado de lado \\(h\\). Em cada '
        + 'face a componente normal é constante, de modo que o fluxo sai sem integral '
        + 'nenhuma. Na face da direita, por exemplo, a normal aponta no sentido de \\(x\\) '
        + 'crescente e</p>'
        + '\\[\\Phi_{\\rm dir}=j_x\\left(x_0+\\tfrac{h}{2}\\right)h'
        + '=a\\left(x_0+\\tfrac{h}{2}\\right)h.\\]'
        + '<p>Na face da esquerda a normal aponta no sentido contrário, o que troca o sinal, e '
        + 'o que sobra da soma das duas é</p>'
        + '\\[\\Phi_{\\rm dir}+\\Phi_{\\rm esq}=a\\,h^2=\\pder{j_x}{x}\\,h^2.\\]'
        + '<p>O mesmo vale no outro par de faces. Somando os quatro, o fluxo líquido para fora '
        + 'da caixa vale \\(\\left(a+b\\right)h^2\\), que é exatamente '
        + '\\(\\left(\\nabla\\cdot\\vet{j}\\right)\\) vezes a área. As duas últimas barras do '
        + 'gráfico mostram esses dois números, e eles coincidem para qualquer escolha dos '
        + 'deslizantes.</p>'
        + '<p>É esse o conteúdo do <strong>teorema da divergência</strong>, aqui em duas '
        + 'dimensões e para um campo linear, mas o argumento é geral: empilhando caixas '
        + 'infinitesimais, as faces internas se cancelam duas a duas e sobra a fronteira '
        + 'externa,</p>'
        + '\\[\\oint_S\\vet{j}\\cdot d\\vet{A}'
        + '=\\iiint_\\Omega\\left(\\nabla\\cdot\\vet{j}\\right)d\\Omega.\\]'
        + '<p>A divergência positiva é um <strong>ralo</strong> do ponto de vista do volume, '
        + 'porque sai mais do que entra e o que há dentro diminui. A divergência negativa é um '
        + '<strong>criadouro</strong>. Em um fluido comum não existem nem um nem outro, e é '
        + 'essa ausência que vai produzir a equação da continuidade.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     5. A continuidade em ação
     Um pulso de densidade empurrado por um escoamento que acelera ou
     desacelera. O que se quer mostrar é que a massa dentro do tubo não
     se conserva sozinha: ela obedece a um balanço, e o balanço é
     verificado número a número enquanto a animação roda.
     ================================================================= */
  REGISTRO.continuidade = function (raiz) {
    var N = 300, DX = 1 / N;
    var est = { k: 0.9, t: 0, rodando: true };
    var rho = new Float64Array(N + 1), ini = new Float64Array(N + 1);
    var Mant = 0, dMdt = 0, difMedia = 0;

    function vel(x) { return 0.25 * (1 + est.k * x); }

    function reiniciar() {
      for (var i = 0; i <= N; i++) {
        var x = i * DX, z = (x - 0.15) / 0.05;
        rho[i] = 1 + 0.9 * Math.exp(-z * z);
        ini[i] = rho[i];
      }
      est.t = 0;
      Mant = massa();
    }

    /* A soma vai de 1 a N porque o ponto 0 é a entrada, mantida fixa, e
       não faz parte do volume de controle. Com esse recorte o esquema é
       conservativo de forma exata: somando a atualização célula a célula,
       tudo se cancela menos o fluxo nas duas pontas, e dM/dt = j(0) − j(N)
       vale para o método numérico, e não apenas no papel. */
    function massa() {
      var s = 0;
      for (var i = 1; i <= N; i++) s += rho[i] * DX;
      return s;
    }

    /* Upwind de primeira ordem: a velocidade é sempre positiva, de modo
       que a informação vem da esquerda e a derivada do fluxo é tomada
       para trás. É o esquema do módulo 9, usado aqui antes da hora. */
    function passo(dt) {
      var novo = new Float64Array(N + 1), i;
      var j0 = rho[0] * vel(0), jN = rho[N] * vel(1);
      for (i = 1; i <= N; i++) {
        var ja = rho[i - 1] * vel((i - 1) * DX);
        var jb = rho[i] * vel(i * DX);
        novo[i] = rho[i] - dt * (jb - ja) / DX;
      }
      novo[0] = 1;                       // entrada mantida em ρ = 1
      for (i = 0; i <= N; i++) rho[i] = novo[i];
      return j0 - jN;
    }

    var corpo = moldura(raiz, 'A massa que entra, a que sai e a que fica');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'aceleração do escoamento', -0.6, 2, 0.1, 0.9,
      function (v) { est.k = v; }, function (v) { return F.fmt(v, 1); });
    opcoes(ctr, [{ rot: 'pausar', v: 0 }, { rot: 'recomeçar', v: 1 }], -1,
      function (v) {
        if (v === 0) est.rodando = !est.rodando;
        else { reiniciar(); est.rodando = true; }
      });

    var mostrar = cartoes(corpo, [
      { rot: 'massa no tubo', k: 'M' },
      { rot: 'j na entrada', k: 'je' },
      { rot: 'j na saída', k: 'js' },
      { rot: 'j entrada − j saída, média', k: 'dif' },
      { rot: 'dM/dt medido', k: 'dm' },
      { rot: 'densidade máxima', k: 'max' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var i, jx = new Array(N + 1), mx = 0, imax = 0;
      for (i = 0; i <= N; i++) {
        jx[i] = rho[i] * vel(i * DX);
        if (rho[i] > mx) { mx = rho[i]; imax = i; }
      }

      var g1 = G.eixos(cv1, {
        altura: 290, xmin: 0, xmax: 1, ymin: 0, ymax: 2.2,
        margem: { e: 52, d: 14, c: 14, b: 42 },
        rotX: 'posição ao longo do tubo', rotY: 'densidade ρ',
        marcasX: G.marcasLineares(0, 1, 5, 1),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      G.curva(g1, function (x) {
        var k = Math.round(x * N); return ini[Math.max(0, Math.min(N, k))];
      }, G.COR.suave, 1.6, [5, 4]);
      G.curva(g1, function (x) {
        var k = Math.round(x * N); return rho[Math.max(0, Math.min(N, k))];
      }, G.COR.mestra, 2.6);
      G.legenda(g1, [
        { texto: 'ρ agora', cor: G.COR.mestra },
        { texto: 'ρ no início', cor: G.COR.suave }
      ]);
      rotulo(g1.ct, 't = ' + F.fmt(est.t, 2), g1.x0 + 8, g1.y0 + 12,
        G.COR.suave, 'left');

      var g2 = G.eixos(cv2, {
        altura: 290, xmin: 0, xmax: 1, ymin: 0, ymax: 1.5,
        margem: { e: 52, d: 14, c: 14, b: 42 },
        rotX: 'posição ao longo do tubo', rotY: 'velocidade e corrente',
        marcasX: G.marcasLineares(0, 1, 5, 1),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      G.curva(g2, vel, G.COR.bronze, 2.2, [6, 4]);
      G.curva(g2, function (x) {
        var k = Math.round(x * N); return jx[Math.max(0, Math.min(N, k))];
      }, G.COR.vinho, 2.6);
      G.legenda(g2, [
        { texto: 'j = ρu', cor: G.COR.vinho },
        { texto: 'u(x)', cor: G.COR.bronze }
      ]);

      mostrar({
        M: F.fmt(massa(), 4),
        je: F.fmt(jx[0], 4),
        js: F.fmt(jx[N], 4),
        dif: F.fmt(difMedia, 4),
        dm: F.fmt(dMdt, 4),
        max: F.fmt(mx, 3) + ' em x = ' + F.fmt(imax * DX, 2)
      });
    }

    function escreverNota() {
      nota.innerHTML =
        '<p>Falta um passo para fechar o raciocínio do módulo anterior. A taxa com que a massa '
        + 'varia dentro de um volume fixo \\(\\Omega\\) pode ser calculada diretamente, '
        + 'derivando a integral:</p>'
        + '\\[\\dot m_\\Omega=\\der{}{t}\\iiint_\\Omega\\rho\\,d\\Omega'
        + '=\\iiint_\\Omega\\pder{\\rho}{t}\\,d\\Omega,\\]'
        + '<p>onde a derivada entrou na integral porque o volume não se move. Essa variação só '
        + 'pode vir do fluxo através da superfície, já que massa não é criada nem destruída, e '
        + 'com a normal para fora o fluxo positivo tira massa de dentro:</p>'
        + '\\[\\iiint_\\Omega\\pder{\\rho}{t}\\,d\\Omega'
        + '+\\iiint_\\Omega\\nabla\\cdot\\left(\\rho\\vet{u}\\right)d\\Omega=0.\\]'
        + '<p>O volume é arbitrário, e uma integral que se anula em qualquer volume só pode ter '
        + 'integrando nulo. Daí a <strong>equação da continuidade</strong>:</p>'
        + '\\[\\pder{\\rho}{t}+\\nabla\\cdot\\left(\\rho\\vet{u}\\right)=0.\\]'
        + '<p>O widget resolve essa equação em uma dimensão, com a velocidade crescendo ou '
        + 'diminuindo ao longo do tubo conforme o deslizante. Vale olhar para dois fatos ao '
        + 'mesmo tempo. O primeiro é local: onde o escoamento acelera, a mesma massa é '
        + 'esticada por um trecho maior e a densidade cai, o que se vê o pulso achatar '
        + 'enquanto avança. O segundo é global: os cartões comparam \\(dM/dt\\), medido pela '
        + 'variação da massa dentro do tubo, com a diferença entre a corrente que entra e a '
        + 'que sai. Os dois números são iguais a cada instante, e é esse o balanço que a '
        + 'equação expressa ponto a ponto.</p>'
        + '<p>Nada aqui é específico de massa. Trocando \\(\\rho\\) por densidade de energia ou '
        + 'por concentração de uma espécie química, a mesma equação aparece de novo nos '
        + 'módulos 10 e 13, e com um termo extra do lado direito quando houver fonte, como uma '
        + 'reação química ou um aquecimento por efeito Joule.</p>';
      tipografar(corpo);
    }

    reiniciar();
    escreverNota();
    registrarRedesenho(desenhar);

    (function animar() {
      if (est.rodando) {
        var umax = Math.max(vel(0), vel(1));
        var dt = 0.4 * DX / umax, acc = 0;
        for (var s = 0; s < 6; s++) { acc += passo(dt) * dt; est.t += dt; }
        var M = massa();
        /* os dois números são medidos no mesmo intervalo: a variação da
           massa de um lado, a média da diferença de correntes do outro */
        dMdt = (M - Mant) / (6 * dt);
        difMedia = acc / (6 * dt);
        Mant = M;
        if (est.t > 3.2) reiniciar();
        desenhar();
      }
      requestAnimationFrame(animar);
    })();
  };

  /* =================================================================
     6. O bico da mangueira
     A conta mais usada do assunto, feita com o desenho ao lado para
     que a razão entre os diâmetros e a razão entre as velocidades
     deixem de ser dois números soltos.
     ================================================================= */
  REGISTRO.tubo = function (raiz) {
    var est = { d2: 0.10 };
    var D1 = 0.20, U1 = 1.0, RHO = 1000;

    var corpo = moldura(raiz, 'O tubo que estreita');

    var cv = el('canvas');
    corpo.appendChild(cv);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'diâmetro do bico', 0.04, 0.26, 0.005, 0.10,
      function (v) { est.d2 = v; desenhar(); },
      function (v) { return F.fmt(v * 100, 1) + ' cm'; });

    var mostrar = cartoes(corpo, [
      { rot: 'razão de diâmetros', k: 'rd' },
      { rot: 'razão de áreas', k: 'ra' },
      { rot: 'velocidade no bico', k: 'u2' },
      { rot: 'vazão volumétrica', k: 'qv' },
      { rot: 'vazão mássica', k: 'qm' },
      { rot: 'energia cinética por kg', k: 'ec' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var r = est.d2 / D1, u2 = U1 / (r * r);

      var p = G.preparar(cv, 250);
      var ct = p.ct;
      var cy = p.A * 0.46, esc = p.A * 0.40 / D1;
      var xa = p.L * 0.06, xb = p.L * 0.46, xc = p.L * 0.62, xd = p.L * 0.95;
      var h1 = D1 * esc / 2, h2 = est.d2 * esc / 2;

      function perfil(x) {
        if (x <= xb) return h1;
        if (x >= xc) return h2;
        var s = (x - xb) / (xc - xb);
        return h1 + (h2 - h1) * (1 - Math.cos(Math.PI * s)) / 2;
      }

      ct.fillStyle = 'rgba(63,67,145,.12)';
      ct.beginPath();
      var x, i;
      ct.moveTo(xa, cy - perfil(xa));
      for (x = xa; x <= xd; x += 2) ct.lineTo(x, cy - perfil(x));
      for (x = xd; x >= xa; x -= 2) ct.lineTo(x, cy + perfil(x));
      ct.closePath(); ct.fill();

      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 2.4;
      [-1, 1].forEach(function (s) {
        ct.beginPath();
        ct.moveTo(xa, cy + s * perfil(xa));
        for (x = xa; x <= xd; x += 2) ct.lineTo(x, cy + s * perfil(x));
        ct.stroke();
      });

      /* linhas de corrente: a mesma fração do raio em cada seção, de modo
         que o aperto entre elas mostra a aceleração */
      ct.strokeStyle = 'rgba(63,67,145,.45)'; ct.lineWidth = 1.2;
      for (i = 1; i <= 3; i++) {
        [-1, 1].forEach(function (s) {
          ct.beginPath();
          ct.moveTo(xa, cy + s * perfil(xa) * i / 4);
          for (x = xa; x <= xd; x += 2) ct.lineTo(x, cy + s * perfil(x) * i / 4);
          ct.stroke();
        });
      }

      /* setas de velocidade, com comprimento proporcional a u */
      var L1 = p.L * 0.07;
      seta(ct, xa + 12, cy, xa + 12 + L1, cy, G.COR.mestra, 2.6);
      rotulo(ct, 'u₁ = ' + F.fmt(U1, 1) + ' m/s', xa + 12 + L1 / 2, cy - 12,
        G.COR.mestra, 'center', 'bottom');
      var L2 = Math.min(p.L * 0.30, L1 * u2 / U1);
      seta(ct, xc + 8, cy, xc + 8 + L2, cy, G.COR.vinho, 2.6);
      rotulo(ct, 'u₂ = ' + F.fmt(u2, 2) + ' m/s', xc + 8 + L2 / 2, cy + 12,
        G.COR.vinho, 'center', 'top');

      /* cotas dos diâmetros */
      [[xa + 30, h1, 'D₁ = ' + F.fmt(D1 * 100, 0) + ' cm', G.COR.tinta],
       [xd - 30, h2, 'D₂ = ' + F.fmt(est.d2 * 100, 1) + ' cm', G.COR.tinta]
      ].forEach(function (q) {
        seta(ct, q[0], cy - q[1], q[0], cy + q[1], q[3], 1.4);
        seta(ct, q[0], cy + q[1], q[0], cy - q[1], q[3], 1.4);
        rotulo(ct, q[2], q[0], cy + q[1] + 14, q[3], 'center', 'top');
      });

      var qv = U1 * Math.PI * D1 * D1 / 4;
      mostrar({
        rd: F.fmt(r, 3),
        ra: F.fmt(r * r, 4),
        u2: F.fmt(u2, 3) + ' m/s',
        qv: F.fmt(qv * 1000, 2) + ' L/s',
        qm: F.fmt(qv * RHO, 2) + ' kg/s',
        ec: F.fmt(u2 * u2 / 2, 2) + ' J/kg'
      });

      nota.innerHTML =
        '<p>Num escoamento incompressível a densidade não varia nem no tempo nem no espaço, de '
        + 'modo que a equação da continuidade se reduz a</p>'
        + '\\[\\nabla\\cdot\\vet{u}=0.\\]'
        + '<p>Aplicada a um trecho de tubo, essa condição diz que a massa que entra por uma '
        + 'seção tem de sair pela outra. Com \\(u\\) entendida como a velocidade média na '
        + 'seção,</p>'
        + '\\[\\dot Q=\\rho u_1S_1=\\rho u_2S_2,\\]'
        + '<p>e, como a seção de um tubo circular vale \\(S=\\pi D^2/4\\), a razão entre as '
        + 'velocidades é o inverso do quadrado da razão entre os diâmetros:</p>'
        + '\\[\\frac{u_2}{u_1}=\\left(\\frac{D_1}{D_2}\\right)^2.\\]'
        + '<p>É uma dependência violenta, e o deslizante deixa isso evidente: reduzir o '
        + 'diâmetro à metade multiplica a velocidade por quatro. Com \\(D_1=20\\) cm e '
        + '\\(u_1=1\\) m/s, o bico que faz a água sair a \\(4\\) m/s tem de ter exatamente '
        + '\\(10\\) cm, porque \\(D_2=D_1\\sqrt{u_1/u_2}\\).</p>'
        + '<p>O último cartão mostra o que essa aceleração custa. A energia cinética por '
        + 'unidade de massa vai com \\(u^2\\), e portanto com a quarta potência da razão de '
        + 'diâmetros, o que já antecipa o teorema de Bernoulli do módulo 5: a energia que '
        + 'aparece como movimento tem de sair da pressão, e é por isso que a pressão cai onde '
        + 'o tubo estreita.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     7. A derivada material
     O escoamento é permanente, a velocidade em cada ponto não muda com
     o tempo, e ainda assim o elemento de fluido acelera. Esse é o
     ponto que mais custa a entrar, e ele só convence quando se vê a
     mesma partícula passando por pontos de velocidades diferentes.
     ================================================================= */
  REGISTRO.material = function (raiz) {
    var est = { k: 1.6, t: 0, x: 0.05, rodando: true };
    var U0 = 0.22, XP = 0.55;          // sonda fixa em x = 0,55
    var hist = [];

    function vel(x) { return U0 * (1 + est.k * x); }
    function dvel() { return U0 * est.k; }          // du/dx, constante

    function reiniciar() { est.t = 0; est.x = 0.05; hist = []; }

    var corpo = moldura(raiz, 'Escoamento permanente, partícula acelerada');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'aceleração do escoamento', 0, 3, 0.1, 1.6,
      function (v) { est.k = v; reiniciar(); }, function (v) { return F.fmt(v, 1); });
    opcoes(ctr, [{ rot: 'pausar', v: 0 }, { rot: 'recomeçar', v: 1 }], -1,
      function (v) {
        if (v === 0) est.rodando = !est.rodando;
        else { reiniciar(); est.rodando = true; }
      });

    var mostrar = cartoes(corpo, [
      { rot: 'posição da partícula', k: 'x' },
      { rot: 'velocidade dela', k: 'u' },
      { rot: '∂u/∂t na sonda', k: 'dt' },
      { rot: 'u ∂u/∂x', k: 'conv' },
      { rot: 'Du/Dt', k: 'mat' },
      { rot: 'u na sonda fixa', k: 'sonda' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var u = vel(est.x), conv = u * dvel();

      /* ---- o tubo, as setas e a partícula ---- */
      var p = G.preparar(cv1, 250);
      var ct = p.ct;
      var xa = p.L * 0.06, xb = p.L * 0.94, cy = p.A * 0.45, h = p.A * 0.22;
      ct.fillStyle = 'rgba(63,67,145,.08)';
      ct.fillRect(xa, cy - h, xb - xa, 2 * h);
      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 2;
      ct.beginPath();
      ct.moveTo(xa, cy - h); ct.lineTo(xb, cy - h);
      ct.moveTo(xa, cy + h); ct.lineTo(xb, cy + h);
      ct.stroke();

      var i;
      for (i = 0; i <= 9; i++) {
        var xx = i / 9, px = xa + xx * (xb - xa);
        var c = vel(xx) / vel(1) * (xb - xa) * 0.085;
        seta(ct, px, cy - h * 0.55, px + c, cy - h * 0.55, 'rgba(63,67,145,.55)', 1.8);
        seta(ct, px, cy + h * 0.55, px + c, cy + h * 0.55, 'rgba(63,67,145,.55)', 1.8);
      }

      var ppx = xa + Math.min(1, est.x) * (xb - xa);
      ct.fillStyle = G.COR.vinho;
      ct.beginPath(); ct.arc(ppx, cy, 7, 0, 2 * Math.PI); ct.fill();
      seta(ct, ppx, cy, ppx + u / vel(1) * (xb - xa) * 0.16, cy, G.COR.vinho, 2.6);
      rotulo(ct, 'partícula', ppx, cy - 14, G.COR.vinho, 'center', 'bottom');

      var spx = xa + XP * (xb - xa);
      ct.strokeStyle = G.COR.bronze; ct.lineWidth = 2;
      ct.setLineDash([4, 3]);
      ct.beginPath(); ct.moveTo(spx, cy - h - 10); ct.lineTo(spx, cy + h + 10); ct.stroke();
      ct.setLineDash([]);
      rotulo(ct, 'sonda fixa', spx, cy + h + 14, G.COR.bronze, 'center', 'top');

      /* ---- as duas leituras de velocidade contra o tempo ---- */
      var gr = G.eixos(cv2, {
        altura: 250, xmin: 0, xmax: 3, ymin: 0, ymax: U0 * (1 + est.k) * 1.15 + 0.01,
        margem: { e: 54, d: 14, c: 14, b: 42 },
        rotX: 'tempo', rotY: 'velocidade',
        marcasX: G.marcasLineares(0, 3, 6, 1),
        formataY: function (v) { return F.fmt(v, 2); }
      });
      G.curva(gr, function () { return vel(XP); }, G.COR.bronze, 2.2, [6, 4]);
      var gc = gr.ct;
      gc.strokeStyle = G.COR.vinho; gc.lineWidth = 2.6;
      gc.beginPath();
      hist.forEach(function (q, i) {
        var px = gr.X(q[0]), py = gr.Y(Math.min(gr.ymax, q[1]));
        if (i === 0) gc.moveTo(px, py); else gc.lineTo(px, py);
      });
      gc.stroke();
      G.legenda(gr, [
        { texto: 'a partícula sente', cor: G.COR.vinho },
        { texto: 'a sonda mede', cor: G.COR.bronze }
      ]);

      mostrar({
        x: F.fmt(est.x, 3),
        u: F.fmt(u, 4),
        dt: '0',
        conv: F.fmt(conv, 4),
        mat: F.fmt(conv, 4),
        sonda: F.fmt(vel(XP), 4)
      });
    }

    function escreverNota() {
      nota.innerHTML =
        '<p>Há duas maneiras de medir a velocidade de um fluido. Uma é fincar uma sonda num '
        + 'ponto do espaço e anotar o que passa por ali, que é o ponto de vista de '
        + '<strong>Euler</strong>. A outra é marcar um elemento de fluido com corante e '
        + 'seguir esse elemento, que é o ponto de vista de <strong>Lagrange</strong>. As duas '
        + 'medidas respondem perguntas diferentes, e a segunda lei de Newton só vale para a '
        + 'segunda, porque é o elemento de fluido que tem massa.</p>'
        + '<p>No desenho o escoamento é <strong>permanente</strong>: a velocidade em cada '
        + 'ponto não muda com o tempo, de modo que a sonda fixa mede sempre o mesmo valor e '
        + '\\(\\pder{\\vet{u}}{t}=0\\). A partícula marcada, no entanto, acelera, porque ela '
        + 'vai ocupando pontos onde a velocidade é maior. Não há contradição alguma: são duas '
        + 'derivadas diferentes da mesma função.</p>'
        + '<p>Para escrever a aceleração do elemento basta aplicar a regra da cadeia à '
        + 'velocidade avaliada na posição da partícula, \\(\\vet{u}(x(t),y(t),z(t),t)\\):</p>'
        + '\\[\\frac{D\\vet{u}}{Dt}=\\pder{\\vet{u}}{t}'
        + '+\\pder{\\vet{u}}{x}\\der{x}{t}'
        + '+\\pder{\\vet{u}}{y}\\der{y}{t}'
        + '+\\pder{\\vet{u}}{z}\\der{z}{t}.\\]'
        + '<p>As três derivadas das coordenadas são as próprias componentes da velocidade, e o '
        + 'que sobra se escreve de forma compacta como</p>'
        + '\\[\\frac{D\\vet{u}}{Dt}=\\pder{\\vet{u}}{t}'
        + '+\\left(\\vet{u}\\cdot\\nabla\\right)\\vet{u}.\\]'
        + '<p>O primeiro termo é a parte <strong>local</strong>, que mede se o escoamento '
        + 'inteiro está mudando com o tempo. O segundo é a parte <strong>convectiva</strong>, '
        + 'que mede o que a partícula encontra ao se deslocar. Os cartões mostram os dois '
        + 'separadamente: aqui o local é exatamente zero e todo o resto da aceleração vem da '
        + 'convecção.</p>'
        + '<p>O exemplo prático desse termo é o bocal de uma mangueira. A água dentro dele está '
        + 'em regime permanente, nada muda com o tempo, e mesmo assim ela sai muito mais '
        + 'rápido do que entrou. Quem acelera essa água é a diferença de pressão entre a '
        + 'entrada e a saída do bocal, e é exatamente isso que a equação de Euler vai '
        + 'afirmar.</p>';
      tipografar(corpo);
    }

    escreverNota();
    registrarRedesenho(desenhar);

    (function animar() {
      if (est.rodando) {
        var dt = 0.012, s;
        for (s = 0; s < 2; s++) {
          /* Runge-Kutta de segunda ordem para dx/dt = u(x) */
          var k1 = vel(est.x), k2 = vel(est.x + dt * k1 / 2);
          est.x += dt * k2;
          est.t += dt;
          hist.push([est.t, vel(est.x)]);
        }
        if (est.x > 1 || est.t > 3) reiniciar();
        desenhar();
      }
      requestAnimationFrame(animar);
    })();
  };

  /* =================================================================
     8. A pressão e o empuxo
     As forças de contato entram na equação como o gradiente de uma
     pressão, e isso soa abstrato. O cubo mergulhado mostra o que esse
     gradiente faz: a face de baixo está mais fundo, logo sob pressão
     maior, e a diferença entre as duas faces é o empuxo de Arquimedes.
     ================================================================= */
  REGISTRO.empuxo = function (raiz) {
    var est = { rc: 700, a: 0.20, h: 1.20 };
    var RHO = 1000, G0 = 9.80665, PATM = 101325;

    var corpo = moldura(raiz, 'De onde sai o empuxo');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'densidade do corpo', 200, 2000, 20, 700,
      function (v) { est.rc = v; desenhar(); },
      function (v) { return F.fmt(v, 0) + ' kg/m³'; });
    deslizante(ctr, 'profundidade do centro', 0.3, 2.5, 0.05, 1.2,
      function (v) { est.h = v; desenhar(); },
      function (v) { return F.fmt(v, 2) + ' m'; });

    var mostrar = cartoes(corpo, [
      { rot: 'pressão no topo', k: 'pt' },
      { rot: 'pressão no fundo', k: 'pf' },
      { rot: 'força no topo', k: 'ft' },
      { rot: 'força no fundo', k: 'ff' },
      { rot: 'resultante das pressões', k: 'res' },
      { rot: 'peso do corpo', k: 'peso' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var a = est.a, V = a * a * a, A = a * a;
      var zt = est.h - a / 2, zf = est.h + a / 2;      // profundidades das faces
      var pt = PATM + RHO * G0 * zt, pf = PATM + RHO * G0 * zf;
      var ft = pt * A, ff = pf * A;
      var res = ff - ft;                                 // empuxo, para cima
      var peso = est.rc * V * G0;
      var acel = (res - peso) / (est.rc * V);

      /* ---- o tanque e o cubo ----
         O cubo é desenhado com tamanho fixo e a profundidade entra como
         cota, porque em escala verdadeira ele ficaria do tamanho de uma
         unha ao lado de dois metros de água. As setas de pressão, essas
         sim, são proporcionais à pressão manométrica de cada face, que
         é o que o desenho precisa mostrar. */
      var p = G.preparar(cv1, 300);
      var ct = p.ct;
      var sup = 26;
      ct.fillStyle = 'rgba(63,67,145,.09)';
      ct.fillRect(8, sup, p.L - 16, p.A - sup - 6);
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2;
      ct.beginPath(); ct.moveTo(8, sup); ct.lineTo(p.L - 8, sup); ct.stroke();
      rotulo(ct, 'superfície livre', p.L - 12, sup - 5, G.COR.mestra, 'right', 'bottom');

      var la = Math.min(96, p.L * 0.26);
      var cx = p.L * 0.46, cy = p.A * 0.60;
      var esl = 62 / (RHO * G0 * 2.6);          // pascal manométrico para pixel

      var n = 3, i, fx, fy;
      for (i = 0; i < n; i++) {
        fx = cx - la / 2 + la * (i + 0.5) / n;
        seta(ct, fx, cy - la / 2 - RHO * G0 * zt * esl, fx, cy - la / 2,
          G.COR.mestra, 2);
        seta(ct, fx, cy + la / 2 + RHO * G0 * zf * esl, fx, cy + la / 2,
          G.COR.mestra, 2);
        fy = cy - la / 2 + la * (i + 0.5) / n;
        var cl = RHO * G0 * (zt + (zf - zt) * (i + 0.5) / n) * esl;
        seta(ct, cx - la / 2 - cl, fy, cx - la / 2, fy, 'rgba(63,67,145,.40)', 1.6);
        seta(ct, cx + la / 2 + cl, fy, cx + la / 2, fy, 'rgba(63,67,145,.40)', 1.6);
      }

      ct.fillStyle = 'rgba(140,47,57,.18)';
      ct.fillRect(cx - la / 2, cy - la / 2, la, la);
      ct.strokeStyle = G.COR.vinho; ct.lineWidth = 2;
      ct.strokeRect(cx - la / 2, cy - la / 2, la, la);
      rotulo(ct, 'lado a = ' + F.fmt(a * 100, 0) + ' cm', cx, cy,
        G.COR.vinho, 'center', 'middle');

      /* cota da profundidade até a face de cima */
      var xq = cx - la / 2 - 70;
      seta(ct, xq, sup, xq, cy - la / 2, G.COR.suave, 1.4);
      seta(ct, xq, cy - la / 2, xq, sup, G.COR.suave, 1.4);
      rotulo(ct, F.fmt(zt, 2) + ' m', xq - 6, (sup + cy - la / 2) / 2,
        G.COR.suave, 'right');

      rotulo(ct, 'p no topo', cx, cy - la / 2 - RHO * G0 * zt * esl - 6,
        G.COR.mestra, 'center', 'bottom');
      rotulo(ct, 'p no fundo', cx, cy + la / 2 + RHO * G0 * zf * esl + 6,
        G.COR.mestra, 'center', 'top');
      rotulo(ct, 'as laterais se cancelam', cx + la / 2 + 56, cy,
        G.COR.suave, 'left');

      /* ---- as forças verticais em barras ---- */
      var lim = Math.max(res, peso) * 1.3 + 1;
      var gr = G.eixos(cv2, {
        altura: 300, xmin: -0.5, xmax: 2.5, ymin: 0, ymax: lim,
        margem: { e: 62, d: 14, c: 14, b: 44 }, divY: 4,
        rotY: 'força (N)',
        marcasX: [{ v: 0, r: 'empuxo' }, { v: 1, r: 'ρf g V' }, { v: 2, r: 'peso' }],
        formataY: function (v) { return F.fmt(v, 0); }
      });
      G.barras(gr, [{ x: 0, y: res }], G.COR.mestra, 0.5);
      G.barras(gr, [{ x: 1, y: RHO * G0 * V }], G.COR.clara, 0.5);
      G.barras(gr, [{ x: 2, y: peso }], G.COR.vinho, 0.5);
      rotulo(gr.ct, acel > 0.005 ? 'sobe' : (acel < -0.005 ? 'desce' : 'equilíbrio'),
        gr.X(1), gr.y0 + 14,
        acel > 0.005 ? G.COR.mestra : (acel < -0.005 ? G.COR.vinho : G.COR.suave));
      rotulo(gr.ct, 'a = ' + F.fmt(acel, 2) + ' m/s²', gr.X(1), gr.y0 + 30,
        G.COR.suave);

      mostrar({
        pt: F.fmt(pt / 1000, 2) + ' kPa',
        pf: F.fmt(pf / 1000, 2) + ' kPa',
        ft: F.fmt(ft, 0) + ' N',
        ff: F.fmt(ff, 0) + ' N',
        res: F.fmt(res, 2) + ' N',
        peso: F.fmt(peso, 2) + ' N'
      });

      nota.innerHTML =
        '<p>A pressão é o resultado das trocas de momento linear através da superfície que '
        + 'separa dois elementos vizinhos, e ela atua sempre no sentido contrário à normal '
        + 'externa. A força de contato sobre o elemento inteiro é, portanto,</p>'
        + '\\[-\\oint_S p\\,d\\vet{A}=-\\iiint_\\Omega\\nabla p\\,d\\Omega,\\]'
        + '<p>onde o teorema da divergência foi aplicado componente a componente. O que entra '
        + 'na equação de movimento não é a pressão, é o seu <strong>gradiente</strong>: um '
        + 'corpo mergulhado a dez metros ou a mil, com pressão uniforme à sua volta, não '
        + 'sentiria força nenhuma.</p>'
        + '<p>O cubo do desenho mostra o gradiente em ação. As quatro faces laterais estão aos '
        + 'pares em profundidades iguais, de modo que as forças horizontais se cancelam. As '
        + 'faces de cima e de baixo não: a de baixo está mais fundo e sofre pressão maior. A '
        + 'diferença vale</p>'
        + '\\[E=\\left(p_{\\rm f}-p_{\\rm t}\\right)A'
        + '=\\varrho_{\\rm f}\\,g\\,a\\cdot a^2=\\varrho_{\\rm f}\\,g\\,V,\\]'
        + '<p>que é o <strong>empuxo de Arquimedes</strong>, igual ao peso do fluido '
        + 'deslocado. As duas primeiras barras do gráfico mostram a resultante medida face a '
        + 'face e a previsão \\(\\varrho_{\\rm f}gV\\), e elas coincidem. Arquimedes deixa de '
        + 'ser um princípio à parte e passa a ser uma consequência de \\(-\\nabla p\\).</p>'
        + '<p>Repare que as pressões absolutas são enormes, da ordem de uma centena de '
        + 'quilopascal, e que a resultante é pequena. Quase tudo o que as duas faces sofrem é '
        + 'a pressão atmosférica, que se cancela exatamente por ser a mesma em cima e embaixo. '
        + 'Essa é a razão prática de se trabalhar com a pressão manométrica, medida a partir '
        + 'da atmosférica, em quase todo problema de hidrostática.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* ---------- inicialização ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-widget]'), function (n) {
      var f = REGISTRO[n.getAttribute('data-widget')];
      if (f) {
        try { f(n); }
        catch (e) {
          n.innerHTML = '<div class="saida">Não foi possível carregar este componente.</div>';
          if (window.console) console.error(e);
        }
      }
    });
  });
})();
