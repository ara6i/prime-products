"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/app/shared/lib/utils"

const SegmentedControl = TabsPrimitive.Root

function SegmentedControlList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="segmented-control-list"
      className={cn(
        "relative flex items-center justify-center self-stretch rounded-[0.417vw] border border-black/[0.08] bg-surface-segment",
        className
      )}
      style={{ gap: "-1px" }}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="segmented-control-item"
      className={cn(
        "relative z-10 flex flex-1 items-center justify-center rounded-[0.417vw] px-[0.833vw] py-[0.417vw] text-[0.729vw] leading-[1.57] transition-colors",
        "text-text-body",
        "data-[state=active]:bg-brand-blue-pale data-[state=active]:text-brand-blue-dark",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        className
      )}
      {...props}
    />
  )
}

function SegmentedControlDivider({ className }: { className?: string }) {
  return (
    <div
      data-slot="segmented-control-divider"
      className={cn("relative z-10 h-[0.729vw] w-px shrink-0 bg-border-separator", className)}
    />
  )
}

const SegmentedControlContent = TabsPrimitive.Content

export {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlItem,
  SegmentedControlDivider,
  SegmentedControlContent,
}
