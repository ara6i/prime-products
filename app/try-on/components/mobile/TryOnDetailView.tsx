"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  FileDownloadIcon,
  MonetizationOnIcon,
} from "@/app/shared/components/icons";
import { AffiliateBuyButton } from "@/app/try-on/components/AffiliateBuyButton";
import type { TryOnDetailData } from "@/app/dashboard/types";

interface TryOnDetailViewProps {
  data: TryOnDetailData;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TryOnDetailView({ data }: TryOnDetailViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
      <Link
        href="/dashboard"
        className="mb-3 flex min-h-11 items-center gap-2 text-sm font-medium text-text-primary"
      >
        <ArrowLeftIcon size={18} />
        Back to Dashboard
      </Link>

      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-[20px] bg-surface-segment">
        <Image
          src={data.imageUrl}
          alt="Try-on result"
          fill
          sizes="calc(100vw - 32px)"
          className="object-cover object-top"
          priority
        />
        <a
          href={data.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          aria-label="Download try-on result"
          className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow-sm backdrop-blur-sm"
        >
          <FileDownloadIcon size={20} />
        </a>
      </div>

      <section className="mt-4 flex flex-col gap-4 rounded-[20px] border border-divider bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-text-primary">
            Outfit Details
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              data.status === "ready"
                ? "bg-status-ready-bg text-status-ready-text"
                : "bg-warning-bg text-warning-text"
            }`}
          >
            {data.status === "ready" ? "Ready" : "Processing"}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-text-hint">
            <CalendarIcon size={16} />
            <span>{formatDate(data.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-text-hint">
            <MonetizationOnIcon size={16} />
            <span className="font-medium text-text-primary">{data.price}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-primary">
            Pieces in this outfit ({data.itemCount})
          </h2>

          {data.products.length === 0 ? (
            <p className="rounded-xl bg-surface-light px-4 py-6 text-center text-sm text-text-hint">
              Product details are not available for this try-on.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {data.products.map((product) => (
                <article
                  key={product.productId}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-product-card-border bg-white p-2"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-light">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 767px) calc(50vw - 29px), 220px"
                      className="object-contain"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="line-clamp-2 text-xs font-medium leading-5 text-text-primary">
                      {product.name}
                    </h3>
                    <p className="truncate text-xs text-text-hint">
                      {product.brand}
                    </p>
                    <p className="text-sm font-medium text-text-primary">
                      ${(product.price ?? 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <AffiliateBuyButton
                    affiliateUrl={product.affiliateUrl}
                    variant="fill-neutral"
                    size="xs"
                    className="h-9 w-full rounded-full px-3 text-xs"
                  />
                </article>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/try-on"
          className="flex h-11 items-center justify-center rounded-full bg-brand-blue px-5 text-sm font-medium text-white"
        >
          Try On Again
        </Link>
      </section>
    </div>
  );
}
