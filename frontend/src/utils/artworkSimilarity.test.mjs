import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSimilarArtworks } from "./artworkSimilarity.js";

describe("getSimilarArtworks", () => {
  it("ranks artworks by shared traits and excludes the inspected artwork", () => {
    const artwork = {
      artwork_id: 1,
      student_id: 10,
      genre: "abstract",
      art_type: "painting",
      mediums_used: ["acrylic", "canvas"],
      color_used: ["#aabbcc"],
    };
    const candidates = [
      { artwork_id: 2, genre: "abstract" },
      {
        artwork_id: 3,
        student_id: 10,
        genre: "abstract",
        art_type: "painting",
        mediums_used: ["canvas", "acrylic"],
        color_used: ["#aabbcc"],
      },
      { artwork_id: 1, genre: "abstract", art_type: "painting" },
      { artwork_id: 4, genre: "landscape" },
    ];

    assert.deepEqual(
      getSimilarArtworks(artwork, candidates).map((item) => item.artwork_id),
      [3, 2],
    );
  });

  it("returns no results when there are no shared traits", () => {
    assert.deepEqual(
      getSimilarArtworks(
        { artwork_id: 1, genre: "abstract" },
        [{ artwork_id: 2, genre: "landscape" }],
      ),
      [],
    );
  });
});
