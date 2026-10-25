import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getArtworkRelatedArtists } from "./artworkRelatedArtists.js";

const source = {
  artwork_id: 1, student_id: 10, genre: "Abstract", mediums_used: "Oil",
  art_type: "Painting", color_used: "Red",
};

describe("getArtworkRelatedArtists", () => {
  it("prioritizes matching medium and style and ignores unrelated shared attributes", () => {
    const results = getArtworkRelatedArtists(source, [
      { artwork_id: 2, student_id: 20, genre: "Abstract", mediums_used: "Acrylic" },
      { artwork_id: 3, student_id: 30, genre: "Landscape", mediums_used: "Oil" },
      { artwork_id: 4, student_id: 40, genre: "Abstract", mediums_used: "Oil" },
      { artwork_id: 5, student_id: 50, art_type: "Painting", color_used: "Red" },
      { artwork_id: 6, student_id: 60, mediums_used: "Oil pastel" },
    ]);
    assert.deepEqual(results.map((artist) => artist.student_id), [40, 30, 20]);
  });

  it("normalizes encoded metadata, aliases, casing, and separators", () => {
    const results = getArtworkRelatedArtists({
      ...source,
      genre: JSON.stringify(JSON.stringify(["ABSTRACT_ART"])),
      mediums_used: JSON.stringify(["Watercolour painting", "Soft Pastels"]),
    }, [
      { artwork_id: 2, student_id: 20, genre: ["abstract"], mediums_used: "Watercolor; Canvas" },
      { artwork_id: 3, student_id: 30, mediums_used: JSON.stringify(JSON.stringify(["pastel"])) },
      { artwork_id: 4, student_id: 40, genre: "Abstract-painting", mediums_used: ["water color"] },
    ]);
    assert.deepEqual(results.map((artist) => artist.student_id), [20, 40, 30]);
  });

  it("groups unique artists and artwork previews while counting all their eligible works", () => {
    const matching = Array.from({ length: 4 }, (_, index) => ({
      artwork_id: index + 2, student_id: "20", genre: "Abstract", mediums_used: "Oil",
      first_name: "Jane", last_name: "Doe", shop_name: "Jane's Studio",
      profile_image: "https://example.test/jane.jpg", shop_description: "Oil painter",
      course: "Fine Arts",
    }));
    const [artist] = getArtworkRelatedArtists(source, [
      ...matching, matching[0],
      { artwork_id: 6, student_id: 20, genre: "Portrait", mediums_used: "Acrylic" },
      { artwork_id: 7, student_id: 20, genre: "Abstract", is_sold_out: 1 },
    ]);
    assert.deepEqual(artist, {
      student_id: 20, name: "Jane's Studio", artistName: "Jane Doe", department: "Fine Arts",
      profile_image: "https://example.test/jane.jpg", bio: "Oil painter",
      specialties: ["Oil", "Abstract"], works: 5, artworks: matching.slice(0, 3),
    });
  });

  it("excludes the source artwork, its seller, invalid IDs, and sold or exhausted stock", () => {
    const candidates = [
      { artwork_id: "1", student_id: 20 },
      { artwork_id: 2, student_id: "10" },
      { artwork_id: 3, student_id: null },
      { artwork_id: true, student_id: 20 },
      { artwork_id: 4, student_id: "2x" },
      { artwork_id: 5, student_id: 30, is_sold_out: "1" },
      { artwork_id: 6, student_id: 40, stock_available: "2", sold_quantity: 2 },
      { artwork_id: 7, student_id: 50, stock_available: 0 },
      { artwork_id: 8, student_id: 60, availability: "unavailable" },
      { artwork_id: 9, student_id: 70, is_sold: true },
      { artwork_id: 10, student_id: 80, stock_status: "sold_out" },
      { artwork_id: 11, student_id: 90, stock_available: 3, sold_quantity: 1, status: "verified" },
    ].map((candidate) => ({ genre: "Abstract", ...candidate }));
    assert.deepEqual(
      getArtworkRelatedArtists(source, candidates).map((artist) => artist.student_id),
      [90],
    );
  });

  it("does not treat seller registration status as artwork availability", () => {
    const results = getArtworkRelatedArtists(source, [
      { artwork_id: 2, student_id: 20, genre: "Abstract", status: "sold" },
    ]);
    assert.equal(results.length, 1);
  });

  it("never recommends artists because their absent metadata matches", () => {
    const candidates = [
      { artwork_id: 2, student_id: 20, genre: "Unknown", mediums_used: "None" },
      { artwork_id: 3, student_id: 30, genre: null, mediums_used: "N/A" },
      { artwork_id: 4, student_id: 40, genre: "[broken json", mediums_used: { oil: true } },
    ];
    assert.deepEqual(getArtworkRelatedArtists(source, candidates), []);
    assert.deepEqual(getArtworkRelatedArtists({
      ...source, genre: "unknown", mediums_used: "no mediums detected",
    }, candidates), []);
  });

  it("limits unique artists, uses deterministic ties, and provides safe card defaults", () => {
    const candidates = Array.from({ length: 8 }, (_, index) => ({
      artwork_id: index + 2, student_id: index + 20, genre: "Abstract", artist: `Artist ${index}`,
    }));
    const results = getArtworkRelatedArtists(source, [...candidates].reverse());
    assert.deepEqual(results.map((artist) => artist.student_id), [20, 21, 22, 23, 24, 25]);
    assert.deepEqual(
      getArtworkRelatedArtists(source, candidates, 2).map((artist) => artist.student_id),
      [20, 21],
    );
    assert.equal(results[0].name, "Artist 0");
    assert.equal(results[0].department, "Independent Artist");
    assert.equal(results[0].profile_image, "");
    assert.equal(results[0].bio, "");
    assert.deepEqual(results[0].specialties, ["Abstract"]);
  });

  it("safely rejects invalid sources, candidate lists, and limits", () => {
    const candidates = [{ artwork_id: 2, student_id: 20, genre: "Abstract" }];
    for (const invalid of [null, {}, { ...source, student_id: 0 }, { ...source, artwork_id: "bad" }]) {
      assert.deepEqual(getArtworkRelatedArtists(invalid, candidates), []);
    }
    assert.deepEqual(getArtworkRelatedArtists(source, null), []);
    assert.deepEqual(getArtworkRelatedArtists(source, [null, true, "oil"]), []);
    for (const limit of [0, -1, 1.5, Infinity, "2"]) {
      assert.deepEqual(getArtworkRelatedArtists(source, candidates, limit), []);
    }
  });
});
