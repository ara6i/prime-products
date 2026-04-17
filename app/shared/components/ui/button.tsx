import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/app/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-blue text-white rounded-[52.083vw] hover:bg-brand-blue-dark disabled:bg-surface-disabled",
        icon: "bg-transparent rounded-full hover:bg-surface-light",
        nav: "flex-col rounded-[1.042vw] bg-transparent transition-colors data-[active=true]:bg-brand-blue-light",
        ghost:
          "bg-transparent rounded-[1.042vw] hover:bg-surface-light",
        link:
          "bg-transparent text-brand-blue rounded-[52.083vw] hover:bg-brand-blue-pale",
        outline:
          "bg-transparent border border-[#2154EF] text-[#2154EF] rounded-[52.083vw] hover:bg-brand-blue-pale",
        chip:
          "bg-[#D1D1D1] text-[#4F4F4F] rounded-[52.083vw] data-[active=true]:bg-[#5D5D5D] data-[active=true]:text-white",
        secondary:
          "bg-[#888888] text-white rounded-[52.083vw] hover:bg-[#777777]",
        "outline-dark":
          "bg-transparent border border-[#5D5D5D] text-[#5D5D5D] rounded-[52.083vw] hover:bg-[#F5F5F5]",
        "outline-neutral":
          "bg-transparent border border-[#6D6D6D] text-[#6D6D6D] rounded-[52.083vw] hover:bg-[#F5F5F5]",
        "fill-neutral":
          "bg-surface-segment text-text-primary rounded-[52.083vw] hover:bg-surface-disabled",
        tunal:
          "bg-brand-blue-light text-brand-blue-dark rounded-[52.083vw] hover:bg-brand-blue-light/80",
      },
      size: {
        default: "h-[2.604vw] px-[0.833vw] py-[0.625vw] gap-[0.313vw] text-[0.833vw] leading-[1.625]",
        sm: "h-[1.979vw] px-[0.625vw] py-[0.417vw] gap-[0.208vw] text-[0.729vw] leading-[1.57]",
        xs: "h-[1.875vw] px-[0.417vw] py-[0.417vw] gap-[0.208vw] text-[0.625vw] leading-[1.667]",
        icon: "h-[2.083vw] w-[2.083vw] p-[0.521vw]",
        "icon-sm": "h-[1.875vw] w-[1.875vw] p-0",
        nav: "w-[3.75vw] px-[0.833vw] py-[0.625vw] gap-[0.208vw]",
        "2xl": "h-[3.021vw] px-[1.25vw] py-[0.833vw] gap-[0.417vw] text-[0.833vw] leading-[1.625]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
