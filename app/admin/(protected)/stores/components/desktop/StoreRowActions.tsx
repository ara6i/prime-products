"use client";

import { useState, useTransition } from "react";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Ban,
  Power,
} from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { Button } from "@/app/shared/components/ui/button";
import { Input } from "@/app/shared/components/ui/input";
import {
  activateShopifyShopAction,
  grantTryOnsAction,
  resetSizeGuideMappingAction,
  suspendShopifyShopAction,
} from "../../actions";
import type { UnifiedStore } from "@/app/admin/shared/types";

interface Props {
  store: UnifiedStore;
}

type ActiveDialog = null | "suspend" | "activate" | "grant" | "reset";

const itemClass =
  "group flex items-center gap-[0.521vw] px-[0.521vw] py-[0.313vw] rounded-[0.313vw] text-[0.677vw] text-text-primary outline-none cursor-pointer select-none data-[highlighted]:bg-admin-row-hover data-[disabled]:text-text-hint data-[disabled]:cursor-not-allowed max-lg:gap-2 max-lg:px-2 max-lg:py-1.5 max-lg:text-[13px] max-lg:rounded-md";

const iconClass =
  "shrink-0 text-text-body group-data-[highlighted]:text-text-primary max-lg:h-4 max-lg:w-4";

const iconStyle = { width: "0.729vw", height: "0.729vw" };

