import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import type { BlogPostDetail } from "../../types";

interface BlogArticleContentProps {
  post: BlogPostDetail;
}

export function BlogArticleContent({ post }: BlogArticleContentProps) {
  const primaryTopic = post.topics[0];

  return (
    <article>
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-brand-blue transition hover:text-brand-blue-dark"
      >
        <ArrowLeft size={16} />
        Back to blog
      </Link>

      <div className="relative aspect-[1.9] overflow-hidden rounded-[8px] bg-surface-blue-pale md:rounded-[22px]">
        <Image
          src={post.imageSrc}
          alt={post.imageAlt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 820px"
          className="object-cover"
        />
      </div>

      <div className="mt-9">
        {primaryTopic ? (
          <span className="rounded-full border border-brand-blue/15 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-brand-blue">
            {primaryTopic.label}
          </span>
        ) : null}
        <h1 className="mt-4 max-w-[760px] text-[40px] font-bold leading-[1.08] text-text-primary md:text-[62px]">
          {post.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-brand-blue/10 pb-6">
          <div className="flex items-center gap-3">
            <Image
              src={post.authorAvatarSrc}
              alt={post.authorName}
              width={52}
              height={52}
              className="h-[52px] w-[52px] rounded-full object-contain"
            />
            <span className="text-sm font-semibold text-text-body">By {post.authorName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-text-body">
            <span className="flex items-center gap-2">
              <CalendarDays size={15} className="text-brand-blue" />
              {post.dateLabel}
            </span>
            <span className="flex items-center gap-2">
              <Clock size={15} className="text-brand-blue" />
              {post.readTimeLabel}
            </span>
          </div>
        </div>
        <p className="mt-7 text-lg leading-8 text-text-body">{post.excerpt}</p>
      </div>

      <div className="mt-8 space-y-9 text-[17px] leading-8 text-text-body">
        {post.content.map((block, index) => {
          if (block.type === "paragraph") {
            return <p key={index}>{block.body}</p>;
          }

          return (
            <section key={index}>
              <h2 className="text-xl font-bold leading-tight text-text-primary">{block.title}</h2>
              <p className="mt-3">{block.body}</p>
            </section>
          );
        })}
      </div>
    </article>
  );
}
