# Warburg Canvas

Mesa visual autônoma para compor painéis, posicionar imagens e registrar relações de Pathosformel no corpus de pesquisa.

O projeto é deliberadamente separado do companion. Ele recebe dados do corpus, mas mantém layouts e conexões em um modelo próprio. Filtrar imagens altera apenas a visualização: posições de itens ocultos continuam preservadas.

## MVP

- carregamento automático da exportação pública canônica do corpus;
- importação de corpus em JSON ou JSONL;
- filtros por país, regime e busca textual;
- arrastar, ampliar e deslocar a mesa;
- criação e remoção de conexões nomeadas;
- persistência local com confirmação de sucesso ou falha;
- exportação integral do painel em JSON;
- testes de regressão contra perda de posições durante filtros.

## Executar

```bash
npm install
npm run dev
```

Por padrão, o aplicativo lê somente a exportação pública derivada em
`anavvanzin/iconocracy-corpus/corpus/corpus-data.json`. A cadeia de dados é:

```text
data/processed/records.jsonl → corpus/corpus-data.json → warburg-canvas
```

`records.jsonl` continua sendo o ledger canônico e `corpus-data.json` deve ser
regenerado no repositório do corpus. O Warburg Canvas não escreve em nenhuma
dessas fontes.

Para usar outro endpoint em desenvolvimento ou no deploy, configure a variável
de build `VITE_CORPUS_URL`:

```bash
cp .env.example .env.local
npm run dev
```

Se a variável não for definida, o aplicativo usa a URL raw da branch `main` do
repositório canônico. Depois da carga, o layout salvo localmente é reconciliado
com o corpus: posições conhecidas são preservadas e novos itens recebem posições
iniciais sem reiniciar a curadoria existente.

## Verificar

```bash
npm ci
npm run check
```

Antes do deploy, confirme também que a URL configurada responde com JSON e
permite leitura pelo navegador (CORS), e faça um teste manual de carga, filtros,
movimentação, salvamento e recarga do painel. A CI repete build e testes nas
versões 18, 20 e 22 do Node.js.

## Contrato mínimo do corpus

```json
{
  "id": "BR-1891-001",
  "title": "Efígie da República",
  "country": "BR",
  "year": 1891,
  "regime": "NORMATIVO",
  "motif": ["barrete frígio"],
  "imageUrl": "https://exemplo.org/imagem.jpg"
}
```

Também são aceitos objetos com uma lista em `items` ou `corpus`. Alguns nomes equivalentes são normalizados durante a importação.

## Princípio de integridade

O layout persiste o conjunto completo de nós. Filtros definem quais cartões são renderizados e nunca substituem o mapa integral de posições. Essa regra responde diretamente ao risco de perda de dados identificado no primeiro protótipo integrado.
