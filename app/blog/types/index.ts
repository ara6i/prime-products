export type BlogTopicKey =
  | "ai-sizing"
  | "virtual-try-on"
  | "shopify"
  | "conversion"
  | "fashion-tech"
  | "fit-data"
  | "merchant-growth";

export type BlogTopicIconName =
  | "ruler"
  | "sparkles"
  | "shopping-bag"
  | "gauge"
  | "shirt"
  | "bar-chart"
  | "bot";

export interface BlogTopic {
  key: BlogTopicKey;
  label: string;
  iconName: BlogTopicIconName;
}

export interface BlogAuthor {
  name: string;
  role: string;
  location: string;
  bio: string;
  avatarSrc: string;
}

export interface BlogPostRecord {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  authorAvatarSrc: string;
  topicKeys: BlogTopicKey[];
  imageSrc: string;
  imageAlt: string;
  readTimeMinutes: number;
  content: BlogPostContentBlock[];
}

export type BlogPostContentBlock =
  | { type: "paragraph"; body: string }
  | { type: "heading"; title: string; body: string };

export interface BlogPostCard {
  id: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  metaLabel: string;
  topics: BlogTopic[];
  imageSrc: string;
  imageAlt: string;
}

export interface FeaturedBlogPost {
  id: string;
  title: string;
  eyebrow: string;
  imageSrc: string;
  imageAlt: string;
}

export interface BlogExperienceItem {
  title: string;
  subtitle: string;
  period: string;
}

export interface BlogToolItem {
  title: string;
  description: string;
  iconSrc: string;
}

export interface BlogCreatingItem {
  title: string;
  description: string;
}

export interface BlogPaginationViewModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BlogPageViewModel {
  topics: BlogTopic[];
  posts: BlogPostCard[];
  pagination: BlogPaginationViewModel;
  author: BlogAuthor;
  featuredPost: FeaturedBlogPost;
  experience: BlogExperienceItem[];
  tools: BlogToolItem[];
  creating: BlogCreatingItem[];
}

export interface BlogPostDetailViewModel {
  post: BlogPostDetail;
  relatedPosts: BlogPostCard[];
}

export interface BlogPostDetail {
  id: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  authorName: string;
  authorAvatarSrc: string;
  topics: BlogTopic[];
  imageSrc: string;
  imageAlt: string;
  readTimeLabel: string;
  content: BlogPostContentBlock[];
}
