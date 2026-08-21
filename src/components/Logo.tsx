import logoAsset from "@/assets/ht-detail-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="HT Detail - estética automotiva em Castanhal, Pará"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}

export function LogoBadge({ size = 88, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-foreground p-3 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <Logo size={size} />
    </div>
  );
}
