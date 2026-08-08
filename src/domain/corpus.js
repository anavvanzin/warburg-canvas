import { normalizeCorpus } from "./layout.js";

export const DEFAULT_CORPUS_URL =
  "https://raw.githubusercontent.com/anavvanzin/iconocracy-corpus/main/corpus/corpus-data.json";

export function resolveCorpusUrl(environment = {}) {
  const configured = String(environment.VITE_CORPUS_URL ?? "").trim();
  return configured || DEFAULT_CORPUS_URL;
}

export async function loadCorpus(
  corpusUrl,
  { fetchImplementation = globalThis.fetch, signal } = {},
) {
  const source = String(corpusUrl ?? "").trim();
  if (!source) throw new Error("A URL do corpus não foi configurada.");
  if (typeof fetchImplementation !== "function") {
    throw new Error("Este ambiente não oferece suporte para carregar o corpus.");
  }

  let response;
  try {
    response = await fetchImplementation(source, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(`Não foi possível carregar o corpus configurado: ${source}.`);
  }

  if (!response.ok) {
    throw new Error(
      `Corpus indisponível (${response.status || "erro HTTP"}) em ${source}.`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`A resposta do corpus não contém JSON válido: ${source}.`);
  }

  return normalizeCorpus(payload);
}
