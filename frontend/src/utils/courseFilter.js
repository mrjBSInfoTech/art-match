const normalizeCourse = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/bachelor of science(?:\s+in)?/g, "bs")
    .replace(
      /bachelor of fine arts(?:\s*,?\s*(?:major\s+in|in))?/g,
      "bfa",
    )
    .replace(/\bmajor\s+in\b/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const courseAliases = {
  "bfa advertising arts": "bfa visual communication",
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
