import type { ResumeRow } from "@/types/supabase";

const SKILL_KEYWORDS = [
  "React",
  "React Native",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Java",
  "Spring",
  "Spring Boot",
  "Kotlin",
  "Swift",
  "Go",
  "Rust",
  "C",
  "C++",
  "C#",
  ".NET",
  "PHP",
  "Ruby",
  "Rails",
  "Laravel",
  "SQL",
  "PostgreSQL",
  "Postgres",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "GraphQL",
  "REST",
  "REST API",
  "gRPC",
  "Kafka",
  "RabbitMQ",
  "Spark",
  "Airflow",
  "dbt",
  "Tableau",
  "Power BI",
  "Excel",
  "Pandas",
  "NumPy",
  "Machine Learning",
  "Deep Learning",
  "AI",
  "LLM",
  "NLP",
  "Computer Vision",
  "PyTorch",
  "TensorFlow",
  "Scikit-learn",
  "AWS",
  "GCP",
  "Google Cloud",
  "Azure",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "Git",
  "Linux",
  "Nginx",
  "Tailwind",
  "Tailwind CSS",
  "CSS",
  "HTML",
  "Sass",
  "Redux",
  "Vue",
  "Angular",
  "Svelte",
  "Figma",
  "Product Design",
  "Design Systems",
  "Fintech",
  "Payments",
  "Stripe",
  "Salesforce",
  "SAP",
  "HubSpot",
  "Jira",
  "Agile",
  "Scrum",
  "SEO",
  "Photoshop",
  "Illustrator"
];

const HEADING =
  /^(skills|technical skills|core skills|key skills|competencies|tech stack|technologies|tools|experience|work experience|professional experience|employment|employment history|work history|education|academic background|summary|professional summary|profile|objective|career objective|projects|selected projects|certifications|certificates|licenses|awards|publications|references|contact|contact information|personal information|phone|email|address|location|linkedin|github|portfolio|website|curriculum vitae|resume|cv)\b/i;

const JOB_TITLE_HINT =
  /\b(engineer|developer|designer|manager|director|analyst|consultant|architect|administrator|specialist|lead|intern|associate|executive|officer|founder|co-founder|president|vice president|vp|head of|student|graduate|assistant|coordinator|representative|technician|scientist)\b/i;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(\+\d[\d\s().-]{6,}\d|\b\d{3}[\s().-]?\d{3}[\s().-]?\d{4}\b|\b\d{7,}\b)/;
const URL_PATTERN = /(https?:\/\/|www\.|linkedin\.com|github\.com)/i;

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
    skills: extractSkills(text),
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
    fileName: row.file_name,
    extractedText: row.extracted_text ?? "",
    createdAt: row.created_at,
    uploadedAt: new Date(row.created_at).toISOString().slice(0, 10)
  };
}

