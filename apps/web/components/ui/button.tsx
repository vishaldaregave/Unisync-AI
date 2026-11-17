import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-ink/90",
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        outline: "border border-line-strong bg-white text-ink hover:bg-surface-soft",
        ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
        subtle: "bg-surface-sunken text-ink hover:bg-line",
        danger: "bg-rose-600 text-white hover:bg-rose-500",
        success: "bg-brand-500 text-white hover:bg-brand-600",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
