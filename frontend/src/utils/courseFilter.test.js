import assert from "node:assert/strict";
import test from "node:test";
import {
  getCanonicalCourseName,
  getCourseLabel,
  matchesCourse,
} from "./courseFilter.js";

test("matches current course labels and full student course names", () => {
  const courses = [
    ["BS Architecture", "Bachelor of Science in Architecture"],
    ["BS in Architecture", "Bachelor of Science in Architecture"],
    ["BFA Painting", "Bachelor of Fine Arts, Major in Painting"],
    ["Bachelor of Fine Arts in Painting", "Bachelor of Fine Arts, Major in Painting"],
    [
      "BFA Visual Communication",
      "Bachelor of Fine Arts, Major in Visual Communication",
    ],
    [
      "Bachelor of Fine Arts in Visual Communication",
      "Bachelor of Fine Arts, Major in Visual Communication",
    ],
    ["BFAVC", "Bachelor of Fine Arts, Major in Visual Communication"],
    ["BS Interior Design", "Bachelor of Science in Interior Design"],
    ["BS in Interior Design", "Bachelor of Science in Interior Design"],
    ["BSID", "Bachelor of Science in Interior Design"],
  ];

  for (const [requested, sellerCourse] of courses) {
    assert.equal(matchesCourse(sellerCourse, requested), true);
    assert.equal(matchesCourse(requested, sellerCourse), true);
  }
});

test("includes legacy Advertising Arts sellers with Visual Communication", () => {
  assert.equal(
    matchesCourse(
      "Bachelor of Fine Arts in Advertising Arts",
      "BFA Visual Communication",
    ),
    true,
  );
});

test("keeps other courses out and allows an empty course filter", () => {
  assert.equal(matchesCourse("BFA Painting", "BS Architecture"), false);
  assert.equal(matchesCourse("BFA Painting", ""), true);
});

test("formats the canonical course label for shop results", () => {
  assert.equal(
    getCourseLabel("Bachelor of Fine Arts, Major in Visual Communication"),
    "BFA Visual Communication",
  );
});

test("normalizes bulk-import and shorthand course names to full canonical names", () => {
  assert.equal(
    getCanonicalCourseName("BFA Visual Communication"),
    "Bachelor of Fine Arts, Major in Visual Communication",
  );
  assert.equal(
    getCanonicalCourseName("Bachelor of Fine Arts in Visual Communication"),
    "Bachelor of Fine Arts, Major in Visual Communication",
  );
  assert.equal(
    getCanonicalCourseName("BFA Painting"),
    "Bachelor of Fine Arts, Major in Painting",
  );
  assert.equal(
    getCanonicalCourseName("Bachelor of Fine Arts in Painting"),
    "Bachelor of Fine Arts, Major in Painting",
  );
  assert.equal(
    getCanonicalCourseName("BS Interior Design"),
    "Bachelor of Science in Interior Design",
  );
  assert.equal(
    getCanonicalCourseName("B.S. in Interior Design"),
    "Bachelor of Science in Interior Design",
  );
  assert.equal(
    getCanonicalCourseName("BSArchi"),
    "Bachelor of Science in Architecture",
  );
  assert.equal(
    getCanonicalCourseName("BS Industrial Design"),
    "BS Industrial Design",
  );
});
