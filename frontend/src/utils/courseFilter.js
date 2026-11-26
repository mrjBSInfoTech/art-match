const normalizeCourse = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\bb\.\s*s\.?(?=\s|$)/g, "bs")
    .replace(/\bb\.\s*f\.\s*a\.?(?=\s|$)/g, "bfa")
    .replace(/[.,\-_/()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/bachelor of science(?:\s+(?:major\s+in|in))?/g, "bs")
    .replace(/bachelor of fine arts(?:\s+(?:major\s+in|in))?/g, "bfa")
    .replace(/\bmajor\s+in\b/g, "")
    .replace(/^(bs|bfa)\s+in\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const courseAliases = {
  "bfa advertising arts": "bfa visual communication",
  "bfa viscom": "bfa visual communication",
  "bfa visual comm": "bfa visual communication",
  "bfa visual communications": "bfa visual communication",
  "bfa vc": "bfa visual communication",
  bfavc: "bfa visual communication",
  bfav: "bfa visual communication",
  "bfa ptg": "bfa painting",
  bfap: "bfa painting",
  bsarchi: "bs architecture",
  "bs archi": "bs architecture",
  "bs arch": "bs architecture",
  bsa: "bs architecture",
  bsid: "bs interior design",
  "bs id": "bs interior design",
  "bs interior designing": "bs interior design",
  "bs interior designs": "bs interior design",
};

const canonicalizeCourse = (value) => {
  const normalized = normalizeCourse(value);
  return courseAliases[normalized] || normalized;
};

const courseLabels = {
  "bs architecture": "BS Architecture",
  "bfa painting": "BFA Painting",
  "bfa visual communication": "BFA Visual Communication",
  "bs interior design": "BS Interior Design",
};

const canonicalFullCourseNames = {
  "bs architecture": "Bachelor of Science in Architecture",
  "bfa painting": "Bachelor of Fine Arts, Major in Painting",
  "bfa visual communication":
    "Bachelor of Fine Arts, Major in Visual Communication",
  "bs interior design": "Bachelor of Science in Interior Design",
};

export function matchesCourse(artworkCourse, requestedCourse) {
  const requested = canonicalizeCourse(requestedCourse);
  return (
    !requested ||
    canonicalizeCourse(artworkCourse) === requested
  );
}

export function getCourseLabel(course) {
  const normalized = canonicalizeCourse(course);
  return courseLabels[normalized] || String(course || "").trim();
}

export function getCanonicalCourseName(course) {
  const trimmed = String(course || "").trim();
  if (!trimmed) return "";
  const normalized = canonicalizeCourse(trimmed);
  return canonicalFullCourseNames[normalized] || trimmed;
}
