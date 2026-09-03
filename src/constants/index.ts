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

export const STATUS_COLORS = {
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  found: { bg: "bg-success/10", text: "text-success", label: "Found" },
  claimed: { bg: "bg-warning/12", text: "text-warning", label: "Claimed" },
  returned: { bg: "bg-primary/10", text: "text-primary", label: "Returned" },
} as const;

export type ItemCategory = typeof CATEGORIES[number]["value"];
export type ItemStatus = "lost" | "found" | "claimed" | "returned";
