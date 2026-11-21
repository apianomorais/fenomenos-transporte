# -*- coding: utf-8 -*-
"""Condução transiente: erf, efusividade, onda térmica, Robin e Biot.

O QUE RESOLVE
    1. O sólido semi-infinito, comparado com a solução de semelhança, com o
       fluxo na superfície e a lei da raiz do tempo medidos.
    2. O contato entre dois sólidos, que mede a temperatura de interface e
       mostra que lê-la errado na malha custa uma ordem de convergência.
    3. A onda térmica, com a profundidade de penetração medida de dois
       jeitos independentes, pela amplitude e pela fase.
    4. O contorno de Robin pelo ponto fantasma, com o limite de estabilidade
       das células de superfície localizado de forma exata.
    5. O modelo concentrado, com o erro medido em função do Biot.

A FISICA
    Todo problema deste modulo e a mesma equacao, e o que muda e so a
    condicao de contorno. Isso nao e detalhe: em conducao transiente quase
    todo o conteudo fisico esta no contorno, porque o interior apenas
    difunde. A superficie que troca por conveccao, que e o caso realista, e
    a que mais da trabalho, e e por onde entram os dois numeros que
    organizam o assunto, o Biot e o Fourier.

    A efusividade e o exemplo mais limpo disso. Ela nao aparece na equacao,
    so na condicao de contorno entre dois corpos, e ainda assim e ela, e nao
    a condutividade, que decide se um objeto parece frio ao toque.

COMO CONFERIR SE ESTA CERTO
    1. O perfil numerico tem de bater com erf(x/(2 sqrt(alfa t))), e o fluxo
       na superficie com k(Ts-Ti)/sqrt(pi alfa t).
    2. A temperatura de contato tem de bater com a media ponderada pelas
       efusividades, e so bate se o valor na interface for lido pela
       continuidade do fluxo.
    3. Os dois comprimentos medidos na onda termica, o da queda da amplitude
       e o do atraso de fase, tem de dar o mesmo numero.
    4. O limite de estabilidade medido no espectro tem de bater com a
       formula deduzida para o modo de superficie.

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

import numpy as np
from scipy.optimize import brentq
from scipy.special import erf


# ---------------------------------------------------------------------------
# 1. o solido semi-infinito
# ---------------------------------------------------------------------------


def semi_infinito(alfa=1e-5, Ti=20.0, Ts=100.0, t_fim=60.0, folgas=10.0,
                  M=801, s=0.25):
    """Degrau de temperatura na superfície de um corpo que ocupa x > 0.

    O domínio é finito, e por isso só vale enquanto a perturbação não chegar
    ao fundo. A profundidade afetada é da ordem de 4 sqrt(alfa t), e por
    isso o domínio é dimensionado em múltiplos de sqrt(alfa t) em vez de ser
    um número fixo de metros: com `folgas = 10` sobra mais que o dobro da
    frente térmica, e o fundo não interfere.
    """
    L = folgas * np.sqrt(alfa * t_fim)
    dx = L / (M - 1)
    x = np.linspace(0, L, M)
    dt = s * dx * dx / alfa
    n = int(round(t_fim / dt))
    T = np.full(M, float(Ti))
    T[0] = Ts
    for _ in range(n):
        T[1:-1] = T[1:-1] + s * (T[2:] - 2 * T[1:-1] + T[:-2])
    exato = Ts + (Ti - Ts) * erf(x / (2 * np.sqrt(alfa * t_fim)))
    # fluxo na superficie por diferenca de tres pontos, de segunda ordem
    grad = (-3 * T[0] + 4 * T[1] - T[2]) / (2 * dx)
    return x, T, exato, -grad, dt, n


# ---------------------------------------------------------------------------
# 2. contato entre dois sólidos
# ---------------------------------------------------------------------------


def efusividade(p):
    k, rho, c = p
    return np.sqrt(k * rho * c)


def contato(p1, T1, p2, T2, L=0.3, M=2000, t_fim=5.0, s=0.2):
    """Dois semi-infinitos postos em contato em x = 0.

    A malha é de volumes finitos, com a interface caindo exatamente numa
    FACE e não num nó: do contrário o contato fica meia célula fora do
    lugar. Na face usa-se a média harmônica das condutividades, que é a que
    conserva o fluxo quando o material muda.
    """
    k1, r1, c1 = p1
    k2, r2, c2 = p2
    dx = 2 * L / M
    xc = -L + (np.arange(M) + 0.5) * dx
    k = np.where(xc < 0, k1, k2)
    rc = np.where(xc < 0, r1 * c1, r2 * c2)
    T = np.where(xc < 0, float(T1), float(T2))
    kf = 2 * k[:-1] * k[1:] / (k[:-1] + k[1:])
    dt = s * dx * dx / (k / rc).max()
    for _ in range(int(t_fim / dt)):
        q = -kf * np.diff(T) / dx
        T[1:-1] -= dt / (rc[1:-1] * dx) * np.diff(q)
    i = M // 2
    ingenua = 0.5 * (T[i - 1] + T[i])                 # media simples
    honesta = (k1 * T[i - 1] + k2 * T[i]) / (k1 + k2)  # continuidade do fluxo
    return ingenua, honesta


# ---------------------------------------------------------------------------
# 3. a onda térmica
# ---------------------------------------------------------------------------


def onda_termica(alfa=1e-6, periodo=86400.0, A=10.0, L=2.0, M=801,
                 ciclos=12, s=0.25):
    """Superfície oscilando, e o regime periódico que se estabelece dentro."""
    w = 2 * np.pi / periodo
    dx = L / (M - 1)
    dt = s * dx * dx / alfa
    n = int(round(ciclos * periodo / dt))
    T = np.zeros(M)
    guarda = int(round(periodo / dt))          # ultimo ciclo inteiro
    hist = np.zeros((guarda, M))
    for i in range(n):
        T[0] = A * np.cos(w * i * dt)
        T[1:-1] = T[1:-1] + s * (T[2:] - 2 * T[1:-1] + T[:-2])
        if i >= n - guarda:
            hist[i - (n - guarda)] = T
    tempos = np.arange(guarda) * dt + (n - guarda) * dt
    # amplitude e fase de cada profundidade, por projecao em cos e sen
    cs = np.cos(w * tempos)
    sn = np.sin(w * tempos)
    a = 2 * (hist * cs[:, None]).mean(axis=0)
    b = 2 * (hist * sn[:, None]).mean(axis=0)
    amp = np.hypot(a, b)
    fase = np.unwrap(np.arctan2(b, a))
    return np.linspace(0, L, M), amp, fase, np.sqrt(2 * alfa / w)


# ---------------------------------------------------------------------------
# 4. o contorno de Robin e a estabilidade
# ---------------------------------------------------------------------------


def raio_espectral(s, Bi, M=201):
    """Maior autovalor em módulo da matriz de um passo, com Robin nas pontas."""
    A = np.zeros((M, M))
    for i in range(1, M - 1):
        A[i, i - 1] = s
        A[i, i] = 1 - 2 * s
        A[i, i + 1] = s
    A[0, 0] = 1 - 2 * s - 2 * s * Bi          # no da superficie, ponto fantasma
    A[0, 1] = 2 * s
    A[-1, -1] = 1 - 2 * s - 2 * s * Bi
    A[-1, -2] = 2 * s
    return float(np.abs(np.linalg.eigvals(A)).max())


def limite_medido(Bi, M=201):
    lo, hi = 1e-4, 2.0
    for _ in range(60):
        m = 0.5 * (lo + hi)
        if raio_espectral(m, Bi, M) <= 1 + 1e-12:
            lo = m
        else:
            hi = m
    return lo


# ---------------------------------------------------------------------------
# 5. o modelo concentrado
# ---------------------------------------------------------------------------


def raizes_parede(Bi, quantas=60):
    """Raízes de zeta tan(zeta) = Bi, uma em cada intervalo (k pi, (k+1/2) pi)."""
    r = []
    for k in range(quantas):
        r.append(brentq(lambda z: z * np.tan(z) - Bi,
                        k * np.pi + 1e-12, (k + 0.5) * np.pi - 1e-12))
    return np.array(r)


def erro_concentrado(Bi):
    """Maior diferença, no tempo, entre a média exata e a exponencial."""
    z = raizes_parede(Bi)
    C = 4 * np.sin(z) / (2 * z + np.sin(2 * z))
    peso = C * np.sin(z) / z                    # media da parede
    fo = np.linspace(1e-4, 8 / max(Bi, 1e-3), 4000)
    exato = (peso[None, :] * np.exp(-np.outer(fo, z ** 2))).sum(axis=1)
    return float(np.abs(exato - np.exp(-Bi * fo)).max())


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. O SOLIDO SEMI-INFINITO')
    print('=' * 72)
    alfa, Ti, Ts, t = 1e-5, 20.0, 100.0, 60.0
    x, T, exato, grad, dt, n = semi_infinito(alfa, Ti, Ts, t)
    prof = 4 * np.sqrt(alfa * t)
    print('   alfa = %.0e m2/s, Ti = %.0f C, Ts = %.0f C, t = %.0f s'
          % (alfa, Ti, Ts, t))
    print('   profundidade afetada, 4 sqrt(alfa t) = %.4f m, num dominio de'
          % prof)
    print('   %.4f m, isto e, %.1f vezes maior: o fundo nao interfere.'
          % (x[-1], x[-1] / prof))
    print()
    print('   erro maximo contra erf(x/(2 sqrt(alfa t))): %.3e C'
          % np.abs(T - exato).max())
    print('   em fracao do degrau: %.2e' % (np.abs(T - exato).max() / (Ts - Ti)))
    print()
    k = 1.0
    q_prev = k * (Ts - Ti) / np.sqrt(np.pi * alfa * t)
    print('   fluxo na superficie (com k = 1 W/mK, para isolar a formula):')
    print('      medido na malha: %.6f W/m2' % (k * grad))
    print('      k(Ts-Ti)/sqrt(pi alfa t): %.6f W/m2' % q_prev)
    print('      razao: %.6f' % (k * grad / q_prev))
    print()
    print('   A lei da raiz do tempo, medida na profundidade onde a')
    print('   temperatura subiu 1 por cento do degrau:')
    print()
    print('      t (s)     profundidade (m)    x/sqrt(t)')
    for tt in (15.0, 30.0, 60.0, 120.0):
        xx, TT, _, _, _, _ = semi_infinito(alfa, Ti, Ts, tt)
        lim = Ti + 0.01 * (Ts - Ti)
        i = int(np.argmax(TT < lim))
        print('      %6.0f    %14.5f    %9.6f' % (tt, xx[i], xx[i] / np.sqrt(tt)))
    print()
    print('   A ultima coluna e constante: a frente de calor avanca com a')
    print('   RAIZ do tempo, e nao com o tempo. Dobrar o alcance custa')
    print('   quatro vezes mais tempo, e e por isso que assar leva tempo.')
    print()

    print('=' * 72)
    print('2. POR QUE O METAL PARECE MAIS FRIO QUE A MADEIRA')
    print('=' * 72)
    pele = (0.37, 1000.0, 1180.0 ** 2 / (0.37 * 1000.0))
    aco = (50.0, 7850.0, 13800.0 ** 2 / (50.0 * 7850.0))
    madeira = (0.15, 600.0, 465.0 ** 2 / (0.15 * 600.0))
    print('   Pele a 33 C (e = %.0f) tocando dois objetos a 20 C.'
          % efusividade(pele))
    print()
    print('      objeto     e        T de contato prevista   medida na malha')
    for nome, p in (('aco', aco), ('madeira', madeira)):
        prev = ((efusividade(pele) * 33 + efusividade(p) * 20)
                / (efusividade(pele) + efusividade(p)))
        _, honesta = contato(pele, 33.0, p, 20.0, M=2000)
        print('      %-9s %6.0f   %18.3f C %14.3f C'
              % (nome, efusividade(p), prev, honesta))
    print()
    print('   Os dois objetos estao a 20 C. O aco leva a pele quase ate la,')
    print('   a madeira quase nao a esfria, e a sensacao termica mede isso,')
    print('   e nao a temperatura do objeto.')
    print()
    print('   COMO LER A INTERFACE NA MALHA')
    print()
    print('   O valor na interface nao e a media dos dois vizinhos, porque')
    print('   o gradiente tem um bico ali: o que e continuo e o FLUXO, nao a')
    print('   derivada. Lendo dos dois jeitos, contra a formula %.4f C:'
          % ((efusividade(pele) * 33 + efusividade(aco) * 20)
             / (efusividade(pele) + efusividade(aco))))
    print()
    prev = ((efusividade(pele) * 33 + efusividade(aco) * 20)
            / (efusividade(pele) + efusividade(aco)))
    print('        M       media simples        pela continuidade do fluxo')
    for M in (500, 1000, 2000, 4000):
        ing, hon = contato(pele, 33.0, aco, 20.0, M=M)
        print('      %5d   %.4f (%+.4f)      %.4f (%+.5f)'
              % (M, ing, ing - prev, hon, hon - prev))
    print()
    print('   A media simples converge, mas em PRIMEIRA ordem: o erro so cai')
    print('   pela metade quando a malha dobra. A leitura pela continuidade')
    print('   do fluxo ja acerta todas as casas com mil celulas. O mesmo')
    print('   calculo, lido de dois jeitos, custa uma ordem de convergencia.')
    print()

    print('=' * 72)
    print('3. A ONDA TERMICA')
    print('=' * 72)
    alfa, per = 1e-6, 86400.0
    x, amp, fase, delta = onda_termica(alfa, per)
    print('   Solo com alfa = %.0e m2/s, oscilacao diaria de amplitude 10 C.'
          % alfa)
    print('   delta = sqrt(2 alfa/omega) = %.4f m' % delta)
    print()
    # as duas medidas independentes, ajustadas onde o sinal ainda e limpo
    sel = (x > 0.02) & (amp > 0.05)
    # a amplitude CAI com a profundidade (inclinacao negativa) e o atraso de
    # fase CRESCE com ela (inclinacao positiva); os sinais sao opostos e o
    # comprimento e o mesmo
    d_amp = -1.0 / np.polyfit(x[sel], np.log(amp[sel]), 1)[0]
    d_fase = +1.0 / np.polyfit(x[sel], fase[sel], 1)[0]
    print('      comprimento medido pela QUEDA DA AMPLITUDE: %.4f m' % d_amp)
    print('      comprimento medido pelo ATRASO DE FASE:     %.4f m' % d_fase)
    print('      previsto:                                   %.4f m' % delta)
    print('      diferenca entre as duas medidas: %.2f %%'
          % (100 * abs(d_amp - d_fase) / delta))
    print()
    print('   Os dois sao o mesmo comprimento, e isso nao era obrigatorio:')
    print('   amplitude e fase sao coisas diferentes, e so coincidem porque')
    print('   a solucao e uma exponencial complexa com parte real e')
    print('   imaginaria iguais. Dai sai a regra pratica: a profundidade em')
    print('   que a onda diaria morre e tambem a profundidade em que ela')
    print('   chega com um radiano de atraso.')
    print()
    i = int(np.argmin(np.abs(x - np.pi * delta)))
    print('   A meia volta de atraso acontece em x = pi delta = %.3f m, onde'
          % (np.pi * delta))
    print('   a amplitude ja caiu para %.2f %% da superficie: ali o solo esta'
          % (100 * amp[i] / amp[0]))
    print('   mais quente quando a superficie esta mais fria, e e por isso')
    print('   que uma adega rasa funciona.')
    print()

    print('=' * 72)
    print('4. O CONTORNO DE ROBIN E O LIMITE DE ESTABILIDADE')
    print('=' * 72)
    print('   A celula da superficie troca com o ambiente, e isso aperta o')
    print('   limite de estabilidade. O criterio usual vem de exigir que o')
    print('   coeficiente do proprio no nao fique negativo, o que da')
    print('   s(1 + Bi) <= 1/2. Esse criterio e SUFICIENTE, nao e o limite.')
    print()
    print('   Procurando um modo de superficie T_j = z^j, a equacao do no da')
    print('   superficie exige z^2 - 2 Bi z - 1 = 0, de onde')
    print('   z = Bi - sqrt(1 + Bi^2), e o autovalor correspondente e')
    print('   lambda = 1 - 2 s (1 + sqrt(1 + Bi^2)). Pedindo lambda >= -1:')
    print()
    print('      s <= 1/(1 + sqrt(1 + Bi^2))')
    print()
    print('      Bi malha   limite medido    formula deduzida   s(1+Bi)<=1/2')
    for Bi in (0.1, 0.25, 0.5, 1.0, 2.0, 5.0):
        med = limite_medido(Bi)
        ded = 1 / (1 + np.sqrt(1 + Bi * Bi))
        pos = 1 / (2 * (1 + Bi))
        print('      %8.2f   %13.8f   %16.8f   %12.6f'
              % (Bi, med, ded, pos))
    print()
    print('   A formula deduzida bate com o espectro em oito casas. O')
    print('   criterio da positividade e conservador, e fica quase duas')
    print('   vezes mais apertado que o necessario quando o Biot de malha')
    print('   cresce. Usar o criterio conservador nao esta errado, e ate')
    print('   recomendavel, porque alem de estavel ele garante que a')
    print('   temperatura nao oscila de passo a passo; mas convem saber que')
    print('   se esta pagando por isso.')
    print()

    print('=' * 72)
    print('5. BIOT E O MODELO CONCENTRADO: QUANTO ERRO, DE FATO')
    print('=' * 72)
    print('   Parede plana de meia espessura L, conveccao nas duas faces, com')
    print('   L_c = V/A = L. Erro maximo da exponencial contra a serie')
    print('   exata, em fracao do degrau inicial:')
    print()
    print('      Bi       erro maximo')
    for Bi in (0.02, 0.05, 0.1, 0.2, 0.5, 1.0):
        e = erro_concentrado(Bi)
        print('      %5.2f    %7.4f   (%.1f %%)' % (Bi, e, 100 * e))
    bi5 = brentq(lambda b: erro_concentrado(b) - 0.05, 0.05, 1.0)
    print()
    print('   O criterio Bi < 0,1 e conservador: ali o erro vale 1,2 por')
    print('   cento, e nao os cinco por cento que o criterio promete nao')
    print('   ultrapassar. Os cinco por cento so chegam em Bi = %.2f.' % bi5)
    print('   A margem e bem-vinda, porque o erro cresce rapido depois disso:')
    print('   em Bi = 1 o modelo concentrado ja erra dez por cento.')
    print()
    print('   Cuidado com o comprimento caracteristico. Para uma esfera de')
    print('   raio R, L_c = V/A = R/3, e nao R. A batata de 4 cm com')
    print('   k = 0,5 W/mK e h = 20 W/m2K tem')
    print('      Bi = h (R/3)/k = %.3f    pela definicao L_c = V/A'
          % (20 * (0.04 / 3) / 0.5))
    print('      Bi = h R / k     = %.3f    usando o raio, como fazem varios'
          % (20 * 0.04 / 0.5))
    print('                               textos nas solucoes em serie')
    print('   Os dois estao muito acima de 0,1, e a conclusao nao muda: o')
    print('   centro da batata fica muito atras da casca. Mas os numeros')
    print('   diferem por tres, e convem dizer qual convencao se esta usando.')
    print()


if __name__ == '__main__':
    main()
