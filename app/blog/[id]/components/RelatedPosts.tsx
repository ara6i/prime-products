import type { BlogPostCard as BlogPostCardModel } from "../../types";
import { BlogPostCard } from "../../components/BlogPostCard";

interface RelatedPostsProps {
  posts: BlogPostCardModel[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-8 md:px-8 md:pb-20">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-blue">
            Keep reading
          </p>
          <h2 className="mt-2 text-[30px] font-bold leading-tight text-text-primary">
            Related insights
          </h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
