"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import {
  ArrowLeftIcon,
  MonetizationOnIcon,
  CalendarIcon,
  ShareIcon,
  FileDownloadIcon,
  BookmarkOutlineIcon,
  InfoOutlineIcon,
} from "@/app/shared/components/icons";
import type { TryOnDetailData } from "@/app/dashboard/types";

interface TryOnDetailViewProps {
  data: TryOnDetailData;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TryOnDetailView({ data }: TryOnDetailViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.833vw]">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="flex items-center gap-[0.417vw] text-[0.833vw] leading-[1.354vw] text-text-primary hover:opacity-70 transition-opacity"
      >
        <ArrowLeftIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" />
        Back to Dashboard
      </Link>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-[1.25vw]">
        {/* Left: Result image */}
        <div className="relative w-[44.5%] shrink-0 overflow-hidden rounded-[1.042vw] bg-surface-segment">
          <Image
            src={data.imageUrl}
            alt="Try-on result"
            fill
            className="object-cover object-top"
          />

          {/* Floating actions */}
          <div className="absolute bottom-[1.042vw] right-[1.042vw] flex flex-col gap-[0.417vw]">
            <button className="flex h-[2.083vw] w-[2.083vw] items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
              <ShareIcon size={18} className="!w-[0.938vw] !h-[0.938vw] text-brand-blue" />
            </button>
            <button className="flex h-[2.083vw] w-[2.083vw] items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
              <FileDownloadIcon size={18} className="!w-[0.938vw] !h-[0.938vw] text-brand-blue" />
            </button>
          </div>
        </div>

        {/* Right: Outfit details */}
        <div className="flex min-h-0 flex-1 flex-col gap-[0.833vw]">
          {/* Title */}
          <h2 className="text-[1.042vw] font-medium leading-[1.771vw] text-text-primary">
            Outfit Details
          </h2>

          {/* Info row */}
          <div className="flex items-center gap-[1.25vw]">
            <div className="flex items-center gap-[0.313vw]">
              <CalendarIcon size={16} className="!w-[0.833vw] !h-[0.833vw] text-text-hint" />
              <span className="text-[0.729vw] leading-[1.146vw] text-text-hint">Created</span>
              <span className="text-[0.729vw] font-medium leading-[1.146vw] text-text-primary">
                {formatDate(data.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-[0.313vw]">
              <MonetizationOnIcon size={16} className="!w-[0.833vw] !h-[0.833vw] text-text-hint" />
              <span className="text-[0.729vw] leading-[1.146vw] text-text-hint">Total</span>
              <span className="text-[0.729vw] font-medium leading-[1.146vw] text-text-primary">
                {data.price}
              </span>
            </div>
          </div>

          {/* Pieces label */}
          <span className="text-[0.833vw] font-medium leading-[1.354vw] text-text-primary">
            Pieces in this outfit ({data.itemCount})
          </span>

          {/* Product grid - scrollable */}
          <div className="flex min-h-0 flex-1 flex-wrap content-start gap-[0.833vw] overflow-y-auto pr-[0.208vw]">
            {data.products.map((product) => (
              <div
                key={product.productId}
                className="flex w-[calc(50%-0.417vw)] flex-col gap-[0.417vw] rounded-[0.729vw] border-[0.5px] border-product-card-border bg-white p-[0.521vw]"
              >
                {/* Product image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[0.521vw] bg-white">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                  <button className="absolute bottom-[0.417vw] right-[0.417vw] flex h-[1.458vw] w-[1.458vw] items-center justify-center rounded-[0.313vw] bg-white/90 shadow-sm">
                    <BookmarkOutlineIcon size={14} className="!w-[0.729vw] !h-[0.729vw] text-text-hint" />
                  </button>
                </div>

                {/* Product info */}
                <div className="flex flex-col gap-[0.208vw] px-[0.104vw]">
                  <span className="line-clamp-2 text-[0.729vw] font-medium leading-[1.146vw] text-text-primary">
                    {product.name}
                  </span>
                  <span className="text-[0.625vw] leading-[1.042vw] text-text-hint">
                    {product.brand}
                  </span>
                  <div className="mt-[0.208vw] flex items-center justify-between">
                    <div className="flex items-center gap-[0.208vw]">
                      <span className="text-[0.729vw] font-medium leading-[1.146vw] text-text-primary">
                        ${(product.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <InfoOutlineIcon size={12} className="!w-[0.625vw] !h-[0.625vw] text-text-hint" />
                    </div>
                    {product.affiliateUrl ? (
                      <Button variant="fill-neutral" size="xs" className="h-[1.458vw] px-[0.625vw] text-[0.625vw] rounded-[0.417vw]" asChild>
                        <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">Buy</a>
                      </Button>
                    ) : (
                      <Button variant="fill-neutral" size="xs" className="h-[1.458vw] px-[0.625vw] text-[0.625vw] rounded-[0.417vw]">
                        Buy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-[0.625vw] pt-[0.417vw]">
            <Button variant="primary" size="default" asChild>
              <Link href="/dashboard/try-on">Try On Again</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
