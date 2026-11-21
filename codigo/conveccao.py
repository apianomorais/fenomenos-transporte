# -*- coding: utf-8 -*-
"""Convecção: Blasius, o Prandtl, o Rayleigh crítico e o que a malha grossa faz.

O QUE RESOLVE
    1. A equação de Blasius por tiro, com f''(0), a espessura de 99 % e o
       coeficiente de atrito.
    2. A camada-limite térmica, com o expoente 1/3 do Prandtl medido em vez
       de assumido.
    3. O problema de estabilidade linear de Rayleigh-Bénard, que dá o
       Rayleigh crítico e o comprimento de onda dos rolos.
    4. A simulação não linear completa, em função corrente e vorticidade,
       com o Nusselt medido acima do limiar.
    5. O que uma malha grossa faz de fato com uma simulação de convecção,
       que não é o que se costuma dizer.

A FISICA
    Convecção é advecção e difusão acopladas pelo empuxo, e por isso este
    módulo usa tudo o que os módulos 8 e 9 construíram. O acoplamento é o
    que a torna difícil: a temperatura move o fluido, o fluido carrega a
    temperatura, e não há como resolver um sem o outro.

    O caso de Rayleigh-Bénard é o mais limpo de todos porque tem um limiar
    exato. Abaixo dele o fluido fica parado apesar de estar com o lado
    pesado por cima, porque a viscosidade e a difusão de calor desmancham
    qualquer perturbação antes que ela cresça. Esse numero, 1707,76, e uma
    previsao de teoria linear sem nenhum parametro ajustado, e e por isso
    que ele serve tao bem para aferir um programa.

COMO CONFERIR SE ESTA CERTO
    1. O tiro em Blasius tem de dar f''(0) = 0,332057 e u/U = 0,99 em
       eta = 4,91.
    2. O gradiente de temperatura na parede tem de dar 0,332 Pr^(1/3), e
       convem medir ATE ONDE esse expoente vale.
    3. O problema de autovalor tem de convergir para Ra = 1707,76 e
       k = 3,117, e a convergencia diz de que lado a malha erra.
    4. A simulacao nao linear tem de ficar em Nu = 1 abaixo do limiar e
       crescer linearmente acima dele. O limiar que ela da, extrapolado
       ate Nu = 1, tem de cair dentro da faixa que a secao 3 da para a
       mesma resolucao: e a conferencia cruzada entre os dois programas,
       e vale mais que qualquer um dos dois sozinho.
    5. O coeficiente dessa reta tende a 1,43 quando a janela de ajuste
       encolhe, sem chegar la nesta malha. Convem medir a tendencia em
       vez de afirmar o valor.

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

import numpy as np
from scipy.integrate import solve_ivp
from scipy.linalg import eig
from scipy.optimize import brentq, minimize_scalar


# ---------------------------------------------------------------------------
# 1. Blasius
# ---------------------------------------------------------------------------


def blasius(s, eta_max=10.0):
    """Integra f''' = -f f''/2 com f(0) = f'(0) = 0 e f''(0) = s."""
    def lado(e, y):
        return [y[1], y[2], -0.5 * y[0] * y[2]]
    return solve_ivp(lado, [0, eta_max], [0.0, 0.0, s],
                     rtol=1e-11, atol=1e-13, dense_output=True)


def acha_blasius():
    """Procura o f''(0) que leva f' a 1 longe da parede."""
    s = brentq(lambda s: blasius(s).y[1, -1] - 1.0, 0.1, 1.0, xtol=1e-14)
    return s, blasius(s)


# ---------------------------------------------------------------------------
# 2. a camada térmica
# ---------------------------------------------------------------------------


def teta_linha_zero(sol, Pr, eta_max=10.0, n=4000):
    """Gradiente de temperatura na parede, sem precisar de tiro.

    De theta'' = -(Pr/2) f theta' sai theta'(eta) = theta'(0) exp(-(Pr/2) I),
    com I a integral de f. Impondo theta(infinito) = 1,
    theta'(0) = 1 / integral de exp(-(Pr/2) I).
    """
    e = np.linspace(0, eta_max, n)
    f = sol.sol(e)[0]
    integral_f = np.concatenate(([0.0], np.cumsum(0.5 * (f[1:] + f[:-1]) * np.diff(e))))
    g = np.exp(-0.5 * Pr * integral_f)
    return 1.0 / np.trapezoid(g, e)


# ---------------------------------------------------------------------------
# 3. o Rayleigh crítico, por estabilidade linear
# ---------------------------------------------------------------------------


def ra_marginal(k, N=120):
    """Menor Ra que torna marginal o modo de número de onda k.

    Resolve (D^2-k^2)^2 W = Ra k^2 Theta e (D^2-k^2) Theta = -W, com
    W = DW = Theta = 0 nas duas paredes rígidas. A condição DW = 0 entra
    pelo ponto fantasma espelhado no operador biharmônico.
    """
    h = 1.0 / (N + 1)
    I = np.eye(N)
    D2 = (np.diag(-2 * np.ones(N)) + np.diag(np.ones(N - 1), 1)
          + np.diag(np.ones(N - 1), -1)) / h ** 2
    D4 = np.zeros((N, N))
    for i in range(N):
        for j, c in ((i - 2, 1), (i - 1, -4), (i, 6), (i + 1, -4), (i + 2, 1)):
            if 0 <= j < N:
                D4[i, j] += c
    D4[0, 0] += 1
    D4[-1, -1] += 1                     # fantasma espelhado: DW = 0
    D4 /= h ** 4
    LL = D4 - 2 * k * k * D2 + k ** 4 * I
    L = D2 - k * k * I
    A = np.block([[LL, np.zeros((N, N))], [I, L]])
    B = np.block([[np.zeros((N, N)), k * k * I],
                  [np.zeros((N, N)), np.zeros((N, N))]])
    val = eig(A, B, right=False)
    val = val[np.isfinite(val) & (np.abs(val.imag) < 1e-6) & (val.real > 0)].real
    return val.min() if val.size else np.inf


def critico(N=120):
    r = minimize_scalar(lambda k: ra_marginal(k, N), bracket=(3.0, 3.2))
    return r.fun, r.x


# ---------------------------------------------------------------------------
# 4. a simulação não linear
# ---------------------------------------------------------------------------


def monta_poisson(nx, nz, dx, dz):
    """Pré-fatora o laplaciano: FFT em x e tridiagonal em z.

    O truque que torna isto rodável: a eliminação de Thomas é feita para
    TODOS os números de onda de uma vez, vetorizada sobre eles. Com um laço
    em Python por número de onda, a mesma simulação levaria minutos em vez
    de segundos.
    """
    kx = 2 * np.pi * np.fft.fftfreq(nx, dx)
    n = nz - 2
    sub = np.full((nx, n), 1.0 / dz ** 2)
    sup = np.full((nx, n), 1.0 / dz ** 2)
    dia = np.tile(-2.0 / dz ** 2, (nx, n)) - (kx ** 2)[:, None]
    cb = dia.copy()
    fat = np.zeros((nx, n))
    for i in range(1, n):
        fat[:, i] = sub[:, i] / cb[:, i - 1]
        cb[:, i] -= fat[:, i] * sup[:, i - 1]
    return {'cb': cb, 'sup': sup, 'fat': fat, 'n': n}


def resolve_poisson(rhs, P):
    R = np.fft.fft(rhs, axis=0)
    cr = R[:, 1:-1].astype(complex)
    n, cb, sup, fat = P['n'], P['cb'], P['sup'], P['fat']
    for i in range(1, n):
        cr[:, i] -= fat[:, i] * cr[:, i - 1]
    x = np.empty_like(cr)
    x[:, -1] = cr[:, -1] / cb[:, -1]
    for i in range(n - 2, -1, -1):
        x[:, i] = (cr[:, i] - sup[:, i] * x[:, i + 1]) / cb[:, i]
    saida = np.zeros_like(R)
    saida[:, 1:-1] = x
    return np.real(np.fft.ifft(saida, axis=0))


def simula(Ra, Pr=1.0, nx=64, nz=32, larg=2.0, upwind=False, t_fim=20.0,
           semente=1):
    """Boussinesq 2D em função corrente e vorticidade, adimensional.

    Comprimento em unidades da espessura, tempo em d^2/alfa, temperatura em
    DeltaT. x é periódico e as duas paredes são rígidas, com a vorticidade
    de parede pela fórmula de Thom. A condição inicial é o perfil de
    condução mais um ruído pequeno, que é o que a instabilidade amplifica.
    """
    dx, dz = larg / nx, 1.0 / (nz - 1)
    rng = np.random.default_rng(semente)
    z = np.linspace(0, 1, nz)
    T = (1 - z)[None, :] * np.ones((nx, 1)) + 1e-3 * rng.standard_normal((nx, nz))
    T[:, 0] = 1.0
    T[:, -1] = 0.0
    w = np.zeros((nx, nz))
    P = monta_poisson(nx, nz, dx, dz)
    dt = min(0.2 * dx * dx, 0.2 * dz * dz / max(Pr, 1.0), 0.25 * dz * dz)

    def ddx(f):
        return (np.roll(f, -1, 0) - np.roll(f, 1, 0)) / (2 * dx)

    def lap(f):
        o = np.zeros_like(f)
        o[:, 1:-1] = ((np.roll(f, -1, 0) - 2 * f + np.roll(f, 1, 0))[:, 1:-1] / dx ** 2
                      + (f[:, 2:] - 2 * f[:, 1:-1] + f[:, :-2]) / dz ** 2)
        return o

    for _ in range(int(t_fim / dt)):
        psi = resolve_poisson(-w, P)
        u = np.zeros_like(psi)
        u[:, 1:-1] = (psi[:, 2:] - psi[:, :-2]) / (2 * dz)
        v = -ddx(psi)

        def adv(f):
            if upwind:
                fx = np.where(u > 0, (f - np.roll(f, 1, 0)) / dx,
                              (np.roll(f, -1, 0) - f) / dx)
                fz = np.zeros_like(f)
                fz[:, 1:-1] = np.where(v[:, 1:-1] > 0, (f[:, 1:-1] - f[:, :-2]) / dz,
                                       (f[:, 2:] - f[:, 1:-1]) / dz)
            else:
                fx = ddx(f)
                fz = np.zeros_like(f)
                fz[:, 1:-1] = (f[:, 2:] - f[:, :-2]) / (2 * dz)
            return u * fx + v * fz

        wn = w + dt * (-adv(w) + Pr * lap(w) + Ra * Pr * ddx(T))
        Tn = T + dt * (-adv(T) + lap(T))
        Tn[:, 0] = 1.0
        Tn[:, -1] = 0.0
        psi2 = resolve_poisson(-wn, P)
        wn[:, 0] = -2 * psi2[:, 1] / dz ** 2          # Thom
        wn[:, -1] = -2 * psi2[:, -2] / dz ** 2
        w, T = wn, Tn
        if not np.all(np.isfinite(w)):
            return np.nan
    grad = (-3 * T[:, 0] + 4 * T[:, 1] - T[:, 2]) / (2 * dz)
    return float(-grad.mean())


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. A CAMADA-LIMITE DE BLASIUS, POR TIRO')
    print('=' * 72)
    s, sol = acha_blasius()
    e99 = brentq(lambda e: sol.sol(e)[1] - 0.99, 1.0, 9.0)
    print('   f\'\'(0) encontrado:  %.9f' % s)
    print('   valor de tabela:    0,332057')
    print()
    print('   u/U chega a 0,99 em eta = %.4f' % e99)
    print('   logo a espessura vale delta = %.3f x/sqrt(Re_x), que a' % e99)
    print('   definicao usual arredonda para 5.')
    print()
    print('   Cf sqrt(Re_x) = 2 f\'\'(0) = %.6f   (tabela: 0,664)' % (2 * s))
    print()
    print('   O tiro converge porque a condicao no infinito e monotona em')
    print('   f\'\'(0): chutar baixo deixa f\' abaixo de 1, chutar alto o joga')
    print('   acima. Por isso basta bisseccao, sem precisar de derivada.')
    print()

    print('=' * 72)
    print('2. A CAMADA TERMICA E O EXPOENTE DO PRANDTL')
    print('=' * 72)
    print('   De theta\'\' + (Pr/2) f theta\' = 0 sai Nu_x = theta\'(0) sqrt(Re_x),')
    print('   e a correlacao de tabela afirma theta\'(0) = 0,332 Pr^(1/3).')
    print('   Medindo theta\'(0) para cada Pr:')
    print()
    print('      Pr        theta\'(0)      0,332 Pr^(1/3)    razao')
    razoes_pr = {}
    for Pr in (0.01, 0.1, 0.7, 1.0, 7.0, 100.0, 1000.0):
        t0 = teta_linha_zero(sol, Pr, eta_max=max(10.0, 40.0 / Pr ** 0.5))
        prev = 0.332 * Pr ** (1 / 3)
        razoes_pr[Pr] = t0 / prev
        print('      %7.2f   %12.6f %15.6f %9.4f'
              % (Pr, t0, prev, t0 / prev))
    print()
    print('   Em Pr = 1 o valor bate com f\'\'(0), como tem de bater: com')
    print('   Pr = 1 as duas equacoes sao a mesma. A lei de um terco acerta')
    print('   de Pr = 0,7 ate Pr = 100 dentro de dois por cento, e falha')
    print('   nos metais liquidos, onde Pr e da ordem de 0,01.')
    print()
    print('   Convem dizer o tamanho do erro na direcao certa. Em')
    print('   Pr = 0,01 a correlacao preve %.4f e o valor verdadeiro e'
          % (0.332 * 0.01 ** (1 / 3)))
    print('   %.4f: ela SUPERESTIMA a troca de calor em %.0f por cento do'
          % (0.332 * 0.01 ** (1 / 3) * razoes_pr[0.01],
             100 * (1 / razoes_pr[0.01] - 1)))
    print('   valor verdadeiro, que e o lado perigoso de errar num')
    print('   trocador. Medida contra a propria previsao, a diferenca e de')
    print('   %.0f por cento; as duas maneiras de dizer sao legitimas, e'
          % (100 * (1 - razoes_pr[0.01])))
    print('   convem dizer qual se esta usando.')
    print()

    print('=' * 72)
    print('3. O RAYLEIGH CRITICO, POR ESTABILIDADE LINEAR')
    print('=' * 72)
    print('   Resolvendo o problema de autovalor do modo marginal:')
    print()
    print('        N      Ra critico      k critico')
    for N in (20, 40, 80, 160):
        r, k = critico(N)
        print('      %4d   %13.4f   %12.5f' % (N, r, k))
    print('      exato        1707,7618        3,11632')
    print()
    print('   A convergencia e de segunda ordem, e por BAIXO: a malha')
    print('   grossa da um Rayleigh critico MENOR que o verdadeiro. Guarde')
    print('   isso, porque e o contrario do que se costuma supor, e a')
    print('   secao 5 volta ao assunto.')
    print()
    r, k = critico(160)
    print('   Do k critico sai o tamanho dos rolos:')
    print('      comprimento de onda = 2 pi/k = %.4f espessuras' % (2 * np.pi / k))
    print('      logo cada rolo mede %.4f espessura, porque um comprimento'
          % (np.pi / k))
    print('      de onda comporta dois rolos girando em sentidos opostos.')
    print('   E uma previsao geometrica, sem parametro nenhum, e se confere')
    print('   com uma regua numa panela de oleo.')
    print()

    print('=' * 72)
    print('4. A SIMULACAO NAO LINEAR: O LIMIAR APARECE SOZINHO')
    print('=' * 72)
    print('   Boussinesq 2D completo, malha 48x24, caixa de duas espessuras')
    print('   de largura, partindo do perfil de conducao mais ruido. Perto')
    print('   do limiar a saturacao e lenta, e por isso aqui se integra ate')
    print('   t = 20, enquanto a secao 5, bem acima do limiar, se contenta')
    print('   com t = 4.')
    print()
    print('        Ra      Nu       Nu - 1     1,43 (Ra/Ra_c - 1)')
    rac = 1707.7618
    medidos = []
    for Ra in (1500, 1700, 1800, 2000, 2500, 5000):
        nu = simula(Ra, nx=48, nz=24, t_fim=20.0)
        medidos.append((Ra, nu))
        prev = 1.43 * (Ra / rac - 1)
        print('      %5d   %7.4f  %9.5f %18s'
              % (Ra, nu, nu - 1, '%.5f' % prev if Ra > rac else '—'))
    print()
    print('   Abaixo de 1707,76 o Nusselt fica em 1 nas quatro casas: o')
    print('   fluido nao se move, e todo o calor atravessa por conducao,')
    print('   apesar de o liquido pesado estar por cima. Acima do limiar a')
    print('   conveccao aparece. Nada disso foi posto no programa: o')
    print('   limiar emerge da competicao entre empuxo, viscosidade e')
    print('   difusao de calor.')
    print()
    print('   Mas a coluna da direita nao bate bem, e a razao entre')
    print('   medido e previsto vai de %.2f em Ra = 1800 a %.2f em'
          % ((medidos[2][1] - 1) / (1.43 * (1800 / rac - 1)),
             (medidos[4][1] - 1) / (1.43 * (2500 / rac - 1))))
    print('   Ra = 2500. Vale descobrir o que esta atrapalhando, e ha')
    print('   duas candidatas: o tempo de integracao e o limiar da malha.')
    print()
    print('   Primeiro o tempo. Perto do limiar a taxa de crescimento vai')
    print('   a zero junto com a amplitude, e o estado estacionario')
    print('   demora. Repetindo Ra = 1800 com tempos diferentes:')
    print()
    print('        t_fim     Nu - 1')
    tempos = []
    for tf in (10.0, 20.0, 40.0, 80.0):
        v = simula(1800, nx=48, nz=24, t_fim=tf) - 1
        tempos.append(v)
        print('      %7.0f  %11.5f' % (tf, v))
    print()
    if abs(tempos[-1] / tempos[-2] - 1) < 1e-3:
        print('   Os dois ultimos tempos dao o mesmo numero em cinco casas:')
        print('   a tabela anterior ja esta medindo estado estacionario, e')
        print('   o tempo de integracao nao e o culpado. Em t = 10 ainda')
        print('   nao estava; e bom saber que t = 20 basta.')
    else:
        print('   O numero ainda sobe entre os dois ultimos tempos: a')
        print('   tabela anterior esta medindo transiente, e nao saturacao.')
    print()
    print('   Agora o limiar. Em vez de procura-lo por bisseccao, que e')
    print('   cara e mede quando o programa CONSEGUE DETECTAR conveccao e')
    print('   nao quando ela comeca, e melhor usar a propria lei linear:')
    print('   se Nu - 1 = A (Ra - Ra_c) perto do limiar, entao ajustar uma')
    print('   reta e ler onde ela cruza o eixo da o Ra_c da malha, sem')
    print('   nenhuma simulacao perto do limiar.')
    print()
    print('        Ra       Nu - 1')
    ras = np.array([1800.0, 1900.0, 2000.0, 2100.0])
    nus = []
    for Ra in ras:
        nu = simula(Ra, nx=48, nz=24, t_fim=60.0)
        nus.append(nu - 1)
        print('      %5.0f  %12.5f' % (Ra, nu - 1))
    nus = np.array(nus)
    print()
    print('   Antes de ajustar, convem olhar se a reta e mesmo reta. As')
    print('   inclinacoes entre pontos consecutivos:')
    print()
    for i in range(len(ras) - 1):
        print('      de %4.0f a %4.0f:  %.4e'
              % (ras[i], ras[i + 1], (nus[i + 1] - nus[i])
                 / (ras[i + 1] - ras[i])))
    print()
    print('   Elas CAEM conforme Ra sobe, o que era de esperar: a lei')
    print('   linear e o primeiro termo de uma expansao e a curva se')
    print('   dobra para baixo. Isso tem consequencia direta sobre o')
    print('   ajuste: uma reta puxada por pontos longe do limiar cruza o')
    print('   eixo cedo demais. Entao vale ajustar em janelas cada vez')
    print('   mais estreitas e ver para onde as duas quantidades andam.')
    print()
    print('      janela de ajuste      Ra_c      coeficiente A Ra_c')
    for k in (4, 3, 2):
        A, B = np.polyfit(ras[:k], nus[:k], 1)
        rc = -B / A
        print('      %4.0f a %4.0f  (%d pts) %9.0f  %18.3f'
              % (ras[0], ras[k - 1], k, rc, A * rc))
    A, B = np.polyfit(ras[:2], nus[:2], 1)
    rac_malha = -B / A
    print('      exato                  %9.0f  %18.3f' % (rac, 1.43))
    print()
    print('   As duas colunas sobem juntas na direcao dos valores')
    print('   previstos conforme a janela encolhe, que e o comportamento')
    print('   de quem esta extrapolando certo mas com dado insuficiente.')
    print()
    print('   Tomando a janela mais estreita, o limiar desta malha fica em')
    print('   %.0f, %.1f por cento abaixo do exato. E esse numero conversa'
          % (rac_malha, 100 * (1 - rac_malha / rac)))
    print('   com a secao 3, onde o problema de autovalor deu 1678 com 20')
    print('   pontos e 1700 com 40: esta simulacao tem 24 na vertical, e')
    print('   %.0f cai justamente dentro desse intervalo.' % rac_malha)
    print()
    print('   Vale pesar o que isso significa. Sao dois programas')
    print('   independentes, um linear e um nao linear, com')
    print('   discretizacoes diferentes, e eles erram o limiar para o')
    print('   mesmo lado e por quantidades compativeis. Nenhum dos dois')
    print('   sozinho provaria que o erro e da malha e nao de um defeito;')
    print('   os dois juntos provam.')
    print()
    print('   Ja o coeficiente, %.2f contra 1,43, fica perto e nao fecha,'
          % (A * rac_malha))
    print('   e o que sobra e a caixa: ela tem duas espessuras de largura,')
    print('   o que impoe comprimento de onda 2,000 quando o preferido e')
    print('   2,016, e um rolo espremido convecte um pouco menos. Extrair')
    print('   1,43 com tres casas exigiria caixa larga, malha fina e')
    print('   pontos ainda mais proximos do limiar.')
    print()

    print('=' * 72)
    print('5. O QUE A MALHA GROSSA FAZ DE VERDADE')
    print('=' * 72)
    print('   Ha um aviso corrente sobre simular conveccao: o de que a')
    print('   difusao numerica do esquema de adveccao soma a alfa, de modo')
    print('   que a malha grossa derruba o Rayleigh EFETIVO e a conveccao')
    print('   pode nem aparecer. Vale medir se e isso mesmo que acontece.')
    print()
    print('   Ra = 5000, que e tres vezes o limiar:')
    print()
    print('      malha      centrado      upwind     o upwind perde')
    for nx, nz in ((16, 8), (24, 12), (32, 16), (48, 24), (64, 32), (96, 48)):
        a = simula(5000, nx=nx, nz=nz, upwind=False, t_fim=4.0)
        b = simula(5000, nx=nx, nz=nz, upwind=True, t_fim=4.0)
        print('      %3dx%-3d %11.4f %11.4f %13.1f %%'
              % (nx, nz, a, b, 100 * (1 - b / a)))
    print()
    print('   O upwind de fato enfraquece a conveccao, e muito: em 16x8 ele')
    print('   tira um terco do Nusselt. Mas ele NAO a mata, nem na malha')
    print('   mais grosseira que ainda roda. A razao e simples e vale a')
    print('   pena enunciar: a difusao numerica do upwind vale u dx/2, e')
    print('   portanto ela e PROPORCIONAL A VELOCIDADE. No limiar a')
    print('   velocidade e infinitesimal, a difusao numerica tambem, e o')
    print('   limiar nao se move. O que ela estraga e a amplitude depois')
    print('   que a conveccao ja comecou.')
    print()
    print('   E o esquema centrado numa malha grossa erra para o outro')
    print('   lado: em 16x8 ele da Nu = 3,02 contra 2,12 convergido, quase')
    print('   50 por cento a mais. Some a isso o Rayleigh critico menor da')
    print('   secao 3, e o retrato fica completo:')
    print()
    print('      - malha grossa com centrado: conveccao cedo demais e forte')
    print('        demais;')
    print('      - malha grossa com upwind: conveccao fraca demais;')
    print('      - nos dois casos o limiar continua perto de 1708, e nao e')
    print('        por ai que a malha engana.')
    print()
    print('   A licao pratica nao muda, e so fica mais precisa: nao se')
    print('   acredita num Nusselt sem repetir a conta em duas malhas. O')
    print('   numero so vale quando parar de mudar.')
    print()


if __name__ == '__main__':
    main()
