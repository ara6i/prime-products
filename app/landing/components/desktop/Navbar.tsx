"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Play, BookOpen, LayoutDashboard } from "lucide-react";
import { Button } from "@/app/shared/components/ui";

const DEVELOPER_DROPDOWN = [
  { title: "SDK in Action", icon: Play, href: "/demo/products", desc: "Try it on real products" },
  { title: "Documentation", icon: BookOpen, href: "/docs", desc: "Guides & API reference" },
  { title: "Dashboard", icon: LayoutDashboard, href: "https://preview.myaifitting.com/developer/dashboard/keys", desc: "Keys, billing & usage" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const handleEnter = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <nav className="flex items-center gap-[0.833vw] px-[3.125vw] py-[0.625vw] w-full mx-auto">
      <Link href="/">
        <Image
          src="/images/landing/logo-navbar-transparent.png"
          alt="PrimeStyleAI"
          width={95}
          height={89}
          className="object-contain w-[4.948vw] h-[4.635vw]"
        />
      </Link>

      <div className="flex items-center gap-[0.833vw] flex-1">
        <Link
          href="/pricing"
          className="text-[0.833vw] leading-[1.625] text-black w-[5vw]"
        >
          Pricing
        </Link>

        {/* Developers dropdown */}
        <div
          className="relative"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <Link
            href="/"
            className="flex items-center gap-[0.2vw] text-[0.833vw] leading-[1.625] text-black hover:text-[#1a6cff] transition-colors w-[6vw]"
          >
            <span>Developers</span>
            <ChevronDown
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              style={{ width: "0.7vw", height: "0.7vw" }}
            />
          </Link>

          {open && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-[0.4vw] z-50">
              <div className="w-[18vw] bg-white border border-gray-200 rounded-[0.8vw] shadow-xl shadow-black/10 overflow-hidden">
                <div className="p-[0.4vw]">
                  {DEVELOPER_DROPDOWN.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-start gap-[0.6vw] px-[0.8vw] py-[0.6vw] rounded-[0.5vw] transition-colors duration-150 hover:bg-gray-50 text-gray-900"
                      >
                        <div className="flex-shrink-0 flex items-center justify-center rounded-[0.4vw] mt-[0.1vw] bg-gray-100" style={{ width: "2vw", height: "2vw" }}>
                          <Icon style={{ width: "1vw", height: "1vw" }} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ fontSize: "0.85vw", lineHeight: 1.3 }}>{item.title}</p>
                          <p className="text-gray-500" style={{ fontSize: "0.7vw", lineHeight: 1.4 }}>{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/terms"
          className="text-[0.833vw] leading-[1.625] text-black w-[5vw]"
        >
          Terms
        </Link>
        <Link
          href="#"
          className="text-[0.833vw] leading-[1.625] text-black w-[5vw]"
        >
          Policy
        </Link>
      </div>

      <Button
        variant="primary"
        size="default"
        className="h-[2.604vw] px-[0.833vw] text-[0.833vw] leading-[1.354vw] rounded-[52.083vw]"
        asChild
      >
        <Link href="/auth">Try it Free</Link>
      </Button>
    </nav>
  );
}
