export const CATEGORIES = [
  { value: "electronics", label: "Electronics", icon: "Laptop" },
  { value: "clothing", label: "Clothing", icon: "Shirt" },
  { value: "documents", label: "ID / Documents", icon: "FileText" },
  { value: "keys", label: "Keys", icon: "Key" },
  { value: "wallet", label: "Wallet / Bag", icon: "Wallet" },
  { value: "jewelry", label: "Jewelry", icon: "Gem" },
  { value: "books", label: "Books / Notes", icon: "BookOpen" },
  { value: "other", label: "Other", icon: "Package" },
] as const;

export const LOCATIONS = [
  "Main Building",
  "Library",
  "Canteen",
  "Quadrangle",
  "Seminar Hall",
  "Auditorium",
  "Computer Centre",
  "Lab Block",
  "Workshop",
  "Admin Office",
  "First Year Building",
  "Grounds",
  "Parking Lot",
  "Other",
] as const;

export const STATUS_STYLES: Record<
  string,
  { border: string; bg: string; text: string; label: string }
> = {
  lost: {
    border: "border-red-500/35 dark:border-red-400/40",
    bg: "bg-red-500/[0.08] dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    label: "Lost",
  },
  found: {
    border: "border-emerald-500/35 dark:border-emerald-400/40",
    bg: "bg-emerald-500/[0.08] dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Found",
  },
  claimed: {
    border: "border-amber-500/35 dark:border-amber-400/40",
    bg: "bg-amber-500/[0.08] dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300",
    label: "Claimed",
  },
  returned: {
    border: "border-blue-500/35 dark:border-blue-400/40",
    bg: "bg-blue-500/[0.08] dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    label: "Returned",
  },
};

export const CATEGORY_STYLES: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  electronics: {
    border: "border-sky-500/35 dark:border-sky-400/40",
    bg: "bg-sky-500/[0.08] dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
  },
  clothing: {
    border: "border-amber-500/35 dark:border-amber-400/40",
    bg: "bg-amber-500/[0.08] dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300",
  },
  documents: {
    border: "border-emerald-500/35 dark:border-emerald-400/40",
    bg: "bg-emerald-500/[0.08] dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  keys: {
    border: "border-purple-500/35 dark:border-purple-400/40",
    bg: "bg-purple-500/[0.08] dark:bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-300",
  },
  wallet: {
    border: "border-rose-500/35 dark:border-rose-400/40",
    bg: "bg-rose-500/[0.08] dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
  },
  jewelry: {
    border: "border-pink-500/35 dark:border-pink-400/40",
    bg: "bg-pink-500/[0.08] dark:bg-pink-500/15",
    text: "text-pink-700 dark:text-pink-300",
  },
  books: {
    border: "border-indigo-500/35 dark:border-indigo-400/40",
    bg: "bg-indigo-500/[0.08] dark:bg-indigo-500/15",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  other: {
    border: "border-teal-500/35 dark:border-teal-400/40",
    bg: "bg-teal-500/[0.08] dark:bg-teal-500/15",
    text: "text-teal-700 dark:text-teal-300",
  },
};

