import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, PackageSearch, Trash2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DBClaim } from "@/types/database";

export type ResolutionKind = "removed" | "returned" | "claimed" | "not_found";

interface ItemResolutionNoticeProps {
  kind: ResolutionKind;
  itemId?: string;
  itemTitle?: string;
  itemCategory?: string;
  itemLocation?: string;
  claim?: Partial<DBClaim> | null;
  onClearClaim?: (claimId: string) => void;
}

export function ItemResolutionNotice({
  kind,
  itemId,
  itemTitle,
  itemCategory,
  itemLocation,
  claim,
  onClearClaim,
}: ItemResolutionNoticeProps) {
  const displayTitle = itemTitle || "Campus Listing";

  const config = {
    removed: {
      icon: <Trash2 className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-6 mx-auto" strokeWidth={1} />,
      heading: "Listing Concluded",
      description:
        "The author has removed this post from the campus board. It is no longer open for active public interaction.",
    },
    returned: {
      icon: <CheckCircle2 className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-6 mx-auto" strokeWidth={1} />,
      heading: "Item Returned",
      description:
        "Verification was successfully completed and the item has been returned to its owner on campus.",
    },
    claimed: {
      icon: <Clock className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-6 mx-auto" strokeWidth={1} />,
      heading: "Claim Accepted",
      description:
        "The finder and verified claimant are currently coordinating the campus exchange. Public claims are temporarily closed.",
    },
    not_found: {
      icon: <PackageSearch className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-6 mx-auto" strokeWidth={1} />,
      heading: "Listing Unavailable",
      description:
        "We couldn't find this listing. The item link may be outdated, or the post was removed by the owner.",
    },
  }[kind];

  return (
    <div className="container max-w-2xl py-12 md:py-24 animate-fade-in flex flex-col items-center">
      {/* Top back navigation */}
      <div className="w-full flex justify-start mb-12">
        <Link
          to="/items"
          className="inline-flex items-center gap-1.5 text-[15px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Board</span>
        </Link>
      </div>

      <div className="flex flex-col items-center text-center max-w-md w-full">
        {config.icon}
        
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
          {config.heading}
        </h1>
        
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-10">
          {config.description}
        </p>

        {/* Details Section */}
        {((itemTitle || itemCategory || itemLocation) || claim) && (
          <div className="w-full text-left flex flex-col gap-0 border-y border-neutral-200 dark:border-neutral-800 mb-10">
            {/* Referenced Listing Row */}
            {(itemTitle || itemCategory || itemLocation) && (
              <div className="py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                <div className="flex justify-between items-baseline gap-4 mb-1">
                  <h3 className="text-[14px] font-medium text-foreground">Referenced Listing</h3>
                  <span className="text-[14px] text-muted-foreground truncate max-w-[50%] text-right">{displayTitle}</span>
                </div>
                {(itemCategory || itemLocation) && (
                  <p className="text-[14px] text-neutral-500 capitalize">
                    {[itemCategory, itemLocation].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            )}

            {/* Claim Record Row */}
            {claim && (
              <div className="py-4 last:border-0">
                <div className="flex justify-between items-baseline gap-4 mb-1">
                  <h3 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-neutral-400" />
                    Claim Record
                  </h3>
                  <span className="text-[14px] text-neutral-500 capitalize font-medium">
                    {claim.status === "approved"
                      ? "Accepted"
                      : claim.status === "pending"
                        ? "Pending"
                        : claim.status === "rejected"
                          ? "Declined"
                          : "Withdrawn"}
                  </span>
                </div>

                {claim.message && (
                  <p className="text-[14px] text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2 italic">
                    "{claim.message}"
                  </p>
                )}

                {claim.meeting_details && (
                  <p className="text-[14px] text-foreground mt-3">
                    <span className="text-neutral-500">Handover:</span> {claim.meeting_details}
                  </p>
                )}

                {onClearClaim && claim.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-start">
                    <button
                      type="button"
                      onClick={() => onClearClaim(claim.id!)}
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear from history</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row w-full gap-3 justify-center">
          <Button
            asChild
            className="h-12 rounded-xl px-6 text-[15px] font-medium w-full sm:w-auto min-w-[140px]"
          >
            <Link to="/items">Browse Board</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-12 rounded-xl px-6 text-[15px] font-medium w-full sm:w-auto min-w-[140px] bg-neutral-100 dark:bg-neutral-800 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <Link to="/dashboard?tab=my-claims">My Claims</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
