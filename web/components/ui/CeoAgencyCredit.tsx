import { cn } from "@/lib/utils";
import {
  CEO_AGENCY_NAME,
  CEO_AGENCY_TITLE,
  CEO_AGENCY_URL,
} from "@/lib/ceoAgency";

type CeoAgencyCreditProps = {
  variant?: "header" | "footer" | "inline";
  className?: string;
};

/**
 * Attribution link to CEO.AGENCY with plain-HTML fallback (visible anchor text).
 */
export function CeoAgencyCredit({ variant = "inline", className }: CeoAgencyCreditProps) {
  return (
    <p
      className={cn(
        "text-muted",
        variant === "header" && "text-[10px] sm:text-xs leading-tight",
        variant === "footer" && "text-xs",
        variant === "inline" && "text-xs",
        className
      )}
    >
      A product by{" "}
      <a
        href={CEO_AGENCY_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={CEO_AGENCY_TITLE}
        aria-label={`${CEO_AGENCY_NAME} — AI agency for growing businesses`}
        className="font-semibold text-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
      >
        {CEO_AGENCY_NAME}
      </a>
    </p>
  );
}
