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
      rotulo(ct, N + ' partículas', p.L / 2, y0 - 8, G.COR.suave, 'center', 'bottom');

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
          return { v: k, r: k === 0 ? '1' : '10' + (k > 1 ? '^' + k : '') };
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
      { rot: 'diferença relativa', k: 'dif' },
      { rot: 'M / M da gota uniforme', k: 'raz' },
      { rot: 'densidade média', k: 'dm' },
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
      var nd = 44, i;
      for (i = 0; i < nd; i++) {
        var z1 = -1 + 2 * i / nd, z2 = -1 + 2 * (i + 1) / nd;
        var zm = (z1 + z2) / 2, a = Math.sqrt(Math.max(0, 1 - zm * zm));
        ct.fillStyle = 'rgba(63,67,145,' + (0.08 + 0.62 * dens(zm)) + ')';
        ct.fillRect(cx - a * R, cy - z2 * R, 2 * a * R, (z2 - z1) * R + 0.6);
      }
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
      rotulo(ct, 'z', cx - 10, cy - R * 0.6, G.COR.vinho, 'right');
      rotulo(ct, 'mais densa', cx, cy + R + 14, G.COR.suave, 'center', 'top');
      rotulo(ct, 'menos densa', cx, cy - R - 14, G.COR.suave, 'center', 'bottom');

      /* ---- o integrando, cuja área é a massa ---- */
      var gr = G.eixos(cv2, {
        altura: 300, xmin: -1, xmax: 1, ymin: 0, ymax: Math.PI * 1.08,
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
        dif: F.pct(Math.abs(num - exa) / exa, 4),
        raz: F.fmt(num / (4 * Math.PI / 3), 4),
        dm: F.fmt(num / (4 * Math.PI / 3), 4) + ' ρ₀',
        meio: F.pct(meio / num, 1)
      });

      nota.innerHTML =
        '<p>A gota é praticamente esférica, de raio \\(R\\), e a gravidade deixa a parte de '
        + 'baixo mais densa que a de cima, de modo que</p>'
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
      rotulo(ct, 'superfície de área A', (ax + bx) / 2 - 12, (ay + by) / 2,
        G.COR.tinta, 'right');

      /* a normal e a velocidade, com o ângulo entre elas */
      var nx = Math.cos(th), ny = -Math.sin(th);
      seta(ct, cx, cy, cx + nx * L * 0.8, cy + ny * L * 0.8, G.COR.vinho, 2.4);
      rotulo(ct, 'n̂', cx + nx * L * 0.9, cy + ny * L * 0.9, G.COR.vinho);
      var i;
      for (i = -2; i <= 2; i++) {
        var yy = cy + i * L * 0.42;
        seta(ct, cx - L * 1.25, yy, cx - L * 0.55, yy, G.COR.mestra, 2);
      }
      rotulo(ct, 'u⃗', cx - L * 0.95, cy - L * 0.42 - 12, G.COR.mestra, 'center', 'bottom');
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
