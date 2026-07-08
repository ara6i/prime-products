"use client";

import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { Footer as DesktopFooter } from "@/app/landing/components/desktop/Footer";
import { Footer as MobileFooter } from "@/app/landing/components/mobile/Footer";
import type { BlogPostDetailViewModel } from "../../types";
import { BlogArticleContent } from "./BlogArticleContent";
import { BlogArticleSidebar } from "./BlogArticleSidebar";
import { RelatedPosts } from "./RelatedPosts";

interface BlogPostPageClientProps {
  viewModel: BlogPostDetailViewModel;
  initialIsMobile: boolean;
}

export function BlogPostPageClient({ viewModel, initialIsMobile }: BlogPostPageClientProps) {
  return (
    <PilotModalProvider>
      <main className="min-h-screen bg-[#F8FAFF] text-text-primary">
        {initialIsMobile ? (
          <MobileDeveloperNavbar sectionHrefPrefix="/" />
        ) : (
          <DeveloperNavbar sectionHrefPrefix="/" />
        )}

        <section className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,820px)_280px] lg:items-start">
          <BlogArticleContent post={viewModel.post} />
          <div className="lg:sticky lg:top-[7vw]">
            <BlogArticleSidebar />
          </div>
        </section>

        <RelatedPosts posts={viewModel.relatedPosts} />

        <div className={initialIsMobile ? "flex flex-col gap-6 bg-brand-blue-pale px-4 py-10" : "flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]"}>
          {initialIsMobile ? <MobileFooter /> : <DesktopFooter />}
        </div>
      </main>
    </PilotModalProvider>
  );
}
