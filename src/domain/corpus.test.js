import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CORPUS_URL,
  loadCorpus,
  resolveCorpusUrl,
} from "./corpus.js";

describe("canonical corpus source", () => {
  it("uses the canonical public export by default", () => {
    expect(resolveCorpusUrl()).toBe(DEFAULT_CORPUS_URL);
  });

  it("accepts a configured deployment URL", () => {
    expect(
      resolveCorpusUrl({ VITE_CORPUS_URL: "  https://data.example/corpus.json  " }),
    ).toBe("https://data.example/corpus.json");
  });

  it("fetches and normalizes the configured corpus", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: "BR-001",
            title: "República",
            country: "Brazil",
            date: "1891",
            regime: "normativo",
          },
        ],
      }),
    });

    const corpus = await loadCorpus("https://data.example/corpus.json", {
      fetchImplementation,
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://data.example/corpus.json",
      expect.objectContaining({ cache: "no-cache" }),
    );
    expect(corpus).toEqual([
      expect.objectContaining({ id: "BR-001", year: "1891" }),
    ]);
  });

  it("reports the source when the configured endpoint fails", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(
      loadCorpus("https://data.example/missing.json", { fetchImplementation }),
    ).rejects.toThrow(
      "Corpus indisponível (404) em https://data.example/missing.json.",
    );
  });
});
