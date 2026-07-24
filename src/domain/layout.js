export const LAYOUT_VERSION = 1;
export const STORAGE_KEY = "warburg-canvas:layout:v1";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function defaultPosition(index) {
  const columns = 6;
  return {
    x: 80 + (index % columns) * 220,
    y: 80 + Math.floor(index / columns) * 270,
  };
}

export function normalizeCorpusItem(item, index = 0) {
  const id = String(
    item?.id ?? item?.itemId ?? item?.identifier ?? `item-${index + 1}`,
  );

  return {
    ...item,
    id,
    title: String(item?.title ?? item?.name ?? id),
    country: String(item?.country ?? item?.countryCode ?? item?.country_code ?? ""),
    regime: String(item?.regime ?? item?.regimeKey ?? item?.regime_key ?? ""),
    year: item?.yearValue ?? item?.year ?? item?.date ?? "",
    motif: item?.motif ?? item?.motifs ?? "",
    imageUrl:
      item?.imageUrl ??
      item?.image_url ??
      item?.thumbnail ??
      item?.thumbnailUrl ??
      "",
  };
}

export function normalizeCorpus(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.corpus ?? [];

  if (!Array.isArray(source)) {
    throw new Error("O corpus precisa ser uma lista ou conter a chave items/corpus.");
  }

  const seen = new Set();
  return source.map(normalizeCorpusItem).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function parseCorpusText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return [];

  try {
    return normalizeCorpus(JSON.parse(trimmed));
  } catch (jsonError) {
    try {
      return normalizeCorpus(
        trimmed
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line)),
      );
    } catch {
      throw new Error(
        `Arquivo inválido. Use JSON ou JSONL. Detalhe: ${jsonError.message}`,
      );
    }
  }
}

export function createLayout(items, name = "Painel sem título") {
  return {
    version: LAYOUT_VERSION,
    id: crypto.randomUUID?.() ?? `layout-${Date.now()}`,
    name,
    nodes: Object.fromEntries(
      items.map((item, index) => [item.id, defaultPosition(index)]),
    ),
    connections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function reconcileLayout(layout, items) {
  const base = isValidLayout(layout) ? layout : createLayout(items);
  const nodes = { ...base.nodes };

  items.forEach((item, index) => {
    const current = nodes[item.id];
    nodes[item.id] = current
      ? {
          x: finiteNumber(current.x, defaultPosition(index).x),
          y: finiteNumber(current.y, defaultPosition(index).y),
        }
      : defaultPosition(index);
  });

  return {
    ...base,
    version: LAYOUT_VERSION,
    nodes,
    connections: Array.isArray(base.connections) ? base.connections : [],
  };
}

export function mergeNodePositions(layout, positions) {
  return {
    ...layout,
    nodes: {
      ...layout.nodes,
      ...positions,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function addConnection(layout, sourceId, targetId, label) {
  if (!sourceId || !targetId || sourceId === targetId) return layout;
  const duplicate = layout.connections.some(
    (connection) =>
      connection.sourceId === sourceId && connection.targetId === targetId,
  );
  if (duplicate) return layout;

  return {
    ...layout,
    connections: [
      ...layout.connections,
      {
        id: crypto.randomUUID?.() ?? `connection-${Date.now()}`,
        sourceId,
        targetId,
        label: String(label || "Pathosformel").trim() || "Pathosformel",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function removeConnection(layout, connectionId) {
  return {
    ...layout,
    connections: layout.connections.filter(
      (connection) => connection.id !== connectionId,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function filterCorpus(items, filters) {
  const query = String(filters.query ?? "").trim().toLocaleLowerCase("pt-BR");
  return items.filter((item) => {
    if (filters.country && item.country !== filters.country) return false;
    if (filters.regime && item.regime !== filters.regime) return false;
    if (!query) return true;

    const searchable = [
      item.id,
      item.title,
      item.country,
      item.regime,
      Array.isArray(item.motif) ? item.motif.join(" ") : item.motif,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchable.includes(query);
  });
}

export function isValidLayout(layout) {
  return Boolean(
    layout &&
      typeof layout === "object" &&
      layout.nodes &&
      typeof layout.nodes === "object" &&
      Array.isArray(layout.connections),
  );
}

export function readStoredLayout(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidLayout(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeLayout(layout, storage = globalThis.localStorage) {
  if (!isValidLayout(layout)) {
    throw new Error("O painel não possui uma estrutura válida.");
  }
  storage?.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }),
  );
}
