const definitions = [
  { name: "BS Architecture", color: "#ef2028" },
  { name: "BFA Painting", color: "#f6a400" },
  { name: "BFA Advertising Arts", color: "#6366e8" },
  { name: "BS Interior Design", color: "#10b981" },
  { name: "BFA Industrial Design", color: "#12a9c5" },
];
const normalize = value => String(value || "").toLowerCase()
  .replace(/bachelor of science(?: in)?\b/g, "bs")
  .replace(/bachelor of fine arts(?: major in| in)?\b/g, "bfa")
  .replace(/\bmajor in\b/g, "").replace(/\./g, "").replace(/\s+/g, " ").trim();

export function buildProgramDistribution(students, artworks) {
  const programs = definitions.map(program => ({ ...program, students: 0, artworks: 0 }));
  const other = { name: "Other / Unspecified", color: "#64748b", students: 0, artworks: 0 };
  for (const [records, field, id] of [[students, "students", "student_id"], [artworks, "artworks", "artwork_id"]]) {
    const seen = new Set();
    for (const record of records) {
      if (record[id] != null && seen.has(String(record[id]))) continue;
      if (record[id] != null) seen.add(String(record[id]));
      const course = normalize(record.course || record.program);
      const program = programs.find(item => normalize(item.name) === course) || other;
      program[field]++;
    }
  }
  return other.students || other.artworks ? [...programs, other] : programs;
}
