import { afterEach, describe, expect, it, vi } from "vitest";
import { exaSearch, formatComps, gatherWebContext } from "./web-grounding";

afterEach(() => vi.unstubAllGlobals());

function mockFetch(impl: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const exaBody = (results: unknown[]) =>
  new Response(JSON.stringify({ results }), { status: 200 });

describe("exaSearch", () => {
  it("maps results to trimmed comps", async () => {
    mockFetch(() =>
      exaBody([
        { title: "Charizard SAR", url: "https://tcgplayer.com/x", text: "  Market   $420  " },
      ]),
    );
    const comps = await exaSearch({ query: "charizard", apiKey: "k" });
    expect(comps[0]).toEqual({
      title: "Charizard SAR",
      url: "https://tcgplayer.com/x",
      text: "Market $420",
    });
  });
});

describe("exaSearch domain fallback", () => {
  it("strips Exa-unavailable domains and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "The following requested domains are not available: ebay.com. Remove them.",
            tag: "SOURCE_NOT_AVAILABLE",
          }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(exaBody([{ title: "ok", url: "u", text: "t" }]));
    vi.stubGlobal("fetch", fetchMock);

    const comps = await exaSearch({
      query: "q",
      apiKey: "k",
      includeDomains: ["ebay.com", "tcgplayer.com"],
    });
    expect(comps).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.includeDomains).toEqual(["tcgplayer.com"]);
  });
});

describe("gatherWebContext", () => {
  it("returns undefined without an api key (grounding disabled)", async () => {
    mockFetch(() => exaBody([]));
    expect(await gatherWebContext("q", ["tcgplayer.com"], undefined)).toBeUndefined();
  });

  it("returns a formatted block on success", async () => {
    mockFetch(() =>
      exaBody([{ title: "Sold", url: "https://ebay.com/i", text: "sold for 50000 yen" }]),
    );
    const block = await gatherWebContext("q", ["ebay.com"], "key");
    expect(block).toContain("https://ebay.com/i");
    expect(block).toContain("sold for 50000 yen");
  });

  it("swallows errors and returns undefined (never blocks checkout)", async () => {
    mockFetch(() => new Response("nope", { status: 500 }));
    expect(await gatherWebContext("q", ["ebay.com"], "key")).toBeUndefined();
  });
});

describe("formatComps", () => {
  it("drops empty-text comps and caps at five", () => {
    const block = formatComps(
      Array.from({ length: 8 }, (_, i) => ({ title: `t${i}`, url: `u${i}`, text: `x${i}` })),
    );
    expect(block.split("\n\n")).toHaveLength(5);
  });
});