export function StoreRowActions({ store }: Props) {
  const [active, setActive] = useState<ActiveDialog>(null);
  const [grantAmount, setGrantAmount] = useState("100");
  const [pending, startTransition] = useTransition();

  const canSuspend = store.source === "shopify" && store.status === "active";
  const canActivate = store.source === "shopify" && store.status === "suspended";
  const canGrant = store.source === "shopify";
  const shopDomain = store.source === "shopify" ? store.identifier : null;

  const copyDomain = async () => {
    try {
      await navigator.clipboard.writeText(store.identifier);
      toast.success(`Copied ${store.identifier}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(successMsg);
      else toast.error(res.error ?? "Action failed");
      setActive(null);
    });
  };

  const onSuspend = () =>
    runAction(() => suspendShopifyShopAction(store.id), "Shop suspended");
  const onActivate = () =>
    runAction(() => activateShopifyShopAction(store.id), "Shop activated");
  const onGrant = () =>
    runAction(
      () => grantTryOnsAction(store.id, Number(grantAmount)),
      `Added ${Number(grantAmount).toLocaleString()} try-ons`,
    );
  const onReset = () =>
    runAction(
      () => resetSizeGuideMappingAction(store.source, store.id),
      "Mapping reset — next CSV upload will re-learn",
    );

  return (
    <div className="inline-flex items-center gap-[0.313vw]">
      <a
        href={`/admin/stores/${store.source}/${store.id}`}
        className="inline-flex items-center h-[1.563vw] px-[0.625vw] rounded-[0.313vw] text-[0.625vw] font-medium text-text-body hover:bg-admin-muted hover:text-text-primary transition-colors"
      >
        View
      </a>

      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Store actions"
            className="inline-flex h-[1.563vw] w-[1.563vw] items-center justify-center rounded-[0.313vw] text-text-hint hover:bg-admin-muted hover:text-text-primary outline-none data-[state=open]:bg-admin-muted data-[state=open]:text-text-primary transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="!w-[0.729vw] !h-[0.729vw]"
            >
              <circle cx="8" cy="3" r="1.3" />
              <circle cx="8" cy="8" r="1.3" />
              <circle cx="8" cy="13" r="1.3" />
            </svg>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className={cn(
              "z-50 min-w-[10.5vw] rounded-[0.417vw] border border-admin-border bg-admin-surface-card shadow-admin-elevated p-[0.208vw]",
              "max-lg:min-w-[200px] max-lg:rounded-xl max-lg:p-1.5",
            )}
          >
            <DropdownMenu.Item className={itemClass} onSelect={copyDomain}>
              <Copy className={iconClass} style={iconStyle} strokeWidth={1.8} />
              <span>Copy {store.source === "shopify" ? "domain" : "ID"}</span>
            </DropdownMenu.Item>

            {shopDomain && (
              <>
                <DropdownMenu.Item asChild>
                  <a
                    href={`https://${shopDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className={itemClass}
                  >
                    <ExternalLink className={iconClass} style={iconStyle} strokeWidth={1.8} />
                    <span>Open storefront</span>
                  </a>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <a
                    href={`https://${shopDomain}/admin`}
                    target="_blank"
                    rel="noreferrer"
                    className={itemClass}
                  >
                    <ExternalLink className={iconClass} style={iconStyle} strokeWidth={1.8} />
                    <span>Open Shopify admin</span>
                  </a>
                </DropdownMenu.Item>
              </>
            )}

            <DropdownMenu.Separator className="my-[0.156vw] h-px bg-admin-border-soft max-lg:my-1" />

            {canGrant && (
              <DropdownMenu.Item className={itemClass} onSelect={() => setActive("grant")}>
                <Plus className={iconClass} style={iconStyle} strokeWidth={1.8} />
                <span>Grant try-ons</span>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Item className={itemClass} onSelect={() => setActive("reset")}>
              <RefreshCw className={iconClass} style={iconStyle} strokeWidth={1.8} />
              <span>Reset size-guide mapping</span>
            </DropdownMenu.Item>

            {(canSuspend || canActivate) && (
              <DropdownMenu.Separator className="my-[0.156vw] h-px bg-admin-border-soft max-lg:my-1" />
            )}

            {canSuspend && (
              <DropdownMenu.Item
                className={cn(
                  itemClass,
                  "!text-admin-status-suspended-text data-[highlighted]:!bg-admin-status-suspended-bg/60",
                )}
                onSelect={() => setActive("suspend")}
              >
                <Ban
                  className="shrink-0 text-admin-status-suspended-text max-lg:h-4 max-lg:w-4"
                  style={iconStyle}
                  strokeWidth={1.8}
                />
                <span>Suspend shop</span>
              </DropdownMenu.Item>
            )}
            {canActivate && (
              <DropdownMenu.Item
                className={cn(
                  itemClass,
                  "!text-admin-status-active-text data-[highlighted]:!bg-admin-status-active-bg/60",
                )}
                onSelect={() => setActive("activate")}
              >
                <Power
                  className="shrink-0 text-admin-status-active-text max-lg:h-4 max-lg:w-4"
                  style={iconStyle}
                  strokeWidth={1.8}
                />
                <span>Activate shop</span>
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Suspend confirm */}
      <Dialog open={active === "suspend"} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[22vw] rounded-[0.833vw] p-[1.25vw] max-lg:max-w-sm max-lg:rounded-2xl max-lg:p-5">
          <DialogHeader className="gap-[0.313vw]">
            <DialogTitle className="text-admin-md font-semibold text-text-primary max-lg:text-base">
              Suspend this shop?
            </DialogTitle>
            <DialogDescription className="text-admin-sm text-text-body max-lg:text-sm">
              Try-on will stop working on the merchant&apos;s storefront. You can reactivate later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-[0.625vw] flex-row gap-[0.417vw] max-lg:mt-3 max-lg:gap-2">
            <Button
              type="button"
              variant="outline-neutral"
              size="sm"
              className="flex-1"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-admin-status-suspended-text hover:bg-admin-status-suspended-text/90"
              onClick={onSuspend}
              disabled={pending}
            >
              {pending ? "Suspending…" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate confirm */}
      <Dialog open={active === "activate"} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[22vw] rounded-[0.833vw] p-[1.25vw] max-lg:max-w-sm max-lg:rounded-2xl max-lg:p-5">
          <DialogHeader className="gap-[0.313vw]">
            <DialogTitle className="text-admin-md font-semibold text-text-primary max-lg:text-base">
              Activate this shop?
            </DialogTitle>
            <DialogDescription className="text-admin-sm text-text-body max-lg:text-sm">
              Try-on will resume for customers on the storefront.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-[0.625vw] flex-row gap-[0.417vw] max-lg:mt-3 max-lg:gap-2">
            <Button
              type="button"
              variant="outline-neutral"
              size="sm"
              className="flex-1"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={onActivate}
              disabled={pending}
            >
              {pending ? "Activating…" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant try-ons */}
      <Dialog open={active === "grant"} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[22vw] rounded-[0.833vw] p-[1.25vw] max-lg:max-w-sm max-lg:rounded-2xl max-lg:p-5">
          <DialogHeader className="gap-[0.313vw]">
            <DialogTitle className="text-admin-md font-semibold text-text-primary max-lg:text-base">
              Grant bonus try-ons
            </DialogTitle>
            <DialogDescription className="text-admin-sm text-text-body max-lg:text-sm">
              Adds to the merchant&apos;s remaining try-on balance immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-[0.625vw] max-lg:mt-3">
            <label
              htmlFor="grant-amount"
              className="block text-admin-xs font-medium text-text-body mb-[0.313vw] max-lg:text-xs max-lg:mb-1.5"
            >
              Amount
            </label>
            <Input
              id="grant-amount"
              type="number"
              min={1}
              max={100000}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              autoFocus
              className="h-[2.083vw] max-lg:h-11"
            />
          </div>
          <DialogFooter className="mt-[0.833vw] flex-row gap-[0.417vw] max-lg:mt-4 max-lg:gap-2">
            <Button
              type="button"
              variant="outline-neutral"
              size="sm"
              className="flex-1"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={onGrant}
              disabled={pending || !grantAmount || Number(grantAmount) <= 0}
            >
              {pending ? "Granting…" : `Grant ${grantAmount || 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset mapping confirm */}
      <Dialog open={active === "reset"} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[22vw] rounded-[0.833vw] p-[1.25vw] max-lg:max-w-sm max-lg:rounded-2xl max-lg:p-5">
          <DialogHeader className="gap-[0.313vw]">
            <DialogTitle className="text-admin-md font-semibold text-text-primary max-lg:text-base">
              Reset size-guide mapping?
            </DialogTitle>
            <DialogDescription className="text-admin-sm text-text-body max-lg:text-sm">
              Clears the AI-learned header mapping. The next CSV upload will re-learn from scratch.
              Existing size charts are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-[0.625vw] flex-row gap-[0.417vw] max-lg:mt-3 max-lg:gap-2">
            <Button
              type="button"
              variant="outline-neutral"
              size="sm"
              className="flex-1"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={onReset}
              disabled={pending}
            >
              {pending ? "Resetting…" : "Reset mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
