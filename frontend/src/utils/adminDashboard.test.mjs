import test from "node:test";
import assert from "node:assert/strict";
import { buildProgramDistribution } from "./adminDashboard.js";

test("program chart uses full saved course names, deduplicates records, and never supplies sample counts", () => {
  const students = [
    { student_id: 1, course: "Bachelor of Fine Arts in Painting" },
    { student_id: "1", course: "BFA Painting" },
    { student_id: 2, course: "Bachelor of Science in Architecture" },
    { student_id: 3, course: "Bachelor of Science in Fine Arts" },
  ];
  const artworks = [{ artwork_id: 8, course: "BFA Painting" }, { artwork_id: 8, course: "BFA Painting" }];
  const programs = buildProgramDistribution(students, artworks);
  assert.equal(programs.find(item => item.name === "BFA Painting").students, 1);
  assert.equal(programs.find(item => item.name === "BFA Painting").artworks, 1);
  assert.equal(programs.find(item => item.name === "BS Architecture").students, 1);
  assert.equal(programs.find(item => item.name === "Other / Unspecified").students, 1);
  assert.equal(programs.find(item => item.name === "BFA Advertising Arts").students, 0);
  assert.equal(programs.reduce((sum, item) => sum + item.students, 0), 3);
  assert.ok(buildProgramDistribution([], []).every(item => item.students === 0 && item.artworks === 0));
});
