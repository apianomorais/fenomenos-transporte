# -*- coding: utf-8 -*-
"""Laplace por relaxação: ordem do erro, Jacobi, Gauss-Seidel e SOR.

O QUE RESOLVE
    1. Resolve a equação de Laplace num caso de resposta conhecida e mede a
       ordem de convergência do laplaciano de cinco pontos.
    2. Mostra, medindo, que um contorno de Neumann feito por diferença de um
       lado só derruba a ordem do domínio inteiro de 2 para 1, e que o ponto
       fantasma recupera os 2.
    3. Reproduz o capacitor do widget da seção 7 e conta as varreduras de
       Jacobi, Gauss-Seidel e SOR até o mesmo resíduo.
    4. Procura o omega ótimo por medida e compara com a fórmula.
    5. Mede como o custo de cada método cresce com o tamanho da malha.

A FISICA
    A equacao de Laplace diz que o potencial em cada ponto e a media dos
    vizinhos. A discretizacao de cinco pontos diz literalmente isso, e e por
    isso que a relaxacao funciona: varrer a malha trocando cada ponto pela
    media dos vizinhos e iterar o proprio enunciado da equacao.

    O que muda de um metodo para o outro nao e a resposta, e o caminho ate
    ela. Jacobi usa so valores velhos, Gauss-Seidel aproveita os novos assim
    que saem, e o SOR exagera de proposito a correcao, porque ela aponta
    sempre para o mesmo lado. Os tres chegam ao mesmo campo.

COMO CONFERIR SE ESTA CERTO
    1. O erro contra a solucao exata tem de cair por 4 quando o numero de
       pontos dobra, e a inclinacao do log do erro contra o log de h tem de
       dar 2.
    2. Com o contorno de Neumann mal feito, essa mesma medida tem de dar 1.
       Se der 2, o teste nao esta medindo o que diz medir.
    3. Os tres metodos tem de chegar ao MESMO campo, com diferenca da ordem
       do residuo de corte, e so o numero de varreduras pode diferir.
    4. O omega que minimiza as varreduras tem de ficar perto de
       2/(1 + sen(pi/N)) na caixa vazia.
    5. As varreduras de Jacobi e de Gauss-Seidel tem de crescer como N^2, e
       as do SOR com omega otimo como N.

Prof. Apiano Morais - LFCA/URCA - Fenomenos de Transporte
"""

import numpy as np
from scipy.sparse import lil_matrix, csr_matrix
from scipy.sparse.linalg import spsolve


# ---------------------------------------------------------------------------
# 1. o caso de resposta conhecida, resolvido de uma vez pelo sistema linear
# ---------------------------------------------------------------------------


def laplace_direto(N):
    """u = sen(pi x) senh(pi y)/senh(pi) no quadrado unitário.

    A borda de cima vale sen(pi x) e as outras três valem zero. Monta o
    sistema linear da seção 4 e o resolve de uma vez, sem iterar, para que
    o erro medido seja só o da discretização.
    """
    x = np.linspace(0, 1, N)
    u = np.zeros((N, N))
    u[-1, :] = np.sin(np.pi * x)                 # j = N-1 é o topo
    livres = [(j, i) for j in range(1, N - 1) for i in range(1, N - 1)]
    pos = {p: k for k, p in enumerate(livres)}
    A = lil_matrix((len(livres), len(livres)))
    b = np.zeros(len(livres))
    for (j, i), k in pos.items():
        A[k, k] = -4.0
        for viz in ((j + 1, i), (j - 1, i), (j, i + 1), (j, i - 1)):
            if viz in pos:
                A[k, pos[viz]] = 1.0
            else:
                b[k] -= u[viz]                   # vai para o lado direito
    for p, v in zip(livres, spsolve(csr_matrix(A), b)):
        u[p] = v
    X, Y = np.meshgrid(x, x)
    exato = np.sin(np.pi * X) * np.sinh(np.pi * Y) / np.sinh(np.pi)
    return 1.0 / (N - 1), np.abs(u - exato)[1:-1, 1:-1].max()


# ---------------------------------------------------------------------------
# 2. o mesmo, com uma parede de Neumann feita de dois jeitos
# ---------------------------------------------------------------------------


