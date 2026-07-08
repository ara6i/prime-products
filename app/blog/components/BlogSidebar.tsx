import Image from "next/image";
import Link from "next/link";
import { Linkedin, MapPin, Twitter, Youtube } from "lucide-react";
import type { BlogPageViewModel } from "../types";

interface BlogSidebarProps {
  viewModel: BlogPageViewModel;
}

export function BlogSidebar({ viewModel }: BlogSidebarProps) {
  return (
    <aside className="flex flex-col gap-7">
      <section className="rounded-[8px] border border-brand-blue/10 bg-white p-6 shadow-sm shadow-brand-blue/5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-hint">
          About
        </p>
        <div className="mt-5 flex items-center gap-4">
          <Image
            src={viewModel.author.avatarSrc}
            alt={viewModel.author.name}
            width={76}
            height={76}
            className="h-[76px] w-[76px] rounded-full object-contain"
          />
          <div>
            <h2 className="text-sm font-bold text-text-primary">{viewModel.author.name}</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">
              {viewModel.author.role}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-text-body">{viewModel.author.bio}</p>
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-text-body">
          <MapPin size={15} className="text-brand-blue" />
          {viewModel.author.location}
        </p>
        <div className="mt-4 flex items-center gap-3 text-text-body">
          {[Twitter, Youtube, Linkedin].map((Icon, index) => (
            <span
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-blue-pale text-brand-blue"
            >
              <Icon size={15} />
            </span>
          ))}
        </div>
      </section>

      <Link
        href={`/blog/${viewModel.featuredPost.id}`}
        className="group overflow-hidden rounded-[8px] border border-brand-blue/10 bg-text-primary shadow-sm shadow-brand-blue/5"
      >
        <div className="relative aspect-[1.12]">
          <Image
            src={viewModel.featuredPost.imageSrc}
            alt={viewModel.featuredPost.imageAlt}
            fill
            sizes="320px"
            className="object-cover opacity-75 transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-text-primary via-text-primary/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <span className="rounded-full bg-white/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
              {viewModel.featuredPost.eyebrow}
            </span>
            <h2 className="mt-4 text-xl font-bold leading-tight">{viewModel.featuredPost.title}</h2>
          </div>
        </div>
      </Link>

      <section className="rounded-[8px] border border-brand-blue/10 bg-white p-6 shadow-sm shadow-brand-blue/5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-hint">
          Focus areas
        </p>
        <div className="mt-5 space-y-5">
          {viewModel.experience.map((item) => (
            <div key={item.title} className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-xs text-text-body">{item.subtitle}</p>
              </div>
              <span className="text-xs font-semibold text-text-hint">{item.period}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[8px] border border-brand-blue/10 bg-white p-6 shadow-sm shadow-brand-blue/5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-hint">
          Technologies
        </p>
        <div className="mt-5 space-y-5">
          {viewModel.tools.map((tool) => (
            <div key={tool.title} className="flex gap-3">
              <Image
                src={tool.iconSrc}
                alt=""
                width={34}
                height={34}
                className="h-[34px] w-[34px] rounded-[8px] object-contain"
              />
              <div>
                <h3 className="text-sm font-bold text-text-primary">{tool.title}</h3>
                <p className="mt-1 text-xs leading-5 text-text-body">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[8px] border border-brand-blue/10 bg-white p-6 shadow-sm shadow-brand-blue/5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-hint">
          Creating
        </p>
        <div className="mt-5 space-y-5">
          {viewModel.creating.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-bold text-brand-blue">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-text-body">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
