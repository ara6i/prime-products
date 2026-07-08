import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getBlogPostDetailViewModel,
  getBlogPostIds,
} from "../services/blogService";
import { BlogPostPageClient } from "./components/BlogPostPageClient";

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getBlogPostIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
	const { id } = await params;
	const viewModel = await getBlogPostDetailViewModel(id);

  if (!viewModel) {
    return {
      title: "Blog post not found | PrimeStyleAI",
    };
  }

  return {
    title: `${viewModel.post.title} | PrimeStyleAI Blog`,
    description: viewModel.post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
	const { id } = await params;
	const viewModel = await getBlogPostDetailViewModel(id);
  if (!viewModel) notFound();

  const headersList = await headers();
  const initialIsMobile = MOBILE_UA_REGEX.test(headersList.get("user-agent") ?? "");

  return <BlogPostPageClient viewModel={viewModel} initialIsMobile={initialIsMobile} />;
}
