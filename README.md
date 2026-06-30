# 常用漢字 — Aprender Jōyō Kanji

App web para estudar os **2136 kanji Jōyō** (常用漢字) com quiz de múltipla escolha.
Mostra o card de um kanji e 4 opções **bem parecidas**, com a ordem **embaralhada a cada exibição**.

![nível](https://img.shields.io/badge/kanji-2136-e63946) ![idioma](https://img.shields.io/badge/significados-PT-2fbf71)

## Funcionalidades

- **Significado + Leitura** — alterna entre perguntar o significado (em português) e a leitura (on'yomi / kun'yomi). Também dá para fixar em só um dos modos.
- **Distratores parecidos** — nas leituras, as opções erradas são escolhidas por similaridade fonética (mesmo script, comprimento e kana em comum); nos significados, vêm de kanji do mesmo nível.
- **Ordem aleatória** — as 4 alternativas são embaralhadas a cada questão.
- **Repetição espaçada simples** — o app prioriza kanji ainda não vistos e os que você errou mais (salvo em `localStorage`).
- **Filtro por nível** — estude por grade escolar (1–6) ou o conjunto secundário (8), ou todos de uma vez.
- **Ficha de aprendizado** — após responder, mostra todos os significados, leituras on/kun, nível e número de traços.
- **Estatísticas** — acertos, sequência (streak) e precisão da sessão.
- **Atalhos de teclado** — `1`–`4` escolhem a opção, `Enter`/`Espaço` avança.

## Como rodar

É um site estático, sem build. Basta servir a pasta:

```bash
npx http-server -p 8123 -c-1
# abra http://localhost:8123
```

Ou abra `index.html` direto no navegador (o `localStorage` funciona igual).

### Deploy no GitHub Pages

Faça push e ative o GitHub Pages na branch principal (pasta raiz). O app é 100% client-side.

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Estilo (tema escuro) |
| `app.js` | Lógica do quiz, distratores e repetição espaçada |
| `kanji-data.js` | Dataset gerado: 2136 Jōyō kanji com leituras e significados |
| `build-data.js` | Script que gera `kanji-data.js` a partir do KANJIDIC2 |

## Regenerar o dataset

```bash
curl -sL -o kanjidic2.xml.gz http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
gzip -dk kanjidic2.xml.gz
node build-data.js
```

O parser filtra os kanji de grade 1–8 (= conjunto Jōyō), extrai `ja_on`/`ja_kun` e os significados em português (`m_lang="pt"`), caindo para inglês nos ~197 kanji sem tradução PT.

## Dados e licença

Significados e leituras vêm do **[KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)**, © Electronic Dictionary Research and Development Group (EDRDG), distribuído sob **CC BY-SA 4.0**.
