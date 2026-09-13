export type ExperienceFilter = "any" | "1+" | "2+" | "3+" | "5+";

export type DateFilter = "all" | "today" | "7d" | "30d";

export type CandidateSort =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "experience-desc"
  | "experience-asc";

export type FilterableCandidate = {
  name: string;
  skills: string[];
  experience: string;
  createdAt?: string;
};

export const EXPERIENCE_OPTIONS: { value: ExperienceFilter; label: string }[] = [
  { value: "any", label: "Any experience" },
  { value: "1+", label: "1+ years" },
  { value: "2+", label: "2+ years" },
  { value: "3+", label: "3+ years" },
  { value: "5+", label: "5+ years" }
];

export const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" }
];

export const SORT_OPTIONS: { value: CandidateSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "experience-desc", label: "Most experience" },
  { value: "experience-asc", label: "Least experience" }
];

/** Parse "5 years" / "4+ years" into a number; null when unknown ("Not specified", role lines). */
export function parseExperienceYears(experience: string): number | null {
  const match = experience.match(/(\d{1,2})\s*\+?\s*years?/i);
  if (!match?.[1]) {
    return null;
  }

  const years = Number(match[1]);
  if (!Number.isFinite(years) || years < 0 || years > 60) {
    return null;
  }

  return years;
}

export function getAvailableSkills<T extends FilterableCandidate>(candidates: T[], limit = 30): string[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const candidate of candidates) {
    for (const skill of candidate.skills) {
      const key = skill.toLowerCase();
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(key, { label: skill, count: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((entry) => entry.label);
}

export function filterCandidates<T extends FilterableCandidate>(
  candidates: T[],
  filters: { skill: string; experience: ExperienceFilter; date: DateFilter }
): T[] {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return candidates.filter((candidate) => {
    if (filters.skill !== "all") {
      const wanted = filters.skill.toLowerCase();
      if (!candidate.skills.some((skill) => skill.toLowerCase() === wanted)) {
        return false;
      }
    }

    if (filters.experience !== "any") {
      const required = Number(filters.experience.replace("+", ""));
      const years = parseExperienceYears(candidate.experience);
      if (years === null || years < required) {
        return false;
      }
    }

    if (filters.date !== "all") {
      if (!candidate.createdAt) {
        return false;
      }
      const uploaded = new Date(candidate.createdAt).getTime();
      if (Number.isNaN(uploaded)) {
        return false;
      }
      if (filters.date === "today" && uploaded < startOfToday.getTime()) {
        return false;
      }
      if (filters.date === "7d" && uploaded < now - 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (filters.date === "30d" && uploaded < now - 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
    }

    return true;
  });
}

export function sortCandidates<T extends FilterableCandidate>(candidates: T[], sort: CandidateSort): T[] {
  const ranked = (experience: string) => {
    const years = parseExperienceYears(experience);
    return years === null ? -1 : years;
  };

  return [...candidates].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return timeOf(a) - timeOf(b);
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "experience-desc":
        return ranked(b.experience) - ranked(a.experience) || a.name.localeCompare(b.name);
      case "experience-asc":
        return ranked(a.experience) - ranked(b.experience) || a.name.localeCompare(b.name);
      case "newest":
      default:
        return timeOf(b) - timeOf(a);
    }
  });
}

function timeOf(candidate: FilterableCandidate) {
  if (!candidate.createdAt) {
    return 0;
  }
  const time = new Date(candidate.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}
