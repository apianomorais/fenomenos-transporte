# -*- coding: utf-8 -*-
"""Advecção e difusão no computador: estabilidade, ordem e os erros de cada esquema.

O QUE RESOLVE
    1. Difusão pelo esquema explícito, e o limite s <= 1/2 medido dos dois
       lados, com o caso s = 1/2 conferido contra uma fórmula fechada.
    2. Implícito e Crank-Nicolson pelo algoritmo de Thomas, com a ordem no
       passo de tempo medida separadamente do erro de malha.
    3. O FTCS aplicado à advecção, e a separação entre o que nele é
       reproduzível e o que não é.
    4. Upwind: a difusão numérica prevista pela equação modificada,
       comparada com a largura medida do pulso.
    5. Lax-Wendroff: a dispersão numérica junto de uma descontinuidade.
    6. O Péclet de malha, e o limiar de 2 localizado por medida.

A FISICA
    Advecção e difusão são os dois modos de transportar uma substância, e
    cada um impõe ao computador uma dificuldade diferente. A difusão espalha
    e e por isso perdoa: qualquer erro que ela produza tende a ser suavizado
    pela propria equacao. A adveccao so translada, nao perdoa nada, e todo
    erro cometido viaja junto com o pulso.

    Essa diferenca aparece na escolha dos vizinhos. Na difusao o fluxo vem
    dos dois lados e a diferenca centrada e a escolha natural. Na adveccao a
    informacao vem de um lado so, o de montante, e perguntar ao vizinho de
    jusante e consultar o futuro: e dai que sai a instabilidade do FTCS.

COMO CONFERIR SE ESTA CERTO
    1. Com s = 1/2 o esquema explicito vira uma media dos dois vizinhos, e o
       maximo de um pulso de um ponto so tem de dar C(2n, n)/4^n exatamente.
    2. O erro do implicito tem de cair por 2 e o do Crank-Nicolson por 4
       quando o passo de tempo cai pela metade.
    3. A largura medida do pulso no upwind tem de bater com
       sqrt(sigma0^2 + 2 D_num t) nas cinco casas, e D_num tem de se anular
       em C = 1.
    4. O limiar de oscilacao do esquema centrado tem de cair exatamente em
       Pe = 2, e nao perto de 2.

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

from math import comb

import numpy as np

N = 200          # celulas do anel
L = 1.0          # comprimento do anel
U = 1.0          # velocidade de adveccao
S0 = 0.05        # largura inicial da gaussiana
DX = L / N


# ---------------------------------------------------------------------------
# perfis iniciais, os mesmos do widget da aula
# ---------------------------------------------------------------------------


def distancia(x, x0=0.25):
    """Distância ao centro do pulso, pela imagem mais próxima no anel."""
    d = x - x0
    d = np.where(d > L / 2, d - L, d)
    return np.where(d < -L / 2, d + L, d)


def gaussiana():
    d = distancia(np.arange(N) * DX)
    return np.exp(-d * d / (2 * S0 * S0))


def degrau():
    d = distancia(np.arange(N) * DX)
    return np.where(np.abs(d) < 0.08, 1.0, 0.0)


def largura(c):
    """Largura do pulso pelo segundo momento, em coordenada angular.

    O centroide tem de ser calculado como ângulo, e não como média de x, ou
    um pulso que cruza a emenda do anel aparece no meio do domínio.
    """
    th = 2 * np.pi * np.arange(N) / N
    s = c.sum()
    tb = np.arctan2((c * np.sin(th)).sum() / s, (c * np.cos(th)).sum() / s)
    d = (th - tb + np.pi) % (2 * np.pi) - np.pi
    return float(np.sqrt((c * (d * L / (2 * np.pi)) ** 2).sum() / s))


# ---------------------------------------------------------------------------
# esquemas
# ---------------------------------------------------------------------------


def passo_ftcs_difusao(c, s):
    return c + s * (np.roll(c, -1) - 2 * c + np.roll(c, 1))


def passo_ftcs(c, C):
    return c - C / 2 * (np.roll(c, -1) - np.roll(c, 1))


def passo_upwind(c, C):
    return c - C * (c - np.roll(c, 1))          # para U > 0


def passo_lax_wendroff(c, C):
    return (c - C / 2 * (np.roll(c, -1) - np.roll(c, 1))
            + C * C / 2 * (np.roll(c, -1) - 2 * c + np.roll(c, 1)))


def thomas(a, b, d, r):
    """Resolve um sistema tridiagonal a-b-d pelo algoritmo de Thomas.

    a é a subdiagonal, b a diagonal, d a superdiagonal e r o lado direito.
    É a eliminação de Gauss escrita para o caso em que só três incógnitas
    aparecem por equação, e custa O(n) em vez de O(n^3).
    """
    n = len(b)
    cb = b.astype(float).copy()
    cr = r.astype(float).copy()
    for k in range(1, n):
        m = a[k] / cb[k - 1]
        cb[k] -= m * d[k - 1]
        cr[k] -= m * cr[k - 1]
    x = np.empty(n)
    x[-1] = cr[-1] / cb[-1]
    for k in range(n - 2, -1, -1):
        x[k] = (cr[k] - d[k] * x[k + 1]) / cb[k]
    return x


def passo_theta(c, s, theta):
    """Um passo de (1-theta) explícito + theta implícito, com extremos fixos.

    theta = 0 é o explícito, theta = 1 o implícito puro e theta = 1/2 o
    Crank-Nicolson. Os pontos das pontas não se movem.
    """
    n = len(c) - 2
    lap = c[2:] - 2 * c[1:-1] + c[:-2]
    r = c[1:-1] + (1 - theta) * s * lap
    r[0] += theta * s * c[0]
    r[-1] += theta * s * c[-1]
    a = np.full(n, -theta * s)
    b = np.full(n, 1 + 2 * theta * s)
    d = np.full(n, -theta * s)
    novo = c.copy()
    novo[1:-1] = thomas(a, b, d, r)
    return novo


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. DIFUSAO EXPLICITA: O LIMITE s <= 1/2, DOS DOIS LADOS')
    print('=' * 72)
    M = 201
    print('   Pulso de um ponto so, de altura 1, numa malha de %d pontos,' % M)
    print('   com as pontas presas em zero. 200 passos.')
    print()
    print('      s        maximo final      o que a analise de von Neumann diz')
    for s in (0.25, 0.50, 0.51, 0.60):
        c = np.zeros(M)
        c[M // 2] = 1.0
        for _ in range(200):
            c[1:-1] = c[1:-1] + s * (c[2:] - 2 * c[1:-1] + c[:-2])
        g = abs(1 - 4 * s)                   # pior modo: k dx = pi
        print('      %.2f   %14.4e      |g| no pior modo = %.2f%s'
              % (s, np.abs(c).max(), g, '' if g <= 1 else '  INSTAVEL'))
    print()
    exato = comb(200, 100) / 2.0 ** 200
    c = np.zeros(M)
    c[M // 2] = 1.0
    for _ in range(200):
        c[1:-1] = c[1:-1] + 0.5 * (c[2:] - 2 * c[1:-1] + c[:-2])
    print('   Em s = 1/2 o esquema vira c_i <- (c_{i+1} + c_{i-1})/2, que e')
    print('   a media dos dois vizinhos, e o pulso de um ponto so se espalha')
    print('   exatamente como os coeficientes binomiais. Depois de 200')
    print('   passos o maximo tem de valer C(200,100)/4^100:')
    print()
    print('      medido:  %.10f' % np.abs(c).max())
    print('      formula: %.10f' % exato)
    print('      desvio:  %.2e' % abs(np.abs(c).max() - exato))
    print()
    print('   O limite nao e conservador: em s = 0,50 o pulso decai em')
    print('   ordem, e em s = 0,51 ele explode. Entre os dois nao ha')
    print('   margem nenhuma.')
    print()

    print('=' * 72)
    print('2. IMPLICITO E CRANK-NICOLSON')
    print('=' * 72)
    M, D, T = 129, 0.01, 0.5
    dx = L / (M - 1)
    x = np.linspace(0, L, M)
    c0 = np.exp(-(x - 0.5) ** 2 / (2 * S0 * S0))
    print('   Estabilidade incondicional, testada no absurdo: s = 50.')
    s_grande = 50.0
    c = c0.copy()
    for _ in range(200):
        c = passo_theta(c, s_grande, 1.0)
    print('      implicito com s = %.0f, 200 passos: maximo = %.6f'
          % (s_grande, np.abs(c).max()))
    c = c0.copy()
    with np.errstate(over='ignore', invalid='ignore'):
        # o estouro aqui e o resultado, nao um acidente: s = 50 esta cem
        # vezes acima do limite do explicito, e o aviso do numpy so
        # atrapalharia a leitura da saida
        for k in range(200):
            c = passo_ftcs_difusao(c, s_grande)
            if not np.all(np.isfinite(c)):
                break
    print('      explicito com o mesmo s:            estourou no passo %d'
          % (k + 1))
    print()
    print('   Ordem no passo de tempo. Para medir so o erro do TEMPO, a')
    print('   referencia e a solucao exata do esquema semidiscreto, que usa')
    print('   o mesmo laplaciano de tres pontos: assim o erro de malha sai')
    print('   da conta e sobra o que se quer medir.')
    print()
    k = 2 * np.pi * np.fft.fftfreq(M - 1, dx)
    lam = -(4 * D / dx ** 2) * np.sin(k * dx / 2) ** 2
    ck0 = np.fft.fft(c0[:-1])
    ref = np.real(np.fft.ifft(ck0 * np.exp(lam * T)))
    for nome, theta in (('implicito', 1.0), ('Crank-Nicolson', 0.5)):
        print('      %s' % nome)
        ant = None
        for nt in (50, 100, 200, 400):
            dt = T / nt
            mu = lam * dt
            g = (1 + (1 - theta) * mu) / (1 - theta * mu)
            num = np.real(np.fft.ifft(ck0 * g ** nt))
            e = np.abs(num - ref).max()
            print('         nt=%4d  dt=%.5f  erro=%.4e %s'
                  % (nt, dt, e, 'cai por %.2f' % (ant / e) if ant else ''))
            ant = e
    print()
    print('   O implicito cai por 2 e o Crank-Nicolson por 4: primeira e')
    print('   segunda ordem no tempo. O preco do implicito e resolver um')
    print('   sistema por passo, e o algoritmo de Thomas o cobra em O(n).')
    print()

    print('=' * 72)
    print('3. FTCS NA ADVECCAO: O QUE E E O QUE NAO E REPRODUZIVEL')
    print('=' * 72)
    C = 0.5
    print('   Gaussiana de sigma0 = %.2f no anel, %d celulas, C = %.1f.'
          % (S0, N, C))
    print()
    base = gaussiana()
    um_ulp = np.nextafter(base, np.inf)    # cada valor um ulp acima
    print('      a segunda condicao inicial difere da primeira em %.2e,'
          % np.abs(um_ulp - base).max())
    print('      que e UM ulp: o ultimo bit de cada valor.')
    print()
    print('      passos     partindo de c0     partindo de c0 + 1 ulp   razao')
    saida = {}
    for nome, c0f in (('a', base), ('b', um_ulp)):
        c = c0f.copy()
        saida[nome] = {}
        for n in range(1, 801):
            c = passo_ftcs(c, C)
            if n in (100, 200, 400, 800):
                saida[nome][n] = np.abs(c).max()
    for n in (100, 200, 400, 800):
        a, b = saida['a'][n], saida['b'][n]
        print('      %6d  %16.5g  %22.5g   %6.3f' % (n, a, b, b / a))
    print()
    print('   O esquema e incondicionalmente instavel, e ate uns 200 passos')
    print('   os dois resultados coincidem em todos os digitos. Dai em')
    print('   diante eles se separam, e em 800 passos diferem por dezenas')
    print('   por cento, apesar de terem partido de dados que diferem no')
    print('   ultimo bit.')
    print()
    print('   A licao e sobre o que vale a pena anotar. O valor 1,15 em 100')
    print('   passos e uma propriedade do esquema e se reproduz em qualquer')
    print('   maquina. O valor em 800 passos nao e: ele e uma propriedade do')
    print('   ultimo bit da biblioteca de exponencial que gerou o dado')
    print('   inicial. De um esquema instavel so se deve citar a ORDEM DE')
    print('   GRANDEZA e a taxa de crescimento, nunca um numero com casas.')
    print()

    print('=' * 72)
    print('4. UPWIND E A DIFUSAO NUMERICA')
    print('=' * 72)
    print('   A equacao modificada diz que o upwind nao resolve a adveccao')
    print('   pura, e sim a adveccao com uma difusao de brinde,')
    print('   D_num = u dx (1 - C)/2. Se isso for verdade, a largura final')
    print('   do pulso tem de ser sqrt(sigma0^2 + 2 D_num t).')
    print()
    print('      C      D_num        largura prevista   medida      desvio')
    for C in (0.25, 0.50, 0.75, 1.00):
        dt = C * DX / U
        n = int(round(0.5 / dt))
        c = gaussiana()
        for _ in range(n):
            c = passo_upwind(c, C)
        dnum = U * DX / 2 * (1 - C)
        prev = np.sqrt(S0 ** 2 + 2 * dnum * 0.5)
        med = largura(c)
        print('      %.2f   %.3e    %12.5f  %10.5f   %.1e'
              % (C, dnum, prev, med, abs(med - prev)))
    print()
    print('   A concordancia e de cinco casas, e isso quer dizer que a')
    print('   equacao modificada nao e uma analogia: e a equacao que o')
    print('   programa resolve de fato. Em C = 1 a difusao numerica se anula')
    print('   e o esquema vira c_i <- c_{i-1}, isto e, copiar cada valor')
    print('   para a celula seguinte, que e a adveccao exata. Essa sorte')
    print('   acaba assim que a velocidade variar de ponto a ponto.')
    print()

    print('=' * 72)
    print('5. LAX-WENDROFF E A DISPERSAO')
    print('=' * 72)
    C = 0.8
    c = degrau()
    for _ in range(200):
        c = passo_lax_wendroff(c, C)
    print('   Degrau, C = %.1f, 200 passos:' % C)
    print('      minimo %.4f   maximo %.4f   (deveria ficar entre 0 e 1)'
          % (c.min(), c.max()))
    cu = degrau()
    for _ in range(200):
        cu = passo_upwind(cu, C)
    print('      o upwind no mesmo degrau: minimo %.4f  maximo %.4f'
          % (cu.min(), cu.max()))
    print()
    cg = gaussiana()
    for _ in range(200):
        cg = passo_lax_wendroff(cg, C)
    cgu = gaussiana()
    for _ in range(200):
        cgu = passo_upwind(cgu, C)
    print('   E na gaussiana suave, com os mesmos 200 passos:')
    print('      largura inicial:            %.5f' % largura(gaussiana()))
    print('      Lax-Wendroff:               %.5f' % largura(cg))
    print('      upwind:                     %.5f' % largura(cgu))
    print()
    print('   Os dois defeitos sao opostos. O upwind nao inventa valores')
    print('   novos, nunca passa de 0 e 1, e em troca alarga o pulso. O')
    print('   Lax-Wendroff guarda a largura e em troca oscila junto da')
    print('   descontinuidade, chegando a concentracao negativa. Godunov')
    print('   provou em 1959 que, entre os esquemas LINEARES, nao ha')
    print('   terceira opcao acima da primeira ordem.')
    print()

    print('=' * 72)
    print('6. O PECLET DE MALHA E O LIMIAR DE 2')
    print('=' * 72)
    print('   Problema estacionario em [0,1], c(0) = 0 e c(1) = 1, com a')
    print('   adveccao escrita por diferenca CENTRADA. A solucao do esquema')
    print('   e c_i = A + B r^i, com r = (1 + Pe/2)/(1 - Pe/2), e ela')
    print('   alterna de celula em celula assim que r fica negativo.')
    print()
    print('      Pe de malha    r         oscila?')
    for pe in (1.0, 1.9, 1.99, 2.0, 2.01, 2.1, 5.0):
        n = 19
        a = np.full(n, 1.0 + pe / 2)
        b = np.full(n, -2.0)
        d = np.full(n, 1.0 - pe / 2)
        r = np.zeros(n)
        r[-1] -= (1.0 - pe / 2)
        c = np.concatenate(([0.0], thomas(a, b, d, r), [1.0]))
        dif = np.diff(c)
        osc = bool(np.any(dif[:-1] * dif[1:] < 0))
        raz = ('%+10.2f' % ((1 + pe / 2) / (1 - pe / 2))
               if abs(pe - 2) > 1e-12 else '  infinito')
        print('      %9.2f  %s   %s' % (pe, raz, 'SIM' if osc else 'nao'))
    print()
    print('   O limiar e exatamente 2, e nao perto de 2: em 1,99 nao oscila')
    print('   e em 2,01 oscila. E por isso que nao se usa diferenca centrada')
    print('   na adveccao de um escoamento real. Para o corante na xicara,')
    print('   com Pe da ordem de 2,5 milhoes, manter Pe de malha abaixo de 2')
    print('   pediria mais de um milhao de celulas em cada direcao.')
    print()


if __name__ == '__main__':
    main()
