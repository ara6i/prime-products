"use client";

import Image from "next/image";
import Link from "next/link";
import { Tabs } from "radix-ui";
import { shopMenuSections } from "./shopMenu.data";
import styles from "./globalShop.module.css";

export function ShopMenuNavigation() {
  return (
    <Tabs.Root className={styles.menuContent} defaultValue="shop" orientation="vertical">
      <Tabs.List className={styles.menuPrimary} aria-label="PrimeStyleAI platforms">
        <ul>
          {shopMenuSections.map((section) => (
            <li key={section.id}>
              <Tabs.Trigger value={section.id}>{section.label}</Tabs.Trigger>
            </li>
          ))}
        </ul>
      </Tabs.List>

      {shopMenuSections.map((section) => (
        <Tabs.Content key={section.id} value={section.id} className={styles.menuPanel}>
          <div className={styles.menuGroupStack}>
            {section.groups.map((group, index) => (
              <nav
                key={group.label}
                className={styles.menuSection}
                aria-label={`${section.label} ${group.label}`}
              >
                <span>|{String(index + 1).padStart(2, "0")}|&nbsp;&nbsp; {group.label}</span>
                <div>
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Opens in a new tab"
                      prefetch={false}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ))}
          </div>

          <nav className={styles.menuFeatureRail} aria-label={`${section.label} featured destinations`}>
            {section.features.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens in a new tab"
                prefetch={false}
              >
                <span>
                  <Image src={item.image} alt="" fill sizes="(max-width: 760px) 44vw, 116px" />
                </span>
                <small>{item.label}</small>
              </Link>
            ))}
          </nav>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
