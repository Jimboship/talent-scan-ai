import type { ResumeRow } from "@/types/supabase";

const SKILL_KEYWORDS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Java",
  "Go",
  "Rust",
  "SQL",
  "PostgreSQL",
  "Postgres",
  "MongoDB",
  "Redis",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "REST",
  "Tailwind",
  "CSS",
  "HTML",
  "Fintech",
  "Payments",
  "Machine Learning",
  "AI",
  "PyTorch",
  "TensorFlow",
  "Figma",
  "Product Design",
  "Design Systems",
  "React Native",
  "Swift",
  "Kotlin",
  "C#",
  ".NET",
  "PHP",
  "Ruby",
  "Rails",
  "Django",
  "Flask",
  "Spring",
  "Kafka",
  "Spark",
  "Tableau",
  "Excel",
  "Salesforce",
  "SAP"
];

const HEADING =
  /^(skills|technical skills|core skills|experience|work experience|professional experience|employment|education|summary|profile|objective|projects|certifications)\b/i;

export type CandidateProfile = {
  name: string;
  skills: string[];
  experience: string;
};

export function filenameToName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCandidateProfile(text: string, fileName: string): CandidateProfile {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    name: extractName(lines, fileName),
    skills: extractSkills(text, lines),
    experience: extractExperience(text)
  };
}

export function resumeToCandidate(row: Pick<ResumeRow, "id" | "file_name" | "extracted_text" | "created_at">) {
  const profile = extractCandidateProfile(row.extracted_text ?? "", row.file_name);

  return {
    id: row.id,
    name: profile.name,
    skills: profile.skills,
    experience: profile.experience,
    uploadedAt: new Date(row.created_at).toISOString().slice(0, 10)
  };
}

function extractName(lines: string[], fileName: string) {
  for (const line of lines.slice(0, 12)) {
    if (HEADING.test(line) || line.includes("@") || line.startsWith("http") || line.length > 60) {
      continue;
    }

    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line)) {
      return line;
    }

    if (/^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$/.test(line) && line.split(" ").length <= 4) {
      return line;
    }
  }

  return filenameToName(fileName) || "Unknown candidate";
}

function extractSkills(text: string, lines: string[]) {
  const fromSection = skillsFromSection(text);
  if (fromSection.length > 0) {
    return fromSection.slice(0, 8);
  }

  const fromKeywords = SKILL_KEYWORDS.filter((skill) => {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return pattern.test(text);
  });

  if (fromKeywords.length > 0) {
    return fromKeywords.slice(0, 8);
  }

  return lines
    .slice(0, 6)
    .map((line) => line.split(/[,•|/]/)[0]?.trim())
    .filter((value): value is string => Boolean(value) && value.length < 24)
    .slice(0, 3);
}

function skillsFromSection(text: string) {
  const match = text.match(
    /(?:^|\n)\s*(?:technical\s+)?skills\s*[:\n]\s*([\s\S]{0,500}?)(?=\n\s*[A-Z][A-Za-z ]{2,30}\s*:?\s*\n|$)/i
  );

  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/[,•|\n]/)
    .map((item) => item.replace(/^[-–]\s*/, "").trim())
    .filter((item) => item.length > 1 && item.length < 32)
    .slice(0, 8);
}

function extractExperience(text: string) {
  const yearsMatch = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs)(?:\s+of\s+experience)?/i);
  if (yearsMatch) {
    return `${yearsMatch[1]} years`;
  }

  const ranges = [...text.matchAll(/\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}|present|current\b/gi)];
  if (ranges.length > 0) {
    const years = ranges
      .map((match) => {
        const start = Number(match[0].match(/(19|20)\d{2}/)?.[0]);
        const endMatch = match[0].match(/(present|current|(?:19|20)\d{2})/i)?.[1];
        const end = /present|current/i.test(endMatch ?? "") ? new Date().getFullYear() : Number(endMatch);
        if (!start || !end) {
          return 0;
        }
        return Math.max(end - start, 0);
      })
      .filter((value) => value > 0);

    if (years.length > 0) {
      const total = Math.min(Math.max(...years), 40);
      return `${total}+ years`;
    }
  }

  return "Not specified";
}
