export const requiredSellerProfileFields = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "birthdate", label: "Birthdate" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "phone_number", label: "Phone Number" },
  { key: "year_level", label: "Year Level" },
  { key: "student_number", label: "Student Number" },
  { key: "course", label: "Course" },
];

export const getMissingSellerProfileFields = (profile = {}) =>
  requiredSellerProfileFields
    .filter(({ key }) => !String(profile[key] || "").trim())
    .map(({ label }) => label);
