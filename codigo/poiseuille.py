# -*- coding: utf-8 -*-
"""Escoamento em tubo: Hagen-Poiseuille, lei de potência e a viscosidade aparente.

O QUE RESOLVE
    1. Resolve numericamente a equação de Navier-Stokes reduzida no tubo,
       sem usar a parábola, e compara com ela.
    2. Verifica que o perfil de tensão é geometria pura, igual para
       qualquer fluido.
    3. Integra o perfil de lei de potência e MEDE o expoente da vazão com
       o raio, em vez de assumi-lo.
    4. Mede a razão entre a velocidade do eixo e a média.
    5. Mostra o que acontece com quem mede vazão num tubo e aplica a
       fórmula de Poiseuille a um fluido que não é newtoniano.

A FISICA
    O tubo e o problema mais simples em que viscosidade, pressao e
    geometria aparecem juntas, e por isso ele serve de laboratorio para
    separar o que vem de cada uma. O equilibrio de forcas num cilindro
    interno da a tensao sem nenhuma hipotese sobre o fluido: so pressao
    vezes area de secao contra tensao vezes area lateral. E so no passo
    seguinte, ao converter tensao em taxa de deformacao, que a reologia
    entra.

    Essa separacao e o motivo de a quarta potencia de Poiseuille nao ser
    universal. Ela nao vem da geometria do tubo, vem de a relacao entre
    tensao e taxa ser linear. Troque a relacao e o expoente muda, sem que
    nada na geometria tenha mudado.

COMO CONFERIR SE ESTA CERTO
    1. A solucao por diferencas finitas tem de convergir para a parabola
       em segunda ordem, e a vazao numerica para pi R^4 dp/(8 mu L).
    2. A tensao calculada a partir do perfil numerico tem de dar
       dp r/(2L) para todo n, em precisao de maquina.
    3. O expoente ajustado de Q contra R tem de dar (3n+1)/n.
    4. A razao u_eixo/u_media tem de dar (3n+1)/(n+1).
    5. A viscosidade aparente tem de variar com dp^(1-1/n).

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

import numpy as np

# tubo de 5 mm de raio e 1 m de comprimento, com 10 Pa de queda de pressao:
# agua a essa queda da Re da ordem de 300, laminar e bem dentro da hipotese
# de escoamento lento
R = 5.0e-3          # m
L = 1.0             # m
DP = 10.0           # Pa
MU = 1.0e-3         # Pa s


# ---------------------------------------------------------------------------
# newtoniano por diferenças finitas, sem usar a parábola
# ---------------------------------------------------------------------------


def perfil_numerico(N, mu=MU, dp=DP, raio=R, comp=L):
    """u_z(r) resolvendo (1/r) d/dr (r du/dr) = (1/mu) dp/dz.

    No eixo o operador é singular, e o limite regular vale 2 u''(0); é essa
    forma que entra na primeira linha da matriz, junto com du/dr = 0.
    """
    h = raio / N
    r = np.linspace(0.0, raio, N + 1)
    A = np.zeros((N + 1, N + 1))
    b = np.full(N + 1, -dp / comp / mu)
    # eixo: 2 u'' = (4/h^2)(u_1 - u_0) pela simetria u_{-1} = u_1
    A[0, 0] = -4.0 / h ** 2
    A[0, 1] = 4.0 / h ** 2
    for i in range(1, N):
        A[i, i - 1] = 1.0 / h ** 2 - 1.0 / (2 * h * r[i])
        A[i, i] = -2.0 / h ** 2
        A[i, i + 1] = 1.0 / h ** 2 + 1.0 / (2 * h * r[i])
    A[N, N] = 1.0
    b[N] = 0.0                                   # não deslizamento
    return r, np.linalg.solve(A, b)


def vazao(r, u):
    return float(np.trapezoid(2 * np.pi * r * u, r))


def perfil_anular(N, a, mu=MU, dp=DP, raio=R, comp=L):
    """O mesmo operador num tubo anular, onde a solução tem um logaritmo.

    Serve de teste de verdade para o solver: no tubo cheio a solução é um
    polinômio de grau dois, e a diferença central é exata sobre polinômios
    de grau dois, de modo que o erro ali é zero por acidente e não mede
    nada. Com o furo no meio some a condição de regularidade no eixo, o
    termo em ln r sobrevive, e o erro de truncamento aparece.
    """
    h = (raio - a) / N
    r = np.linspace(a, raio, N + 1)
    A = np.zeros((N + 1, N + 1))
    b = np.full(N + 1, -dp / comp / mu)
    A[0, 0] = 1.0
    b[0] = 0.0
    for i in range(1, N):
        A[i, i - 1] = 1.0 / h ** 2 - 1.0 / (2 * h * r[i])
        A[i, i] = -2.0 / h ** 2
        A[i, i + 1] = 1.0 / h ** 2 + 1.0 / (2 * h * r[i])
    A[N, N] = 1.0
    b[N] = 0.0
    return r, np.linalg.solve(A, b)


def anular_exato(r, a, mu=MU, dp=DP, raio=R, comp=L):
    return (dp / (4 * mu * comp)) * (raio ** 2 - r ** 2
                                     + (raio ** 2 - a ** 2)
                                     * np.log(r / raio) / np.log(raio / a))


# ---------------------------------------------------------------------------
# lei de potência: a tensão é geometria, e o perfil sai de integrá-la
# ---------------------------------------------------------------------------


def perfil_potencia(n, K, N=200000, dp=DP, raio=R, comp=L):
    """u(r) para tau = K |du/dr|^n, integrando du/dr = -(tau/K)^(1/n).

    A tensão não depende do fluido: tau(r) = dp r/(2 L). Então du/dr sai
    explicitamente e o perfil é uma quadratura, não uma equação diferencial
    a resolver.
    """
    r = np.linspace(0.0, raio, N + 1)
    tau = dp * r / (2 * comp)
    dudr = -(tau / K) ** (1.0 / n)
    # u(r) = integral de r ate R de -du/ds ds, com u(R) = 0
    acum = np.concatenate(([0.0], np.cumsum(0.5 * (dudr[1:] + dudr[:-1])
                                            * np.diff(r))))
    return r, acum - acum[-1]


def q_fechada(n, K, dp=DP, raio=R, comp=L):
    return (np.pi * n / (3 * n + 1) * (dp / (2 * K * comp)) ** (1.0 / n)
            * raio ** ((3 * n + 1) / n))


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. O PERFIL NEWTONIANO, SEM USAR A PARABOLA')
    print('=' * 72)
    print('   Tubo de R = %.0f mm, L = %.0f m, dp = %.0f Pa, mu = %.0e Pa s.'
          % (R * 1e3, L, DP, MU))
    print()
    q_exata = np.pi * R ** 4 * DP / (8 * MU * L)
    print('        N     erro max no perfil    erro na vazao     razao')
    ant = None
    for N in (20, 40, 80, 160, 320):
        r, u = perfil_numerico(N)
        exato = DP / (4 * MU * L) * (R ** 2 - r ** 2)
        erro = np.max(np.abs(u - exato)) / exato[0]
        eq = abs(vazao(r, u) / q_exata - 1)
        print('      %5d   %18.3e  %15.3e  %8s'
              % (N, erro, eq, '—' if ant is None else '%.2f' % (ant / eq)))
        ant = eq
    print()
    print('      vazao exata:    %.6e m3/s' % q_exata)
    print('      vazao numerica: %.6e m3/s' % vazao(*perfil_numerico(320)))
    print('      velocidade media: %.4f m/s' % (q_exata / (np.pi * R ** 2)))
    print('      Reynolds (agua): %.0f' % (1000 * q_exata
                                           / (np.pi * R ** 2) * 2 * R / MU))
    print()
    print('   A coluna do perfil chama atencao: o erro e 1e-14 ja com 20')
    print('   pontos, e nao melhora. Nao e o solver que e bom, e o')
    print('   problema que e facil demais: a solucao e um polinomio de')
    print('   grau dois, e a diferenca central de segunda derivada e')
    print('   EXATA sobre polinomios de grau dois. O erro de truncamento')
    print('   e identicamente nulo, e o que sobra e arredondamento.')
    print()
    print('   Entao esta tabela nao testa o solver. A unica coluna que')
    print('   converge e a da vazao, com razao 4, e ela esta medindo o')
    print('   trapezio da integracao, nao as diferencas finitas.')
    print()
    print('   O teste de verdade precisa de uma solucao que nao seja')
    print('   polinomial. O tubo anular serve: tirando o eixo, o termo em')
    print('   ln r sobrevive, e o mesmo operador passa a errar.')
    print()
    a = 0.3 * R
    print('      tubo anular com a/R = 0,3')
    print('        N      erro max      razao')
    ant = None
    for N in (20, 40, 80, 160, 320):
        r, u = perfil_anular(N, a)
        ex = anular_exato(r, a)
        erro = np.max(np.abs(u - ex)) / np.max(ex)
        print('      %5d  %12.3e  %9s'
              % (N, erro, '—' if ant is None else '%.2f' % (ant / erro)))
        ant = erro
    print()
    print('   Agora sim: razao 4 a cada refinamento, segunda ordem como')
    print('   anunciado. A licao e que um teste de convergencia so vale')
    print('   contra uma solucao que o esquema nao consiga representar')
    print('   exatamente, e a parabola de Poiseuille e justamente uma que')
    print('   ele representa.')
    print()
    r, u = perfil_anular(4000, a)
    q_an = vazao(r, u)
    q_anf = (np.pi * DP / (8 * MU * L)) * (R ** 4 - a ** 4
                                           - (R ** 2 - a ** 2) ** 2
                                           / np.log(R / a))
    print('      vazao no anular, numerica: %.6e m3/s' % q_an)
    print('      forma fechada:             %.6e m3/s' % q_anf)
    print('      diferenca relativa: %.1e' % abs(q_an / q_anf - 1))
    rm_prev = np.sqrt((R ** 2 - a ** 2) / (2 * np.log(R / a)))
    print('      posicao do maximo, medida:  r/R = %.4f'
          % (r[int(np.argmax(u))] / R))
    print('      da condicao du/dr = 0:      r/R = %.4f' % (rm_prev / R))
    print('      meio geometrico (a+R)/2:    r/R = %.4f' % ((1 + 0.3) / 2))
    print()
    # as duas tensoes de parede, do perfil numerico
    tau_a = MU * abs((u[1] - u[0]) / (r[1] - r[0]))
    tau_R = MU * abs((u[-1] - u[-2]) / (r[-1] - r[-2]))
    print('      tensao na parede interna: %.6f Pa' % tau_a)
    print('      tensao na parede externa: %.6f Pa' % tau_R)
    print('      razao: %.3f' % (tau_a / tau_R))
    print('      conferindo o equilibrio global:')
    print('        dp vezes a secao:  %.6e N' % (DP * np.pi * (R ** 2 - a ** 2)))
    print('        tensao vezes area: %.6e N'
          % (2 * np.pi * a * L * tau_a + 2 * np.pi * R * L * tau_R))
    print()
    print('   O maximo nao fica no meio geometrico: fica mais perto da')
    print('   parede interna. O motivo esta nas duas ultimas linhas. A')
    print('   pressao empurra a secao inteira, e as duas paredes tem de')
    print('   segurar o conjunto; como a interna tem menos perimetro, ela')
    print('   precisa de uma tensao maior para dar a sua parte. Tensao')
    print('   maior e gradiente de velocidade maior, e um gradiente maior')
    print('   derruba a velocidade a zero numa distancia menor.')
    print()

    print('=' * 72)
    print('2. A TENSAO E GEOMETRIA, NAO REOLOGIA')
    print('=' * 72)
    print('   A aula afirma que tau(r) = dp r / 2L vale para QUALQUER')
    print('   fluido, porque sai so do equilibrio de forcas. Entao se o')
    print('   perfil for calculado para varios n e a tensao for')
    print('   reconstruida dele, ela tem de dar sempre a mesma reta:')
    print()
    print('        n       K           tau na parede    dp R/2L     erro')
    for n, K in ((0.4, 0.5), (0.7, 0.05), (1.0, MU), (1.4, 2e-4), (1.8, 1e-5)):
        r, u = perfil_potencia(n, K, N=400000)
        # taxa de deformacao por diferenca de um lado na parede
        dudr = (u[-1] - u[-2]) / (r[-1] - r[-2])
        tau_p = K * abs(dudr) ** n
        alvo = DP * R / (2 * L)
        print('      %4.1f  %9.1e  %14.6f  %11.6f  %9.1e'
              % (n, K, tau_p, alvo, abs(tau_p / alvo - 1)))
    print()
    print('   O erro residual e o da diferenca finita na parede, nao da')
    print('   fisica: a tensao foi IMPOSTA pela geometria ao montar o')
    print('   perfil, e reconstrui-la e so conferir que a conta fechou.')
    print()
    print('   Repare nos K: para manter a mesma vazao com n diferente e')
    print('   preciso mudar K em ordens de grandeza, porque as unidades de')
    print('   K sao Pa s^n e mudam com n. Comparar K de fluidos com n')
    print('   diferentes nao significa nada.')
    print()

    print('=' * 72)
    print('3. O EXPOENTE DA VAZAO COM O RAIO, MEDIDO')
    print('=' * 72)
    print('   A quarta potencia de Poiseuille nao vem da geometria: vem de')
    print('   a relacao tensao-taxa ser linear. Variando R por uma decada')
    print('   e ajustando uma reta em log-log:')
    print()
    print('        n     expoente medido   (3n+1)/n      erro')
    raios = np.logspace(np.log10(1e-3), np.log10(1e-2), 12)
    for n in (0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0):
        K = MU if n == 1.0 else 1e-3
        qs = []
        for rr in raios:
            r, u = perfil_potencia(n, K, N=200000, raio=rr)
            qs.append(vazao(r, u))
        p = np.polyfit(np.log(raios), np.log(qs), 1)[0]
        prev = (3 * n + 1) / n
        print('      %4.1f  %15.6f  %11.6f  %9.1e'
              % (n, p, prev, abs(p / prev - 1)))
    print()
    print('   O expoente vai de 5,5 em n = 0,4 ate 3,5 em n = 2, passando')
    print('   por 4 exatamente no newtoniano, e tende a 3 quando n cresce')
    print('   sem limite. A consequencia pratica e grande: dobrar o raio')
    print('   de um tubo multiplica a vazao por')
    print('      2^4,0 = %6.1f   com agua' % 2 ** 4)
    print('      2^5,5 = %6.1f   com um fluido de n = 0,4'
          % 2 ** ((3 * 0.4 + 1) / 0.4))
    print('      2^3,5 = %6.1f   com um dilatante de n = 2'
          % 2 ** ((3 * 2.0 + 1) / 2.0))
    print()
    print('   E o expoente 3 do limite tem explicacao simples. Com n')
    print('   muito grande, |du/dr| = (tau/K)^(1/n) deixa de depender da')
    print('   tensao: a taxa satura. O perfil vira um cone de inclinacao')
    print('   fixa, a velocidade do eixo cresce so com R, e a vazao, que')
    print('   e velocidade vezes area, cresce com R vezes R^2.')
    print()
    print('   Conferindo tambem a vazao contra a forma fechada:')
    print()
    print('        n     Q numerica        Q fechada        erro')
    for n in (0.4, 1.0, 1.8):
        K = MU if n == 1.0 else 1e-3
        r, u = perfil_potencia(n, K, N=400000)
        qn, qf = vazao(r, u), q_fechada(n, K)
        print('      %4.1f  %14.6e  %14.6e  %10.2e'
              % (n, qn, qf, abs(qn / qf - 1)))
    print()

    print('=' * 72)
    print('4. A FORMA DO PERFIL')
    print('=' * 72)
    print('   A razao entre a velocidade do eixo e a media nao depende de')
    print('   K nem de dp nem de R: so de n.')
    print()
    print('        n     u_eixo/u_media   (3n+1)/(n+1)     erro')
    for n in (0.2, 0.4, 0.6, 1.0, 1.4, 2.0):
        K = MU if n == 1.0 else 1e-3
        r, u = perfil_potencia(n, K, N=400000)
        razao = u[0] / (vazao(r, u) / (np.pi * R ** 2))
        prev = (3 * n + 1) / (n + 1)
        print('      %4.1f  %14.6f  %13.6f  %10.2e'
              % (n, razao, prev, abs(razao / prev - 1)))
    print()
    print('   Em n = 1 da 2, que e a parabola. Em n = 0,2 da 1,33: o')
    print('   perfil quase nao tem curvatura no meio e desce tudo numa')
    print('   casca fina junto a parede. Esse e o escoamento em bloco, e')
    print('   ele e a razao de pastas e tintas serem bombeadas com tanta')
    print('   menos potencia do que a viscosidade medida em repouso faria')
    print('   supor.')
    print()

    print('=' * 72)
    print('5. A ARMADILHA DA VISCOSIDADE APARENTE')
    print('=' * 72)
    print('   Alguem mede Q e dp num tubo e aplica Poiseuille ao contrario')
    print('   para achar a viscosidade:  mu_ap = pi R^4 dp / (8 L Q).')
    print('   Se o fluido nao for newtoniano, esse numero nao e constante.')
    print()
    for n in (0.5, 1.0, 1.6):
        K = MU if n == 1.0 else 1e-3
        print('   n = %.1f:' % n)
        print('        dp (Pa)     Q (m3/s)      mu_ap (Pa s)   mu_ap/mu_ap(1)')
        base = None
        for dp in (1.0, 3.0, 10.0, 30.0, 100.0):
            qq = q_fechada(n, K, dp=dp)
            mua = np.pi * R ** 4 * dp / (8 * L * qq)
            if base is None:
                base = mua
            print('      %9.1f  %12.4e  %13.5e  %12.4f'
                  % (dp, qq, mua, mua / base))
        # expoente medido de mu_ap contra dp
        dps = np.logspace(0, 2, 15)
        mus = [np.pi * R ** 4 * d / (8 * L * q_fechada(n, K, dp=d)) for d in dps]
        p = np.polyfit(np.log(dps), np.log(mus), 1)[0]
        print('        expoente medido: %+.6f    previsto 1 - 1/n = %+.6f'
              % (p, 1 - 1.0 / n))
        print()
    print('   Num pseudoplastico a viscosidade aparente DESPENCA com a')
    print('   pressao: cem vezes mais pressao e cem vezes menos')
    print('   viscosidade aparente, porque Q vai com dp^2. Num dilatante')
    print('   ela sobe. So no newtoniano ela e constante, e entao a')
    print('   palavra viscosidade significa alguma coisa sozinha.')
    print()
    print('   A licao e sobre medida, nao sobre conta: um viscosimetro')
    print('   capilar que reporta um unico numero esta supondo n = 1. Se')
    print('   o fluido nao for newtoniano, o numero que ele da vale')
    print('   apenas na vazao em que mediu.')
    print()


if __name__ == '__main__':
    main()
