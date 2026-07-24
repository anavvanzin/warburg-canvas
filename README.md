# Warburg Canvas

Mesa visual autônoma para compor painéis, posicionar imagens e registrar relações de Pathosformel no corpus de pesquisa.

O projeto é deliberadamente separado do companion. Ele recebe dados do corpus, mas mantém layouts e conexões em um modelo próprio. Filtrar imagens altera apenas a visualização: posições de itens ocultos continuam preservadas.

## MVP

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

## Verificar

```bash
npm run check
```

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
