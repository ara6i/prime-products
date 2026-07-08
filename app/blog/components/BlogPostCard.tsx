import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogPostCard as BlogPostCardModel } from "../types";

interface BlogPostCardProps {
  post: BlogPostCardModel;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="group">
      <Link href={`/blog/${post.id}`} className="block">
        <div className="relative aspect-[1.58] overflow-hidden rounded-[8px] bg-surface-blue-pale">
          <Image
            src={post.imageSrc}
            alt={post.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {post.topics.slice(0, 2).map((topic) => (
              <span
                key={topic.key}
                className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-brand-blue shadow-sm"
              >
                {topic.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-text-hint">
            {post.metaLabel} / {post.dateLabel}
          </p>
          <h2 className="mt-2 flex items-start gap-2 text-[19px] font-bold leading-[1.18] text-text-primary transition group-hover:text-brand-blue">
            {post.title}
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" />
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-body">
            {post.excerpt}
          </p>
        </div>
      </Link>
    </article>
  );
}
