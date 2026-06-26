"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/app/shared/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10.417vw] overflow-hidden rounded-[0.729vw] border border-customer-border bg-customer-card p-[0.313vw] text-text-primary shadow-[0_1.25vw_4.167vw_rgba(15,23,42,0.16)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 max-lg:min-w-[54vw] max-lg:rounded-[4vw] max-lg:p-[1.5vw]",
          className
        )}
        {...props}
      />
    </DropdownMenuPortal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default select-none items-center gap-[0.521vw] rounded-[0.521vw] px-[0.625vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset=true]:pl-[1.667vw] hover:bg-customer-soft focus:bg-customer-soft max-lg:gap-[2vw] max-lg:rounded-[2.8vw] max-lg:px-[3vw] max-lg:py-[2.6vw] max-lg:text-[3.3vw]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[0.521vw] py-[0.521vw] pl-[1.667vw] pr-[0.625vw] text-[clamp(12px,0.72vw,14px)] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-customer-soft focus:bg-customer-soft max-lg:rounded-[2.8vw] max-lg:py-[2.6vw] max-lg:pl-[8vw] max-lg:pr-[3vw] max-lg:text-[3.3vw]",
        className
      )}
      {...props}
    >
      <span className="absolute left-[0.521vw] flex h-[0.833vw] w-[0.833vw] items-center justify-center max-lg:left-[3vw] max-lg:h-[4vw] max-lg:w-[4vw]">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="h-[0.729vw] w-[0.729vw] max-lg:h-[3.4vw] max-lg:w-[3.4vw]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-[0.625vw] py-[0.417vw] text-[0.573vw] font-semibold uppercase tracking-[0.12em] text-customer-muted data-[inset=true]:pl-[1.667vw] max-lg:px-[3vw] max-lg:py-[2vw] max-lg:text-[2.5vw]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-[0.313vw] my-[0.313vw] h-px bg-customer-border max-lg:-mx-[1.5vw] max-lg:my-[1.5vw]", className)}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default select-none items-center rounded-[0.521vw] px-[0.625vw] py-[0.521vw] text-[clamp(12px,0.72vw,14px)] outline-none transition-colors data-[inset=true]:pl-[1.667vw] hover:bg-customer-soft focus:bg-customer-soft max-lg:rounded-[2.8vw] max-lg:px-[3vw] max-lg:py-[2.6vw] max-lg:text-[3.3vw]",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-[0.729vw] w-[0.729vw] max-lg:h-[3.4vw] max-lg:w-[3.4vw]" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "z-50 min-w-[10.417vw] overflow-hidden rounded-[0.729vw] border border-customer-border bg-customer-card p-[0.313vw] text-text-primary shadow-[0_1.25vw_4.167vw_rgba(15,23,42,0.16)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-lg:min-w-[54vw] max-lg:rounded-[4vw] max-lg:p-[1.5vw]",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
