# -*- coding: utf-8 -*-
"""Meios porosos: Darcy saindo de uma rede de poros, lei de potência, Forchheimer e Washburn.

O QUE RESOLVE
    1. Monta uma rede desordenada de poros, resolve o escoamento nela com a
       máquina do módulo 8 e mostra a lei de Darcy aparecendo sozinha.
    2. Confere a permeabilidade do feixe de capilares contra a forma de
       Kozeny-Carman, e separa as duas convenções da constante.
    3. Repete a rede com um fluido de lei de potência e mede o expoente
       macroscópico, que tem de ser 1/n.
    4. Resolve Forchheimer e localiza onde Darcy começa a errar, em função
       do Reynolds de poro.
    5. Integra a embebição de Washburn e confere a lei da raiz do tempo,
       depois acrescenta a gravidade e encontra a altura de Jurin.

A FISICA
    A lei de Darcy nao e uma lei fundamental: e o que sobra da equacao de
    Stokes depois de uma media sobre um volume que contem muitos poros. Por
    isso ela nao se deduz de um poro so, e sim de um conjunto deles, e por
    isso tambem a permeabilidade nao e propriedade do fluido: e propriedade
    da geometria do espaco vazio, e tem unidade de area.

    Essa origem explica os limites. Se a inercia deixa de ser desprezivel,
    Stokes nao vale e Darcy perde a linearidade, que e Forchheimer. Se o
    fluido nao e newtoniano, a relacao entre vazao e gradiente num poro ja
    nao e linear, e a media sobre os poros carrega a nao linearidade para a
    escala grande sem mudar o expoente.

COMO CONFERIR SE ESTA CERTO
    1. Na rede, a vazao tem de ser EXATAMENTE proporcional a diferenca de
       pressao e inversamente proporcional a viscosidade. Qualquer desvio
       acima do erro de maquina e erro de programa.
    2. O feixe de capilares tem permeabilidade k = eps R^2/8, que se escreve
       como Kozeny-Carman com raio hidraulico R/2 e constante 2.
    3. O expoente macroscopico medido na rede tem de dar 1/n, e nao algo
       perto de 1/n: a media nao estraga o expoente.
    4. A embebicao numerica tem de seguir a raiz do tempo, e com gravidade
       tem de parar exatamente na altura de Jurin.

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

import numpy as np
from scipy.sparse import csr_matrix, lil_matrix
from scipy.sparse.linalg import spsolve


# ---------------------------------------------------------------------------
# a rede de poros
# ---------------------------------------------------------------------------


def monta_rede(N=20, semente=1, sigma=0.3, Rm=50e-6, comp=200e-6):
    """Rede quadrada de N x N nós, ligados por tubos de raio log-normal.

    Os raios variam por um fator que vai de metade ao dobro, que é pouco
    perto de um arenito real, e já basta para o resultado não depender de
    nenhuma regularidade da rede.
    """
    rng = np.random.default_rng(semente)
    rh = Rm * np.exp(sigma * rng.standard_normal((N, N - 1)))
    rv = Rm * np.exp(sigma * rng.standard_normal((N - 1, N)))
    return rh, rv, comp


def monta_sistema(N, gh, gv, dp):
    """Kirchhoff: em cada nó interno, a soma das vazões é zero."""
    def pos(i, j):
        return j * N + i

    A = lil_matrix((N * N, N * N))
    b = np.zeros(N * N)
    for j in range(N):
        for i in range(N):
            k = pos(i, j)
            if i == 0 or i == N - 1:          # faces de entrada e de saida
                A[k, k] = 1.0
                b[k] = dp if i == 0 else 0.0
                continue
            tot = 0.0
            vizinhos = ((i + 1, j, gh[j, i]), (i - 1, j, gh[j, i - 1]),
                        (i, j + 1, gv[j, i] if j < N - 1 else 0.0),
                        (i, j - 1, gv[j - 1, i] if j > 0 else 0.0))
            for ii, jj, g in vizinhos:
                if g == 0.0:
                    continue
                A[k, pos(ii, jj)] = g
                tot += g
            A[k, k] = -tot
    return csr_matrix(A), b


def escoa_newtoniano(rh, rv, comp, mu, dp):
    """Rede com fluido newtoniano: condutância de Poiseuille, sistema linear."""
    N = rh.shape[0]
    gh = np.pi * rh ** 4 / (8 * mu * comp)
    gv = np.pi * rv ** 4 / (8 * mu * comp)
    A, b = monta_sistema(N, gh, gv, dp)
    P = spsolve(A, b).reshape(N, N)
    Q = float(np.sum(gh[:, 0] * (P[:, 0] - P[:, 1])))
    return Q, P


def escoa_potencia(rh, rv, comp, K, n, dp, tol=1e-12, kmax=300):
    """Rede com fluido de lei de potência, por iteração de Picard.

    Num tubo de raio R e comprimento L, a lei de potência dá
    Q = (n pi R^3/(3n+1)) (|dp| R/(2 L K))^(1/n), que se escreve como
    Q = g dp com uma condutância g que depende da própria queda de pressão.
    Resolve-se o sistema linear com a condutância do passo anterior e
    repete-se, amortecendo pela metade para a iteração não oscilar.
    """
    N = rh.shape[0]
    ch = (n * np.pi * rh ** 3 / (3 * n + 1)) * (rh / (2 * comp * K)) ** (1 / n)
    cv = (n * np.pi * rv ** 3 / (3 * n + 1)) * (rv / (2 * comp * K)) ** (1 / n)
    P = np.tile(np.linspace(dp, 0, N), (N, 1))
    piso = 1e-9 * dp            # evita 0^negativo quando n > 1
    for it in range(kmax):
        dh = np.maximum(np.abs(P[:, :-1] - P[:, 1:]), piso)
        dv = np.maximum(np.abs(P[:-1, :] - P[1:, :]), piso)
        A, b = monta_sistema(N, ch * dh ** (1 / n - 1), cv * dv ** (1 / n - 1),
                             dp)
        novo = spsolve(A, b).reshape(N, N)
        mudou = np.abs(novo - P).max() / dp
        P = 0.5 * P + 0.5 * novo
        if mudou < tol:
            break
    dh = np.maximum(np.abs(P[:, 0] - P[:, 1]), piso)
    Q = float(np.sum(ch[:, 0] * dh ** (1 / n - 1) * (P[:, 0] - P[:, 1])))
    return Q, it


# ---------------------------------------------------------------------------
# Forchheimer e Ergun
# ---------------------------------------------------------------------------


def ergun(eps, d, mu, rho):
    """Coeficientes de Ergun: a parte viscosa dá k, a inercial dá beta."""
    k = eps ** 3 * d ** 2 / (150 * (1 - eps) ** 2)
    beta = 1.75 * (1 - eps) / (eps ** 3 * d)
    return k, beta


def q_forchheimer(grad, k, beta, mu, rho):
    """Resolve -grad p = (mu/k) q + beta rho q^2 para q > 0."""
    a = beta * rho
    b = mu / k
    return (-b + np.sqrt(b * b + 4 * a * grad)) / (2 * a)


# ---------------------------------------------------------------------------
# Washburn
# ---------------------------------------------------------------------------


def washburn(R, gama, teta, mu, rho, g, t_fim, dt=1e-5, com_gravidade=False,
             l0=1e-6):
    """Avanço do menisco num capilar, integrado em l por RK4.

    A velocidade sai do equilíbrio entre a pressão capilar e a perda de
    Poiseuille na coluna já preenchida, de comprimento l:
        dl/dt = R^2 (2 gama cos(teta)/R - rho g l) / (8 mu l)
    Repare no l no denominador: a velocidade DIVERGE quando l tende a zero,
    e por isso não se pode partir de l = 0. Partindo de um l0 pequeno, os
    primeiros passos ainda assim erram, e a função seguinte mostra o jeito
    certo de contornar isso.
    """
    pcap = 2 * gama * np.cos(teta) / R

    def f(l):
        motor = pcap - (rho * g * l if com_gravidade else 0.0)
        return R * R * motor / (8 * mu * l)

    l = l0
    ts, ls = [0.0], [l]
    for i in range(int(t_fim / dt)):
        k1 = f(l)
        k2 = f(max(l + dt * k1 / 2, 1e-12))
        k3 = f(max(l + dt * k2 / 2, 1e-12))
        k4 = f(max(l + dt * k3, 1e-12))
        l = l + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        ts.append((i + 1) * dt)
        ls.append(l)
    return np.array(ts), np.array(ls)


def washburn_u(R, gama, teta, mu, rho, g, t_fim, dt=1e-5, com_gravidade=False):
    """O mesmo problema integrado na variável u = l^2, que não tem a divergência.

    Multiplicando a equação por 2l, o l do denominador some:
        du/dt = R^2 (2 gama cos(teta)/R - rho g sqrt(u)) / (4 mu)
    Agora u(0) = 0 é um ponto perfeitamente comum, e sem gravidade o lado
    direito é CONSTANTE: a integração fica exata, e o que ela devolve é a
    própria lei de Washburn. Trocar de variável não é um truque de
    programação, é reconhecer qual é a grandeza que evolui simplesmente.
    """
    pcap = 2 * gama * np.cos(teta) / R

    def f(u):
        raiz = np.sqrt(max(u, 0.0))
        motor = pcap - (rho * g * raiz if com_gravidade else 0.0)
        return R * R * motor / (4 * mu)

    u = 0.0
    ts, us = [0.0], [u]
    for i in range(int(t_fim / dt)):
        k1 = f(u)
        k2 = f(u + dt * k1 / 2)
        k3 = f(u + dt * k2 / 2)
        k4 = f(u + dt * k3)
        u = u + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        ts.append((i + 1) * dt)
        us.append(u)
    return np.array(ts), np.sqrt(np.maximum(np.array(us), 0.0))


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. A LEI DE DARCY SAINDO DE UMA REDE DE POROS')
    print('=' * 72)
    rh, rv, comp = monta_rede(N=20)
    mu = 1e-3
    print('   Rede de 20x20 nos, tubos de raio log-normal em torno de 50 um,')
    print('   resolvida por Kirchhoff com condutancia de Poiseuille. Nada')
    print('   nessa montagem supoe a lei de Darcy: ela so conhece Poiseuille')
    print('   tubo a tubo e conservacao de massa em cada no.')
    print()
    print('      dp (Pa)        Q (m3/s)        Q/dp          desvio')
    base = None
    for dp in (100.0, 200.0, 400.0, 1000.0):
        Q, _ = escoa_newtoniano(rh, rv, comp, mu, dp)
        if base is None:
            base = Q / dp
        print('      %8.1f   %.6e   %.6e   %.1e'
              % (dp, Q, Q / dp, abs(Q / dp / base - 1)))
    print()
    print('      viscosidade     Q * mu')
    for m in (1e-3, 2e-3, 5e-3, 1e-2):
        Q, _ = escoa_newtoniano(rh, rv, comp, m, 100.0)
        print('      %.0e        %.6e' % (m, Q * m))
    print()
    print('   A vazao e proporcional a diferenca de pressao em todas as')
    print('   casas, e o produto Q*mu nao se mexe: e a lei de Darcy, com a')
    print('   permeabilidade saindo da geometria da rede e de mais nada. Ela')
    print('   nao foi imposta em lugar nenhum do programa.')
    print()

    print('=' * 72)
    print('2. O FEIXE DE CAPILARES E A FORMA DE KOZENY-CARMAN')
    print('=' * 72)
    print('   O caso em que tudo se faz a mao: tubos retos e paralelos de')
    print('   raio R ocupando uma fracao eps da area.')
    print()
    R, eps, L, dp = 20e-6, 0.35, 0.01, 500.0
    area = 1e-4
    ntubos = eps * area / (np.pi * R * R)
    Qtotal = ntubos * np.pi * R ** 4 * dp / (8 * mu * L)
    q = Qtotal / area                        # velocidade de Darcy
    k_medido = q * mu * L / dp
    print('      R = %.0f um, eps = %.2f' % (R * 1e6, eps))
    print('      k medido pela vazao:  %.6e m2' % k_medido)
    print('      eps R^2/8:            %.6e m2' % (eps * R * R / 8))
    print('      razao:                %.10f' % (k_medido / (eps * R * R / 8)))
    print()
    rh_hid = R / 2                           # raio hidraulico = 2 eps/S
    print('   Escrevendo com o raio hidraulico R_h = R/2, isso e')
    print('   k = eps R_h^2/2, que e a forma de Kozeny-Carman com')
    print('   tortuosidade 1 e constante 2. Num leito de esferas o caminho')
    print('   nao e reto, e a constante sobe de 2 para 5.')
    print()
    print('      k = eps R_h^2/2 = %.6e m2' % (eps * rh_hid ** 2 / 2))
    print()
    print('   AS DUAS CONVENCOES DA CONSTANTE')
    print()
    d = 500e-6
    for epsl in (0.35, 0.40, 0.45):
        kc = epsl ** 3 * d ** 2 / (180 * (1 - epsl) ** 2)
        ke = epsl ** 3 * d ** 2 / (150 * (1 - epsl) ** 2)
        print('      eps=%.2f, d=%.0f um:  Carman (180) %.3e   Ergun (150) %.3e'
              % (epsl, d * 1e6, kc, ke))
    print()
    print('   A diferenca e de 20 por cento e vem de ajustes a conjuntos de')
    print('   dados diferentes, nao de fisica diferente. Nenhuma das duas')
    print('   merece mais de um algarismo significativo de confianca: a')
    print('   permeabilidade de um meio real se mede, e a formula serve para')
    print('   saber o que esperar e como ela escala.')
    print()

    print('=' * 72)
    print('3. FLUIDO DE LEI DE POTENCIA: O EXPOENTE ATRAVESSA A MEDIA')
    print('=' * 72)
    print('   A mesma rede, agora com tau = K gamma^n. Num tubo so, a vazao')
    print('   vai com dp^(1/n). A pergunta e o que sobra disso depois da')
    print('   media sobre uma rede desordenada, onde cada tubo tem a sua')
    print('   propria queda de pressao.')
    print()
    rh, rv, comp = monta_rede(N=14)
    dps = np.array([50.0, 100.0, 200.0, 400.0])
    print('      n       expoente medido      1/n previsto     diferenca')
    for n in (1.0, 0.8, 0.6, 0.5, 1.3):
        qs = [escoa_potencia(rh, rv, comp, 1e-3, n, d)[0] for d in dps]
        p = np.polyfit(np.log(dps), np.log(qs), 1)[0]
        print('      %.1f   %17.8f   %15.8f   %10.1e'
              % (n, p, 1 / n, abs(p - 1 / n)))
    print()
    print('   O expoente macroscopico e exatamente 1/n, e nao perto de 1/n.')
    print('   A desordem da rede muda a permeabilidade, muda qual caminho')
    print('   leva mais vazao, e nao toca no expoente. Para um fluido')
    print('   pseudoplastico, com n < 1, isso quer dizer que dobrar o')
    print('   gradiente mais que dobra a vazao: bombear forte compensa mais')
    print('   do que compensaria com agua.')
    print()

    print('=' * 72)
    print('4. FORCHHEIMER: ONDE DARCY COMECA A ERRAR')
    print('=' * 72)
    eps, d, rho = 0.40, 1e-3, 1000.0
    k, beta = ergun(eps, d, mu, rho)
    print('   Leito de esferas de %.0f mm, eps = %.2f, agua.' % (d * 1e3, eps))
    print('   Pela equacao de Ergun: k = %.3e m2, beta = %.3e 1/m'
          % (k, beta))
    print()
    print('      grad p (Pa/m)    q Darcy     q Forchheimer   Darcy erra   Re poro')
    for grad in (1e3, 1e4, 1e5, 1e6, 1e7):
        qd = k * grad / mu
        qf = q_forchheimer(grad, k, beta, mu, rho)
        rep = rho * qf * d / (mu * (1 - eps))
        print('      %12.0e   %.4e   %.4e   %8.1f %%   %8.2f'
              % (grad, qd, qf, 100 * (qd / qf - 1), rep))
    print()
    # onde os dois termos de Ergun se igualam
    print('   Os dois termos de Ergun ficam iguais quando')
    print('   1,75 rho q d/(150 mu (1-eps)) = 1, isto e, Re de poro = %.1f.'
          % (150 / 1.75))
    print('   E Darcy erra 10 por cento quando o termo inercial vale 10 por')
    print('   cento do viscoso, em Re de poro = %.2f.' % (150 / 1.75 * 0.1))
    alvo = 150 / 1.75 * 0.1
    g = 1e3
    for _ in range(200):                     # busca simples pelo gradiente
        qf = q_forchheimer(g, k, beta, mu, rho)
        rep = rho * qf * d / (mu * (1 - eps))
        if rep > alvo:
            break
        g *= 1.05
    qd = k * g / mu
    print()
    print('      conferindo: em Re de poro = %.2f, Darcy erra %.1f por cento'
          % (rep, 100 * (qd / qf - 1)))
    print()
    print('   A conclusao pratica e que Darcy vale ate Re de poro da ordem')
    print('   de 1, com folga, e que o limite nao e uma propriedade do meio')
    print('   e sim da velocidade: o mesmo arenito obedece a Darcy longe do')
    print('   poco e deixa de obedecer perto dele, onde a mesma vazao passa')
    print('   por uma area muito menor.')
    print()

    print('=' * 72)
    print('5. WASHBURN: A EMBEBICAO VAI COM A RAIZ DO TEMPO')
    print('=' * 72)
    R, gama, teta, g = 1e-5, 0.0728, 0.0, 9.80665
    l0 = 1e-6
    ts, ls = washburn(R, gama, teta, mu, rho, g, 2.0)
    # a solucao exata parte do mesmo l0 em que a integracao parte; a lei
    # pura de Washburn e o caso l0 = 0, e a diferenca some em poucos ms
    pura = np.sqrt(R * gama * np.cos(teta) * ts / (2 * mu))
    print('   Capilar de %.0f um em agua, angulo de contato zero.' % (R * 1e6))
    print('   Lei de Washburn: l = sqrt(R gama cos(teta) t/(2 mu))')
    print()
    tu, lu = washburn_u(R, gama, teta, mu, rho, g, 2.0)
    print('      t (s)   integrando l (mm)   integrando u=l^2 (mm)   lei pura (mm)')
    for alvo in (0.1, 0.5, 1.0, 2.0):
        i = int(np.argmin(np.abs(ts - alvo)))
        print('      %5.1f %16.4f %22.6f %15.6f'
              % (ts[i], 1e3 * ls[i], 1e3 * lu[i], 1e3 * pura[i]))
    sel = ts > 1e-3
    print()
    print('      integrando l:   maior desvio da lei pura %.2e'
          % np.abs(ls[sel] / pura[sel] - 1).max())
    print('      integrando u:   maior desvio da lei pura %.2e'
          % np.abs(lu[sel] / pura[sel] - 1).max())
    print()
    print('   A DIVERGENCIA EM l = 0, E COMO SE LIVRAR DELA')
    print()
    off = (ls ** 2 - pura ** 2)[-1]
    print('   Integrando em l, a velocidade inicial e infinita e os')
    print('   primeiros passos erram. O erro nao e passageiro: ele vira um')
    print('   deslocamento CONSTANTE em l^2, de %.3e m2 aqui, que a' % off)
    print('   integracao carrega para sempre. Por isso a razao cai como 1/t')
    print('   sem nunca chegar a 1.')
    print()
    print('   Multiplicando a equacao por 2l, a variavel u = l^2 obedece a')
    print('   du/dt = R^2 p_cap/(4 mu), que e CONSTANTE. A singularidade era')
    print('   da variavel, nao do problema: em u a integracao fica exata, e')
    print('   bate com a lei pura em %.0e. Vale procurar essa troca sempre'
          % np.abs(lu[sel] / pura[sel] - 1).max())
    print('   que a derivada divergir no instante inicial.')
    print()
    print('   E a mesma raiz do tempo da difusao, e pela mesma razao: a')
    print('   forca motriz e fixa e a resistencia cresce com o comprimento')
    print('   ja percorrido. Dobrar o alcance custa quatro vezes mais tempo.')
    print()
    print('   COM A GRAVIDADE, A SUBIDA PARA')
    print()
    print('   A altura de equilibrio e a de Jurin, e o tempo para chegar la')
    print('   vai com 8 mu h/(R^2 rho g). Num capilar de 10 um isso da')
    jur10 = 2 * gama / (rho * g * 1e-5)
    print('   h = %.2f m e um tempo da ordem de %.0f s, isto e, horas: nao'
          % (jur10, 8 * mu * jur10 / (1e-10 * rho * g)))
    print('   se integra isso a passo fixo. Num tubo de 1 mm tudo cabe em')
    print('   decimos de segundo, e e esse o caso da demonstracao classica.')
    print()
    Rg = 1e-3
    ts2, ls2 = washburn_u(Rg, gama, teta, mu, rho, g, 1.0, dt=1e-6,
                          com_gravidade=True)
    jurin = 2 * gama * np.cos(teta) / (rho * g * Rg)
    print('      tubo de %.0f mm, altura final integrada: %.6f m'
          % (Rg * 1e3, ls2[-1]))
    print('      altura de Jurin 2 gama cos(teta)/(rho g R): %.6f m' % jurin)
    print('      razao: %.8f' % (ls2[-1] / jurin))
    meia = ts2[int(np.argmax(ls2 >= jurin / 2))]
    noventa = ts2[int(np.argmax(ls2 >= 0.9 * jurin))]
    print()
    print('      metade da altura e alcancada em %.4f s, e noventa por cento'
          % meia)
    print('      so em %.4f s, %.1f vezes mais tarde: o resto da subida'
          % (noventa, noventa / meia))
    print('      leva muito mais, porque a aproximacao e exponencial.')
    print()
    print('   A raiz do tempo vale enquanto a coluna for curta perto da')
    print('   altura de Jurin. Num meio poroso fino essa altura e grande, e')
    print('   por isso a lei de Washburn descreve bem a mancha de cafe')
    print('   subindo no guardanapo; num tubo largo ela falha cedo.')
    print()


if __name__ == '__main__':
    main()
