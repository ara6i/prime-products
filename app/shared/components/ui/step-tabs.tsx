"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/app/shared/lib/utils"

const StepTabs = TabsPrimitive.Root

function StepTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="step-tabs-list"
      className={cn(
        "flex items-stretch gap-[0.417vw] self-stretch rounded-[5.208vw] bg-surface-light p-[0.208vw]",
        className
      )}
      {...props}
    />
  )
}

function StepTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="step-tabs-trigger"
      className={cn(
        "flex flex-1 items-center justify-center gap-[0.521vw] rounded-[15.625vw] px-[0.625vw] py-[0.313vw] text-[0.729vw] leading-[1.57] transition-colors",
        "data-[state=active]:bg-brand-blue-pale",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        className
      )}
      {...props}
    />
  )
}

const StepTabsContent = TabsPrimitive.Content

export { StepTabs, StepTabsList, StepTabsTrigger, StepTabsContent }
