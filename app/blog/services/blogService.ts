import {
  BLOG_AUTHOR,
  BLOG_CREATING,
  BLOG_EXPERIENCE,
  BLOG_POSTS,
  BLOG_TOOLS,
  BLOG_TOPICS,
  FEATURED_BLOG_POST,
} from "../data/blogContent";
import {
  mapBlogPageViewModel,
  mapBlogPostDetailViewModel,
} from "../mappers/blogMapper";
import type { BlogPageViewModel, BlogPaginationViewModel, BlogPostDetailViewModel, BlogPostRecord } from "../types";

const BLOG_PAGE_SIZE = 6;
const FALLBACK_BLOG_IMAGE_SRC = "/images/landing/ps/ps-hero-visual.png";

interface BackendBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  authorAvatarSrc: string | null;
  topicKeys: string[];
  imageSrc: string | null;
  imageAlt: string | null;
  readTimeMinutes: number;
  content: BlogPostRecord["content"];
}

interface BackendBlogListPayload {
  posts?: BackendBlogPost[];
  pagination?: BlogPaginationViewModel;
}

interface BlogPostList {
  posts: BlogPostRecord[];
  pagination: BlogPaginationViewModel;
}

function getBlogApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_PRIMESTYLE_API_URL ||
    "http://localhost:4000"
  ).replace(/\/+$/, "");
}

function isKnownTopicKey(value: string): value is BlogPostRecord["topicKeys"][number] {
  return BLOG_TOPICS.some((topic) => topic.key === value);
}

function mapBackendPost(post: BackendBlogPost): BlogPostRecord {
  return {
    id: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt.slice(0, 10),
    authorName: post.authorName,
    authorAvatarSrc: post.authorAvatarSrc || "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: post.topicKeys.filter(isKnownTopicKey),
    imageSrc: post.imageSrc || FALLBACK_BLOG_IMAGE_SRC,
    imageAlt: post.imageAlt || post.title,
    readTimeMinutes: post.readTimeMinutes,
    content: post.content,
  };
}

function mapFeaturedPost(post: BlogPostRecord): BlogPageViewModel["featuredPost"] {
  return {
    id: post.id,
    title: post.title,
    eyebrow: "Featured blog",
    imageSrc: post.imageSrc,
    imageAlt: post.imageAlt,
  };
}

function selectFeaturedPost(posts: BlogPostRecord[]): BlogPageViewModel["featuredPost"] {
  const postWithRealImage = posts.find((post) => post.imageSrc !== FALLBACK_BLOG_IMAGE_SRC);
  return postWithRealImage ? mapFeaturedPost(postWithRealImage) : FEATURED_BLOG_POST;
}

function buildPagination(page: number, limit: number, total: number): BlogPaginationViewModel {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

function paginateStaticPosts(page: number, limit: number): BlogPostList {
  const pagination = buildPagination(page, limit, BLOG_POSTS.length);
  const start = (pagination.page - 1) * pagination.limit;

  return {
    posts: BLOG_POSTS.slice(start, start + pagination.limit),
    pagination,
  };
}

async function fetchBackendPosts(page: number, limit: number): Promise<BlogPostList | null> {
  try {
    const params = new URLSearchParams({
      status: "published",
      page: String(page),
      limit: String(limit),
    });
    const response = await fetch(`${getBlogApiBaseUrl()}/api/blog?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as BackendBlogListPayload;
    if (!Array.isArray(payload.posts) || !payload.pagination) return null;
    return {
      posts: payload.posts.map(mapBackendPost),
      pagination: payload.pagination,
    };
  } catch {
    return null;
  }
}

async function fetchBackendPost(id: string): Promise<BlogPostRecord | null> {
  try {
    const response = await fetch(`${getBlogApiBaseUrl()}/api/blog/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { post?: BackendBlogPost };
    return payload.post ? mapBackendPost(payload.post) : null;
  } catch {
    return null;
  }
}

export async function getBlogPageViewModel(page = 1): Promise<BlogPageViewModel> {
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const postList = (await fetchBackendPosts(normalizedPage, BLOG_PAGE_SIZE)) ?? paginateStaticPosts(normalizedPage, BLOG_PAGE_SIZE);
  const featuredPosts = (await fetchBackendPosts(1, 50))?.posts ?? postList.posts;

  return mapBlogPageViewModel({
    topics: BLOG_TOPICS,
    posts: postList.posts,
    pagination: postList.pagination,
    author: BLOG_AUTHOR,
    featuredPost: selectFeaturedPost(featuredPosts),
    experience: BLOG_EXPERIENCE,
    tools: BLOG_TOOLS,
    creating: BLOG_CREATING,
  });
}

export async function getBlogPostDetailViewModel(id: string): Promise<BlogPostDetailViewModel | null> {
  const backendPosts = await fetchBackendPosts(1, 50);
  const allPosts = backendPosts?.posts ?? BLOG_POSTS;
  const post = (await fetchBackendPost(id)) ?? allPosts.find((item) => item.id === id);
  if (!post) return null;

  return mapBlogPostDetailViewModel({
    post,
    allPosts,
    topics: BLOG_TOPICS,
  });
}

export function getBlogPostIds(): string[] {
  return BLOG_POSTS.map((post) => post.id);
}
