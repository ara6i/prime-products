import type { Metadata } from "next";
import { headers } from "next/headers";
import { BlogPageClient } from "./components/BlogPageClient";
import { getBlogPageViewModel } from "./services/blogService";

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;

export const metadata: Metadata = {
  title: "PrimeStyleAI Blog | Fit Intelligence and Virtual Try-On Insights",
  description:
    "AI sizing, virtual try-on, Shopify rollout, and conversion insights from PrimeStyleAI.",
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
	const headersList = await headers();
  const resolvedSearchParams = await searchParams;
	const initialIsMobile = MOBILE_UA_REGEX.test(headersList.get("user-agent") ?? "");
	const viewModel = await getBlogPageViewModel(parsePage(resolvedSearchParams.page));

	return <BlogPageClient initialViewModel={viewModel} initialIsMobile={initialIsMobile} />;
}
