export type ProfileSection = "posts" | "shop" | "about";

export type PostFilter = "all" | "new" | "knitwear" | "everyday";

export interface CreatorProduct {
  id: string;
  sequence: string;
  name: string;
  merchant: string;
  price: string;
  image: string;
  category: Exclude<PostFilter, "all" | "new">;
}

export interface CreatorPost {
  id: string;
  title: string;
  published: string;
  views: string;
  duration: string;
  image: string;
  videoSource?: string;
  objectPosition?: string;
  filters: PostFilter[];
}

export interface CreatorProfileData {
  name: string;
  handle: string;
  location: string;
  followers: string;
  monthlyStories: string;
  bio: string[];
  portrait: string;
  heroImage: string;
  featuredVideoPoster: string;
  featuredVideoSource: string;
  featuredOutfit: string;
  products: CreatorProduct[];
  posts: CreatorPost[];
}
