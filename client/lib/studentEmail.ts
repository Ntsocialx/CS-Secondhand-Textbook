const VERIFIED_STUDENT_DOMAINS = ["student.tut.ac.za", "tut.ac.za", "tut4life.ac.za", "student.campus.edu"];

export function isVerifiedStudentEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const separator = normalizedEmail.lastIndexOf("@");
  if (separator < 1) return false;
  const domain = normalizedEmail.slice(separator + 1);
  return VERIFIED_STUDENT_DOMAINS.includes(domain);
}

export const verifiedStudentDomainHint = VERIFIED_STUDENT_DOMAINS.map((domain) => `@${domain}`).join(", ");
