# -*- coding: utf-8 -*-
"""Extrai o texto e as equacoes de um .docx para markdown.

Uso:  python3 -I ferramentas/extrai-docx.py fonte/meios.docx conteudo/livro.md

O Word guarda a matematica no mesmo Office Math Markup dos slides, de modo
que o conversor de omml.py serve sem mudanca. O que muda e a travessia: em
vez de formas de slide, aqui sao paragrafos (w:p), e o estilo de cada um
(w:pStyle) diz se a linha e titulo, legenda ou texto corrido.
"""
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from omml import de_oMath, M

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MC = '{http://schemas.openxmlformats.org/markup-compatibility/2006}'

# estilo do Word -> marcacao de markdown
NIVEL = {'Ttulo': '# ', 'Title': '# ',
         'Ttulo1': '# ', 'Heading1': '# ',
         'Ttulo2': '## ', 'Heading2': '## ',
         'Ttulo3': '### ', 'Heading3': '### ',
         'Subtitulo': '### ', 'Subtitle': '### ',
         'TtulodaPginadeTtulo': '# ',
         'Caption': '', 'Legenda': '', 'Recuonormal': '', 'SemEspaamento': ''}

# o que nao entra no texto: sumario, nomes de autor, dicas de modelo
IGNORA = {'Sumrio1', 'Sumrio2', 'CabealhodoSumrio', 'NomedoAutor',
          'NomedosAutoresdaPginadeTtulo', 'InformaesdoAutor', 'TextodeDica'}


def estilo(p):
    for f in p:
        if f.tag == W + 'pPr':
            for g in f:
                if g.tag == W + 'pStyle':
                    return g.get(W + 'val') or ''
    return ''


def texto_do_paragrafo(p):
    """Texto de um w:p, com as equacoes em \\(...\\)."""
    partes = []

    def anda(no):
        if no.tag == MC + 'Fallback':
            return
        if no.tag == M + 'oMath':
            tex = de_oMath(no)
            if tex:
                partes.append(' \\(%s\\) ' % tex)
            return
        if no.tag == W + 't':
            partes.append(no.text or '')
            return
        if no.tag in (W + 'br', W + 'tab'):
            partes.append(' ')
            return
        for f in no:
            anda(f)

    anda(p)
    return re.sub(r'[ \t]{2,}', ' ', ''.join(partes)).strip()


def converte(entrada, saida):
    z = zipfile.ZipFile(entrada)
    raiz = ET.fromstring(z.read('word/document.xml').decode('utf-8'))
    corpo = raiz.find(W + 'body')
    linhas, n_eq = [], 0
    for p in corpo.iter(W + 'p'):
        t = texto_do_paragrafo(p)
        if not t:
            continue
        n_eq += t.count('\\(')
        est = estilo(p)
        if est in IGNORA:
            continue
        pre = NIVEL.get(est, '')
        # um paragrafo que e so uma equacao vira equacao de bloco
        # no documento o estilo Ttulo aparece tambem em texto corrido, de
        # modo que uma linha longa demais para ser titulo volta a ser texto
        if pre and len(t) > 90:
            pre = ''
        so_eq = re.fullmatch(r'\\\((.*)\\\)', t, re.S)
        if so_eq and not pre:
            linhas.append('\\[%s\\]' % so_eq.group(1).strip())
        else:
            linhas.append(pre + t)
    open(saida, 'w', encoding='utf-8').write('\n\n'.join(linhas) + '\n')
    print('%s: %d paragrafos, %d equacoes' % (saida, len(linhas), n_eq))


if __name__ == '__main__':
    converte(sys.argv[1], sys.argv[2])
