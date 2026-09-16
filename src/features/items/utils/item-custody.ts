export type HeldWhere = "with_me" | "at_desk";

export function holderPhrase(isOwner?: boolean, holderName?: string | null) {
  if (isOwner) return "With you";
  const name = holderName?.trim();
  if (name && name.toLowerCase() !== "anonymous") return `With ${name}`;
  return "With the finder";
}

export function custodyLabel(
  heldWhere?: string | null,
  heldAt?: string | null,
  opts?: { isOwner?: boolean; holderName?: string | null },
) {
  if (heldWhere === "at_desk" && heldAt) {
    return `At the ${heldAt} desk`;
  }
  if (heldWhere === "with_me") {
    return holderPhrase(opts?.isOwner, opts?.holderName);
  }
  return null;
}

export function itemSituation(input: {
  status: string;
  location?: string | null;
  held_where?: string | null;
  held_at?: string | null;
  isOwner?: boolean;
  holderName?: string | null;
}) {
  const isFoundOrCustody = input.status === "found" || Boolean(input.held_where);
  const statusWord =
    input.status === "lost"
      ? "Lost"
      : input.status === "found"
        ? "Found"
        : input.status === "claimed"
          ? "Claimed"
          : input.status === "returned"
            ? (isFoundOrCustody ? "Returned" : "Resolved")
            : input.status;

  // Custody info only makes sense for found items
  if (input.status === "found" && input.held_where === "at_desk" && input.held_at) {
    return `Found · Held at ${input.held_at}`;
  }

  if (input.status === "found" && input.held_where === "with_me") {
    return `Found · ${holderPhrase(input.isOwner, input.holderName)}`;
  }

  return input.location ? `${statusWord} · ${input.location}` : statusWord;
}