function extractName(lines: string[], fileName: string) {
  for (const line of lines.slice(0, 12)) {
    const cleaned = stripNameNoise(line);

    if (!cleaned || cleaned.length > 60 || cleaned.length < 3) {
      continue;
    }

    if (HEADING.test(cleaned) || JOB_TITLE_HINT.test(cleaned)) {
      continue;
    }

    if (EMAIL_PATTERN.test(cleaned) || PHONE_PATTERN.test(cleaned) || URL_PATTERN.test(cleaned)) {
      continue;
    }

    if (/\d/.test(cleaned) || /[|/\\:;()[\]{}]/.test(cleaned)) {
      continue;
    }

    const words = cleaned.split(/\s+/);
    if (words.length < 2 || words.length > 4) {
      continue;
    }

    if (!words.every((word) => /^[A-Z][a-z'-]*\.?$/.test(word) || /^[A-Z]\.$/.test(word))) {
      continue;
    }

    if (words.filter((word) => word.replace(/\./g, "").length === 1).length > 1) {
      continue;
    }

    return words.join(" ");
  }

  return filenameToName(fileName) || "Unknown candidate";
}

function stripNameNoise(line: string) {
  return line
    .replace(EMAIL_PATTERN, " ")
    .replace(PHONE_PATTERN, " ")
    .replace(URL_PATTERN, " ")
    .replace(/[,•|/\\:;()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "")
    .trim();
}

function dedupeSkills(skills: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const skill of skills) {
    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(skill);
    }
  }

  return unique
    .filter((skill) => {
      for (const other of unique) {
        if (other !== skill && other.toLowerCase().includes(skill.toLowerCase())) {
          // Drop substrings such as "SQL" when "PostgreSQL" is present, or
          // "REST" when "REST API" is present, unless both are meaningful.
          if (!(skill.toLowerCase() === "sql" && other.toLowerCase() === "mysql")) {
            return false;
          }
        }
      }
      return true;
    })
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, 8)
    .sort((a, b) => a.localeCompare(b));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function skillRegex(skill: string) {
  if (skill === "C") {
    return /\bC\b(?!\+\+|#)/;
  }

  if (skill === "C++") {
    return /(?<![A-Za-z+#])C\+\+(?![A-Za-z+#])/;
  }

  if (skill === "C#") {
    return /(?<![A-Za-z+#])C#(?![A-Za-z+#])/;
  }

  if (skill === "Go") {
    // Avoid matching the common verb "go" unintentionally.
    return /\bGo\b(?=\s*(?:,|;|\||•|\n|$))/;
  }

  if (/^[A-Za-z0-9+#/. -]+$/.test(skill)) {
    return new RegExp(`(?<![A-Za-z0-9+#.])${escapeRegExp(skill)}(?![A-Za-z0-9+#])`, "i");
  }

  return new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i");
}

function extractSkills(text: string) {
  const normalizedText = text.replace(/\s+/g, " ");
  const fromKeywords = SKILL_KEYWORDS.filter((skill) => skillRegex(skill).test(normalizedText));

  if (fromKeywords.length > 0) {
    return dedupeSkills(fromKeywords);
  }

  const fromSection = skillsFromSection(text);
  if (fromSection.length > 0) {
    // Only accept section items that look like skills, not prose sentences.
    const cleaned = fromSection.filter((item) => item.length < 32 && !/\.\s/.test(item));
    if (cleaned.length > 0) {
      return dedupeSkills(cleaned);
    }
  }

  // No fabricated fallback: only real keyword hits are returned.
  return [];
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
  const normalized = text.replace(/\s+/g, " ");

  const yearsMatch = normalized.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs)(?:\s+of\s+experience)?/i);
  if (yearsMatch?.[1]) {
    const years = Number(yearsMatch[1]);
    if (Number.isFinite(years) && years <= 60) {
      return `${years}${normalized.slice(yearsMatch.index ?? 0, (yearsMatch.index ?? 0) + yearsMatch[0].length).includes("+") ? "+" : ""} years`;
    }
  }

  const rangeMatches = [...normalized.matchAll(/\b((?:19|20)\d{2})\s*[–—-]\s*((?:19|20)\d{2}|present|current)\b/gi)];
  if (rangeMatches.length > 0) {
    const currentYear = new Date().getFullYear();
    const durations = rangeMatches
      .map((match) => {
        const start = Number(match[1]);
        const endToken = (match[2] ?? "").toLowerCase();
        const end = /present|current/.test(endToken) ? currentYear : Number(match[2]);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
          return 0;
        }
        return end - start;
      })
      .filter((value) => value > 0 && value <= 60);

    if (durations.length > 0) {
      const total = Math.min(Math.max(...durations), 40);
      return `${total}+ years`;
    }
  }

  // Deterministic, non-invented summary: first role-like line from experience section.
  const roleLine = firstRoleLine(text);
  if (roleLine) {
    return roleLine.length > 80 ? `${roleLine.slice(0, 77)}…` : roleLine;
  }

  return "Not specified";
}

function firstRoleLine(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-–*]\s*/, "").trim())
    .filter(Boolean);

  const sectionStart = lines.findIndex((line) =>
    /^(work experience|professional experience|employment|employment history|work history|experience)\b/i.test(line)
  );

  const candidates = sectionStart >= 0 ? lines.slice(sectionStart + 1, sectionStart + 12) : lines.slice(0, 12);

  for (const line of candidates) {
    if (HEADING.test(line) || line.length < 4 || line.length > 80) {
      continue;
    }

    if (EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line) || URL_PATTERN.test(line)) {
      continue;
    }

    // Prefer lines that look like "Role at Company" or "Role, Company (2020-2023)".
    if (/\bat\b/i.test(line) || /[,|–—-]/.test(line) || /\b(19|20)\d{2}\b/.test(line) || JOB_TITLE_HINT.test(line)) {
      return line;
    }
  }

  return null;
}
