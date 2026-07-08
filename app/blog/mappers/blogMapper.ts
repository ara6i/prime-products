import type {
  BlogPostDetail,
  BlogPostDetailViewModel,
  BlogPageViewModel,
  BlogPostCard,
  BlogPostRecord,
  BlogTopic,
} from "../types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function mapBlogPostToCard(
  post: BlogPostRecord,
  topicsByKey: Map<string, BlogTopic>
): BlogPostCard {
  const topics = post.topicKeys
    .map((key) => topicsByKey.get(key))
    .filter((topic): topic is BlogTopic => Boolean(topic));

  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    dateLabel: dateFormatter.format(new Date(`${post.publishedAt}T00:00:00`)),
    metaLabel: `${post.authorName} / ${post.readTimeMinutes} min read`,
    topics,
    imageSrc: post.imageSrc,
    imageAlt: post.imageAlt,
  };
}

export function mapBlogPageViewModel(input: {
  topics: BlogTopic[];
  posts: BlogPostRecord[];
  pagination: BlogPageViewModel["pagination"];
  author: BlogPageViewModel["author"];
  featuredPost: BlogPageViewModel["featuredPost"];
  experience: BlogPageViewModel["experience"];
  tools: BlogPageViewModel["tools"];
  creating: BlogPageViewModel["creating"];
}): BlogPageViewModel {
  const topicsByKey = new Map(input.topics.map((topic) => [topic.key, topic]));

  return {
    topics: input.topics,
    posts: input.posts.map((post) => mapBlogPostToCard(post, topicsByKey)),
    pagination: input.pagination,
    author: input.author,
    featuredPost: input.featuredPost,
    experience: input.experience,
    tools: input.tools,
    creating: input.creating,
  };
}

export function mapBlogPostToDetail(
  post: BlogPostRecord,
  topicsByKey: Map<string, BlogTopic>
): BlogPostDetail {
  const topics = post.topicKeys
    .map((key) => topicsByKey.get(key))
    .filter((topic): topic is BlogTopic => Boolean(topic));

  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    dateLabel: dateFormatter.format(new Date(`${post.publishedAt}T00:00:00`)),
    authorName: post.authorName,
    authorAvatarSrc: post.authorAvatarSrc,
    topics,
    imageSrc: post.imageSrc,
    imageAlt: post.imageAlt,
    readTimeLabel: `${post.readTimeMinutes} min read`,
    content: post.content,
  };
}

export function mapBlogPostDetailViewModel(input: {
  post: BlogPostRecord;
  allPosts: BlogPostRecord[];
  topics: BlogTopic[];
}): BlogPostDetailViewModel {
  const topicsByKey = new Map(input.topics.map((topic) => [topic.key, topic]));
  const relatedPosts = input.allPosts
    .filter((post) => post.id !== input.post.id)
    .slice(0, 3)
    .map((post) => mapBlogPostToCard(post, topicsByKey));

  return {
    post: mapBlogPostToDetail(input.post, topicsByKey),
    relatedPosts,
  };
}
