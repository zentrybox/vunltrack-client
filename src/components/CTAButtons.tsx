"use client";

import CoalButton, { type CoalButtonProps } from "@/components/CoalButton";
import { Icon } from "@/components/icons";

export function AnalyzeCTA(props: Omit<CoalButtonProps, "children" | "variant" | "size" | "icon">) {
  return (
    <CoalButton
      variant="cta"
      size="xl"
      icon={<Icon name="radar" className="h-5 w-5" />}
      {...props}
    >
      Analyze
    </CoalButton>
  );
}

export function ExportCTA(props: Omit<CoalButtonProps, "children" | "variant" | "size" | "icon">) {
  return (
    <CoalButton
      variant="cta"
      size="xl"
      icon={<Icon name="export" className="h-5 w-5" />}
      {...props}
    >
      Export
    </CoalButton>
  );
}