def laplace_neumann(N, modo):
    """u = cos(pi x) senh(pi y)/senh(pi), que tem du/dx = 0 em x = 0 e x = 1.

    As duas paredes laterais sao de Neumann homogeneo e entram no sistema
    como incognitas. Em `modo='ingenuo'` a condicao vira u_parede = u_vizinho,
    que e uma diferenca de um lado so e so tem primeira ordem. Em
    `modo='fantasma'` espelha-se o vizinho para fora da malha, o que da uma
    diferenca centrada e mantem a segunda ordem.
    """
    x = np.linspace(0, 1, N)
    topo = np.cos(np.pi * x)
    livres = [(j, i) for j in range(1, N - 1) for i in range(0, N)]
    pos = {p: k for k, p in enumerate(livres)}
    A = lil_matrix((len(livres), len(livres)))
    b = np.zeros(len(livres))

    def soma(k, p, c):
        if p in pos:
            A[k, pos[p]] += c
        elif p[0] == N - 1:
            b[k] -= c * topo[p[1]]               # borda de cima
        # a borda de baixo vale zero e nao contribui

    for (j, i), k in pos.items():
        parede = (i == 0 or i == N - 1)
        viz = (j, 1) if i == 0 else (j, N - 2)
        if parede and modo == 'ingenuo':
            A[k, k] = 1.0
            A[k, pos[viz]] = -1.0
            continue
        A[k, k] = -4.0
        soma(k, (j + 1, i), 1.0)
        soma(k, (j - 1, i), 1.0)
        if parede:                               # ponto fantasma: espelha
            A[k, pos[viz]] += 2.0
        else:
            soma(k, (j, i + 1), 1.0)
            soma(k, (j, i - 1), 1.0)

    u = np.zeros((N, N))
    u[-1, :] = topo
    for p, v in zip(livres, spsolve(csr_matrix(A), b)):
        u[p] = v
    X, Y = np.meshgrid(x, x)
    exato = np.cos(np.pi * X) * np.sinh(np.pi * Y) / np.sinh(np.pi)
    return 1.0 / (N - 1), np.abs(u - exato)[1:-1, :].max()


# ---------------------------------------------------------------------------
# 3. o capacitor do widget, relaxado
# ---------------------------------------------------------------------------


def capacitor(N=61, meia_placa=15, meio_vao=9):
    """Duas placas em +1 e -1 dentro de uma caixa aterrada."""
    u = np.zeros((N, N))
    fixo = np.zeros((N, N), bool)
    fixo[0, :] = fixo[-1, :] = fixo[:, 0] = fixo[:, -1] = True
    m = (N - 1) // 2
    a, b = m - meia_placa, m + meia_placa
    for i in range(a, b + 1):
        u[m - meio_vao, i] = 1.0
        fixo[m - meio_vao, i] = True
        u[m + meio_vao, i] = -1.0
        fixo[m + meio_vao, i] = True
    return u, fixo


def caixa_vazia(N):
    """Caixa com o topo em 1 e as outras três bordas em zero."""
    u = np.zeros((N, N))
    fixo = np.zeros((N, N), bool)
    fixo[0, :] = fixo[-1, :] = fixo[:, 0] = fixo[:, -1] = True
    u[-1, :] = 1.0
    return u, fixo


def varre_jacobi(u, fixo):
    """Uma varredura de Jacobi, vetorizada.

    Jacobi não depende da ordem de visita, e por isso a forma vetorizada dá
    exatamente o mesmo resultado do laço ponto a ponto, muito mais rápido.
    """
    novo = u.copy()
    novo[1:-1, 1:-1] = 0.25 * (u[2:, 1:-1] + u[:-2, 1:-1]
                               + u[1:-1, 2:] + u[1:-1, :-2])
    novo[fixo] = u[fixo]
    d = novo - u
    u[:] = novo
    return float(np.sqrt(np.sum(d * d)))


def varre_sor(u, fixo, w=1.0):
    """Uma varredura de SOR em ordem lexicográfica; w = 1 é Gauss-Seidel.

    Esta não se vetoriza, porque cada ponto usa os vizinhos já atualizados
    na mesma varredura. O laço em Python é lento de propósito: é a versão
    que corresponde exatamente ao widget da aula.
    """
    N = u.shape[0]
    s = 0.0
    for j in range(1, N - 1):
        for i in range(1, N - 1):
            if fixo[j, i]:
                continue
            med = 0.25 * (u[j, i + 1] + u[j, i - 1] + u[j + 1, i] + u[j - 1, i])
            d = w * (med - u[j, i])
            s += d * d
            u[j, i] += d
    return float(np.sqrt(s))


def relaxa(u, fixo, metodo, w=1.82, tol=1e-11, kmax=20000):
    k, res = 0, 1.0
    while res > tol and k < kmax:
        if metodo == 'jacobi':
            res = varre_jacobi(u, fixo)
        else:
            res = varre_sor(u, fixo, 1.0 if metodo == 'gs' else w)
        k += 1
    return k, res


