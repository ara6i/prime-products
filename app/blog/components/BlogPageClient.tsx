"use client";

import type { BlogPageViewModel } from "../types";
import { useBlogPage } from "../hooks/useBlogPage";
import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { Footer as DesktopFooter } from "@/app/landing/components/desktop/Footer";
import { Footer as MobileFooter } from "@/app/landing/components/mobile/Footer";
import { BlogHero } from "./BlogHero";
import { BlogNewsletter } from "./BlogNewsletter";
import { BlogPagination } from "./BlogPagination";
import { BlogPostCard } from "./BlogPostCard";
import { BlogSidebar } from "./BlogSidebar";
import { TopicChips } from "./TopicChips";

interface BlogPageClientProps {
  initialViewModel: BlogPageViewModel;
  initialIsMobile: boolean;
}

export function BlogPageClient({ initialViewModel, initialIsMobile }: BlogPageClientProps) {
  const viewModel = useBlogPage(initialViewModel);

  return (
    <PilotModalProvider>
      <main className="min-h-screen bg-[#F8FAFF] text-text-primary">
        {initialIsMobile ? (
          <MobileDeveloperNavbar sectionHrefPrefix="/" />
        ) : (
          <DeveloperNavbar sectionHrefPrefix="/" />
        )}
        <BlogHero />
        <TopicChips topics={viewModel.topics} />

        <section className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-10">
          <div>
            <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
              {viewModel.posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
            <BlogPagination pagination={viewModel.pagination} />
          </div>
          <BlogSidebar viewModel={viewModel} />
        </section>

        <BlogNewsletter />
        <div className={initialIsMobile ? "flex flex-col gap-6 bg-brand-blue-pale px-4 py-10" : "flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]"}>
          {initialIsMobile ? <MobileFooter /> : <DesktopFooter />}
        </div>
      </main>
    </PilotModalProvider>
  );
}
