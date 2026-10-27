const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export const formatEUR = (v: number) => eur.format(v);
export const formatHours = (v: number) => `${num.format(v)} h`;
export const formatNum = (v: number) => num.format(v);
export const formatPct = (v: number) => `${Math.round(v * 100)} %`;

export const LEAVE_TYPES: Record<string, string> = {
  VACATION: "Urlaub",
  SICK: "Krankheit",
  OTHER: "Sonstige Abwesenheit",
};

export const LEAVE_STATUS: Record<string, string> = {
  PENDING: "Offen",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

export const PROJECT_CATEGORIES = ["Renovierung", "Verwaltung", "Akquise", "Vermietung", "Intern"];
