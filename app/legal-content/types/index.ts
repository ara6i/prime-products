export type PolicyTone = "legal" | "support" | "pricing";

export type PolicySubsection = {
  title: string;
  body?: string[];
  items?: string[];
};

export type PolicySection = {
  title: string;
  body?: string[];
  items?: string[];
  subsections?: PolicySubsection[];
};

export type PolicyPageContent = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  lastUpdated?: string;
  effectiveDate?: string;
  location?: string;
  tone: PolicyTone;
  intro: string[];
  quickNotes: string[];
  sections: PolicySection[];
  contactTitle: string;
  contactBody: string;
  contactEmail?: string;
  contactPhone?: string;
};
