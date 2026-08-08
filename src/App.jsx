import { useEffect, useMemo, useRef, useState } from "react";
import { loadCorpus, resolveCorpusUrl } from "./domain/corpus.js";
import {
  addConnection,
  createLayout,
  filterCorpus,
  mergeNodePositions,
  parseCorpusText,
  readStoredLayout,
  reconcileLayout,
  removeConnection,
  storeLayout,
} from "./domain/layout.js";

const CORPUS_URL = resolveCorpusUrl(import.meta.env);

function values(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function ItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <div className="item-placeholder" aria-hidden="true">
        {item.country || "WC"}
      </div>
    );
  }
  return (
    <img
      src={item.imageUrl}
      alt=""
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}

function Canvas({
  items,
  layout,
  onMove,
  onConnect,
  linkingSource,
  setLinkingSource,
}) {
  const [viewport, setViewport] = useState({ x: 20, y: 20, zoom: 0.8 });
  const interaction = useRef(null);
  const visibleIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  useEffect(() => {
    const onPointerMove = (event) => {
      const active = interaction.current;
      if (!active) return;

      if (active.type === "pan") {
        setViewport((current) => ({
          ...current,
          x: active.originX + event.clientX - active.clientX,
          y: active.originY + event.clientY - active.clientY,
        }));
        return;
      }

      onMove(active.id, {
        x: Math.round(
          active.originX + (event.clientX - active.clientX) / viewport.zoom,
        ),
        y: Math.round(
          active.originY + (event.clientY - active.clientY) / viewport.zoom,
        ),
      });
    };

    const stop = () => {
      interaction.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [onMove, viewport.zoom]);

  const startPan = (event) => {
    if (event.target.closest(".canvas-node")) return;
    interaction.current = {
      type: "pan",
      clientX: event.clientX,
      clientY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
  };

  const startDrag = (event, id) => {
    if (event.target.closest("button")) return;
    event.stopPropagation();
    const position = layout.nodes[id] ?? { x: 0, y: 0 };
    interaction.current = {
      type: "node",
      id,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const chooseConnection = (targetId) => {
    if (!linkingSource) {
      setLinkingSource(targetId);
      return;
    }
    if (linkingSource === targetId) {
      setLinkingSource(null);
      return;
    }
    const label = window.prompt(
      "Pathosformel ou motivo compartilhado:",
      "gesto compartilhado",
    );
    if (label !== null) onConnect(linkingSource, targetId, label);
    setLinkingSource(null);
  };

  const onWheel = (event) => {
    event.preventDefault();
    setViewport((current) => ({
      ...current,
      zoom: Math.max(
        0.35,
        Math.min(1.8, current.zoom * (event.deltaY < 0 ? 1.08 : 0.92)),
      ),
    }));
  };

  return (
    <section
      className="canvas-viewport"
      onPointerDown={startPan}
      onWheel={onWheel}
      aria-label="Mesa visual Warburg"
    >
      <div
        className="canvas-stage"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        <svg className="connections" aria-hidden="true">
          {layout.connections.map((connection) => {
            if (
              !visibleIds.has(connection.sourceId) ||
              !visibleIds.has(connection.targetId)
            ) {
              return null;
            }
            const source = layout.nodes[connection.sourceId];
            const target = layout.nodes[connection.targetId];
            if (!source || !target) return null;
            const x1 = source.x + 90;
            const y1 = source.y + 108;
            const x2 = target.x + 90;
            const y2 = target.y + 108;
            const curve = Math.max(45, Math.abs(x2 - x1) * 0.13);
            return (
              <g key={connection.id}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${y1 - curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`}
                />
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - curve / 2}>
                  {connection.label}
                </text>
              </g>
            );
          })}
        </svg>

        {items.map((item) => {
          const position = layout.nodes[item.id] ?? { x: 0, y: 0 };
          const isSource = linkingSource === item.id;
          return (
            <article
              className={`canvas-node${isSource ? " is-linking" : ""}`}
              key={item.id}
              style={{ left: position.x, top: position.y }}
              onPointerDown={(event) => startDrag(event, item.id)}
            >
              <ItemImage item={item} />
              <div className="node-copy">
                <span className="eyebrow">
                  {item.country || "s.l."} · {item.year || "s.d."}
                </span>
                <strong title={item.title}>{item.title}</strong>
                <small>{item.regime || "sem regime"}</small>
              </div>
              <button
                type="button"
                className="connect-button"
                onClick={() => chooseConnection(item.id)}
              >
                {isSource ? "cancelar ligação" : linkingSource ? "ligar aqui" : "conectar"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="zoom-controls">
        <button
          type="button"
          onClick={() =>
            setViewport((current) => ({
              ...current,
              zoom: Math.min(1.8, current.zoom * 1.15),
            }))
          }
        >
          +
        </button>
        <span>{Math.round(viewport.zoom * 100)}%</span>
        <button
          type="button"
          onClick={() =>
            setViewport((current) => ({
              ...current,
              zoom: Math.max(0.35, current.zoom / 1.15),
            }))
          }
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setViewport({ x: 20, y: 20, zoom: 0.8 })}
        >
          centrar
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [layout, setLayout] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    country: "",
    regime: "",
  });
  const [linkingSource, setLinkingSource] = useState(null);
  const [status, setStatus] = useState("Carregando corpus canônico…");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    loadCorpus(CORPUS_URL, { signal: controller.signal })
      .then((corpus) => {
        setItems(corpus);
        setLayout(reconcileLayout(readStoredLayout(), corpus));
        setStatus(`${corpus.length} itens carregados do corpus canônico.`);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setItems([]);
        setLayout(createLayout([]));
        setStatus(error.message);
      });

    return () => controller.abort();
  }, []);

  const visibleItems = useMemo(
    () => filterCorpus(items, filters),
    [items, filters],
  );
  const countries = useMemo(() => values(items, "country"), [items]);
  const regimes = useMemo(() => values(items, "regime"), [items]);

  const changeLayout = (updater) => {
    setLayout((current) =>
      typeof updater === "function" ? updater(current) : updater,
    );
    setDirty(true);
  };

  const handleMove = (id, position) => {
    changeLayout((current) =>
      mergeNodePositions(current, { [id]: position }),
    );
  };

  const handleConnect = (sourceId, targetId, label) => {
    changeLayout((current) =>
      addConnection(current, sourceId, targetId, label),
    );
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const corpus = parseCorpusText(await file.text());
      setItems(corpus);
      setLayout((current) => reconcileLayout(current, corpus));
      setFilters({ query: "", country: "", regime: "" });
      setStatus(`${corpus.length} itens importados de ${file.name}.`);
      setDirty(true);
    } catch (error) {
      setStatus(error.message);
    } finally {
      event.target.value = "";
    }
  };

  const handleSave = () => {
    try {
      storeLayout(layout);
      setDirty(false);
      setStatus(`Painel salvo localmente às ${new Date().toLocaleTimeString("pt-BR")}.`);
    } catch (error) {
      setStatus(`Falha ao salvar: ${error.message}`);
    }
  };

  if (!layout) {
    return <main className="loading">{status}</main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="kicker">MESA DE PESQUISA VISUAL</span>
          <h1>Warburg Canvas</h1>
        </div>
        <div className="top-actions">
          <label className="button secondary">
            importar corpus
            <input
              type="file"
              accept=".json,.jsonl,application/json"
              onChange={handleImport}
              hidden
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              downloadJson(
                `${layout.name.toLocaleLowerCase("pt-BR").replace(/\W+/g, "-") || "painel"}.json`,
                layout,
              )
            }
          >
            exportar JSON
          </button>
          <button type="button" className="button primary" onClick={handleSave}>
            salvar painel{dirty ? " •" : ""}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <section>
            <label className="field-label" htmlFor="panel-name">
              nome do painel
            </label>
            <input
              id="panel-name"
              value={layout.name}
              onChange={(event) =>
                changeLayout((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </section>

          <section>
            <h2>Corpus</h2>
            <input
              aria-label="Buscar no corpus"
              placeholder="buscar título, motivo, id…"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
            />
            <div className="filter-grid">
              <select
                aria-label="Filtrar por país"
                value={filters.country}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    country: event.target.value,
                  }))
                }
              >
                <option value="">todos os países</option>
                {countries.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar por regime"
                value={filters.regime}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    regime: event.target.value,
                  }))
                }
              >
                <option value="">todos os regimes</option>
                {regimes.map((regime) => (
                  <option key={regime}>{regime}</option>
                ))}
              </select>
            </div>
            <p className="count">
              {visibleItems.length} visíveis de {items.length}. Os filtros não
              alteram o painel salvo.
            </p>
            <a
              className="corpus-source"
              href={CORPUS_URL}
              target="_blank"
              rel="noreferrer"
              title={CORPUS_URL}
            >
              abrir exportação canônica
            </a>
          </section>

          <section className="connection-panel">
            <h2>Pathosformeln</h2>
            {layout.connections.length === 0 ? (
              <p className="empty-copy">
                Selecione “conectar” em uma imagem e escolha a imagem de destino.
              </p>
            ) : (
              <ol>
                {layout.connections.map((connection) => (
                  <li key={connection.id}>
                    <div>
                      <strong>{connection.label}</strong>
                      <span>
                        {connection.sourceId} → {connection.targetId}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover conexão ${connection.label}`}
                      onClick={() =>
                        changeLayout((current) =>
                          removeConnection(current, connection.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="status-box" aria-live="polite">
            <span>{dirty ? "alterações não salvas" : "estado preservado"}</span>
            <p>{status}</p>
          </section>
        </aside>

        <Canvas
          items={visibleItems}
          layout={layout}
          onMove={handleMove}
          onConnect={handleConnect}
          linkingSource={linkingSource}
          setLinkingSource={setLinkingSource}
        />
      </div>
    </main>
  );
}
