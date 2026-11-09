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
        + 'separadamente: aqui o local é exatamente zero e todo o resto da aceleração vem do '
        + 'termo convectivo.</p>'
        + '<p>O nome é consagrado e é impreciso. Transporte pelo simples deslocamento do '
        + 'fluido chama-se <strong>advecção</strong>; <strong>convecção</strong>, em sentido '
        + 'estrito, é o que acontece quando advecção e difusão atuam juntas, como na parede '
        + 'quente que aquece o ar subindo ao longo dela. No fluido ideal deste módulo não há '
        + 'difusão nenhuma, de modo que o que existe aqui é advecção pura.</p>'
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

  /* =================================================================
     9. O paradoxo hidrostático
     Três vasos de mesma base e mesma altura de líquido, com volumes
     muito diferentes, têm a mesma pressão no fundo e a mesma força
     sobre a base. O vaso que contém menos líquido empurra a base com
     a mesma força que o que contém mais, e isso parece violar alguma
     coisa até se perceber que as paredes inclinadas também empurram.
     ================================================================= */
  REGISTRO.stevin = function (raiz) {
    var est = { h: 0.60, rho: 1000 };
    var G0 = 9.80665, ABASE = 0.020;        // base de 200 cm², igual nos três

    var corpo = moldura(raiz, 'Mesma altura, mesma pressão, pesos diferentes');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'altura da coluna', 0.10, 1.00, 0.02, 0.60,
      function (v) { est.h = v; desenhar(); },
      function (v) { return F.fmt(v * 100, 0) + ' cm'; });
    opcoes(ctr, [{ rot: 'água', v: 1000 }, { rot: 'óleo', v: 850 },
                 { rot: 'glicerina', v: 1260 }, { rot: 'mercúrio', v: 13546 }], 0,
      function (v) { est.rho = v; desenhar(); });

    var mostrar = cartoes(corpo, [
      { rot: 'pressão no fundo', k: 'p' },
      { rot: 'força sobre a base', k: 'f' },
      { rot: 'peso no vaso reto', k: 'w1' },
      { rot: 'peso no vaso que abre', k: 'w2' },
      { rot: 'peso no vaso que fecha', k: 'w3' },
      { rot: 'coluna equivalente de água', k: 'eq' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* Três vasos de mesma base e mesma altura: reto, tronco que abre e
       tronco que fecha. O fator é a razão entre o raio no topo e na base. */
    var VASOS = [
      { rot: 'reto', f: 1.0 },
      { rot: 'abre', f: 1.8 },
      { rot: 'fecha', f: 0.45 }
    ];

    function volume(f) {
      /* tronco de cone de raio r0 na base e f·r0 no topo */
      var r0 = Math.sqrt(ABASE / Math.PI);
      return Math.PI * r0 * r0 * est.h * (1 + f + f * f) / 3;
    }

    function desenhar() {
      var p = est.rho * G0 * est.h, Fb = p * ABASE;

      var pa = G.preparar(cv1, 320);
      var ct = pa.ct;
      var base = pa.A - 62, esc = (pa.A - 96) / 1.0;
      var larg = pa.L / 3;

      VASOS.forEach(function (v, i) {
        var cx = larg * (i + 0.5);
        var r0 = larg * 0.17, h = est.h * esc;
        var rt = r0 * v.f;
        ct.fillStyle = 'rgba(63,67,145,.16)';
        ct.beginPath();
        ct.moveTo(cx - r0, base); ct.lineTo(cx + r0, base);
        ct.lineTo(cx + rt, base - h); ct.lineTo(cx - rt, base - h);
        ct.closePath(); ct.fill();
        ct.strokeStyle = G.COR.tinta; ct.lineWidth = 2;
        ct.beginPath();
        ct.moveTo(cx - rt, base - h); ct.lineTo(cx - r0, base);
        ct.lineTo(cx + r0, base); ct.lineTo(cx + rt, base - h);
        ct.stroke();
        ct.strokeStyle = G.COR.mestra; ct.lineWidth = 1.6;
        ct.beginPath();
        ct.moveTo(cx - rt, base - h); ct.lineTo(cx + rt, base - h); ct.stroke();
        rotulo(ct, v.rot, cx, base + 6, G.COR.suave, 'center', 'top');
        rotulo(ct, F.fmt(volume(v.f) * 1000, 1) + ' L', cx, base - h - 8,
          G.COR.suave, 'center', 'bottom');
        /* a força que o líquido faz sobre a base, igual nos três */
        seta(ct, cx, base + 24, cx, base + 44, G.COR.vinho, 2.4);
      });
      rotulo(ct, 'a mesma força sobre as três bases', pa.L / 2, base + 48,
        G.COR.vinho, 'center', 'top');

      /* perfil de pressão */
      var pmax = est.rho * G0 * 1.0 / 1000;
      var gr = G.eixos(cv2, {
        altura: 300, xmin: 0, xmax: Math.max(1, pmax * 1.05), ymin: 0, ymax: 1,
        margem: { e: 58, d: 14, c: 14, b: 44 },
        rotX: 'pressão manométrica (kPa)', rotY: 'profundidade (m)',
        marcasX: G.marcasLineares(0, Math.max(1, pmax * 1.05), 5,
          pmax > 20 ? 0 : 1),
        formataY: function (v) { return F.fmt(1 - v, 1); }
      });
      /* o eixo vertical é profundidade medida para baixo, de modo que a
         reta de Stevin aparece como uma diagonal */
      var gc = gr.ct;
      gc.strokeStyle = G.COR.mestra; gc.lineWidth = 2.8;
      gc.beginPath();
      gc.moveTo(gr.X(0), gr.Y(1));
      gc.lineTo(gr.X(est.rho * G0 * est.h / 1000), gr.Y(1 - est.h));
      gc.stroke();
      gc.setLineDash([5, 4]); gc.strokeStyle = G.COR.suave; gc.lineWidth = 1.4;
      gc.beginPath();
      gc.moveTo(gr.x0, gr.Y(1 - est.h)); gc.lineTo(gr.x1, gr.Y(1 - est.h));
      gc.stroke(); gc.setLineDash([]);
      rotulo(gc, 'fundo', gr.x1 - 6, gr.Y(1 - est.h) - 6,
        G.COR.suave, 'right', 'bottom');
      rotulo(gc, 'superfície', gr.X(0) + 8, gr.Y(1) + 8,
        G.COR.suave, 'left', 'top');
      rotulo(gc, 'p = ϱgh', gr.X(est.rho * G0 * est.h / 1000) - 8,
        gr.Y(1 - est.h / 2), G.COR.mestra, 'right');

      mostrar({
        p: F.fmt(p / 1000, 2) + ' kPa',
        f: F.fmt(Fb, 1) + ' N',
        w1: F.fmt(volume(1.0) * est.rho * G0, 1) + ' N',
        w2: F.fmt(volume(1.8) * est.rho * G0, 1) + ' N',
        w3: F.fmt(volume(0.45) * est.rho * G0, 1) + ' N',
        eq: F.fmt(p / (1000 * G0) * 100, 1) + ' cm'
      });

      nota.innerHTML =
        '<p>Num fluido em repouso a equação de Euler perde o lado esquerdo inteiro e sobra o '
        + 'equilíbrio entre o peso e o gradiente de pressão:</p>'
        + '\\[\\nabla p=\\rho\\vet{g}=-\\rho\\nabla\\Psi.\\]'
        + '<p>Para densidade uniforme e campo uniforme, com \\(\\Psi=-gz\\) medido para cima, '
        + 'a integração é imediata e dá a <strong>lei de Stevin</strong>,</p>'
        + '\\[p=p_0+\\rho g h,\\]'
        + '<p>com \\(h\\) a profundidade abaixo da superfície livre. A pressão depende da '
        + 'profundidade e de nada mais: não depende da forma do vaso, do volume contido nem '
        + 'da largura da superfície.</p>'
        + '<p>Os três vasos do desenho têm a mesma base e a mesma altura de líquido, e contêm '
        + 'volumes muito diferentes. A pressão no fundo é a mesma nos três, e portanto a '
        + 'força sobre a base também. Os cartões mostram que o peso do líquido, esse sim, '
        + 'difere bastante, e que no vaso que abre o peso é maior que a força sobre a base, '
        + 'enquanto no que fecha é menor. É o <strong>paradoxo hidrostático</strong>, e a '
        + 'saída é lembrar que as paredes inclinadas não são verticais: elas também empurram '
        + 'o líquido, para baixo no vaso que fecha e para cima no que abre, e a conta '
        + 'fecha.</p>'
        + '<p>O último cartão converte a pressão em altura de coluna de água, que é como ela '
        + 'costuma ser citada em hidráulica. Com mercúrio a mesma coluna produz treze vezes '
        + 'mais pressão, e é por isso que o barômetro de Torricelli tem setenta e seis '
        + 'centímetros em vez de dez metros.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     10. A equação de Lane-Emden
     Integrada por Runge-Kutta de quarta ordem, com os casos conhecidos
     servindo de aferição: n = 0 dá raio √6, n = 1 dá π e n = 5 não
     termina nunca, apesar de ter massa finita.
     ================================================================= */
  REGISTRO.laneemden = function (raiz) {
    var est = { n: 3 };

    /* Valores tabelados, usados para conferir a integração na tela. */
    var TABELA = { 0: [2.4494, 4.8988], 1: [3.14159, 3.14159],
                   1.5: [3.65375, 2.71406], 2: [4.35287, 2.41105],
                   3: [6.89685, 2.01824], 4: [14.9716, 1.79723] };

    var corpo = moldura(raiz, 'A estrutura de uma esfera autogravitante');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'índice politrópico n', 0, 5, 0.25, 3,
      function (v) { est.n = v; desenhar(); },
      function (v) { return F.fmt(v, 2); });

    var mostrar = cartoes(corpo, [
      { rot: 'raio ξ₁', k: 'x1' },
      { rot: 'valor tabelado', k: 'tab' },
      { rot: '−ξ₁²θ′(ξ₁)', k: 'der' },
      { rot: 'ρ central / ρ média', k: 'raz' },
      { rot: 'expoente p ∝ ρ^γ', k: 'gam' },
      { rot: 'massa adimensional', k: 'm' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* θ'' + (2/ξ)θ' + θ^n = 0, com θ(0)=1 e θ'(0)=0. A origem é singular,
       de modo que o arranque usa a série θ ≈ 1 − ξ²/6 + n ξ⁴/120. */
    function integrar(n) {
      var h = 0.002, x = 0.01;
      var th = 1 - x * x / 6 + n * Math.pow(x, 4) / 120;
      var dth = -x / 3 + n * Math.pow(x, 3) / 30;
      var pts = [[0, 1, 0]];
      function f(x, y) {
        var t = y[0] <= 0 ? 0 : Math.pow(y[0], n);
        return [y[1], -2 / x * y[1] - t];
      }
      var y = [th, dth], i;
      for (i = 0; i < 20000; i++) {
        if (y[0] <= 0) break;
        if (i % 25 === 0) pts.push([x, y[0], y[1]]);
        var k1 = f(x, y);
        var k2 = f(x + h / 2, [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]]);
        var k3 = f(x + h / 2, [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]]);
        var k4 = f(x + h, [y[0] + h * k3[0], y[1] + h * k3[1]]);
        var ant = y[0], antx = x, antd = y[1];
        y = [y[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
             y[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
        x += h;
        if (y[0] <= 0 && ant > 0) {
          /* interpolação linear no passo que cruza o zero, aplicada também
             à derivada, porque é dela que sai a massa */
          var s = ant / (ant - y[0]);
          return { pts: pts, x1: antx + s * h,
                   dx1: antd + s * (y[1] - antd), cortou: true };
        }
      }
      return { pts: pts, x1: x, dx1: y[1], cortou: false };
    }

    function desenhar() {
      var n = est.n, r = integrar(n);
      var xm = r.cortou ? r.x1 * 1.08 : 40;

      var g1 = G.eixos(cv1, {
        altura: 290, xmin: 0, xmax: xm, ymin: 0, ymax: 1.05,
        margem: { e: 52, d: 14, c: 14, b: 42 },
        rotX: 'raio adimensional ξ', rotY: 'θ, com ρ = ρc θⁿ',
        marcasX: G.marcasLineares(0, xm, 5, xm > 20 ? 0 : 1),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      var gc = g1.ct;
      gc.strokeStyle = G.COR.mestra; gc.lineWidth = 2.6;
      gc.beginPath();
      r.pts.forEach(function (q, i) {
        var px = g1.X(q[0]), py = g1.Y(Math.max(0, q[1]));
        if (i === 0) gc.moveTo(px, py); else gc.lineTo(px, py);
      });
      gc.stroke();
      if (r.cortou) G.vertical(g1, r.x1, G.COR.vinho, 'ξ₁');

      var g2 = G.eixos(cv2, {
        altura: 290, xmin: 0, xmax: xm, ymin: 0, ymax: 1.05,
        margem: { e: 52, d: 14, c: 14, b: 42 },
        rotX: 'raio adimensional ξ', rotY: 'densidade ρ/ρc',
        marcasX: G.marcasLineares(0, xm, 5, xm > 20 ? 0 : 1),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      var g2c = g2.ct;
      g2c.strokeStyle = G.COR.vinho; g2c.lineWidth = 2.6;
      g2c.beginPath();
      r.pts.forEach(function (q, i) {
        var d = q[1] <= 0 ? 0 : Math.pow(q[1], n);
        var px = g2.X(q[0]), py = g2.Y(Math.min(1.05, d));
        if (i === 0) g2c.moveTo(px, py); else g2c.lineTo(px, py);
      });
      g2c.stroke();
      /* sombreado sob a curva, desenhado a partir dos próprios pontos
         da integração, que não estão igualmente espaçados */
      g2c.fillStyle = 'rgba(140,47,57,.14)';
      g2c.beginPath();
      g2c.moveTo(g2.X(0), g2.Y(0));
      r.pts.forEach(function (q) {
        var d = q[1] <= 0 ? 0 : Math.pow(q[1], n);
        g2c.lineTo(g2.X(q[0]), g2.Y(Math.min(1.05, d)));
      });
      g2c.lineTo(g2.X(r.pts[r.pts.length - 1][0]), g2.Y(0));
      g2c.closePath(); g2c.fill();

      var m = -r.x1 * r.x1 * r.dx1;
      var tab = TABELA[n];
      mostrar({
        x1: r.cortou ? F.fmt(r.x1, 4) : 'não termina',
        tab: tab ? F.fmt(tab[0], 4) : '—',
        der: r.cortou ? F.fmt(m, 4) : F.fmt(Math.sqrt(3), 4) + ' (limite)',
        raz: r.cortou ? F.fmt(r.x1 / (3 * (-r.dx1)), 3) : '∞',
        gam: F.fmt(n > 0 ? 1 + 1 / n : 0, 3).replace('0,000', '∞'),
        m: tab ? F.fmt(tab[1], 4) + ' tabelado' : '—'
      });

      nota.innerHTML =
        '<p>Uma massa de fluido no espaço, sujeita apenas à atração dos seus próprios '
        + 'elementos, obedece a duas equações ao mesmo tempo. O equilíbrio hidrostático liga '
        + 'pressão e potencial,</p>'
        + '\\[\\nabla\\Psi=-\\frac{\\nabla p}{\\rho},\\]'
        + '<p>e a equação de Poisson liga o potencial à densidade que o produz,</p>'
        + '\\[\\nabla^2\\Psi=4\\pi G\\rho.\\]'
        + '<p>Eliminando \\(\\Psi\\) entre as duas sobra uma equação só para pressão e '
        + 'densidade,</p>'
        + '\\[\\nabla\\cdot\\left(\\frac{\\nabla p}{\\rho}\\right)=-4\\pi G\\rho,\\]'
        + '<p>que em simetria esférica vira '
        + '\\(\\der{}{r}\\left(\\frac{r^2}{\\rho}\\der{p}{r}\\right)=-4\\pi G\\rho\\,r^2\\). '
        + 'Falta ainda uma relação entre pressão e densidade, e a escolha usual é a '
        + 'politrópica \\(p=K\\rho^{1+1/n}\\), com \\(n\\) no deslizante.</p>'
        + '<p>Escrevendo \\(\\rho=\\rho_c\\theta^n\\) e medindo o raio em unidades de '
        + '\\(\\alpha=\\sqrt{(n+1)K\\rho_c^{1/n-1}/4\\pi G}\\), toda a física some das '
        + 'constantes e resta a <strong>equação de Lane-Emden</strong>:</p>'
        + '\\[\\frac{1}{\\xi^2}\\der{}{\\xi}\\left(\\xi^2\\der{\\theta}{\\xi}\\right)'
        + '=-\\theta^n,\\qquad\\theta(0)=1,\\quad\\theta\'(0)=0.\\]'
        + '<p>Ela é resolvida aqui por Runge-Kutta de quarta ordem, com arranque em série '
        + 'porque a origem é singular. O primeiro zero \\(\\xi_1\\) é a superfície da esfera, '
        + 'e o cartão ao lado traz o valor tabelado para conferir: \\(n=0\\) dá '
        + '\\(\\xi_1=\\sqrt6\\), \\(n=1\\) dá exatamente \\(\\pi\\), \\(n=3\\) dá '
        + '\\(6{,}89685\\).</p>'
        + '<p>Três casos merecem nome. Com \\(n=0\\) a densidade é uniforme e a solução é a '
        + 'parábola \\(\\theta=1-\\xi^2/6\\). Com \\(n=3/2\\) descreve-se um gás '
        + 'monoatômico adiabático e também a matéria degenerada não relativística das anãs '
        + 'brancas leves. Com \\(n=3\\), que dá \\(\\gamma=4/3\\), descreve-se o gás '
        + 'degenerado ultrarrelativístico, e é desse caso que sai o limite de '
        + 'Chandrasekhar.</p>'
        + '<p>Com \\(n=5\\) acontece algo curioso: \\(\\theta\\) nunca chega a zero, de modo '
        + 'que a esfera não tem borda, e ainda assim a massa total é finita, porque '
        + '\\(-\\xi^2\\theta\'\\to\\sqrt3\\). Esse é o único caso com solução em forma '
        + 'fechada além de \\(n=0\\) e \\(n=1\\), e a próxima seção o resolve no papel.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     11. Linhas de corrente e equipotenciais
     As duas famílias são desenhadas integrando o próprio campo: as de
     corrente seguem u, as equipotenciais seguem u girado de noventa
     graus. A ortogonalidade deixa de ser uma identidade algébrica e
     passa a ser uma coisa que se vê.
     ================================================================= */
  REGISTRO.linhas = function (raiz) {
    var est = { tipo: 'ralo', sw: 1.0 };

    var corpo = moldura(raiz, 'As duas famílias de curvas');

    var cv = el('canvas');
    corpo.appendChild(cv);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    opcoes(ctr, [{ rot: 'uniforme', v: 'uniforme' }, { rot: 'ralo', v: 'ralo' },
                 { rot: 'vórtice', v: 'vortice' }, { rot: 'ralo com rotação', v: 'espiral' },
                 { rot: 'cilindro', v: 'cilindro' }], 1,
      function (v) { est.tipo = v; desenhar(); });
    deslizante(ctr, 'intensidade da rotação', 0, 3, 0.1, 1.0,
      function (v) { est.sw = v; desenhar(); },
      function (v) { return F.fmt(v, 1); });

    var mostrar = cartoes(corpo, [
      { rot: 'u no ponto de prova', k: 'u' },
      { rot: 'divergência medida', k: 'div' },
      { rot: 'vorticidade medida', k: 'rot' },
      { rot: 'ângulo entre as famílias', k: 'ang' },
      { rot: 'pressão relativa ali', k: 'p' },
      { rot: 'circulação em volta', k: 'circ' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    var A = 0.35;                       // raio do ralo ou do cilindro
    var PX = 0.95, PY = 0.62;           // ponto de prova

    /* Campos analíticos, todos irrotacionais fora da origem e todos de
       divergência nula fora dela. */
    function campo(x, y) {
      var r2 = x * x + y * y, r = Math.sqrt(r2);
      if (r < 1e-6) return [0, 0];
      switch (est.tipo) {
        case 'uniforme': return [1, 0];
        case 'ralo': return [-A * x / r2, -A * y / r2];
        case 'vortice': return [-est.sw * A * y / r2, est.sw * A * x / r2];
        case 'espiral': return [(-A * x - est.sw * A * y) / r2,
                                (-A * y + est.sw * A * x) / r2];
        default: {
          /* Cilindro de raio A em escoamento uniforme, de
             phi = U x (1 + A²/r²). Derivando,
             u_x = 1 + A²/r² − 2A²x²/r⁴ e u_y = −2A²xy/r⁴,
             o que põe os pontos de estagnação em (±A, 0), como deve. */
          var c = A * A / (r2 * r2);
          return [1 + A * A / r2 - 2 * c * x * x, -2 * c * x * y];
        }
      }
    }

    function integra(x, y, s, n, passo) {
      var pts = [[x, y]], i;
      for (i = 0; i < n; i++) {
        var k1 = s(x, y);
        var m1 = Math.hypot(k1[0], k1[1]) || 1;
        var k2 = s(x + passo * k1[0] / m1 / 2, y + passo * k1[1] / m1 / 2);
        var m2 = Math.hypot(k2[0], k2[1]) || 1;
        x += passo * k2[0] / m2; y += passo * k2[1] / m2;
        if (Math.abs(x) > 4 || Math.abs(y) > 4) break;
        /* no cilindro a parede é a fronteira do domínio; nos campos com
           singularidade na origem o corte é bem mais perto do centro */
        var lim = est.tipo === 'cilindro' ? A : A * 0.55;
        if (est.tipo !== 'uniforme' && Math.hypot(x, y) < lim) break;
        pts.push([x, y]);
      }
      return pts;
    }

    function desenhar() {
      var p = G.preparar(cv, 420);
      var ct = p.ct;
      var esc = Math.min(p.L, p.A) / 3.2;
      var cx = p.L / 2, cy = p.A / 2;
      function PXp(x) { return cx + x * esc; }
      function PYp(y) { return cy - y * esc; }

      function traca(seeds, s, cor, esp, setas) {
        seeds.forEach(function (q) {
          [1, -1].forEach(function (sinal) {
            var pts = integra(q[0], q[1],
              function (x, y) { var v = s(x, y); return [sinal * v[0], sinal * v[1]]; },
              420, 0.012);
            ct.strokeStyle = cor; ct.lineWidth = esp;
            ct.beginPath();
            pts.forEach(function (w, i) {
              if (i === 0) ct.moveTo(PXp(w[0]), PYp(w[1]));
              else ct.lineTo(PXp(w[0]), PYp(w[1]));
            });
            ct.stroke();
            /* uma ponta no meio do trecho de ida, para que o sentido do
               escoamento fique visível e não apenas o traçado */
            if (setas && sinal === 1 && pts.length > 60) {
              var m = pts[30], n2 = pts[52];
              seta(ct, PXp(m[0]), PYp(m[1]), PXp(n2[0]), PYp(n2[1]), cor, esp + 0.4);
            }
          });
        });
      }

      /* As sementes cobrem o quadro em raio e em ângulo ao mesmo tempo.
         Uma circunferência só de sementes bastaria para as linhas de
         corrente do ralo, mas desenharia dezesseis vezes a mesma curva no
         vórtice, onde as linhas de corrente são círculos concêntricos. Com
         a grade polar as duas famílias ficam bem cobertas em todos os
         campos do menu, ao preço de alguma curva repetida. */
      var seeds = [], i, j;
      var RAIOS = [0.52, 0.80, 1.15, 1.55, 2.05, 2.65];
      for (j = 0; j < RAIOS.length; j++) {
        for (i = 0; i < 10; i++) {
          var a = 2 * Math.PI * (i + 0.35 * j) / 10;
          seeds.push([RAIOS[j] * Math.cos(a), RAIOS[j] * Math.sin(a)]);
        }
      }
      var seeds2 = seeds;

      /* equipotenciais: o campo girado de noventa graus */
      traca(seeds2, function (x, y) {
        var v = campo(x, y); return [-v[1], v[0]];
      }, 'rgba(168,96,31,.5)', 1.2, false);
      traca(seeds, campo, G.COR.mestra, 1.7, true);

      if (est.tipo === 'cilindro' || est.tipo === 'ralo' || est.tipo === 'espiral') {
        ct.fillStyle = est.tipo === 'cilindro' ? '#e8e8ef' : 'rgba(140,47,57,.16)';
        ct.beginPath(); ct.arc(cx, cy, A * esc, 0, 2 * Math.PI); ct.fill();
        ct.strokeStyle = est.tipo === 'cilindro' ? G.COR.tinta : G.COR.vinho;
        ct.lineWidth = 2; ct.stroke();
      }

      /* ponto de prova e os dois vetores que ali se cruzam */
      var v = campo(PX, PY), mv = Math.hypot(v[0], v[1]);
      ct.fillStyle = G.COR.vinho;
      ct.beginPath(); ct.arc(PXp(PX), PYp(PY), 4.5, 0, 2 * Math.PI); ct.fill();
      seta(ct, PXp(PX), PYp(PY), PXp(PX) + v[0] / mv * 34, PYp(PY) - v[1] / mv * 34,
        G.COR.mestra, 2.4);
      seta(ct, PXp(PX), PYp(PY), PXp(PX) - v[1] / mv * 28, PYp(PY) - v[0] / mv * 28,
        G.COR.bronze, 2.2);
      rotulo(ct, 'ponto de prova', PXp(PX), PYp(PY) + 14, G.COR.vinho, 'center', 'top');

      G.legenda({ ct: ct, x1: p.L - 6, y0: 8 }, [
        { texto: 'linhas de corrente, ψ constante', cor: G.COR.mestra },
        { texto: 'equipotenciais, φ constante', cor: G.COR.bronze }
      ]);

      /* medidas numéricas por diferenças centrais */
      var h = 1e-4;
      var dxp = campo(PX + h, PY), dxm = campo(PX - h, PY);
      var dyp = campo(PX, PY + h), dym = campo(PX, PY - h);
      var div = (dxp[0] - dxm[0]) / (2 * h) + (dyp[1] - dym[1]) / (2 * h);
      var rot = (dxp[1] - dxm[1]) / (2 * h) - (dyp[0] - dym[0]) / (2 * h);
      var perp = [-v[1], v[0]];
      var cosang = (v[0] * perp[0] + v[1] * perp[1]) / (mv * mv);

      /* circulação num circuito pequeno em volta do ponto de prova */
      var rc = 0.12, circ = 0, n = 240;
      for (i = 0; i < n; i++) {
        var th = 2 * Math.PI * i / n, th2 = 2 * Math.PI * (i + 1) / n;
        var xm = PX + rc * Math.cos((th + th2) / 2);
        var ym = PY + rc * Math.sin((th + th2) / 2);
        var w = campo(xm, ym);
        circ += w[0] * (rc * Math.cos(th2) - rc * Math.cos(th))
              + w[1] * (rc * Math.sin(th2) - rc * Math.sin(th));
      }

      mostrar({
        u: F.fmt(mv, 3),
        div: F.fmt(Math.abs(div) < 1e-9 ? 0 : div, 4),
        rot: F.fmt(Math.abs(rot) < 1e-9 ? 0 : rot, 4),
        ang: F.fmt(Math.acos(Math.max(-1, Math.min(1, cosang))) * 180 / Math.PI, 1) + '°',
        p: F.fmt(-mv * mv / 2, 3) + ' (em ρ u²/2)',
        circ: F.fmt(Math.abs(circ) < 1e-6 ? 0 : circ, 4)
      });

      nota.innerHTML =
        '<p>Em duas dimensões a vorticidade tem uma componente só, e a continuidade '
        + 'incompressível pode ser resolvida de uma vez definindo a <strong>função de '
        + 'corrente</strong> \\(\\psi\\) por</p>'
        + '\\[u_x=\\pder{\\psi}{y},\\qquad u_y=-\\pder{\\psi}{x}.\\]'
        + '<p>Com essa definição \\(\\nabla\\cdot\\vet{u}\\) é identicamente nulo, porque as '
        + 'derivadas cruzadas se cancelam. As curvas de \\(\\psi\\) constante são as '
        + '<strong>linhas de corrente</strong>, tangentes ao campo em todo ponto, e a '
        + 'diferença de \\(\\psi\\) entre duas delas é a vazão que passa no canal entre as '
        + 'duas.</p>'
        + '<p>Se além disso o escoamento for irrotacional, a velocidade também deriva de um '
        + '<strong>potencial</strong>, \\(\\vet{u}=\\nabla\\phi\\), e aí valem duas equações '
        + 'de Laplace ao mesmo tempo, \\(\\nabla^2\\phi=0\\) e \\(\\nabla^2\\psi=0\\). As '
        + 'duas famílias de curvas se cruzam sempre em ângulo reto, porque</p>'
        + '\\[\\left(\\der{y}{x}\\right)_\\phi\\left(\\der{y}{x}\\right)_\\psi'
        + '=-\\frac{u_x}{u_y}\\cdot\\frac{u_y}{u_x}=-1,\\]'
        + '<p>e o cartão do ângulo confirma os noventa graus em qualquer ponto e em qualquer '
        + 'dos campos do menu.</p>'
        + '<p>Os cinco exemplos são os tijolos com que se constrói quase tudo. O '
        + '<strong>ralo</strong> tem \\(u_r=-U_ra/r\\) e vem do potencial '
        + '\\(\\phi=-U_ra\\ln r\\). O <strong>vórtice</strong> tem \\(u_\\theta\\propto1/r\\) '
        + 'e vem de \\(\\phi\\propto\\theta\\), que é multivalorado embora a velocidade não '
        + 'seja. Somando os dois sai a <strong>espiral</strong> do ralo de pia. O '
        + '<strong>cilindro</strong> é a soma de um escoamento uniforme com um dipolo, e nele '
        + 'aparecem os dois pontos de estagnação.</p>'
        + '<p>Os cartões medem a divergência e a vorticidade por diferenças centrais no ponto '
        + 'de prova, e as duas dão zero em todos os casos: fora da origem esses campos são ao '
        + 'mesmo tempo incompressíveis e irrotacionais. A circulação num circuito pequeno que '
        + '<em>não</em> envolve a origem também dá zero, inclusive no vórtice, e é isso que '
        + 'faz do vórtice livre um escoamento irrotacional apesar do nome.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     12. A lata furada
     O exemplo do material, resolvido e animado. A hipótese de que a
     superfície desce devagar não é feita: a continuidade entra inteira,
     e o resultado exato se compara com Torricelli.
     ================================================================= */
  REGISTRO.lata = function (raiz) {
    var est = { r2: 0.5, t: 0, rodando: true };
    var R1 = 50, H0 = 0.10, G0 = 9.80665;      // milímetros e metros

    function areas() {
      var S1 = Math.PI * R1 * R1 * 1e-6;        // m²
      var S2 = Math.PI * est.r2 * est.r2 * 1e-6;
      return [S1, S2];
    }

    /* [(S1/S2)² − 1] u1² = 2gh, com u1 = −dh/dt, integra em forma fechada */
    function coef() {
      var a = areas(), S1 = a[0], S2 = a[1];
      return S2 / Math.sqrt(S1 * S1 - S2 * S2);
    }
    function altura(t) {
      var s = Math.sqrt(H0) - Math.sqrt(G0 / 2) * coef() * t;
      return s > 0 ? s * s : 0;
    }
    function tvazio() { return Math.sqrt(2 * H0 / G0) / coef(); }

    var corpo = moldura(raiz, 'A lata furada esvaziando');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'raio do furo', 0.2, 45, 0.1, 0.5,
      function (v) { est.r2 = v; est.t = 0; }, function (v) { return F.fmt(v, 1) + ' mm'; });
    opcoes(ctr, [{ rot: 'pausar', v: 0 }, { rot: 'recomeçar', v: 1 }], -1,
      function (v) {
        if (v === 0) est.rodando = !est.rodando;
        else { est.t = 0; est.rodando = true; }
      });

    var mostrar = cartoes(corpo, [
      { rot: 'altura agora', k: 'h' },
      { rot: 'velocidade no furo', k: 'u2' },
      { rot: 'velocidade de Torricelli', k: 'tor' },
      { rot: 'velocidade da superfície', k: 'u1' },
      { rot: 'tempo até esvaziar', k: 'tv' },
      { rot: 'vazão agora', k: 'q' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var a = areas(), S1 = a[0], S2 = a[1];
      var h = altura(est.t), tf = tvazio();
      var u1 = Math.sqrt(2 * G0 * h / ((S1 / S2) * (S1 / S2) - 1));
      var u2 = u1 * S1 / S2;

      /* ---- a lata ---- */
      var p = G.preparar(cv1, 300);
      var ct = p.ct;
      var lx = p.L * 0.22, lw = p.L * 0.34;
      var fundo = p.A - 48, topo = 24, alt = fundo - topo;
      var hy = fundo - (h / H0) * alt;
      ct.fillStyle = 'rgba(63,67,145,.16)';
      ct.fillRect(lx, hy, lw, fundo - hy);
      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 2.4;
      ct.beginPath();
      ct.moveTo(lx, topo - 6); ct.lineTo(lx, fundo); ct.lineTo(lx + lw, fundo);
      ct.lineTo(lx + lw, topo - 6);
      ct.stroke();
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2;
      ct.beginPath(); ct.moveTo(lx, hy); ct.lineTo(lx + lw, hy); ct.stroke();

      /* o jato, com alcance de queda livre */
      if (h > 1e-5) {
        ct.strokeStyle = G.COR.vinho; ct.lineWidth = 2.2;
        ct.beginPath();
        var escx = alt / H0;
        for (var s = 0; s <= 40; s++) {
          var tt = s * 0.004;
          var xx = lx + lw + u2 * tt * escx * 0.25;
          var yy = fundo + 0.5 * G0 * tt * tt * escx;
          if (yy > p.A - 4) break;
          if (s === 0) ct.moveTo(xx, yy); else ct.lineTo(xx, yy);
        }
        ct.stroke();
      }
      rotulo(ct, 'h = ' + F.fmt(h * 100, 2) + ' cm', lx + lw / 2, hy - 8,
        G.COR.mestra, 'center', 'bottom');
      rotulo(ct, 'furo de ' + F.fmt(est.r2, 1) + ' mm', lx + lw + 6, fundo - 8,
        G.COR.vinho, 'left', 'bottom');
      rotulo(ct, 't = ' + F.fmt(est.t, 1) + ' s', 8, 12, G.COR.suave, 'left', 'top');

      /* ---- a curva h(t) ---- */
      var gr = G.eixos(cv2, {
        altura: 300, xmin: 0, xmax: tf * 1.05, ymin: 0, ymax: H0 * 1.08,
        margem: { e: 58, d: 14, c: 14, b: 44 },
        rotX: 'tempo (s)', rotY: 'altura (m)',
        marcasX: G.marcasLineares(0, tf * 1.05, 5, tf > 100 ? 0 : 1),
        formataY: function (v) { return F.fmt(v, 2); }
      });
      G.curva(gr, function (t) { return altura(t); }, G.COR.mestra, 2.6);
      G.vertical(gr, Math.min(est.t, tf * 1.05), G.COR.vinho, 'agora');

      mostrar({
        h: F.fmt(h * 100, 3) + ' cm',
        u2: F.fmt(u2, 3) + ' m/s',
        tor: F.fmt(Math.sqrt(2 * G0 * h), 3) + ' m/s',
        u1: F.fmt(u1 * 1000, 4) + ' mm/s',
        tv: F.fmt(tf, 1) + ' s',
        q: F.fmt(u2 * S2 * 1e6, 2) + ' mL/s'
      });
    }

    function escreverNota() {
      nota.innerHTML =
        '<p>Uma lata aberta em cima e furada embaixo, com fluido incompressível sujeito à '
        + 'pressão ambiente e ao próprio peso. A continuidade dá \\(u_1S_1=u_2S_2\\), com '
        + '\\(u_1=-\\dot h\\) a velocidade com que a superfície desce, e Bernoulli entre a '
        + 'superfície e o furo dá</p>'
        + '\\[p_0+\\tfrac12\\rho u_1^2+\\rho gh=p_0+\\tfrac12\\rho u_2^2.\\]'
        + '<p>As duas pressões são a mesma, a atmosférica, e cancelam. Substituindo '
        + '\\(u_2=u_1S_1/S_2\\) sobra</p>'
        + '\\[\\left[\\left(\\frac{S_1}{S_2}\\right)^2-1\\right]u_1^2=2gh,\\]'
        + '<p>que é uma equação separável para \\(h(t)\\). Integrando de \\(h_0\\) até '
        + '\\(h\\),</p>'
        + '\\[\\sqrt{h}=\\sqrt{h_0}-\\sqrt{\\frac{g}{2}}\\,'
        + '\\frac{S_2}{\\sqrt{S_1^2-S_2^2}}\\;t,\\]'
        + '<p>e a altura cai como o quadrado disso, de modo que a curva da direita é uma '
        + 'parábola que toca o eixo no instante em que a lata esvazia. Com \\(R_1=50\\) mm, '
        + '\\(R_2=0{,}5\\) mm e \\(h_0=10\\) cm, esse instante fica perto de vinte e quatro '
        + 'minutos.</p>'
        + '<p>Os dois cartões do meio comparam a velocidade de saída com '
        + '\\(\\sqrt{2gh}\\), que é a <strong>fórmula de Torricelli</strong>. Elas são quase '
        + 'iguais, e a razão está no fator \\(\\left(S_1/S_2\\right)^2\\) do denominador: com '
        + 'o furo dez mil vezes menor que a seção da lata, o termo \\(u_1^2\\) de Bernoulli é '
        + 'cem milhões de vezes menor que \\(u_2^2\\) e pode ser jogado fora. Torricelli é o '
        + 'limite de furo pequeno, e o deslizante permite sair dele: com furo de quarenta '
        + 'milímetros num recipiente de cinquenta, a velocidade real fica trinta por cento '
        + 'acima da que Torricelli prevê, porque aí a superfície desce depressa e a sua '
        + 'energia cinética deixa de ser desprezível.</p>'
        + '<p>Vale notar o que foi deixado de fora. O fluido é ideal, de modo que não há '
        + 'perda por viscosidade nem contração do jato na saída. Num furo real o jato se '
        + 'estrangula a cerca de sessenta por cento da área do orifício, o chamado '
        + '<em>vena contracta</em>, e a vazão medida fica abaixo da calculada aqui.</p>';
      tipografar(corpo);
    }

    escreverNota();
    registrarRedesenho(desenhar);

    (function animar() {
      if (est.rodando) {
        est.t += tvazio() / 600;
        if (est.t > tvazio() * 1.02) est.t = 0;
        desenhar();
      }
      requestAnimationFrame(animar);
    })();
  };

  /* =================================================================
     13. Cisalhamento entre duas placas
     A definição de viscosidade em forma de experiência: uma placa que
     desliza sobre outra, o perfil linear que se instala entre elas e a
     força por unidade de área que é preciso aplicar. Ao lado, a curva
     de tensão contra taxa de deformação que separa os newtonianos dos
     demais.
     ================================================================= */
  REGISTRO.cisalhamento = function (raiz) {
    var est = { U: 1.0, h: 2.0, mu: 1.0e-3, rho: 1000, nome: 'água' };

    var FLUIDOS = [
      { rot: 'ar', mu: 1.81e-5, rho: 1.20 },
      { rot: 'água', mu: 1.00e-3, rho: 998 },
      { rot: 'óleo SAE 30', mu: 0.29, rho: 890 },
      { rot: 'glicerina', mu: 1.41, rho: 1260 },
      { rot: 'mel', mu: 10.0, rho: 1420 }
    ];

    var corpo = moldura(raiz, 'A placa que desliza');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'velocidade da placa de cima', 0.1, 3, 0.1, 1.0,
      function (v) { est.U = v; desenhar(); },
      function (v) { return F.fmt(v, 1) + ' m/s'; });
    deslizante(ctr, 'espessura da camada', 0.2, 10, 0.2, 2.0,
      function (v) { est.h = v; desenhar(); },
      function (v) { return F.fmt(v, 1) + ' mm'; });
    opcoes(ctr, FLUIDOS.map(function (f) { return { rot: f.rot, v: f }; }), 1,
      function (v) { est.mu = v.mu; est.rho = v.rho; est.nome = v.rot; desenhar(); });

    var mostrar = cartoes(corpo, [
      { rot: 'taxa de deformação', k: 'gp' },
      { rot: 'tensão de cisalhamento', k: 'tau' },
      { rot: 'força por m² de placa', k: 'f' },
      { rot: 'potência dissipada por m²', k: 'pot' },
      { rot: 'viscosidade cinemática', k: 'nu' },
      { rot: 'tempo de difusão h²/ν', k: 'td' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function desenhar() {
      var h = est.h * 1e-3;
      var gp = est.U / h, tau = est.mu * gp;
      var nu = est.mu / est.rho;

      /* ---- as duas placas e o perfil ---- */
      var p = G.preparar(cv1, 280);
      var ct = p.ct;
      var xa = p.L * 0.14, xb = p.L * 0.86;
      var ybase = p.A * 0.74, ytopo = p.A * 0.26;
      ct.fillStyle = 'rgba(63,67,145,.10)';
      ct.fillRect(xa, ytopo, xb - xa, ybase - ytopo);
      ct.fillStyle = G.COR.tinta;
      ct.fillRect(xa - 10, ybase, xb - xa + 20, 9);
      ct.fillRect(xa - 10, ytopo - 9, xb - xa + 20, 9);
      rotulo(ct, 'placa fixa', (xa + xb) / 2, ybase + 14, G.COR.suave, 'center', 'top');

      var esc = (xb - xa) * 0.58 / 3;
      seta(ct, (xa + xb) / 2, ytopo - 18, (xa + xb) / 2 + est.U * esc, ytopo - 18,
        G.COR.vinho, 2.8);
      rotulo(ct, 'U = ' + F.fmt(est.U, 1) + ' m/s',
        (xa + xb) / 2 + est.U * esc / 2, ytopo - 24, G.COR.vinho, 'center', 'bottom');

      /* o perfil linear, com setas proporcionais à velocidade local */
      var i, n = 7;
      for (i = 0; i <= n; i++) {
        var f = i / n;
        var y = ybase - f * (ybase - ytopo);
        seta(ct, xa + 14, y, xa + 14 + f * est.U * esc, y, G.COR.mestra, 1.8);
      }
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2.2;
      ct.setLineDash([5, 4]);
      ct.beginPath();
      ct.moveTo(xa + 14, ybase); ct.lineTo(xa + 14 + est.U * esc, ytopo);
      ct.stroke(); ct.setLineDash([]);
      seta(ct, xb - 20, ytopo, xb - 20, ybase, G.COR.suave, 1.4);
      seta(ct, xb - 20, ybase, xb - 20, ytopo, G.COR.suave, 1.4);
      rotulo(ct, 'h = ' + F.fmt(est.h, 1) + ' mm', xb - 26, (ytopo + ybase) / 2,
        G.COR.suave, 'right');
      rotulo(ct, est.nome, xa + 18, (ytopo + ybase) / 2 + 24, G.COR.suave, 'left');

      /* ---- tensão contra taxa de deformação ---- */
      var gmax = Math.max(gp * 1.6, 100);
      var gr = G.eixos(cv2, {
        altura: 280, xmin: 0, xmax: gmax, ymin: 0, ymax: est.mu * gmax * 1.4 + 1e-9,
        margem: { e: 62, d: 14, c: 14, b: 44 },
        rotX: 'taxa de deformação (1/s)', rotY: 'tensão (Pa)',
        marcasX: G.marcasLineares(0, gmax, 5, 0),
        formataY: function (v) { return F.fmt(v, v > 100 ? 0 : 2); }
      });
      /* newtoniano, pseudoplástico, dilatante e Bingham, todos ajustados
         para passar pelo mesmo ponto de operação */
      var k = est.mu * gp;
      G.curva(gr, function (g) { return k * Math.pow(g / gp, 0.5); },
        G.COR.bronze, 1.8, [6, 4]);
      G.curva(gr, function (g) { return k * Math.pow(g / gp, 1.8); },
        G.COR.roxo, 1.8, [2, 3]);
      G.curva(gr, function (g) { return 0.35 * k + 0.65 * k * g / gp; },
        G.COR.azul, 1.8, [8, 3]);
      G.curva(gr, function (g) { return est.mu * g; }, G.COR.mestra, 2.8);
      var gc = gr.ct;
      gc.fillStyle = G.COR.vinho;
      gc.beginPath(); gc.arc(gr.X(gp), gr.Y(tau), 5, 0, 2 * Math.PI); gc.fill();
      G.legenda(gr, [
        { texto: 'newtoniano', cor: G.COR.mestra },
        { texto: 'pseudoplástico', cor: G.COR.bronze },
        { texto: 'dilatante', cor: G.COR.roxo },
        { texto: 'Bingham', cor: G.COR.azul }
      ]);

      mostrar({
        gp: F.fmt(gp, 1) + ' s⁻¹',
        tau: F.fmt(tau, tau > 100 ? 1 : 4) + ' Pa',
        f: F.fmt(tau, tau > 100 ? 1 : 4) + ' N',
        pot: F.fmt(tau * est.U, 2) + ' W',
        nu: F.fmt(nu * 1e6, 2) + ' mm²/s',
        td: F.fmt(h * h / nu, 3) + ' s'
      });

      nota.innerHTML =
        '<p>Viscosidade é a medida da resistência de um fluido ao movimento ou à deformação. '
        + 'Com duas placas paralelas e fluido entre elas, empurrar a de cima para a direita '
        + 'enquanto a de baixo fica parada faz o fluido próximo à placa móvel andar mais '
        + 'depressa que o próximo à fixa, e aparece uma diferença de velocidade entre as '
        + 'camadas.</p>'
        + '<p>Nas duas paredes vale a condição de <strong>não deslizamento</strong>: o fluido '
        + 'em contato com uma superfície tem a velocidade dela. Essa condição não é uma '
        + 'consequência das equações, é um fato experimental, e é exatamente o que o fluido '
        + 'ideal do módulo 3 não conseguia respeitar. Entre as duas paredes o perfil se '
        + 'acomoda numa reta, e a taxa de deformação é uniforme:</p>'
        + '\\[\\dot\\gamma=\\der{u_x}{y}=\\frac{U}{h}.\\]'
        + '<p>A tensão que é preciso aplicar na placa para manter o movimento vale</p>'
        + '\\[\\tau=\\mu\\dot\\gamma,\\]'
        + '<p>que é a <strong>lei de Newton da viscosidade</strong>. O coeficiente \\(\\mu\\) '
        + 'é a viscosidade dinâmica, medida em Pa·s, e o menu mostra o quanto ela varia: do ar '
        + 'ao mel são quase seis ordens de grandeza.</p>'
        + '<p>Se o gráfico de \\(\\tau\\) contra \\(\\dot\\gamma\\) for uma reta pela origem, '
        + 'o fluido é <strong>newtoniano</strong>, e a inclinação é a viscosidade. Caso '
        + 'contrário ele é não newtoniano, e a inclinação local passa a se chamar viscosidade '
        + 'aparente. As três curvas tracejadas mostram os desvios mais comuns: o '
        + 'pseudoplástico afina quando agitado, como tinta e sangue; o dilatante engrossa, '
        + 'como amido de milho em água; e o de Bingham só escoa acima de uma tensão mínima, '
        + 'como pasta de dente e lama de perfuração.</p>'
        + '<p>Os dois últimos cartões trazem a <strong>viscosidade cinemática</strong> '
        + '\\(\\nu=\\mu/\\rho\\), que tem unidade de difusividade, e o tempo '
        + '\\(h^2/\\nu\\) que o momento leva para atravessar a camada por difusão. Guarde '
        + 'esses dois: eles são a ponte com o transporte de calor do módulo 10, em que a '
        + 'mesma estrutura reaparece com a difusividade térmica no lugar de \\(\\nu\\).</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     14. Hagen-Poiseuille
     O perfil parabólico, a vazão que vai com a quarta potência do raio
     e o aviso de que, passado certo ponto, nada disso vale mais porque
     o escoamento virou turbulento.
     ================================================================= */
  REGISTRO.poiseuille = function (raiz) {
    /* Fluidos de lei de potência, mu = K gamma^(n-1). Os valores de K e n
       são típicos, de ordem de grandeza, e variam muito com temperatura,
       concentração e método de medida: servem para comparar comportamentos,
       não para projetar tubulação. */
    var FLUIDOS = [
      { rot: 'água', K: 1.00e-3, n: 1.00, rho: 998 },
      { rot: 'sangue', K: 0.015, n: 0.78, rho: 1060 },
      { rot: 'xampu', K: 8.0, n: 0.45, rho: 1030 },
      { rot: 'ketchup', K: 18.0, n: 0.27, rho: 1100 },
      { rot: 'amido em água', K: 0.90, n: 1.60, rho: 1200 },
      { rot: 'glicerina', K: 1.41, n: 1.00, rho: 1260 }
    ];

    var est = { R: 5, dp: 20, K: 1.00e-3, n: 1.00, rho: 998, nome: 'água' };

    var corpo = moldura(raiz, 'O perfil e a potência do raio');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'raio do tubo', 0.5, 20, 0.5, 5,
      function (v) { est.R = v; desenhar(); },
      function (v) { return F.fmt(v, 1) + ' mm'; });
    /* A faixa de pressões úteis muda por ordens de grandeza de um fluido
       para o outro: o que move água a dez centímetros por segundo não tira
       ketchup do lugar. O deslizante é logarítmico, e trocar de fluido
       reposiciona a pressão no valor que dá a mesma velocidade de eixo,
       para que o desenho continue dizendo alguma coisa. */
    var dpd = deslizante(ctr, 'queda de pressão por metro', 0, 6, 0.05,
      Math.log10(20),
      function (v) { est.dp = Math.pow(10, v); desenhar(); },
      function (v) {
        var x = Math.pow(10, v);
        return x < 1000 ? F.fmt(x, 0) + ' Pa/m' : F.fmt(x / 1000, 1) + ' kPa/m';
      });
    opcoes(ctr, FLUIDOS.map(function (f) { return { rot: f.rot, v: f }; }), 0,
      function (v) {
        est.K = v.K; est.n = v.n; est.rho = v.rho; est.nome = v.rot;
        dpd.value = Math.max(0, Math.min(6, Math.log10(pressaoPara(0.10))));
        dpd.dispatchEvent(new Event('input'));
      });

    /* pressão que produz a velocidade de eixo pedida, invertendo o perfil */
    function pressaoPara(umax) {
      var R = est.R * 1e-3, e = (est.n + 1) / est.n;
      return 2 * est.K * Math.pow(umax * (est.n + 1)
        / (est.n * Math.pow(R, e)), est.n);
    }

    var mostrar = cartoes(corpo, [
      { rot: 'expoente n', k: 'n' },
      { rot: 'velocidade no eixo', k: 'umax' },
      { rot: 'razão u máx / u média', k: 'raz' },
      { rot: 'vazão volumétrica', k: 'q' },
      { rot: 'tensão na parede', k: 'tw' },
      { rot: 'Reynolds generalizado', k: 're' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* u(r) = n/(n+1) (dp/2KL)^(1/n) [R^((n+1)/n) - r^((n+1)/n)] */
    function perfil(r, R) {
      var a = Math.pow(est.dp / (2 * est.K), 1 / est.n);
      var e = (est.n + 1) / est.n;
      return est.n / (est.n + 1) * a * (Math.pow(R, e) - Math.pow(r, e));
    }
    function vazao(Rmm) {
      var R = Rmm * 1e-3;
      return Math.PI * est.n / (3 * est.n + 1)
        * Math.pow(est.dp / (2 * est.K), 1 / est.n)
        * Math.pow(R, (3 * est.n + 1) / est.n);
    }

    function desenhar() {
      var R = est.R * 1e-3, n = est.n;
      var umax = perfil(0, R);
      var Q = vazao(est.R);
      var ubar = Q / (Math.PI * R * R);
      var tw = est.dp * R / 2;
      /* Reynolds generalizado de Metzner e Reed, que recai no usual em n = 1 */
      var Re = est.rho * Math.pow(ubar, 2 - n) * Math.pow(2 * R, n)
        / (est.K * Math.pow((3 * n + 1) / (4 * n), n) * Math.pow(8, n - 1));

      /* ---- o tubo visto de lado, com o perfil ---- */
      var p = G.preparar(cv1, 290);
      var ct = p.ct;
      var xa = p.L * 0.10, xb = p.L * 0.92, cy = p.A / 2;
      var hr = p.A * 0.30;
      ct.fillStyle = 'rgba(63,67,145,.10)';
      ct.fillRect(xa, cy - hr, xb - xa, 2 * hr);
      ct.fillStyle = G.COR.tinta;
      ct.fillRect(xa, cy - hr - 8, xb - xa, 8);
      ct.fillRect(xa, cy + hr, xb - xa, 8);

      var esc = (xb - xa) * 0.42;
      var i, n2 = 11;
      for (i = 0; i <= n2; i++) {
        var yr = -1 + 2 * i / n2;
        var u = 1 - Math.pow(Math.abs(yr), (n + 1) / n);
        seta(ct, xa + 16, cy + yr * hr, xa + 16 + u * esc, cy + yr * hr,
          G.COR.mestra, 1.8);
      }
      /* o perfil do fluido escolhido e, tracejado, o parabólico */
      [[1, G.COR.suave, 1.8, [6, 4]], [n, G.COR.vinho, 2.6, null]]
        .forEach(function (q) {
          ct.strokeStyle = q[1]; ct.lineWidth = q[2];
          if (q[3]) ct.setLineDash(q[3]);
          ct.beginPath();
          for (i = 0; i <= 80; i++) {
            var y2 = -1 + 2 * i / 80;
            var u2 = 1 - Math.pow(Math.abs(y2), (q[0] + 1) / q[0]);
            var px = xa + 16 + u2 * esc, py = cy + y2 * hr;
            if (i === 0) ct.moveTo(px, py); else ct.lineTo(px, py);
          }
          ct.stroke(); ct.setLineDash([]);
        });
      rotulo(ct, est.nome + ', n = ' + F.fmt(n, 2), xa + 16 + esc * 0.5, cy - hr + 12,
        G.COR.vinho, 'center', 'top');
      if (Math.abs(n - 1) > 0.01) {
        rotulo(ct, 'parábola, n = 1', xb - 8, cy + hr - 8, G.COR.suave, 'right', 'bottom');
      }
      rotulo(ct, 'parede: u = 0', xa + 20, cy + hr - 8, G.COR.suave, 'left', 'bottom');

      /* ---- vazão contra raio, em escala logarítmica ---- */
      var SUP = { '-6': '10⁻⁶', '-5': '10⁻⁵', '-4': '10⁻⁴', '-3': '10⁻³',
                  '-2': '10⁻²', '-1': '10⁻¹', '0': '1', '1': '10', '2': '100',
                  '3': '1000', '4': '10⁴', '5': '10⁵', '6': '10⁶' };
      var lo = Math.floor(Math.log10(vazao(0.5) * 1e6));
      var hi = Math.ceil(Math.log10(vazao(20) * 1e6));
      var gr = G.eixos(cv2, {
        altura: 290, xmin: Math.log10(0.5), xmax: Math.log10(20),
        ymin: lo, ymax: hi, divY: Math.min(8, hi - lo),
        margem: { e: 64, d: 14, c: 14, b: 44 },
        rotX: 'raio (mm)', rotY: 'vazão (mL/s)',
        marcasX: [0.5, 1, 2, 5, 10, 20].map(function (v) {
          return { v: Math.log10(v), r: String(v).replace('.', ',') };
        }),
        formataY: function (v) {
          var k = Math.round(v);
          return SUP[String(k)] || F.fmt(Math.pow(10, v), 1);
        }
      });
      G.curva(gr, function (lx) {
        return Math.log10(vazao(Math.pow(10, lx)) * 1e6);
      }, G.COR.mestra, 2.8);
      G.vertical(gr, Math.log10(est.R), G.COR.vinho, 'R');
      rotulo(gr.ct, 'inclinação ' + F.fmt((3 * n + 1) / n, 2) + ' nesta escala',
        gr.X(Math.log10(0.6)), gr.y0 + 16, G.COR.suave, 'left', 'top');

      mostrar({
        n: F.fmt(n, 2) + (n < 0.99 ? ' pseudoplástico'
                                   : (n > 1.01 ? ' dilatante' : ' newtoniano')),
        umax: F.fmt(umax, 4) + ' m/s',
        raz: F.fmt((3 * n + 1) / (n + 1), 3),
        q: F.fmt(Q * 1e6, 3) + ' mL/s',
        tw: F.fmt(tw, 3) + ' Pa',
        re: F.fmt(Re, Re < 10 ? 2 : 0) + (Re < 2100 ? ' laminar' : ' não laminar')
      });

      nota.innerHTML =
        '<p>Num escoamento estacionário e lento, em que o termo convectivo é desprezível, a '
        + 'equação de Navier-Stokes perde o lado esquerdo inteiro e sobra um balanço entre '
        + 'pressão e viscosidade. O caminho mais curto até o perfil não passa pela equação '
        + 'vetorial: basta o equilíbrio de forças num cilindro de raio \\(r\\) dentro do '
        + 'tubo, que dá a tensão de cisalhamento sem nenhuma hipótese sobre o fluido,</p>'
        + '\\[\\tau(r)=\\frac{\\Delta p}{2L}\\,r.\\]'
        + '<p>Essa é a razão de o cartão da tensão na parede não mudar quando se troca o '
        + 'fluido: ela vale \\(\\Delta p\\,R/2L\\) seja o fluido qual for. O que muda é a '
        + 'velocidade que essa tensão produz, e aí entra a reologia.</p>'
        + '<p>Para um <strong>fluido newtoniano</strong>, \\(\\tau=\\mu\\,|du/dr|\\), a '
        + 'integração dá a parábola de Hagen-Poiseuille,</p>'
        + '\\[u=\\frac{\\Delta p}{4\\mu L}\\left(R^2-r^2\\right),'
        + '\\qquad Q=\\frac{\\pi R^4\\Delta p}{8\\mu L}.\\]'
        + '<p>Para um <strong>fluido de lei de potência</strong>, '
        + '\\(\\tau=K\\,|du/dr|^{\\,n}\\), a mesma integração dá</p>'
        + '\\[u(r)=\\frac{n}{n+1}'
        + '\\left(\\frac{\\Delta p}{2KL}\\right)^{1/n}'
        + '\\left[R^{\\frac{n+1}{n}}-r^{\\frac{n+1}{n}}\\right],'
        + '\\qquad Q=\\frac{\\pi n}{3n+1}'
        + '\\left(\\frac{\\Delta p}{2KL}\\right)^{1/n}R^{\\frac{3n+1}{n}}.\\]'
        + '<p>Com \\(n=1\\) e \\(K=\\mu\\) tudo recai no caso anterior. O botão troca o '
        + 'fluido e o desenho mostra a consequência, com a parábola tracejada ao fundo para '
        + 'comparação. Num <strong>pseudoplástico</strong>, com \\(n&lt;1\\), o fluido afina '
        + 'justamente onde a taxa de deformação é maior, isto é, junto à parede, e o perfil '
        + 'fica achatado no centro, quase um bloco que desliza sobre uma camada fina. Num '
        + '<strong>dilatante</strong>, com \\(n>1\\), acontece o contrário e o perfil fica '
        + 'mais pontudo que a parábola.</p>'
        + '<p>O cartão da razão \\(u_{\\max}/\\bar u\\) põe isso em número, porque ela vale '
        + '\\(\\left(3n+1\\right)/\\left(n+1\\right)\\): dá 2 para o newtoniano, cai para '
        + '1,4 no ketchup e sobe para 2,2 na suspensão de amido. No limite \\(n\\to0\\) ela '
        + 'tende a 1, que é o escoamento em bloco.</p>'
        + '<p>A dependência com o raio também muda. A vazão vai com '
        + '\\(R^{\\left(3n+1\\right)/n}\\), de modo que a célebre quarta potência é apenas o '
        + 'caso \\(n=1\\): um pseudoplástico com \\(n=0{,}5\\) dá expoente 5, e um dilatante '
        + 'com \\(n=1{,}6\\) dá 3,6. O gráfico da direita mostra a inclinação medida nesta '
        + 'escala logarítmica, e ela acompanha o fluido escolhido.</p>'
        + '<p>Os valores de \\(K\\) e \\(n\\) do menu são típicos e de ordem de grandeza. Eles '
        + 'dependem muito da temperatura, da concentração e da faixa de taxas em que a medida '
        + 'foi feita, e servem para comparar comportamentos, não para dimensionar '
        + 'tubulação. O sangue é pseudoplástico porque as hemácias se alinham e se deformam '
        + 'sob cisalhamento alto, o que o torna mais fino nas artérias e mais espesso nos '
        + 'capilares; o xampu e o ketchup são pseudoplásticos por projeto, para ficarem '
        + 'parados no vidro e escorrerem quando agitados; a suspensão de amido em água é o '
        + 'dilatante de demonstração, que endurece sob impacto.</p>'
        + '<p>O último cartão traz o <strong>número de Reynolds generalizado</strong> de '
        + 'Metzner e Reed, que recai no usual quando \\(n=1\\) e vigia a hipótese de '
        + 'escoamento lento também para os demais:</p>'
        + '\\[Re=\\frac{\\varrho\\,\\bar u^{\\,2-n}D^{\\,n}}'
        + '{K\\left(\\frac{3n+1}{4n}\\right)^{n}8^{\\,n-1}}.\\]';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     15. Young-Laplace
     A pressão dentro de uma gota, de uma bolha de ar na água e de uma
     bolha de sabão, que tem duas superfícies e por isso dobra o
     resultado. O gráfico mostra a dependência com 1/R, que é o que
     torna as gotas pequenas tão difíceis de espremer.
     ================================================================= */
  REGISTRO.younglaplace = function (raiz) {
    var est = { R: 1.0, tipo: 'gota', gama: 0.0728, nome: 'água' };

    var LIQUIDOS = [
      { rot: 'água', g: 0.0733 },
      { rot: 'glicerol', g: 0.0572 },
      { rot: 'etanol', g: 0.0221 },
      { rot: 'mercúrio', g: 0.4254 },
      { rot: 'hélio líquido', g: 0.0001 }
    ];

    var corpo = moldura(raiz, 'A pressão dentro de uma gota');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    deslizante(ctr, 'raio', 0.02, 10, 0.02, 1.0,
      function (v) { est.R = v; desenhar(); },
      function (v) { return F.fmt(v, 2) + ' mm'; });
    opcoes(ctr, LIQUIDOS.map(function (q) { return { rot: q.rot, v: q }; }), 0,
      function (v) { est.gama = v.g; est.nome = v.rot; desenhar(); });
    opcoes(ctr, [{ rot: 'gota', v: 'gota' }, { rot: 'bolha de sabão', v: 'sabao' }], 0,
      function (v) { est.tipo = v; desenhar(); });

    var mostrar = cartoes(corpo, [
      { rot: 'tensão superficial', k: 'g' },
      { rot: 'curvatura 2/R', k: 'kap' },
      { rot: 'salto de pressão', k: 'dp' },
      { rot: 'em coluna de água', k: 'col' },
      { rot: 'energia de superfície', k: 'en' },
      { rot: 'comprimento capilar', k: 'lc' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function salto(Rmm) {
      var f = est.tipo === 'sabao' ? 4 : 2;      // a bolha tem duas superfícies
      return f * est.gama / (Rmm * 1e-3);
    }

    function desenhar() {
      var R = est.R * 1e-3;
      var dp = salto(est.R);
      var area = est.tipo === 'sabao' ? 8 * Math.PI * R * R : 4 * Math.PI * R * R;

      /* ---- a gota com as setas de tensão no equador ---- */
      var p = G.preparar(cv1, 300);
      var ct = p.ct;
      var cx = p.L / 2, cy = p.A * 0.52;
      var rr = Math.min(p.L, p.A) * 0.30;
      if (est.tipo === 'sabao') {
        ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2;
        ct.beginPath(); ct.arc(cx, cy, rr, 0, 2 * Math.PI); ct.stroke();
        ct.beginPath(); ct.arc(cx, cy, rr * 0.93, 0, 2 * Math.PI); ct.stroke();
        ct.fillStyle = 'rgba(63,67,145,.10)';
        ct.beginPath(); ct.arc(cx, cy, rr, 0, 2 * Math.PI);
        ct.arc(cx, cy, rr * 0.93, 0, 2 * Math.PI, true); ct.fill();
        rotulo(ct, 'duas superfícies', cx, cy - rr - 10, G.COR.mestra, 'center', 'bottom');
      } else {
        ct.fillStyle = 'rgba(63,67,145,.16)';
        ct.beginPath(); ct.arc(cx, cy, rr, 0, 2 * Math.PI); ct.fill();
        ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2.4;
        ct.beginPath(); ct.arc(cx, cy, rr, 0, 2 * Math.PI); ct.stroke();
      }

      /* tensão puxando o equador para fora e pressão empurrando de dentro */
      var i;
      seta(ct, cx - rr, cy, cx - rr - 26, cy, G.COR.vinho, 2.4);
      seta(ct, cx + rr, cy, cx + rr + 26, cy, G.COR.vinho, 2.4);
      rotulo(ct, 'γ', cx + rr + 30, cy - 8, G.COR.vinho, 'left', 'bottom');
      for (i = 0; i < 8; i++) {
        var b = 2 * Math.PI * i / 8;
        seta(ct, cx + rr * 0.35 * Math.cos(b), cy + rr * 0.35 * Math.sin(b),
          cx + rr * 0.78 * Math.cos(b), cy + rr * 0.78 * Math.sin(b),
          'rgba(63,67,145,.6)', 1.6);
      }
      rotulo(ct, 'Δp = ' + F.fmt(dp, dp > 100 ? 0 : 2) + ' Pa', cx, cy + rr + 14,
        G.COR.tinta, 'center', 'top');
      rotulo(ct, est.nome + ', R = ' + F.fmt(est.R, 2) + ' mm', cx, cy - rr - 24,
        G.COR.suave, 'center', 'bottom');

      /* ---- o salto contra o raio, em escala logarítmica ---- */
      var lo = Math.floor(Math.log10(salto(10)));
      var hi = Math.ceil(Math.log10(salto(0.02)));
      var SUP = { '-2': '10⁻²', '-1': '10⁻¹', '0': '1', '1': '10', '2': '100',
                  '3': '1000', '4': '10⁴', '5': '10⁵', '6': '10⁶' };
      var gr = G.eixos(cv2, {
        altura: 300, xmin: Math.log10(0.02), xmax: Math.log10(10),
        ymin: lo, ymax: hi, divY: Math.min(8, hi - lo),
        margem: { e: 60, d: 14, c: 14, b: 44 },
        rotX: 'raio (mm)', rotY: 'salto de pressão (Pa)',
        marcasX: [0.02, 0.1, 0.5, 2, 10].map(function (v) {
          return { v: Math.log10(v), r: String(v).replace('.', ',') };
        }),
        formataY: function (v) {
          var k = Math.round(v);
          return SUP[String(k)] || F.fmt(Math.pow(10, v), 1);
        }
      });
      G.curva(gr, function (lx) {
        return Math.log10(salto(Math.pow(10, lx)));
      }, G.COR.mestra, 2.8);
      G.vertical(gr, Math.log10(est.R), G.COR.vinho, 'R');
      rotulo(gr.ct, 'inclinação −1', gr.X(Math.log10(0.1)),
        gr.Y(Math.log10(salto(0.45))), G.COR.suave, 'left');

      mostrar({
        g: F.fmt(est.gama * 1000, 1) + ' mN/m',
        kap: F.fmt(2 / R, 0) + ' m⁻¹',
        dp: F.fmt(dp, dp > 100 ? 0 : 3) + ' Pa',
        col: F.fmt(dp / (1000 * 9.80665) * 1000, 2) + ' mm',
        en: F.fmt(est.gama * area * 1e6, 3) + ' μJ',
        lc: F.fmt(Math.sqrt(est.gama / (1000 * 9.80665)) * 1000, 2) + ' mm'
      });

      nota.innerHTML =
        '<p>A tensão superficial \\(\\gamma\\) é a magnitude da força que atua '
        + 'perpendicularmente sobre uma linha imaginária na superfície de um líquido, por '
        + 'unidade de comprimento dessa linha, \\(\\gamma=dF/dx\\). O trabalho para esticar '
        + 'essa linha de \\(dx\\) ao longo de uma largura \\(L\\) é '
        + '\\(dW=F\\,dx=\\gamma L\\,dx=\\gamma\\,dA\\), de modo que a mesma grandeza também '
        + 'é a <strong>energia por unidade de área</strong> de superfície criada. As duas '
        + 'leituras são equivalentes, e a segunda explica por que uma gota solta no ar fica '
        + 'esférica: entre todas as formas de mesmo volume, a esfera é a de menor área.</p>'
        + '<p>A superfície curva precisa de uma diferença de pressão para ficar em '
        + 'equilíbrio. O balanço entre a força de tensão ao longo da borda e a força de '
        + 'pressão sobre a área dá a relação de <strong>Young-Laplace</strong>,</p>'
        + '\\[\\Delta p=\\gamma\\kappa=\\gamma\\left(\\frac{1}{R_1}+\\frac{1}{R_2}\\right),\\]'
        + '<p>com \\(R_1\\) e \\(R_2\\) os dois raios principais de curvatura. Numa esfera os '
        + 'dois valem \\(R\\), a curvatura é \\(\\kappa=2/R\\) e</p>'
        + '\\[\\Delta p=\\frac{2\\gamma}{R}.\\]'
        + '<p>A bolha de sabão é o caso que mais confunde, e o botão permite compará-la. Ela '
        + 'tem <strong>duas</strong> interfaces, a de dentro e a de fora do filme, cada uma '
        + 'contribuindo com \\(2\\gamma/R\\), de modo que o salto total é \\(4\\gamma/R\\). '
        + 'Uma gota de chuva não: ela tem uma superfície só.</p>'
        + '<p>O gráfico mostra a dependência com o inverso do raio, que em escala logarítmica '
        + 'é uma reta de inclinação \\(-1\\). Uma gota de um milímetro tem dentro de si uns '
        + '\\(150\\) Pa a mais que o ar; uma gotícula de névoa, de um micrômetro, tem '
        + '\\(1{,}5\\) atmosfera. É por isso que a nuvem não se desfaz sozinha e que a '
        + 'cavitação destrói hélices: quanto menor a bolha, mais violenta a pressão '
        + 'envolvida.</p>'
        + '<p>O último cartão traz o <strong>comprimento capilar</strong> '
        + '\\(\\lambda=\\sqrt{\\gamma/\\varrho g}\\), que vale cerca de \\(2{,}7\\) mm para a '
        + 'água. Ele separa os dois mundos: abaixo dele manda a tensão superficial e as gotas '
        + 'são esféricas; acima dele manda a gravidade e as poças se achatam.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     16. Capilaridade
     A coluna que sobe num tubo fino, a depressão do mercúrio quando o
     ângulo de contato passa de noventa graus, e a conta que mostra que
     a capilaridade sozinha não levanta água até a copa de uma árvore.
     ================================================================= */
  REGISTRO.capilar = function (raiz) {
    var est = { r: 0.5, th: 20, gama: 0.0728, rho: 998, nome: 'água' };
    var G0 = 9.80665;

    var LIQUIDOS = [
      { rot: 'água', g: 0.0728, rho: 998, th: 20 },
      { rot: 'etanol', g: 0.0221, rho: 789, th: 0 },
      { rot: 'glicerol', g: 0.0572, rho: 1260, th: 30 },
      { rot: 'mercúrio', g: 0.4254, rho: 13546, th: 140 }
    ];

    var corpo = moldura(raiz, 'A coluna que sobe sozinha');

    var par = el('div', { class: 'paineis' });
    var cv1 = el('canvas');
    var cv2 = el('canvas');
    par.appendChild(cv1);
    par.appendChild(cv2);
    corpo.appendChild(par);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    var dth;
    deslizante(ctr, 'raio do tubo', 0.01, 3, 0.01, 0.5,
      function (v) { est.r = v; desenhar(); },
      function (v) { return v < 0.1 ? F.fmt(v * 1000, 0) + ' μm'
                                    : F.fmt(v, 2) + ' mm'; });
    dth = deslizante(ctr, 'ângulo de contato', 0, 160, 5, 20,
      function (v) { est.th = v; desenhar(); },
      function (v) { return F.fmt(v, 0) + '°'; });
    opcoes(ctr, LIQUIDOS.map(function (q) { return { rot: q.rot, v: q }; }), 0,
      function (v) {
        est.gama = v.g; est.rho = v.rho; est.nome = v.rot; est.th = v.th;
        dth.value = v.th;
        dth.dispatchEvent(new Event('input'));
      });

    var mostrar = cartoes(corpo, [
      { rot: 'altura da coluna', k: 'h' },
      { rot: 'salto de pressão', k: 'dp' },
      { rot: 'peso da coluna', k: 'w' },
      { rot: 'força da tensão', k: 'f' },
      { rot: 'número de Bond', k: 'bo' },
      { rot: 'comprimento capilar', k: 'lc' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    function altura(rmm) {
      var r = rmm * 1e-3;
      return 2 * est.gama * Math.cos(est.th * Math.PI / 180) / (est.rho * G0 * r);
    }

    function desenhar() {
      var r = est.r * 1e-3, h = altura(est.r);
      var dp = 2 * est.gama * Math.cos(est.th * Math.PI / 180) / r;
      var peso = est.rho * G0 * Math.PI * r * r * h;
      var forca = 2 * Math.PI * r * est.gama * Math.cos(est.th * Math.PI / 180);
      var bo = est.rho * G0 * r * r / est.gama;

      /* ---- o tubo e o menisco ---- */
      var p = G.preparar(cv1, 320);
      var ct = p.ct;
      var nivel = p.A * 0.70, cx = p.L * 0.46, tw = Math.min(46, p.L * 0.11);
      /* a escala se ajusta para que a coluna caiba sempre */
      var esc = (p.A * 0.52) / Math.max(0.02, Math.abs(h));
      var hp = Math.max(-p.A * 0.22, Math.min(p.A * 0.52, h * esc));

      ct.fillStyle = 'rgba(63,67,145,.12)';
      ct.fillRect(8, nivel, p.L - 16, p.A - nivel - 6);
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 1.8;
      ct.beginPath(); ct.moveTo(8, nivel); ct.lineTo(p.L - 8, nivel); ct.stroke();

      ct.fillStyle = 'rgba(63,67,145,.22)';
      ct.fillRect(cx - tw / 2, nivel - hp, tw, hp + (p.A - nivel - 6));
      ct.strokeStyle = G.COR.tinta; ct.lineWidth = 2.2;
      ct.beginPath();
      ct.moveTo(cx - tw / 2, 14); ct.lineTo(cx - tw / 2, p.A - 6);
      ct.moveTo(cx + tw / 2, 14); ct.lineTo(cx + tw / 2, p.A - 6);
      ct.stroke();

      /* o menisco, curvado conforme o ângulo de contato */
      var thr = est.th * Math.PI / 180;
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2.4;
      ct.beginPath();
      var i;
      for (i = 0; i <= 24; i++) {
        var s = -1 + 2 * i / 24;
        /* molhando (cos > 0) o menisco é côncavo, com o centro mais baixo
           que a borda; com ângulo acima de 90° ele se inverte */
        var yy = nivel - hp + Math.cos(thr) * (tw / 2) * (1 - s * s) * 0.5;
        if (i === 0) ct.moveTo(cx + s * tw / 2, yy); else ct.lineTo(cx + s * tw / 2, yy);
      }
      ct.stroke();

      seta(ct, cx + tw / 2 + 18, nivel, cx + tw / 2 + 18, nivel - hp, G.COR.vinho, 1.6);
      seta(ct, cx + tw / 2 + 18, nivel - hp, cx + tw / 2 + 18, nivel, G.COR.vinho, 1.6);
      rotulo(ct, (h >= 0 ? 'h = ' : 'depressão ') + F.fmt(Math.abs(h) * 1000, 1) + ' mm',
        cx + tw / 2 + 24, nivel - hp / 2, G.COR.vinho, 'left');
      rotulo(ct, est.nome + ', θ = ' + F.fmt(est.th, 0) + '°', 12, 14,
        G.COR.suave, 'left', 'top');
      rotulo(ct, 'r = ' + (est.r < 0.1 ? F.fmt(est.r * 1000, 0) + ' μm'
                                       : F.fmt(est.r, 2) + ' mm'),
        cx, p.A - 10, G.COR.suave, 'center', 'bottom');

      /* ---- altura contra raio ---- */
      var SUP = { '-4': '10⁻⁴', '-3': '10⁻³', '-2': '10⁻²', '-1': '10⁻¹',
                  '0': '1', '1': '10', '2': '100', '3': '1000' };
      var ha = Math.abs(altura(0.01)), hb = Math.abs(altura(3));
      var lo = Math.floor(Math.log10(Math.min(ha, hb)));
      /* o eixo vai sempre até a altura de uma sequoia, porque a distância
         entre a curva e essa linha é o ponto da seção */
      var hi = Math.max(Math.ceil(Math.log10(Math.max(ha, hb))),
                        Math.ceil(Math.log10(50)));
      var gr = G.eixos(cv2, {
        altura: 320, xmin: Math.log10(0.01), xmax: Math.log10(3),
        ymin: lo, ymax: hi, divY: Math.min(8, hi - lo),
        margem: { e: 60, d: 14, c: 14, b: 44 },
        rotX: 'raio do tubo (mm)', rotY: '|h| (m)',
        marcasX: [0.01, 0.03, 0.1, 0.3, 1, 3].map(function (v) {
          return { v: Math.log10(v), r: String(v).replace('.', ',') };
        }),
        formataY: function (v) {
          var k = Math.round(v);
          return SUP[String(k)] || F.fmt(Math.pow(10, v), 1);
        }
      });
      G.curva(gr, function (lx) {
        return Math.log10(Math.abs(altura(Math.pow(10, lx))) + 1e-12);
      }, G.COR.mestra, 2.8);
      G.vertical(gr, Math.log10(est.r), G.COR.vinho, 'r');
      /* a altura de uma árvore alta, para comparação */
      {
        var gc = gr.ct;
        gc.strokeStyle = G.COR.bronze; gc.lineWidth = 1.6;
        gc.setLineDash([6, 4]);
        gc.beginPath();
        gc.moveTo(gr.x0, gr.Y(Math.log10(50))); gc.lineTo(gr.x1, gr.Y(Math.log10(50)));
        gc.stroke(); gc.setLineDash([]);
        rotulo(gc, 'copa de uma sequoia, 50 m', gr.x1 - 6, gr.Y(Math.log10(50)) - 6,
          G.COR.bronze, 'right', 'bottom');
      }

      mostrar({
        h: F.fmt(h * 1000, 2) + ' mm',
        dp: F.fmt(dp, Math.abs(dp) > 100 ? 0 : 2) + ' Pa',
        w: F.fmt(peso * 1e6, 2) + ' μN',
        f: F.fmt(forca * 1e6, 2) + ' μN',
        bo: F.fmt(bo, 4),
        lc: F.fmt(Math.sqrt(est.gama / (est.rho * G0)) * 1000, 2) + ' mm'
      });

      nota.innerHTML =
        '<p>Quando um líquido molha a parede de um tubo fino, a superfície dentro do tubo '
        + 'deixa de ser plana e se curva. Pelo resultado da seção anterior, essa curvatura '
        + 'exige um salto de pressão, e o líquido sobe até que o peso da coluna equilibre '
        + 'esse salto. Com um menisco esférico de raio \\(R=r/\\cos\\theta\\), onde '
        + '\\(\\theta\\) é o <strong>ângulo de contato</strong>,</p>'
        + '\\[\\varrho gh=\\frac{2\\gamma\\cos\\theta}{r} '
        + '\\quad\\Longrightarrow\\quad '
        + 'h=\\frac{2\\gamma\\cos\\theta}{\\varrho gr}.\\]'
        + '<p>O ângulo de contato decide o sinal. Com \\(\\theta<90^\\circ\\) o líquido é '
        + '<strong>hidrofílico</strong> em relação àquela parede, a adesão com o vidro ganha '
        + 'da coesão interna, e a coluna sobe. Com \\(\\theta>90^\\circ\\) acontece o '
        + 'contrário: o mercúrio no vidro tem \\(\\theta\\approx140^\\circ\\), o cosseno é '
        + 'negativo e o nível dentro do tubo fica <em>abaixo</em> do nível de fora. O botão '
        + 'do mercúrio mostra essa depressão.</p>'
        + '<p>Os dois cartões do meio conferem o balanço de outra maneira, comparando o peso '
        + 'da coluna com a força que a tensão superficial exerce ao longo da linha de '
        + 'contato, \\(2\\pi r\\gamma\\cos\\theta\\). Os dois números coincidem, como têm de '
        + 'coincidir, e essa é a leitura mais direta do fenômeno: o líquido fica literalmente '
        + 'pendurado pela borda do menisco.</p>'
        + '<p>O <strong>número de Bond</strong>, \\(Bo=\\varrho gr^2/\\gamma\\), mede a razão '
        + 'entre gravidade e tensão superficial. Para tubos muito mais finos que o '
        + 'comprimento capilar ele é minúsculo e a capilaridade domina; para tubos largos ele '
        + 'cresce e o efeito desaparece, o que se vê no gráfico pela queda de \\(h\\) com '
        + '\\(1/r\\).</p>'
        + '<p>É aqui que mora uma lição importante sobre o xilema. A seiva sobe por vasos de '
        + 'uns \\(20\\) μm de diâmetro, e a conta acima dá pouco mais de um metro e meio de '
        + 'coluna. Uma sequoia tem cem metros. A capilaridade sozinha, portanto, '
        + '<strong>não</strong> explica a subida da água numa árvore alta, e a linha '
        + 'tracejada no gráfico mostra o tamanho do buraco. O que explica é a transpiração '
        + 'nas folhas, que põe a água do xilema sob tensão, com pressão absoluta '
        + 'negativa, e a coesão entre as moléculas, que mantém a coluna inteira sem romper. '
        + 'A capilaridade entra como a condição de contorno no alto, onde o menisco nos poros '
        + 'da parede celular sustenta a tensão.</p>';
      tipografar(corpo);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     17. A curvatura de uma superfície
     O desenho da definição: um pedaço de superfície, as duas curvas
     principais que passam pelo ponto, os vetores tangentes, a normal e
     os dois círculos osculadores cujos raios entram em Young-Laplace.
     Com os dois raios livres dá para passar da esfera ao cilindro, ao
     plano e à sela, que é onde a curvatura média se anula.
     ================================================================= */
  REGISTRO.curvatura = function (raiz) {
    var est = { k1: 1.0, k2: 1.0, gama: 0.0728 };

    var corpo = moldura(raiz, 'As duas curvas e os dois raios');

    var cv = el('canvas');
    corpo.appendChild(cv);

    var ctr = el('div', { class: 'controles' });
    corpo.appendChild(ctr);
    var d1 = deslizante(ctr, 'curvatura 1/R₁', -1.4, 1.4, 0.05, 1.0,
      function (v) { est.k1 = v; desenhar(); },
      function (v) { return F.fmt(v, 2) + ' mm⁻¹'; });
    var d2 = deslizante(ctr, 'curvatura 1/R₂', -1.4, 1.4, 0.05, 1.0,
      function (v) { est.k2 = v; desenhar(); },
      function (v) { return F.fmt(v, 2) + ' mm⁻¹'; });
    opcoes(ctr, [{ rot: 'esfera', v: [1, 1] }, { rot: 'cilindro', v: [1, 0] },
                 { rot: 'plano', v: [0, 0] }, { rot: 'sela', v: [1, -1] }], 0,
      function (v) {
        est.k1 = v[0]; est.k2 = v[1];
        d1.value = v[0]; d2.value = v[1];
        d1.dispatchEvent(new Event('input'));
        d2.dispatchEvent(new Event('input'));
      });

    var mostrar = cartoes(corpo, [
      { rot: 'raio R₁', k: 'r1' },
      { rot: 'raio R₂', k: 'r2' },
      { rot: 'curvatura κ = 1/R₁ + 1/R₂', k: 'kap' },
      { rot: 'tipo de ponto', k: 'tipo' },
      { rot: 'salto de pressão γκ', k: 'dp' },
      { rot: 'curvatura gaussiana', k: 'gauss' }
    ]);
    var nota = el('div', { class: 'saida' });
    corpo.appendChild(nota);

    /* A superfície é o parabolóide osculador z = (k1 x² + k2 y²)/2, que é
       a melhor aproximação de segunda ordem de qualquer superfície lisa
       perto do ponto de contato. */
    function sup(x, y) { return (est.k1 * x * x + est.k2 * y * y) / 2; }

    function desenhar() {
      var p = G.preparar(cv, 380);
      var ct = p.ct;
      var cx = p.L / 2, cy = p.A * 0.58;
      var esc = Math.min(p.L * 0.42, p.A * 0.34);

      function proj(v) {
        var w = M3.apl(VISTA, v);
        return [cx + w[0] * esc, cy - w[2] * esc - w[1] * esc * 0.22];
      }
      function linha(pts, cor, esp, tracejado) {
        ct.save();
        ct.strokeStyle = cor; ct.lineWidth = esp;
        if (tracejado) ct.setLineDash(tracejado);
        ct.beginPath();
        pts.forEach(function (q, i) {
          var s = proj(q);
          if (i === 0) ct.moveTo(s[0], s[1]); else ct.lineTo(s[0], s[1]);
        });
        ct.stroke();
        ct.restore();
      }

      var L = 1.25, i, j, pts;

      /* malha da superfície */
      for (i = -4; i <= 4; i++) {
        pts = [];
        for (j = -20; j <= 20; j++) {
          var x = L * i / 4, y = L * j / 20;
          pts.push([x, y, sup(x, y)]);
        }
        linha(pts, 'rgba(63,67,145,.22)', 1);
        pts = [];
        for (j = -20; j <= 20; j++) {
          var x2 = L * j / 20, y2 = L * i / 4;
          pts.push([x2, y2, sup(x2, y2)]);
        }
        linha(pts, 'rgba(63,67,145,.22)', 1);
      }

      /* as duas curvas principais pelo ponto de contato */
      pts = [];
      for (j = -24; j <= 24; j++) { var a = L * j / 24; pts.push([a, 0, sup(a, 0)]); }
      linha(pts, G.COR.mestra, 3);
      pts = [];
      for (j = -24; j <= 24; j++) { var b = L * j / 24; pts.push([0, b, sup(0, b)]); }
      linha(pts, G.COR.vinho, 3);

      /* círculos osculadores, no plano de cada curva */
      [[est.k1, G.COR.mestra, true], [est.k2, G.COR.vinho, false]].forEach(function (q) {
        if (Math.abs(q[0]) < 0.06) return;
        /* o círculo osculador inteiro, para que o raio fique visível */
        var R = 1 / q[0], cc = [0, 0, R], arc = [];
        for (j = 0; j <= 90; j++) {
          var th = 2 * Math.PI * j / 90;
          var u = R * Math.sin(th), w = R - R * Math.cos(th);
          arc.push(q[2] ? [u, 0, w] : [0, u, w]);
        }
        linha(arc, q[1], 1.3, [5, 4]);
        var s = proj(cc);
        ct.fillStyle = q[1];
        ct.beginPath(); ct.arc(s[0], s[1], 3, 0, 2 * Math.PI); ct.fill();
        var s0 = proj([0, 0, 0]);
        ct.save();
        ct.strokeStyle = q[1]; ct.lineWidth = 1.2; ct.setLineDash([3, 3]);
        ct.beginPath(); ct.moveTo(s0[0], s0[1]); ct.lineTo(s[0], s[1]); ct.stroke();
        ct.restore();
        rotulo(ct, q[2] ? 'R₁' : 'R₂', (s0[0] + s[0]) / 2 + (q[2] ? -14 : 14),
          (s0[1] + s[1]) / 2 + (q[2] ? -4 : 10), q[1]);
      });

      /* os três vetores de base no ponto de contato */
      var o = proj([0, 0, 0]);
      /* no ponto de contato o plano tangente é o plano z = 0 */
      var t1 = proj([0.62, 0, 0]);
      var t2 = proj([0, 0.62, 0]);
      var nn = proj([0, 0, 0.78]);
      seta(ct, o[0], o[1], t1[0], t1[1], G.COR.mestra, 2.6);
      seta(ct, o[0], o[1], t2[0], t2[1], G.COR.vinho, 2.6);
      seta(ct, o[0], o[1], nn[0], nn[1], G.COR.tinta, 2.6);
      rotulo(ct, 't̂₁', t1[0] + 10, t1[1] + 6, G.COR.mestra);
      rotulo(ct, 't̂₂', t2[0] - 12, t2[1] + 8, G.COR.vinho);
      rotulo(ct, 'n̂', nn[0] + 2, nn[1] - 10, G.COR.tinta);
      rotulo(ct, 'c₁', proj([L, 0, sup(L, 0)])[0] + 12,
        proj([L, 0, sup(L, 0)])[1], G.COR.mestra, 'left');
      rotulo(ct, 'c₂', proj([0, L, sup(0, L)])[0] - 12,
        proj([0, L, sup(0, L)])[1], G.COR.vinho, 'right');
      ct.fillStyle = G.COR.tinta;
      ct.beginPath(); ct.arc(o[0], o[1], 4, 0, 2 * Math.PI); ct.fill();

      var kap = est.k1 + est.k2, gauss = est.k1 * est.k2;
      var tipo = Math.abs(gauss) < 0.01
        ? (Math.abs(kap) < 0.01 ? 'plano' : 'parabólico, um raio infinito')
        : (gauss > 0 ? 'elíptico, curva para o mesmo lado'
                     : 'hiperbólico, sela');
      mostrar({
        r1: Math.abs(est.k1) < 0.06 ? 'infinito' : F.fmt(1 / est.k1, 2) + ' mm',
        r2: Math.abs(est.k2) < 0.06 ? 'infinito' : F.fmt(1 / est.k2, 2) + ' mm',
        kap: F.fmt(kap, 2) + ' mm⁻¹',
        tipo: tipo,
        dp: F.fmt(est.gama * kap * 1000, 1) + ' Pa',
        gauss: F.fmt(gauss, 3) + ' mm⁻²'
      });

      nota.innerHTML =
        '<p>Perto de um ponto, qualquer superfície lisa é bem descrita pelo parabolóide '
        + '\\(z=\\left(\\kappa_1x^2+\\kappa_2y^2\\right)/2\\), que é o que está desenhado. As '
        + 'duas curvas em destaque são \\(c_1\\), ao longo de \\(\\vers{t}_1\\), e \\(c_2\\), '
        + 'ao longo de \\(\\vers{t}_2\\), e os círculos tracejados são os '
        + '<strong>círculos osculadores</strong> de cada uma: o círculo que melhor se ajusta '
        + 'à curva naquele ponto, com centro sobre a normal e raio \\(R_1\\) ou '
        + '\\(R_2\\).</p>'
        + '<p>O vetor curvatura de cada curva é a variação do tangente unitário com o '
        + 'comprimento de arco,</p>'
        + '\\[\\vet{k}_1=\\der{\\vers{t}_1}{c_1}'
        + '=\\left(\\vers{t}_1\\cdot\\nabla\\right)\\vers{t}_1,\\]'
        + '<p>e o seu módulo vale \\(1/R_1\\). A curvatura da superfície é a soma dos dois '
        + 'módulos, \\(\\kappa=1/R_1+1/R_2\\), e é ela que aparece em Young-Laplace.</p>'
        + '<p>Os botões percorrem os quatro casos que importam. Na '
        + '<strong>esfera</strong> os dois raios são iguais e \\(\\kappa=2/R\\). No '
        + '<strong>cilindro</strong> uma das curvas é uma reta, o seu raio é infinito e '
        + '\\(\\kappa=1/R\\): é por isso que a pressão dentro de um jato cilíndrico é metade '
        + 'da de uma gota de mesmo raio. No <strong>plano</strong> ambos são infinitos e não '
        + 'há salto de pressão nenhum.</p>'
        + '<p>A <strong>sela</strong> é o caso que merece atenção. Ali as duas curvas se '
        + 'encurvam para lados opostos, um raio é positivo e o outro negativo, e a soma pode '
        + 'dar zero com as duas curvaturas bem diferentes de zero. Uma superfície assim tem '
        + 'salto de pressão nulo em toda parte, e é exatamente a condição que define uma '
        + '<strong>superfície mínima</strong>, como a película de sabão esticada entre dois '
        + 'anéis. O último cartão mostra a curvatura gaussiana \\(\\kappa_1\\kappa_2\\), que '
        + 'distingue os pontos elípticos dos hiperbólicos e, ao contrário da soma, não muda '
        + 'quando se dobra a superfície sem esticá-la.</p>';
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