# ---------------------------------------------------------------------------
# 4. SOR vermelho-preto, para as malhas maiores
# ---------------------------------------------------------------------------


def varre_sor_vp(u, fixo, w, mascara):
    """SOR com ordenação de tabuleiro, vetorizada.

    Pintando a malha como um tabuleiro, cada casa vermelha só tem vizinhos
    pretos. Dá para atualizar todas as vermelhas de uma vez e depois todas as
    pretas, e isso vetoriza. A ordem de visita não é a mesma do laço
    lexicográfico, e por isso o número de varreduras não sai idêntico, mas a
    taxa de convergência é a mesma e é ela que está sendo medida aqui.
    """
    s = 0.0
    for cor in (0, 1):
        med = np.zeros_like(u)
        med[1:-1, 1:-1] = 0.25 * (u[2:, 1:-1] + u[:-2, 1:-1]
                                  + u[1:-1, 2:] + u[1:-1, :-2])
        sel = (mascara == cor) & (~fixo)
        d = np.zeros_like(u)
        d[sel] = w * (med[sel] - u[sel])
        u += d
        s += float(np.sum(d * d))
    return np.sqrt(s)


def relaxa_vp(u, fixo, w, tol=1e-11, kmax=200000):
    N = u.shape[0]
    jj, ii = np.meshgrid(np.arange(N), np.arange(N), indexing='ij')
    mascara = (ii + jj) % 2
    k, res = 0, 1.0
    while res > tol and k < kmax:
        res = varre_sor_vp(u, fixo, w, mascara)
        k += 1
    return k, res


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. A ORDEM DO ERRO, NO CASO DE RESPOSTA CONHECIDA')
    print('=' * 72)
    print('   u = sen(pi x) senh(pi y)/senh(pi) no quadrado unitario,')
    print('   resolvido pelo sistema linear para o erro ser so o da malha.')
    print()
    print('      N      h          erro maximo    cai por')
    hs, es = [], []
    ant = None
    for N in (17, 33, 65, 129):
        h, e = laplace_direto(N)
        hs.append(h)
        es.append(e)
        print('   %5d  %.6f   %.6e  %s'
              % (N, h, e, '%8.3f' % (ant / e) if ant else '       -'))
        ant = e
    p = np.polyfit(np.log(hs), np.log(es), 1)[0]
    print()
    print('   inclinacao de log(E) contra log(h): %.4f' % p)
    print()
    print('   Dobrar o numero de pontos divide o erro por quase exatamente')
    print('   4, e a inclinacao da 2. E a segunda ordem da formula de cinco')
    print('   pontos, confirmada de ponta a ponta: a formula, a montagem do')
    print('   sistema e o tratamento do contorno, tudo de uma vez.')
    print()

    print('=' * 72)
    print('2. O CONTORNO QUE DERRUBA A ORDEM')
    print('=' * 72)
    print('   Agora u = cos(pi x) senh(pi y)/senh(pi), que tem derivada')
    print('   normal nula nas duas paredes laterais. A condicao de Neumann')
    print('   entra de dois jeitos.')
    print()
    for modo, nome in (('ingenuo', 'u_parede = u_vizinho (um lado so)'),
                       ('fantasma', 'ponto fantasma (centrada)')):
        hs, es = [], []
        ant = None
        print('   %s' % nome)
        print('      N      h          erro maximo    cai por')
        for N in (17, 33, 65, 129):
            h, e = laplace_neumann(N, modo)
            hs.append(h)
            es.append(e)
            print('   %5d  %.6f   %.6e  %s'
                  % (N, h, e, '%8.3f' % (ant / e) if ant else '       -'))
            ant = e
        print('      inclinacao: %.3f'
              % np.polyfit(np.log(hs), np.log(es), 1)[0])
        print()
    print('   O interior e o mesmo nos dois casos. Trocar a condicao de')
    print('   contorno por uma de primeira ordem derruba a ordem do dominio')
    print('   INTEIRO, e o erro passa a cair por 2 em vez de 4. Esse e o')
    print('   motivo de medir a inclinacao em vez de olhar a figura: um erro')
    print('   so no contorno produz um campo de aparencia perfeitamente')
    print('   razoavel, e so a taxa de queda do erro o denuncia.')
    print()

    print('=' * 72)
    print('3. JACOBI, GAUSS-SEIDEL E SOR NO CAPACITOR')
    print('=' * 72)
    print('   Malha 61x61, duas placas em +1 e -1 dentro da caixa aterrada,')
    print('   residuo de corte em 1e-11, varredura lexicografica.')
    print()
    campos = {}
    print('      metodo              varreduras   residuo final   centro')
    for met, w, nome in (('jacobi', 1.0, 'Jacobi'),
                         ('gs', 1.0, 'Gauss-Seidel'),
                         ('sor', 1.82, 'SOR com w = 1,82')):
        u, fixo = capacitor()
        k, res = relaxa(u, fixo, met, w)
        campos[nome] = u.copy()
        print('      %-18s %8d    %.3e    %+.2e' % (nome, k, res, u[30, 30]))
    nomes = list(campos)
    print()
    for a in range(len(nomes)):
        for b in range(a + 1, len(nomes)):
            print('      diferenca maxima %s / %s: %.2e'
                  % (nomes[a], nomes[b],
                     np.abs(campos[nomes[a]] - campos[nomes[b]]).max()))
    print()
    print('   Os tres chegam ao mesmo campo, com diferenca da ordem do')
    print('   residuo de corte. O que muda e so o custo. O potencial no')
    print('   centro tem de dar zero por simetria, e da: e a aferição mais')
    print('   barata que esta geometria oferece.')
    print()

    print('=' * 72)
    print('4. O OMEGA OTIMO: FORMULA E MEDIDA')
    print('=' * 72)
    N = 61
    formula = 2 / (1 + np.sin(np.pi / (N - 1)))
    print('   Na caixa VAZIA, a formula 2/(1 + sen(pi/N)) com N = %d' % (N - 1))
    print('   divisoes preve w = %.4f.' % formula)
    print()
    print('      w        varreduras (caixa vazia)   varreduras (capacitor)')
    casos = (('vazia', lambda: caixa_vazia(N)),
             ('capacitor', lambda: capacitor(N)))
    melhor = {nome: (None, 10 ** 9) for nome, _ in casos}
    for w in (1.70, 1.75, 1.80, 1.82, 1.85, 1.88, 1.90, 1.92, 1.94):
        linha = []
        for nome, monta in casos:
            u, fixo = monta()
            k, _ = relaxa(u, fixo, 'sor', w)
            linha.append(k)
            if k < melhor[nome][1]:
                melhor[nome] = (w, k)
        print('      %.2f   %18d   %20d' % (w, linha[0], linha[1]))
    print()
    print('   minimo medido na caixa vazia: w = %.2f, com %d varreduras'
          % melhor['vazia'])
    print('   minimo medido no capacitor:   w = %.2f, com %d varreduras'
          % melhor['capacitor'])
    print()
    print('   Na caixa vazia a formula acerta: o minimo medido cai onde ela')
    print('   manda. No capacitor o minimo anda para tras, porque as duas')
    print('   placas mudam o espectro do operador e a formula nao sabe disso.')
    print('   A formula serve para orientar a busca, e o ajuste final se faz')
    print('   medindo, que e exatamente o que esta tabela e.')
    print()

    print('=' * 72)
    print('5. COMO O CUSTO CRESCE COM A MALHA')
    print('=' * 72)
    print('   Caixa vazia, residuo de corte em 1e-9. O SOR usa o w otimo de')
    print('   cada malha, e por isso cada linha tem o seu proprio w. Aqui os')
    print('   metodos de varredura ordenada usam tabuleiro, para caber no')
    print('   tempo: a ordem de visita muda, a taxa de convergencia nao.')
    print()
    print('      N      Jacobi    SOR(w otimo)   w otimo')
    Ns = (21, 31, 41, 61, 81)
    kj, ks = [], []
    for n in Ns:
        u, fixo = caixa_vazia(n)
        a, _ = relaxa(u, fixo, 'jacobi', tol=1e-9, kmax=200000)
        w = 2 / (1 + np.sin(np.pi / (n - 1)))
        u, fixo = caixa_vazia(n)
        b, _ = relaxa_vp(u, fixo, w, tol=1e-9)
        kj.append(a)
        ks.append(b)
        print('   %5d  %8d   %10d   %8.4f' % (n, a, b, w))
    pj = np.polyfit(np.log(Ns), np.log(kj), 1)[0]
    ps = np.polyfit(np.log(Ns), np.log(ks), 1)[0]
    print()
    print('      expoente medido, Jacobi:      %.3f   (previsto 2)' % pj)
    print('      expoente medido, SOR otimo:   %.3f   (previsto 1)' % ps)
    print()
    print('   E por isso que a vantagem do SOR nao e um fator fixo. Em')
    print('   61x61 ele e vinte vezes mais barato; dobrando a malha, Jacobi')
    print('   quadruplica o trabalho e o SOR apenas dobra, e a distancia')
    print('   entre os dois dobra junto.')
    print()


if __name__ == '__main__':
    main()
