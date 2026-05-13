# Shopify Launch — full official reference

Verbatim copy of Shopify's complete launch + post-launch documentation. Companion to:
- [SHOPIFY-APP-REVIEW-CHECKLIST.html](./SHOPIFY-APP-REVIEW-CHECKLIST.html) — pre-submission requirements
- [SHOPIFY-LAUNCH-AND-OPERATE.html](./SHOPIFY-LAUNCH-AND-OPERATE.html) — curated post-submission ops guide

Source: https://shopify.dev/docs/apps/launch
Captured: 2026-05-09

**Coverage:** all 53 pages — Built for Shopify (about, requirements, annual reviews, regain status), Privacy + PCD, Billing + Managed Pricing, all subscription pattern pages (time-based, usage-based, combined, complex, max charge, discounts, one-time, credits, refunds, view earnings), Deployment (Cloud Run, hosting, app versions, CD pipeline), Distribution (sunsetting, support, go-to-market, track usage, listing visibility, revenue share), App Store (about, review process, submit, pass review, listing categories, policy violations, quality checks), App Store Ads (all 7 pages: about, create, manage, performance, billing, permissions, FAQ), Marketing (about, press release, brand assets, listing traffic).

**How to navigate:** every page is a top-level `# heading` plus a `<!-- PAGE N/53: title -->` marker. Jump with `grep -n "^# "` or your editor's outline.

---

<!-- PAGE 1/53: About Built for Shopify -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/built-for-shopify -->

# About Built for Shopify

More and more merchants join Shopify every day. They rely on apps to help them start, grow, and run their business effectively.

We've developed a set of quality standards that help app developers to make high-quality apps for merchants: apps that are easy to use, safe, and performant, and help solve merchant problems. Each standard has an impact on the merchant and customer experience, and the success of a merchant’s store.

To determine whether you meet our app quality standards, we evaluate your app using specific, actionable criteria. Apps that meet all of these criteria are eligible for Built for Shopify status. Along the way, you can qualify for smaller [achievements](#other-achievements) that grant you more limited benefits, such as indicators of high quality on your app listing, special merchandising, or opportunities for promotion on various Shopify surfaces.

Most criteria for Built for Shopify and intermediate achievements are automatically evaluated, while others require you to apply for evaluation. Some achievements are automatically granted, while others require you to apply for inclusion. You can check whether your app meets the criteria for Built for Shopify on the **Distribution** page for the app in your Partner Dashboard.

[Achievement criteria\
\
](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria)

[Explore the criteria that you need to meet to earn Built for Shopify status and other achievements.](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria)

***

## Built for Shopify status

Built for Shopify status is the highest level of recognition and achievement that an app can reach. Built for Shopify apps receive additional promotion in the Shopify App Store, and are eligible for promotion on other key merchant surfaces.

**Note:**

You need to [apply for Built for Shopify status](#apply-for-built-for-shopify-status). You can apply for Built for Shopify status anytime.

When you achieve Built for Shopify status, your app receives the following promotional benefits:

### Built for Shopify highlight

A highlight indicating your Built for Shopify status appears on the app listing page. The Built for Shopify highlight appears at the top of the highlights list.

On your way to earning Built for Shopify status, your app might earn other [standalone highlights](https://shopify.dev/docs/apps/launch/built-for-shopify#app-highlights), where applicable.

![An image of the Built for Shopify highlight that appears on the app details page.](https://shopify.dev/assets/assets/images/apps/store/quality/bfs-overview-CN3ls_I8.png)

### Built for Shopify badge

A **Built for Shopify** badge appears on your app card wherever it appears in the Shopify App Store. For example, the badge will be visible on your app listing, and on your app card in search results and category pages.

![An image of the Built for Shopify badge that appears on the app details page.](https://shopify.dev/assets/assets/images/apps/store/quality/bfs-badge-C1UdF-mc.png)

### Search filter for Built for Shopify

When merchants search for apps on the Shopify App Store, there is a search filter for Built for Shopify to help them filter for only apps that are Built for Shopify.

### Priority app review

Developers with Built for Shopify status get priority review when submitting additional apps in future. Your apps go through the same Shopify App Store review process, and must meet all the same requirements, but join a prioritized review queue, reserved just for BFS developers.

### Plan based targeting for Shopify App Store Ads

Built with Shopify developers can target their search, category page, and homepage ads on the Shopify App Store to [specific merchant plans](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#merchant-plan-based-targeting).

### Search ranking boost

Built for Shopify apps appear higher in Shopify App Store search rankings. Built for Shopify apps are ranked higher than other apps with search ranking boosts. This benefit isn’t exclusive to Built for Shopify apps.

### Eligible for promotion on the App Store homepage and category pages

Your app is eligible to be recommended to merchants in the first collection that they see on the App Store homepage and category pages. This collection is personalized for each merchant, so your app isn't guaranteed to appear. This benefit isn’t exclusive to Built for Shopify apps.

![An image of an app in the first section of the Shopify App Store homepage.](https://shopify.dev/assets/assets/images/apps/store/quality/picked-for-you-Ck3caBcj.png)

### Eligible for discovery through the Shopify admin

You'll be eligible to be recommended to merchants in the **Picked for you** modal in the Shopify admin. This collection is personalized for each merchant, so your app isn't guaranteed to appear. This benefit isn’t exclusive to Built for Shopify apps.

### Eligible to be featured in story pages

Apps can be featured in story pages across various surfaces in the Shopify App Store, including the homepage, and in search, navigation, app categories, and the app’s listing. Story pages from Shopify help to educate merchants about how your app can help their business, inspire merchants by showing what’s possible with apps, and build trust by showing how real merchants succeed with apps. Being featured in a story page makes your app more visible, and more likely to be installed by merchants.

### Apply for Built for Shopify status

To achieve Built for Shopify status, you need to apply for your app to be evaluated by Shopify.

You can't apply for Built for Shopify status until you meet all of the [prerequisite achievement criteria](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria). These criteria are automatically evaluated on a regular basis.

After the prerequisite criteria are met, you can apply from the Partner Dashboard:

1. From the Partner Dashboard, go to **Apps** and then select your app from the list.
2. From your app's overview page, click **Distribution**.
3. In the **Apply for Built for Shopify status** section, click **Apply now**.

Only team members with the Manage apps permission can submit applications for Built for Shopify status.

he Shopify app review team will review your application, and will let you know if you need to address any issues before your application can be approved.

You must fix each issue as it's raised by the app review team. If you fail the same criterion three times in a row, then your application is suspended and you won't be able to apply again for three months.

### Maintaining Built for Shopify status

Apps are reviewed annually to ensure they continue to adhere to the Built for Shopify standards. Apps found to no longer adhere to Built for Shopify standards will be notified by email, and will have 60 days to rectify any failures that arise.

### Losing Built for Shopify status

You can lose Built for Shopify status after it's granted if you fail to meet certain criteria on an ongoing basis. [Learn more about why you might lose Built for Shopify status](https://shopify.dev/docs/apps/launch/built-for-shopify/regain-lost-status).

***

## Other achievements

While you work toward Built for Shopify status, you can earn smaller achievements that grant you unique benefits:

* [App highlights](#app-highlights)
* [In the spotlight](#in-the-spotlight)
* [Story pages](#story-pages)
* [Increased visibility on key merchant surfaces](#increased-visibility-on-key-merchant-surfaces)

### App highlights

When your app meets the relevant criteria, we display a highlight on your app listing. These highlights make it easier for merchants to identify high-quality apps. Depending on your app’s functionality, it might qualify for the following app highlights:

* **Built for your business: Works with the latest themes**. This highlight tells users that your app is compatible with Online Store 2.0 themes. These apps are easy to install and enable, offer app block functionality where applicable, and uninstall cleanly.

  **Mandatory:**

  Requirements for the "Works with the latest themes" app highlight

  * (Storefront apps only) [Uninstalls cleanly: uses theme app extensions](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#provide-a-clean-uninstall-including-all-theme-app-extensions)
  * [Minimizes impact on checkout speed](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#minimize-the-impact-on-checkout-speed)

* **Built for your business: Use directly in the Shopify admin**. This highlight tells users that your app is embedded and offers a streamlined workflow.

  **Mandatory:**

  Requirements for the "Use directly in the Shopify admin" app highlight

  * [The app is embedded in the Shopify admin](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#embed-the-app-in-the-shopify-admin)

All apps are automatically assessed to determine whether they meet the criteria for the highlight on a regular basis. If you meet the criteria, then the highlight is automatically added to your app listing. You can check whether your app meets these criteria on the **Distribution** page of your Partner Dashboard.

**Note:**

It might take a few days for the highlight to appear on your app listing after the criteria are met.

![The highlights section on the app listing page.](https://shopify.dev/assets/assets/images/apps/store/quality/highlights-CNYb1dah.png)

### In the spotlight

**In the spotlight** is a curated collection of notable, high-quality apps that appears on the Shopify App Store homepage. Being featured in this section makes your app more visible, and more likely to be installed by merchants.

When you meet the criteria for this achievement, your app becomes eligible to be promoted in the **In the spotlight** section. Our app review team selects eligible apps to be featured every week.

**Note:**

Meeting the achievement criteria makes you eligible to be featured in the **In the Spotlight** section. Your app isn’t guaranteed to be selected.

**Mandatory:**

* [Good Partner standing](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-good-partner-standing)
* [Meets App Store requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist)
* (Storefront apps only) [Uninstalls cleanly: uses theme app extensions](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#provide-a-clean-uninstall-including-all-theme-app-extensions)

![An example of an In the spotlight section.](https://shopify.dev/assets/assets/images/apps/store/quality/in-the-spotlight-D_6U7LEZ.png)

### Story pages

Apps can be featured in story pages across various surfaces in the Shopify App Store, including the homepage, and in search, navigation, app categories, and the app’s listing. Story pages from Shopify help to educate merchants about how your app can help their business, inspire merchants by showing what’s possible with apps, and build trust by showing how real merchants succeed with apps. Being featured in a story page makes your app more visible, and more likely to be installed by merchants.

Only apps that meet the following criteria are eligible to be featured in story pages.

**Mandatory:**

* (Storefront apps only) [Uninstalls cleanly: uses theme app extensions](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#provide-a-clean-uninstall-including-all-theme-app-extensions)
* [Minimum number of installs](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-number-of-installs)
* [Minimum number of reviews](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-number-of-reviews)
* [Minimum app rating](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-app-rating)

![An example of a story page on the Shopify App Store.](https://shopify.dev/assets/assets/images/apps/store/quality/story-pages-CVGg4uIU.png)

### Increased visibility on key merchant surfaces

Shopify surfaces apps to merchants in many ways. Increased visibility makes your app more visible, and more likely to be installed by merchants.

When you earn this achievement, you’ll get a search ranking boost, and become eligible for promotion on key merchant surfaces, including:

* The first collection in the App Store homepage
* The Shopify admin **Picked for you** modal
* App recommendations in Sidekick

These surfaces are personalized for each merchant, so your app isn't guaranteed to appear.

**Mandatory:**

* [Good Partner standing](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-good-partner-standing)
* [Meets App Store requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist)
* (Storefront apps only) [Uninstalls cleanly: uses theme app extensions](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#provide-a-clean-uninstall-including-all-theme-app-extensions)
* [Minimizes impact on checkout speed](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#minimize-the-impact-on-checkout-speed)
* [Minimum number of installs](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-number-of-installs)
* [Minimum number of reviews](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-number-of-reviews)
* [Minimum app rating](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements#have-a-minimum-app-rating)

***

## Quality standards

We use the following standards to determine whether your app is high quality. Each standard has an impact on the merchant and customer experience, and the success of a merchant’s store.

Shopify offers specific, actionable criteria to meet these quality standards. When you meet certain criteria, your app becomes eligible for Built for Shopify status, and other achievements. [Learn about the criteria that you need to meet to earn achievements](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria).

### Safety, security, and reliability

Merchants want to know that their apps are handling store data responsibly. Apps need to use certain APIs and extensions to ensure that they install and uninstall cleanly.

Apps also need to meet all [App Store requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist) on an ongoing basis and uphold the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms). There should be no outstanding infractions against the [Partner Program Agreement](https://www.shopify.com/partners/terms).

### Performance

Apps should perform quickly and at scale for merchants and their customers. We measure how apps impact the performance of the Shopify admin. For a subset of apps, we also measure how your app impacts storefront and checkout performance.

### Ease of use

Apps should be intuitive, seamless, and well-integrated into the Shopify admin.

### Proven usefulness

We observe your app’s usefulness to merchants on a regular basis, using a rolling time window. We automatically gauge usefulness based on how many merchants installed your app, the number of reviews, and your app’s average rating.

### App info and benefits

The app listing is your first point of contact with a merchant, and it's where they'll go to determine whether your app is right for them. Your [app listing](https://shopify.dev/docs/apps/launch/app-requirements-checklist#5-app-listing) should be as complete as possible, and reflect your app's current functionality.

***

---


<!-- PAGE 2/53: Built for Shopify requirements -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/built-for-shopify/requirements -->

# Built for Shopify requirements

To qualify for Built for Shopify status, your app must meet the requirements listed below. Each requirement in this list helps your app meet our app quality standards. Some requirements are general and apply to all apps, and others apply to [specific categories of apps](#category-specific).

Along the way, you'll qualify for smaller achievements that grant you unique benefits. For details about the benefits of each achievement, refer to the [Built for Shopify overview](https://shopify.dev/docs/apps/launch/built-for-shopify#other-achievements).

**Changelog:**

For details about changes to the Built for Shopify requirements, refer to the [Built for Shopify changelog](https://shopify.dev/changelog?filter=built_for_shopify).

## 1. Prerequisites

Some prerequisites are automatically evaluated while others require manual validation. Visit your app's **Distribution** page in your [Partner Dashboard](https://www.shopify.com/partners) for a comprehensive breakdown.

#### 1.1 General

#### 1.1.1 Meet App Store requirements

The app needs to continue to meet the [requirements for distributing apps on the Shopify App Store](https://shopify.dev/docs/apps/launch/app-requirements-checklist).

Your app will be audited for these requirements when you apply for Built for Shopify status.

#### 1.1.2 Have a good Partner standing

The app needs to comply with the [Partner Program Agreement](https://www.shopify.com/partners/terms) and [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms). Your Partner Account must have no active or outstanding infractions. Resolving an outstanding infraction is the first step in getting your account back into Good Partner standing, however, even after resolving issues, previous violations can still temporarily impact your BFS status depending on their severity and frequency. Read more about [Enforcement of Shopify's Partner Program Policies](https://help.shopify.com/en/partners/faq/removal).

#### 1.2 Merchant utility

#### 1.2.1 Have a minimum number of installs

Your app must have a minimum of 50 net installs from active shops on paid plans.

#### 1.2.2 Have a minimum number of reviews

Your app must have a minimum of five reviews.

#### 1.2.3 Have a minimum app rating

Your app must meet a minimum recent app rating threshold in the Shopify App Store.

## 2. Performance

[Optimizing your app for performance](https://shopify.dev/docs/apps/build/performance) directly influences conversion rates, repeat business, and search engine rankings.

#### 2.1 Admin performance

Shopify uses [Web Vitals](https://web.dev/articles/vitals) to determine the performance of your app in the Shopify admin. To enable Shopify to gather Web Vitals metrics, your app needs to use the [latest version of App Bridge](https://shopify.dev/docs/api/app-bridge-library#getting-started).

Learn how to measure your app's performance in the Shopify admin using [Web Vitals](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#improve-your-apps-loading-performance)

When your app loads in the Shopify admin, it needs to meet Web Vitals targets for the following metrics, at the 75th percentile of page loads:

#### 2.1.1 Minimize Largest Contentful Paint (LCP)

Your app's [Largest Contentful Paint (LCP)](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#largest-contentful-paint) is 2.5 seconds or less. Your app needs to have a minimum of 100 calls for LCP over the last 28 days to be assessed.

#### 2.1.2 Minimize Cumulative Layout Shift (CLS)

Your app's [Cumulative Layout Shift (CLS)](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#cumulative-layout-shift) is 0.1 or less. Your app needs to have a minimum of 100 calls for CLS over the last 28 days to be assessed.

#### 2.1.3 Minimize Interaction to Next Paint (INP)

Your app's [Interaction to Next Paint (INP)](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#interaction-to-next-paint) is 200 milliseconds or less. Your app needs to have a minimum of 100 calls for INP over the last 28 days to be assessed.

#### 2.2 Storefront performance

#### 2.2.1 Minimize the impact on store speed

Your app must not reduce the storefront Lighthouse performance score by more than ten points.

#### 2.3 Checkout performance

#### 2.3.1 Minimize the impact on checkout speed

You need to [optimize how your app fetches and stores carrier rates](https://shopify.dev/docs/apps/build/performance/checkout) to minimize impact on checkout speed.

For Shopify to assess your impact on checkout speed, your app must make a minimum of 1000 requests over the last 28 days.

Your requests must have a p95 value of 500ms or less, with a 0.1% failure rate.

## 3. Integration

Design your app so that all of its primary functionality is available within the Shopify admin. [Integrating your app into the Shopify admin](https://shopify.dev/docs/apps/build/integrating-with-shopify) makes it feel familiar, gives you access to Shopify UI elements, and lets users use it easily on mobile devices.

#### 3.1 Embedded apps

#### 3.1.1 Embed the app in the Shopify admin

Apps should be embedded in the Shopify admin using the latest version of [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge) by adding the `app-bridge.js` script tag to the `<head>` of every document of your app. Use [session token authentication](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens) to further optimize the merchant's experience.

Embedding your app in the Shopify admin makes your app feel familiar, gives you access to Shopify UI elements, and lets merchants use your app more easily on mobile devices.

Apps should not embed external web pages. For example, an app named Puzzlify should not have an embedded [app home](https://shopify.dev/docs/apps/build/admin#app-home) that looks identical to the puzzlify.com website.

#### 3.1.2 Keep primary app workflows within Shopify

By default, apps should be embedded in the Shopify admin with the latest version of [App Bridge](https://shopify.dev/docs/api/app-bridge). Merchants should be able to complete primary app workflows inside the Shopify admin. Merchants shouldn't need to access an external website or external surface to complete a primary workflow.

[Exceptions](https://shopify.dev/docs/apps/build/integrating-with-shopify#exceptions) apply on apps that need a standalone site to provide more complex features in a user-friendly way. An example is messaging apps, where users need to continuously monitor their conversation inbox, while accessing other areas of the Shopify admin.

#### 3.1.3 Enable seamless sign up based on Shopify credentials

Apps should make sign up seamless for merchants, without requiring an additional login or sign-up prompt. Users should be able to start using the app immediately after installing it, without having to complete another sign up.

[Exceptions](https://shopify.dev/docs/apps/build/integrating-with-shopify#exceptions) apply on apps that can't be easily accessed by merchants in a self-service manner and require a more complex sign-up, which often involves a business-to-business contract.

In these cases, the app's onboarding in the Shopify admin must first ask merchants to connect their store to their existing credentials. If your app offers both self-service and business-to-business sign up, then the onboarding must include an option to sign up for the service using the merchant's existing Shopify credentials.

#### 3.1.4 Include simplified monitoring or reporting

Expose key metrics that are helpful for merchants on the app's home page. If your app includes monitoring or complex reports that can only exist on an external website or app surface, then you must include a simplified version of the monitoring or reporting in the Shopify admin.

#### 3.1.5 Keep third-party connection settings within Shopify

Any settings or configurations that control the connection between Shopify and a third-party system must be available inside the Shopify embedded app interface.

For instance, when merchants link a social media account, they should have the ability to connect and disconnect it through the Shopify admin at any time.

#### 3.2 Installation and asset management

#### 3.2.1 Provide a clean uninstallation process

If your app is meant to be used in a merchant's online store, then you need to use [theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions) to build the elements to be included in the theme.

Theme app extensions allow apps to integrate with themes seamlessly, without injecting code into the theme. When merchants uninstall apps, blocks that are associated with the apps are automatically and entirely removed from online store themes.

#### 3.2.2 Doesn't use the Asset API to create, modify, or delete files

Your app shouldn't add, remove, or edit a merchant's theme files. There are three exceptions to this rule:

* Your app is a page builder app that adds or replaces all layouts or templates files with the purpose of providing an alternative theme customization experience.
* Your app backs up all theme files, and restores files from a backup.
* Your app primarily provides search engine optimization, content locking, or developer tooling functionality. You can still use the [Asset API](https://shopify.dev/docs/apps/build/online-store/asset-legacy) to read theme files.

Your app will be audited for Asset API usage when you apply for Built for Shopify status.

## 4. Design

The design of your app should not result in merchants feeling confused, stressed, or misled. Instead, your app should be designed to feel [familiar](#familiar), [helpful](#helpful), and [user-friendly](#user-friendly).

#### 4.1 Familiar

Your app generally looks and behaves like the Shopify admin. It offers merchants a predictable and familiar experience. Your app should leverage Shopify [App Bridge](https://shopify.dev/docs/api/app-bridge) where appropriate.

#### 4.1.1 Follow UX best practices

Your app's UI should mimic Shopify's core look and feel to ensure merchants experience a consistent and familiar environment.

![An annotated app home page with callouts for admin button styles, consistent spacing and most content is in a card](https://shopify.dev/images/apps/bfs-requirements/follow-ux-best-practices.png)

Show reasons for rejection

1. UI is generally buggy and/or unpolished. For example, content flickers, repeatedly loads in/out, or causes other content on the page to excessively shift around.
2. The majority of content does not reside in card-like containers where the container looks similar to the Shopify admin cards.
3. Button styles do not match the Shopify admin. For example, primary buttons are a completely different color than Polaris, such as green or purple.
4. A serif or script font is used for the majority of content.
5. Body text size is significantly different from the text size used throughout the Shopify admin.
6. An app's background color is significantly different from the Shopify admin. For example, an app has a black background.
7. Interacting with tabs in a tab group modifies content above the tabs.
8. In a group or list, some items feature icons while others do not.
9. An app's layout spacing is significantly different from the spacing used throughout the Shopify admin.
10. An app's text does not meet basic [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=141#contrast-minimum) contrast requirements.
11. A sub-page of an app does not offer a back button to the parent page.

#### 4.1.2 Mobile-friendly

Design your app to be responsive and adapt to different screen sizes and devices.

![A responsive app on a desktop and mobile device.](https://shopify.dev/images/apps/bfs-requirements/mobile-friendly.png)

Show reasons for rejection

1. On a mobile device, an entire page requires horizontal scrolling.
2. On a mobile device, some content is entirely inaccessible. For example, content is collapsed with no mechanism to expand, or content does not wrap and has no mechanism to scroll horizontally to reveal the obscured portions.
3. On a mobile device, some content appears unreasonably condensed. For example, a two column layout on a desktop device, remains as a two-column layout on a mobile device rather than the two columns stacking.

#### 4.1.3 Concise app name

App names in the admin should not truncate in the Shopify navigation menu.

![The app name, which reads "Puzzlify" and is entirely visible.](https://shopify.dev/images/apps/bfs-requirements/concise-app-name.png)

Show reasons for rejection

1. On a desktop device, when pinned (i.e. the pin icon is no longer visible), the app name is truncated with ellipsis in the Shopify navigation menu.

#### 4.1.4 Use the nav menu

Use the App Bridge [s-app-nav](https://shopify.dev/docs/api/app-home/app-bridge-web-components/s-app-nav) to integrate your app's primary navigation into the Shopify admin navigation menu.

![An app nav with concisely-labeled items like "Templates", "Photos", "Puzzles", and "Examples".](https://shopify.dev/images/apps/bfs-requirements/use-the-nav-menu.png)

Show reasons for rejection

1. An app has its own navigation menu instead of using the Shopify admin navigation menu.
2. Navigating to a sub-page fails to highlight the relevant parent navigation item. For example, navigating to the "Puzzles" sub-page of the "Templates" navigation item does not highlight the "Templates" navigation item.
3. An app has a separate navigation item in addition to the app name that redirects to the app's homepage. Instead, the app name should point at the app's homepage. This is controlled in the Partner Dashboard, under Configuration > URLs > App URL.
4. An app renders emojis within the Shopify admin navigation menu.

#### 4.1.5 Use the contextual save bar

Form inputs should generally be saved using the App Bridge [Contextual Save Bar](https://shopify.dev/docs/api/app-home/apis/save-bar) (CSB).

![The contextual save bar visible at the top of the page. The bar indicates that there are unsaved changes, and includes buttons to discard or save changes.](https://shopify.dev/images/apps/bfs-requirements/use-the-contextual-save-bar.png)

Show reasons for rejection

1. A form does not integrate with the CSB when it would be reasonable to do so. For example, an editor to customize a theme announcement bar has its own save button, but fails to integrate with the CSB.
2. When the CSB is present, a merchant is able to navigate away from the corresponding form without first being forced to interact with the CSB's "Save" or "Discard" buttons.

#### 4.1.6 Use modals appropriately

In a [s-modal](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal), use the [heading](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal#properties-propertydetail-heading) attribute to display the modal's title and the [primary-action](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal#slots-propertydetail-primaryaction) and [secondary-actions](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal#slots-propertydetail-secondaryactions) slots to display the modal's call-to-action buttons.

![A modal header with a secondary button labeled "Change puzzle template" and a primary button labeled "Save".](https://shopify.dev/images/apps/bfs-requirements/use-modals-appropriately.png)

Show reasons for rejection

1. In a [s-modal](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal), the primary and/or secondary modal action buttons appear somewhere other than within the component [slots](https://shopify.dev/docs/api/app-home/polaris-web-components/overlays/modal#slots).
2. A modal uses the deprecated [Polaris Fullscreen bar component](https://polaris-react.shopify.com/components/deprecated/fullscreen-bar) instead of the [s-app-window](https://shopify.dev/docs/api/app-home/app-bridge-web-components/app-window) and [s-page](https://shopify.dev/docs/api/app-home/app-bridge-web-components/title-bar) components.

#### 4.2 Helpful

Your app generally works well and is easy to use. The steps required to set up and implement your app's core workflow should be clear and easy to follow. The process should be free of errors and bugs. If error messages are necessary, they should be clear and the method to rectify any errors should be obvious.

#### 4.2.1 Spelling, grammar and phrasing

Apps must use clear and easy to understand language, proper grammar, and proper spelling throughout.

![The Polaris grammar and mechanics page, which explain guidelines for using special characters, dates, numbers, and measurements.](https://shopify.dev/images/apps/bfs-requirements/spelling-grammar-and-phrasing.png)

Show reasons for rejection

1. One or more prominent spelling or grammatical errors (even if the meaning can still easily be inferred), where "prominent" refers to copy within headings, navigation items or calls to action (e.g. button labels).
2. Phrases, headings, labels or calls to action that are difficult to understand and/or lack sufficient context. For example, a text input with the label "Time" with no explanation of what unit of time is expected.

#### 4.2.2 Helpful onboarding

Apps should have a concise onboarding experience that helps merchants establish the app's core functionality.

![Onboarding screen welcoming merchants to the Puzzlify editor, with onboarding steps presented in separate, dismissible cards. Each card has a title, body text, and a button that merchants can click to complete the onboarding step.](https://shopify.dev/images/apps/bfs-requirements/helpful-onboarding.png)

Show reasons for rejection

1. An app's onboarding does not sufficiently guide merchants to completion.
2. An app's onboarding is not concise.
3. An app's onboarding is difficult to locate, for example, onboarding is collapsed or appears out of view.
4. It is implied or strongly suggested that installing an additional app is a required onboarding step. For example, a setup guide that features a primary button to install another app.
5. An app asks for merchant information without providing clear justification. For example, asking "What types of products do you sell" without any supporting copy, such as, "We'll use this information to automatically recommend appropriate templates".
6. After onboarding has been completed, there is no mechanism to remove UI related to onboarding.

#### 4.2.3 Helpful homepage

Your homepage should clearly indicate if the app is set up and working, and, if possible, indicate how well the app is performing.

![An app home page with a dismissible informational banner in blue about USPS rate changes, and another app home page with a section titled "This week's puzzle performance", with two graphs.](https://shopify.dev/images/apps/bfs-requirements/helpful-homepage.png)

Show reasons for rejection

1. An app has an app block and/or app embed to be activated in a theme but fails to communicate the corresponding status(es) on the app's homepage using [app.extensions()](https://shopify.dev/docs/api/app-home/apis/app#extensions).
2. An app fails to include any metrics or analytics on the homepage when there are obvious metrics that would be helpful to merchants. For example, an email marketing app fails to display metrics related to open rates, engagement rates and/or recent campaigns.
3. After dismissing any and all dismissible elements, an app's homepage only contains static content. For example, a homepage only displays links to other parts of the app or a static welcome message.

#### 4.2.4 Helpful error messages

Errors should be red, guide merchants to solutions, and appear next to relevant fields when possible.

![A form field filled with an email address that currently has a typo. An error message that explains the specific issue displays underneath the form.](https://shopify.dev/images/apps/bfs-requirements/helpful-error-messages.png)

Show reasons for rejection

1. An error message automatically disappears from view after a set amount of time has elapsed. For example, an error message is displayed in a toast, which automatically disappears after 5 seconds.
2. An error message appears in a color other than red.
3. A field is highlighted in red but does not have a corresponding error message.
4. A contextual error is not displayed contextually. For example, a "Must be a valid email address" error is displayed at the top of the page rather than directly below the relevant form field.
5. One or more form fields display an error prior to any merchant interaction.

#### 4.2.5 Guide merchants to logical actions

When presenting a group of related actions, the most logical action should appear visually dominant.

![A dialog box that reads "Your template has unsaved changes. Changes will be lost if you leave without saving". There's a primary button that's labeled "Save Changes" and a secondary button that's labeled "Leave without saving".](https://shopify.dev/images/apps/bfs-requirements/guide-merchants-to-logical-actions.png)

Show reasons for rejection

1. In a button group with related actions, all buttons are presented with the same visual treatment. For example, a button group contains two secondary buttons labelled "Save changes" and "Leave without saving".
2. In a button group, the most visually prominent button doesn't represent the most logical next action. For example, in a button group with "Save changes" and "Leave without saving", the "Leave without saving" button is more visually prominent.

#### 4.2.6 Visible previews

If an app allows merchants to customize something visual, merchants must be able to see their changes in real-time.

![A two column layout with a preview and corresponding editor form fields.](https://shopify.dev/images/apps/bfs-requirements/visible-previews.png)

Show reasons for rejection

1. An app allows merchants to customize something visual but fails to provide a live-preview.
2. On a desktop device, a merchant cannot simultaneously view editor controls and the corresponding preview. For example, a merchant must toggle between the editor and preview, or a merchant must scroll up/down to toggle between viewing the editor and preview.

#### 4.3 User-friendly

Your app doesn't mislead, pressure or overwhelm merchants. Your app should not implement [dark patterns](https://en.wikipedia.org/wiki/Dark_pattern). Deceptive or manipulative practices erode merchant trust in your app and in Shopify.

#### 4.3.1 Don't make false claims

Don't guarantee, promise, or strongly suggest merchant outcomes.

![A dismissible warning banner in yellow that reads "Double your revenue by switching to Puzzlify Pro now". The banner includes a button that's labeled "Upgrade to Pro".](https://shopify.dev/images/apps/bfs-requirements/dont-make-false-claims.png)

Show reasons for rejection

1. An app includes language that states a merchant outcome. For example, "Upgrade to the Pro plan to increase your sales by 18%".
2. An app displays a promotion of another app which includes an average star rating of 4.5 stars. However, in the app store, the promoted app actually has a significantly different average rating of only 3 stars.

#### 4.3.2 Don't pressure merchants

Don't pressure merchants with visible timers, language that could cause guilt or shame, or offer rewards for 5-star reviews.

![A dismissible informational banner in blue, with a message notifying merchants that they have three days left to unlock a pro version of the app if they leave a 5-star review in the app store. The banner includes a button that's labeled "Leave a 5-star review".](https://shopify.dev/images/apps/bfs-requirements/dont-pressure-merchants.png)

Show reasons for rejection

1. An app offers a 7-day free trial. The app displays an animated countdown timer and encourages merchants to upgrade to a paid plan.
2. An app features calls to action that could reasonably make a merchant feel guilt or shame. For example, forcing merchants to click a button labelled "No thanks, I prefer less sales" to sign-up for a lower-tier plan.

#### 4.3.3 Don't distract merchants

Don't distract merchants with unnecessary animations, modals, popovers, or colors.

![A series of separate pages that all contain the same marketing message.](https://shopify.dev/images/apps/bfs-requirements/dont-distract-merchants.png)

Show reasons for rejection

1. A modal or popover automatically appears on page load, after a set time has elapsed, or as a result of an unrelated merchant action. For example, a “Get started” or “Live chat” popover appears on page load, or a “Leave us a review” modal appears after three seconds has elapsed.
2. A large element like a banner or card dramatically animates into view on page load, after a set time has elapsed, or as a result of an unrelated merchant action.
3. Animation is used to draw attention and is unrelated to a merchant action. For example, an "Upgrade to Pro" button wiggles.
4. Red is used for a purpose unrelated to error messaging or a destructive action.

#### 4.3.4 Don't overwhelm merchants

Don't overwhelm merchants with poorly organized forms, overwhelming amounts of text, or multiple banners.

![A card with a very long paragraph of text.](https://shopify.dev/images/apps/bfs-requirements/dont-overwhelm-merchants.png)

Show reasons for rejection

1. A single large and complex form is presented to merchants, rather than a form with fields subdivided into logical groupings.
2. Two or more banners appear in close proximity to one another. For example, at the top of a page or within a single card.
3. An app prominently features large amounts of text (i.e. multiple paragraphs), rather than concise and easily scannable copy. For example, an app displays a card with two paragraphs of text on the app homepage to welcome merchants.

#### 4.3.5 Don't impersonate Shopify

Don't do anything that might reasonably lead a merchant to mistake your app (or a feature of your app) for a [first-party Shopify app](https://apps.shopify.com/partners/shopify) or for Shopify itself.

![An icon that uses the Shopify logo for the app's branding.](https://shopify.dev/images/apps/bfs-requirements/dont-impersonate-shopify.png)

Show reasons for rejection

1. An app's icon could reasonably be mistaken for a [first-party Shopify app](https://apps.shopify.com/partners/shopify) icon. For example, an app icon features a striking similar gradient background to a first-party Shopify app icon.
2. An app uses the [Shopify Sidekick icon](https://www.shopify.com/ca/magic) and/or a color similar to [Shopify's magic purple color](https://polaris.shopify.com/tokens/color#color-bg-fill-magic) to denote an AI related feature.

#### 4.3.6 Dismissible ads

Advertisements and/or promotional content must be dismissible by merchants.

![A promotional message with the "X" icon for dismissing the screen highlighted in the upper right corner.](https://shopify.dev/images/apps/bfs-requirements/dismissible-ads.png)

Show reasons for rejection

1. Promotional content is not dismissible.
2. Promotional content is dismissible, however, after being dismissed the same (or similar) content later appears again.

#### 4.3.7 Label and disable premium features

Features that are gated by a particular plan, must be disabled (both visually and functionally) and clearly indicated. Features exclusive to [Shopify Plus](https://www.shopify.com/ca/plus) must be hidden for non-Plus merchants.

![Greyed out paid-tier features with a link to upgrade to a paid or premium plan. The page includes a button that's labeled "Preview".](https://shopify.dev/images/apps/bfs-requirements/label-and-disable-premium-features.png)

Show reasons for rejection

1. A plan-gated feature is interactive and appears visually enabled. It is only later revealed (e.g. upon form submission) that the feature actually requires merchants to pay for a more expensive plan.
2. A plan-gated feature is interactive but visually appears disabled.
3. A plan-gated feature is non-interative but visually appears enabled.
4. A feature that is exclusive to [Shopify Plus](https://www.shopify.com/ca/plus) merchants is visible to non-Plus merchants.
5. When an app offers multiple tiers and it is not obvious which specific tier is required to unlock a specific feature.

## 5. Category-specific

Not all apps are the same. A great app for one workflow uses different APIs, has different extensions, and looks different from an app for another workflow. Category-specific requirements ensure that apps excel in meeting unique user needs.

If your app belongs to one of the categories listed below, then it must meet all of the criteria listed for that category.

#### 5.1 Ads apps

Any app that enables merchants to create and manage digital advertising campaigns to promote their stores and products.

#### 5.1.1 Use web pixels for ads apps

If your app provides ad attribution, audience creation, segmentation, analytics, pixels, retargeting, or lookalike targeting, it must create and use [Web Pixel extensions](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels) to subscribe to relevant events emitted by Shopify when needed. You may not use script tags or require merchants to copy JavaScript into their stores in order to gather this data.

#### 5.1.2 Use Shopify segments for ads apps

Your app must allow merchants to use any segment defined in the Shopify admin when targeting advertisements or any other operation that targets multiple customers. It must also make these actions available through a [customer segment action extension](https://shopify.dev/docs/apps/build/marketing-analytics/customer-segments/build-an-action-extension).

#### 5.2 Affiliate program apps

Any app that enables merchants to create and manage systems for influencers to promote their products for commissions.

#### 5.2.1 Use web pixels for affiliate program apps

Your app must create and use [Web Pixel extensions](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels) to subscribe to relevant events emitted by Shopify when needed. You may not use script tags or require merchants to copy JavaScript into their stores in order to gather this data.

#### 5.3 Analytics apps

Any app that provides merchants with data-driven insights about their store's performance.

#### 5.3.1 Use web pixels for analytics apps

Your app must create and use [Web Pixel extensions](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels) to subscribe to relevant events emitted by Shopify when needed. You may not use script tags or require merchants to copy JavaScript into their stores in order to gather this data.

#### 5.4 Carrier services apps

Any app that connects to a [carrier service](https://shopify.dev/docs/api/admin-graphql/latest/queries/carrierService) (also known as a carrier calculated service or shipping service) to provide real-time shipping rates to buyers. [Learn more](https://shopify.dev/docs/apps/build/performance/checkout#limit-calls-to-retrieve-carrier-rates) about how to optimize your app's carrier rates performance. To assess your app's performance, you must make a minimum of 1000 requests in the last 28 days.

#### 5.4.1 Respond quickly to rate requests

Over the last 28 days, the carrier rate endpoint provided by your app must respond in fewer than 500 milliseconds for 95% of calls.

#### 5.4.2 Complete rate requests reliably

Over the last 28 days, the carrier rate endpoint provided by your app must successfully respond to 99.9% of requests.

#### 5.5 Discount apps

Any app that enables merchants to define and configure price reductions.

#### 5.5.1 Use discount primitives

Your app must either use [discount functions](https://shopify.dev/docs/apps/build/discounts#build-with-shopify-functions) to define custom discount types or use the native [discount APIs](https://shopify.dev/docs/apps/build/discounts#build-with-the-graphql-admin-api) to create discounts.

#### 5.5.2 Don't use draft orders with custom discounts

Your app must not create draft orders to give custom discounts. Drafts with custom discounts are designed for one-off merchant-driven flows rather than automated customer-driven flows and do not have the same reporting tools.

#### 5.5.3 Use a single redeem code per discount

Your app must use the [`discountRedeemCodeBulkAdd`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountRedeemCodeBulkAdd) mutation to create any discounts with multiple redeem codes.

Instead of creating separate discounts with the same value and different codes through the GraphQL Admin API, using [`discountRedeemCodeBulkAdd`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountRedeemCodeBulkAdd) ensures that all codes are linked to the same discount characteristics, making it easier to manage and update them as needed.

#### 5.5.4 Create high quality links

All [links to your app](https://shopify.dev/docs/apps/build/functions/input-output/metafields-for-input-queries#creating-your-merchant-interface) from the Create discount button on the Discounts page must direct to a page in your embedded app where merchants can create the corresponding discount. These pages must follow all relevant [App Design Guidelines](https://shopify.dev/docs/apps/design).

#### 5.6 Email marketing apps

Any app that enables merchants to communicate with customers via targeted email campaigns.

#### 5.6.1 Use web pixels for email marketing apps

If your app provides automation, segmentation, analytics, or pixels, it must create and use [Web Pixel extensions](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels) to subscribe to relevant events emitted by Shopify when needed. You may not use script tags or require merchants to copy JavaScript into their stores in order to gather this data.

#### 5.6.2 Sync customer data for email marketing apps

Your app must sync all [customer](https://shopify.dev/docs/api/admin-graphql/latest/mutations/customerCreate) information to and from Shopify as required by the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms#2-using-the-shopify-a-p-i).

#### 5.6.3 Use Shopify segments for email marketing apps

Your app must allow merchants to use any segment defined in the Shopify admin when targeting advertisements or any other operation that targets multiple customers. It must also make these actions available through a [customer segment action extension](https://shopify.dev/docs/apps/build/marketing-analytics/customer-segments/build-an-action-extension).

#### 5.6.4 Help merchants to identify visitors to their store for email marketing apps

Your app must use the [visitors API](https://shopify.dev/docs/api/web-pixels-api/emitting-data#visitor-api) to log identifying information, such as emails or phone numbers, for any customers that provide this information on the Online Store.

#### 5.7 Forms apps

Any app that enables merchants to create custom fields for customers to submit personal information, preferences, or inquiries on their stores.

#### 5.7.1 Use Shopify segments for forms apps

Your app must allow merchants to use any segment defined in the Shopify admin when targeting advertisements or any other operation that targets multiple customers. It must also make these actions available through a [customer segment action extension](https://shopify.dev/docs/apps/build/marketing-analytics/customer-segments/build-an-action-extension).

#### 5.7.2 Help merchants to identify visitors to their store for forms apps

Your app must use the [visitors API](https://shopify.dev/docs/api/web-pixels-api/emitting-data#visitor-api) to log identifying information, such as emails or phone numbers, for any customers that provide this information on the Online Store.

#### 5.7.3 Sync customer data for forms apps

Your app must sync all [customer](https://shopify.dev/docs/api/admin-graphql/latest/mutations/customerCreate) information to and from Shopify as required by the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms?shpxid=ac3fdf09-06C8-4EDF-2E7D-89B9F4124FC3#2-using-the-shopify-a-p-i).

#### 5.8 Fulfillment services apps

Any app that uses its own location to prepare and ship orders on behalf of merchants.

#### 5.8.1 Actively fulfill orders

Your app must be active and have fulfilled 100 or more [fulfillment orders](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder) in the last 28 days. If an app is not active, then it's not possible to accurately assess the other criteria for fulfillment services apps.

#### 5.8.2 Complete fulfillment orders

Your app must have completed 99% of the [fulfillment orders](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder) assigned to it in the last 28 days. New fulfillment orders that were created in the last 7 days are excluded. A fulfillment order is considered incomplete if it's in one of the following states:

* `open`, `submitted`
* `in_progress`, `accepted`
* `in_progress`, `rejected`
* `in_progress`, `cancellation_rejected`
* `in_progress`, `cancellation_requested`

#### 5.8.3 Respond to callback requests

In the last 28 days, your app must have responded successfully to 99% of Shopify [callback requests](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentService) that are sent to it, so merchants are not alerted to failing callback requests.

#### 5.8.4 Wait for merchant requests

Your app must only fulfill fulfillment orders after a [merchant requests](https://shopify.dev/docs/api/admin-graphql/latest/enums/FulfillmentOrderStatus) fulfillment.

#### 5.8.5 Add tracking information

In the last 28 days, your app must have [added tracking information](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentTrackingInfoUpdateV2) to 80% of the fulfillments that it creates within one hour of creation.

In cases where precise tracking information isn't available from a shipping carrier URL, you can provide a custom URL to your app's site by:

* Using [`fulfillmentCreateV2`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreateV2) to populate `fulfillment.trackingInfo.company` and `fulfillment.trackingInfo.url(s)` at the time of creation, OR
* Using [`fulfillmentTrackingInfoUpdateV2`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentTrackingInfoUpdateV2) to mutate an existing entry and populate `trackinigInfoInput.company` and `trackingInfoInput.url(s)`.

#### 5.8.6 Respond to fulfillment requests

In the last 28 days, your app must have responded to 99% of fulfillment requests within four hours by either [accepting](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderAcceptFulfillmentRequest) or [rejecting](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderRejectFulfillmentRequest) the fulfillment request.

#### 5.8.7 Respond to cancellation requests

In the last 28 days, your app must have responded to 99% of cancellation requests within 1 hour by either [accepting](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderAcceptCancellationRequest) or [rejecting](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderRejectCancellationRequest) the cancellation request.

#### 5.9 Invoices and receipts apps

Any app that generates invoices or packing slips for orders.

#### 5.9.1 Enable printing on orders pages

Your app must use an [admin print action extension](https://shopify.dev/docs/apps/build/admin/actions-blocks) to let merchants print invoices or packing slips for an individual order directly from the orders detail page as well as for any selected orders from the orders index page.

#### 5.10 Product bundles apps

Any app that groups products together to be sold as a single unit.

#### 5.10.1 Use bundles primitives

Your app must either use the GraphQL Admin API to create [static bundles](https://shopify.dev/docs/apps/build/product-merchandising/bundles/add-fixed-bundle) or use a `cartTransform` function to create [customized bundles](https://shopify.dev/docs/apps/build/product-merchandising/bundles/add-customized-bundle).

However, if your app supports a bundles use case that is not yet supported through these APIs — such as selling bundles on unsupported sales channels, selling bundles as a part of a subscription, or editing orders to add or remove bundles after purchase — you may use other methods to create a bundle.

#### 5.11 Product reviews apps

Any app that enables merchants to collect product reviews.

#### 5.11.1 Provide a flow trigger

Your app must provide a [Flow trigger](https://shopify.dev/docs/apps/build/flow/triggers/create) that starts a workflow whenever a new review is collected.

#### 5.11.2 Use block extensions

Your app must provide an [admin block extension](https://shopify.dev/docs/apps/build/admin/actions-blocks#admin-blocks) on customer detail pages that gives merchants access to any reviews submitted by the customer.

#### 5.12 Returns and exchanges apps

Any app that facilitates the process of managing and processing product returns, exchanges, and refunds for customers.

#### 5.12.1 Sync returns information

Your app must use the appropriate APIs to communicate all lifecycle events of a return to Shopify. These include:

* [Creating returns](https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnCreate)
* [Shipping creation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/reverseDeliveryCreateWithShipping)
* [Restocking](https://shopify.dev/docs/api/admin-graphql/latest/mutations/reverseFulfillmentOrderDispose)
* [Removing items from a return](https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnLineItemRemoveFromReturn)
* [Cancelling a return](https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnCancel)
* [Closing returns](https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnClose)
* [Providing refunds](https://shopify.dev/docs/api/admin-graphql/latest/mutations/refundCreate)

#### 5.12.2 Include exchange line items

Your app must create [exchange line items](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ExchangeLineItemInput) on an order when managing exchanges. You must also remove exchange lines from the order if they are no longer needed.

#### 5.12.3 Include shipping and restocking fees

Your app must add [shipping fees](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ReturnShippingFeeInput) and [restocking fees](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/RestockingFeeInput) on an order when applicable.

#### 5.13 SMS marketing apps

Any app that enables merchants to communicate with customers via targeted SMS campaigns.

#### 5.13.1 Use web pixels for SMS marketing apps

If your app provides automation, segmentation, analytics, or pixels, it must create and use [Web Pixel extensions](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels) to subscribe to relevant events emitted by Shopify when needed. You may not use script tags or require merchants to copy JavaScript into their stores in order to gather this data.

#### 5.13.2 Sync customer data for SMS marketing apps

Your app must sync all [customer](https://shopify.dev/docs/api/admin-graphql/latest/mutations/customerCreate) information to and from Shopify as required by the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms#2-using-the-shopify-a-p-i).

#### 5.13.3 Use Shopify segments for SMS marketing apps

Your app must allow merchants to use any segment defined in the Shopify admin when targeting advertisements or any other operation that targets multiple customers. It must also make these actions available through a [customer segment action extension](https://shopify.dev/docs/apps/build/marketing-analytics/customer-segments/build-an-action-extension).

#### 5.13.4 Help merchants to identify visitors to their store for SMS marketing apps

Your app must use the [visitors API](https://shopify.dev/docs/api/web-pixels-api/emitting-data#visitor-api) to log identifying information, such as emails or phone numbers, for any customers that provide this information on the Online Store.

#### 5.14 Subscription apps

Any app that enables customers to purchase products on a recurring basis.

#### 5.14.1 Use subscription objects and APIs

Your app must use the following subscriptions objects and APIs:

* [Selling plan API](https://shopify.dev/docs/api/admin-graphql/latest/objects/sellingplan) to create and manage various ways to sell and buy products
* [Subscription contract API](https://shopify.dev/docs/api/admin-graphql/latest/objects/subscriptioncontract) to create, manage, and update subscription agreements between a customer and merchant in real time
* [Customer payment method API](https://shopify.dev/docs/api/admin-graphql/latest/objects/customerpaymentmethod) to store payment methods that can be used to pay for future orders without requiring the customer to manually go through checkout

#### 5.14.2 Use theme app block extensions

Your app must add subscriptions on product detail pages by using an [app block for themes](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-blocks-for-themes) that is compatible with [Online Store 2.0](https://shopify.dev/docs/storefronts/themes/os20).

#### 5.14.3 Follow subscriptions UX guidelines

Your app must obey the following [subscriptions UX guidelines](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/subscription-ux-guidelines):

* The subscription information — including selling plan name, price, and savings — must be clearly displayed on the product, cart, and order detail pages.
* The subscription option information must automatically match the color palette, font, font-size, and font weight of the store's current theme by default.

#### 5.14.4 Use Customer Account UI extensions

Your app must use [Customer Account UI extensions](https://shopify.dev/docs/api/customer-account-ui-extensions) to enable customers to view and manage their subscriptions.

---


<!-- PAGE 3/53: Annual reviews -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/built-for-shopify/annual-reviews -->

# Built for Shopify annual reviews

Built for Shopify apps are reviewed annually to ensure they continue to adhere to all [Built for Shopify criteria](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria).

***

## When to expect a review

Your app will be added to the annual review queue about one year from its initial approval. You can expect reviews at around the same time each year.

***

## Review notifications

You’ll get an email notification when your annual review starts. The Partner Dashboard will also indicate that your app is in review.

***

## How long it takes

In general, it takes between a few days and a week to complete an annual review. This includes time spent in the review queue and the review itself.

***

## Getting your results

After the Built for Shopify reviewers have completed their review, you’ll get an email explaining the outcome.

***

## Successful reviews

If the review doesn’t find any issues with your app, then no further action is needed. Congratulations, your app is certified for another year!

***

## Failed reviews

If reviewers find issues with any new or existing criteria, then you’ll receive an email outlining those issues so you can fix them and resubmit your app. If any additional clarification is required, you may reply to the email to speak with the reviewer.

You have 60 days to fix any issues raised in the review and resubmit. Your app keeps its Built for Shopify status during the grace period.

If you don’t complete the required fixes and resubmit your app by the end of 60 days, then your app will have its Built for Shopify status removed. You can [re-apply for Built for Shopify status](https://shopify.dev/docs/apps/launch/built-for-shopify/regain-lost-status) at any time.

***

---


<!-- PAGE 4/53: Regain lost status -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/built-for-shopify/regain-lost-status -->

# Regain lost status

Your app can lose Built for Shopify status if it fails to meet any required criteria on an ongoing basis.

If your app loses Built for Shopify status, then you'll be notified by email, and/or through the Partner Dashboard.

You can monitor the automated criteria on the **Distribution** page of your Partner Dashboard to see if your app is at risk of losing status. Manually checked criteria are monitored on an ongoing basis via ongoing reviews of Built for Shopify certified apps

***

## Automated criteria

After 60 days of failure, you will lose your Built for Shopify status if your app doesn't meet the Shopify App Store requirements or any key quality standards. In addition, failing to meet these criteria may result in a quality check of your app.

* Uninstalls cleanly: uses theme app extensions
* App is embedded in the Shopify admin
* Minimizes impact on checkout speed
* Admin performance: meets 75th percentile Web Vitals targets
* Minimum number of installs
* Minimum number of reviews
* Minimum app rating

To determine whether your app is failing to meet any of these criteria, view the criteria checklist on the **Distribution** page of your [Partner Dashboard](https://partners.shopify.com/current/apps).

For more information about each of these criteria, refer to [Achievement criteria](https://shopify.dev/docs/apps/launch/built-for-shopify/achievement-criteria).

***

## Ongoing reviews

Apps are also monitored on an ongoing basis for all manually checked criteria. An app may be reviewed at any time. If issues are found, then apps will have 60 days to rectify any issues. Apps that don't address failures in time will have their Built for Shopify status removed.

***

## Annual reviews

Apps are reviewed annually to ensure they continue to adhere to the Built for Shopify standards. Apps found to no longer adhere to Built for Shopify standards will be notified by email, and will have 60 days to rectify any failures that arise. Apps that do not address failures in time will have their Built for Shopify status removed.

***

## Regain Built for Shopify status

You'll automatically regain Built for Shopify status as soon your app meets all of the criteria again. You don't need to reapply.

After you regain Built for Shopify status, your app might be checked to ensure compliance with all manually assessed criteria, and ensure that the app meets all current App Store requirements.

***

---


<!-- PAGE 5/53: Privacy requirements -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/privacy-requirements -->

# Privacy requirements

With privacy laws in jurisdictions such as the European Economic Area, United Kingdom, and United States, it's crucial for app developers who work with merchants to disclose all data collection and usage through a privacy policy. Privacy laws such as the General Data Protection Regulation (GDPR), California Privacy Rights Act (CPRA), Colorado Privacy Act, and Virginia's Consumer Data Protection Act clarify and impose obligations on any party that collects, processes, or stores personal data of an individual.

We've [discussed data privacy legislation on our blog](https://www.shopify.com/blog/ecommerce-laws) and how it affects our [merchants](https://help.shopify.com/en/manual/privacy-and-security/privacy), but privacy laws may also apply to developers that build Shopify apps.

We want to ensure that you're setting yourself up for success by complying with any applicable privacy laws and carefully considering what, if any, personal data your app requires, by subscribing to the [mandatory webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance), and by creating a [privacy policy](#app-privacy-policies) if required.

Privacy laws are complex, and will apply differently based on how personal data is collected, processed, or stored. If you have any concerns, then we strongly recommend consulting a lawyer about which privacy laws specifically apply to you.

**Caution:**

This page isn't intended to provide you with legal advice. It sets out Shopify's privacy requirements for app developers and items that you need to consider if you're handling personal data.

***

## App privacy policies

To help comply with privacy laws, and to gain merchant trust by clarifying exactly how merchant and buyer data is used, you must provide a privacy policy and link to it from your Shopify App Store listing. These requirements are the same for both [full and limited visibility](https://shopify.dev/docs/apps/launch/distribution/visibility) apps.

Certain privacy laws require businesses, including app businesses, to provide their customers and users with specific information about how their app or product collects and uses personal data.

We recommend that you include the following details in your app's privacy policy:

* What information do you collect through Shopify's APIs?
* What information do you collect directly from the merchant? For example, do you ask them for contact details? Do you ask them for information about the merchant's customers? Do you generate automated logs relating to the merchant's use of your app?
* What information do you collect directly from merchants' customers? For example, do you drop cookies or use other tracking technologies on their devices? Do you log information relating to how customers visit or navigate particular stores?
* How do you use the information you collect? Do you use this information for any purposes other than providing your app's services?
* For how long do you store or retain the data that you collect?
* Are you established in Europe? Are you storing or processing information outside of Europe?
* How can merchants contact you if they have additional questions? Some jurisdictions require that you also include a physical address.

**Note:**

Note: It is important to be transparent and provide clear details to individuals about how their personal data is collected, processed, and stored. If you have any concerns about how best to describe your app's data practices, then we recommend consulting with a lawyer about your specific needs.

***

## Data rights of individuals

In several jurisdictions, individuals have certain rights with respect to how their personal data is collected, stored, and used. To ensure that your app is legally compliant, it's crucial to consider the following:

* Individuals may have rights to access, correct, erase, and restrict how their personal data is processed. Have a process for receiving and responding to these requests.
* Privacy laws may impose restrictions on transferring data about individuals outside the country of origin, except under certain circumstances. For example, the GDPR requires that such transfers can only take place where there are adequate protections that are essentially equivalent to those in the European Economic Area (EEA). This could be through an adequacy decision, the use of standard contractual clauses, or the use of agreed transfer frameworks.
* Certain privacy laws, such as Singapore's Personal Data Protection Act (PDPA) or the EEA's GDPR, may require you to have a Data Protection Officer (DPO) or Privacy Officer to advise the company, in an independent manner, and monitor its compliance with applicable privacy laws.
* You should consider whether you're required to have a DPO/Privacy Officer, and whether you want to appoint one internally or if you want to use an outside consultant or firm. Note that there are certain requirements in order to be a DPO/Privacy Officer.

**Note:**

Note: If you have concerns about how privacy laws affect how you currently collect, process, and store personal data, then we suggest you consult with a lawyer.

***

## Consent for marketing apps

If your app provides marketing or advertising-related services, then you'll need to consider how privacy and marketing laws apply to you. How the laws apply to you depends on how your app uses data, but you'll need to consider the following:

* Whether you need to obtain consent, or ensure that consent has been obtained, from individuals to use their personal data for such purposes in certain jurisdictions.
* Whether you need to facilitate individuals opting out from such use of their personal data in certain jurisdictions.
* How you use personal data to generate any interest-based segments or inferences to target ads or marketing.

***

---


<!-- PAGE 6/53: Work with protected customer data -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/protected-customer-data -->

# Work with protected customer data

Privacy and data protection are critical foundations for ecommerce and are important to merchants and their customers. The [protected customer data requirements](#requirements) focus on data minimization, transparency, and security so that you can better support a merchant's path towards compliance with privacy and data protection rules.

When your app uses the [Admin API](https://shopify.dev/docs/api/admin-graphql) or the [Customer Account API](https://shopify.dev/docs/api/customer), the review process for your public, published app might require action as described in the following table:

| Level | Data use | Partner actions |
| - | - | - |
| 0 | No customer data | No action required |
| 1 | [Customer data](#protected-customer-data-api-types-and-resources) **excluding** name, address, phone, and email fields | * [Request access to protected customer data](#request-access-to-protected-customer-data) in the Partner Dashboard
* Implement level 1 [protected customer data requirements](#requirements) |
| 2 | [Customer data](#protected-customer-data-api-types-and-resources) **including** name, address, phone, or email fields | - [Request access to protected customer data and fields](#request-access-to-protected-customer-data) in the Partner Dashboard
- Implement level 1 and level 2 [protected customer data requirements](#requirements)
- Participate in [data protection reviews](#data-protection-review) |

Shopify will approve your app to use protected customer data if the requested data is the minimum amount required by your app to provide the merchant with the app functionality. If you're approved to access the data that you requested, then code updates aren't required. If you aren't approved to access the data that you requested, then you might need to update your app to handle errors or redacted data. For more information, refer to the [example API requests for protected customer data](#using-protected-customer-data).

While we encourage all apps to meet protected customer data requirements, access to the different levels can vary based on app types. See below:

| Level | Public app | Custom app | Admin created custom app |
| - | - | - | - |
| 1 | Requires review | Always available | Always available |
| 2 | Requires review | Always available | [Varies by plan](https://help.shopify.com/en/manual/apps/app-types/custom-apps#custom-level2-pii-app) |

To access customer data in development, select the data and fields you're using in the Partner Dashboard. You don't need to submit a request for review for apps that are installed only on development stores.

**Important:**

Partners are legally bound by the terms and conditions of the [Shopify Partner Program Agreement](https://www.shopify.com/partners/terms) and the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms), regardless of the API version that they're using. Protected customer data requirements aren't intended to replace the terms and conditions that you agree to as a Shopify Partner.

***

## Request access to protected customer data

**Note:**

Before you can request access to protected customer data, including on development stores, you need to [select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method) for your app.

Public apps request access to protected customer data and protected customer fields through the Partner Dashboard.

Protected customer data includes any data that directly relates to a customer or prospective customer, as represented in the [API types and resources](#protected-customer-data-api-types-and-resources). Types and resources that don't refer to a single customer, such as the [product](https://shopify.dev/docs/api/admin-graphql/latest/queries/product) query, aren't included.

In addition to requesting access to protected customer data, you'll need to request access to the following protected customer fields individually because they directly identify customers:

* Name: first and last names
* Address: address line 1, address line 2, geolocation, and zip codes in both billing and shipping addresses
* Email
* Phone

If your access is approved, these fields will appear in the [protected customer API types and resources](#protected-customer-data-api-types-and-resources).

To request access:

1. From the Partner Dashboard, go to [**Apps**](https://partners.shopify.com/current/apps), and then select your app.

2. In the sidebar, click **API access requests**.

3. Find **Protected customer data access** and click **Request access**.

4. Select **Protected customer data**, provide your reasons for using it, and click **Save**.

5. If your app needs access to protected customer fields, then select the relevant fields, provide your reasons for using them, and click **Save**.

6. Complete your **Data protection details**, making sure that your app meets the [protected customer data requirements](#requirements).

7. [Submit your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review).

If your app is for testing or installed only on a development store, you can access customer data in development after Step 5. You don't need to submit for review.

You'll receive updates about the status of your review by email and through your Partner Dashboard.

### Protected customer data API types and resources

The [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql) and [Customer Account API](https://shopify.dev/docs/api/customer) reference documentation defines what types, objects, and fields represent protected customer data.

The following table summarizes the API types that are considered protected customer data.

| API resource/type | Protected customer data |
| - | - |
| Customers ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer), [Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Customer)) | Data that defines facts about a single customer, including name, addresses, email, and phone number. |
| Shipping rates ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/ShippingRate)) | Shipping rates that related to a single order, which relates to a single customer. |
| [Webhooks](https://shopify.dev/docs/api/webhooks), Metafields ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield), [Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Metafield)) | Events and metafields that relate to a single customer or order. |
| Orders ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order), [Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Order)) | Orders, draft orders, abandoned checkouts, refunds, transactions, and other data that relate to a single customer. |
| Checkout ([Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Checkout)) | Checkout and payments that relate to orders by a single customer. |
| Shipping and fulfillment ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder), [Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Fulfillment)) | Shipping and fulfillment data that relate to orders by a single customer. |
| Online store ([Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Comment)) | Comments on a store that contain data about the commenter. |
| Gift cards ([GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest/objects/GiftCard)) | Gift cards that are used by a single customer. |

***

## Using protected customer data

After your app is approved to access protected customer data, API requests and webhooks that contain protected resources will return the data requested. Responses will include only approved fields, and unapproved fields will be redacted.

GraphQL requests to unapproved types will return an HTTP `200 Ok` response with an error message in the `errors` hash.

### Example API requests for protected customer data

The following examples show API requests and responses for an app that is approved to access protected customer data and the `email` and `name` fields. In this scenario, the `phone` and `address` fields are redacted from the GraphQL replies. The reply also includes an `errors` message with an explanation of redacted fields.

#### Graph​QL Admin API request with approved fields

## POST /admin/api/{api\_version}/graphql.json

## GraphQL Query

```graphql
{
  customer(id: "gid://shopify/Customer/957611081784") {
    email
    firstName
    lastName
  }
}
```

## JSON Response

```json
HTTP/1.1 200 OK
{
  "data": {
    "customer": {
      "email": "testcustomer@example.com",
      "firstName": "Sally",
      "lastName": "Testopherson",
    }
  }
}
```

#### Graph​QL Admin API request with unapproved fields

## POST /admin/api/{api\_version}/graphql.json

## GraphQL Query

```graphql
{
  customer(id: "gid://shopify/Customer/957611081784") {
    email
    phone
  }
}
```

## JSON Response

```json
HTTP/1.1 200 OK
{
  "data": {
    "customer": {
      "email": "testcustomer@example.com",
      "phone": null,
    }
  },
  "errors": [
    {
      "message": "This app is not approved to access the Customer object. See https://partners.shopify.com/123/apps/456/customer_data for more details.",
      "locations": ...,
      "path": [
        "customer",
        "phone"
      ]
    }
  ]
}
```

#### Customer Account API request with approved fields

## POST /customer/api/{api\_version}/graphql.json

## GraphQL Query

```graphql
{
  customer {
    firstName
    lastName
    emailAddress {
      emailAddress
    }
  }
}
```

## JSON Response

```json
HTTP/1.1 200 OK
{
  "data": {
    "customer": {
      "firstName": "Sally",
      "lastName": "Testopherson",
      "emailAddress": {
        "emailAddress": "testcustomer@example.com"
      },
    }
  }
}
```

#### Customer Account API request with unapproved fields

## POST /customer/api/unstable/graphql.json

## Query

```graphql
{
  customer {
    firstName
    lastName
    phoneNumber {
      phoneNumber
    }
  }
}
```

## JSON Response

```json
HTTP/1.1 200 OK
{
  "data": {
    "customer": {
      "firstName": "Sally",
      "lastName": "Testopherson",
      "phoneNumber": {
        "phoneNumber": null
      },
    }
  },
  "errors": [
    {
      "message":"This app is not approved to use the phoneNumber field. See https://partners.shopify.com/123/apps/456/customer_data for more details.",
      "locations": ...,
      "path":["customer","phoneNumber","phoneNumber"]
  }
}
```

***

## Requirements

To help apps safely process protected customer data, you must implement the following requirements in your development practices and in your apps. These requirements reflect the minimum acceptable handling of protected customer data and help apps support merchants with increasingly strict privacy and security requirements. You might need to consult with a privacy or legal professional for help applying these requirements to your business.

If you're using only protected customer data, then you must meet the level 1 requirements.

If you're using protected customer data including name, address, phone, or email fields, then you must meet all of the level 1 and 2 requirements.

**Level 1 requirements**:

1. **Process only the minimum personal data required to provide app functionality to merchants.**

   Processing personal data comes with legal and regulatory requirements to secure, monitor, manage, and communicate about the data. Using the minimum data required helps minimize the time and effort spent complying with these requirements, and limits the potential damage of a data breach or unauthorized access.

2. **Inform merchants what personal data you process and your reason for processing it.**

   Transparency with merchants about what personal data is processed and why helps merchants manage what processing occurs on their behalf. This information is often included in your privacy policy or data protection agreement.

3. **Limit your processing of personal data to the stated purposes.**

   Processing must be limited to the stated purposes to ensure that merchants and customers are correctly informed about how their data is used.

4. **Where applicable, respect and apply customer consent decisions.**

   Customer consent is a critical mechanism for customers to participate in their data processing and might be required depending on the type of processing your app performs.

5. **Where applicable, respect and apply customer decisions to opt out of any data sharing such as a ‘data sale’ or similar concept under applicable laws or regulations.**

   Merchants must comply with applicable laws and regulations around sharing of personal data and this requirement helps ensure you are prepared to support them.

6. **If you use personal data for automated decision-making and those decisions might have legal or significant effects, then you must allow customers to opt out.**

   Automated decision-making can include personal data processing such as profiling, analyzing, predicting, or scoring algorithms. Automated decisions with legal or significant effects are those that have a material impact on people's lives and it's important to give customers the option to have their data manually processed.

7. **Make privacy and data protection agreements with your merchants.**

   Data protection agreements or privacy policies represent an agreement about personal data processing and are an important tool for formal and safe data privacy practices. They often include details such as data transfer mechanisms, scope of data processed, legal roles and responsibilities, retention, and definition of terms.

8. **Apply retention periods to make sure that personal data isn’t kept for longer than needed.**

   Personal data must not be kept longer than necessary for the stated processing purposes. Retaining personal data longer than necessary increases the security risk of unauthorized access or inappropriate processing.

9. **Encrypt data at rest and in transit.**

   Encrypting data when stored and as it transits various networks helps to prevent bad actors from gaining access to it even if they have access to the application. It also reduces the consequences of unintentionally disclosing the data set to the general public.

**Level 2 requirements**:

1. **Encrypt your data backups.**

   Data backups can contain personal data and should be treated with the same level of concern and consideration as production data in order to prevent unauthorized access.

2. **Keep test and production data separate.**

   Strict separation of environments prevents personal data from production from leaking into less secure environments where it could become exposed.

3. **Have a data loss prevention strategy.**

   A data loss prevention strategy is a combination of technical controls, policies, and standards that protect an organization from the possibility of a bad actor extracting data for nefarious purposes.

4. **Limit staff access to protected customer data.**

   Limiting staff access to protected customer data minimizes the risk that data will be improperly accessed, exfiltrated, or processed.

5. **Require strong passwords for staff accounts.**

   Strong password requirements often include minimum length and a mixture of numbers, letters, and special characters.

6. **Keep an access log to protected customer data.**

   Keeping logs and reviewing them frequently allows an organization to not only keep an audit trail of activity related to data access, but also assess whether their security controls are working effectively.

7. **Implement a security incident response policy.**

   A security incident response policy helps organizations respond appropriately to security incidents and/or data breaches. These policies often include incident severity scales, roles and responsibilities, escalation paths, evidence collection, and required actions.

***

## Data protection review

To help you meet the protected customer data requirements, we might ask for a detailed review of your practices. During this review, you'll need to provide evidence that your app and your practices meet the [protected customer data requirements](#requirements). If we select your app for a data protection review, then we'll contact you with instructions on how to proceed. Data protection reviews can occur after you've implemented the protected customer data requirements.

While any app might be selected, data protection reviews will likely focus on apps that have:

* High number of merchant installs
* High volume of customer records
* More protected customer fields approved
* Long retention of personal data

***

---


<!-- PAGE 7/53: About billing for your app -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing -->

# About billing for your app

The app billing API resources are specific to and mandatory for all full and limited visibility apps that are distributed through the Shopify App Store, unless Shopify has notified you otherwise. [Contact us](https://partners.shopify.com/current/support/) if you have questions or concerns.

Use the [GraphQL Admin API and Partner API](#developer-tools-and-resources)'s billing resources to process charges using Shopify's merchant invoicing system. You can [view data on app charges](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings) using the Partner Dashboard and the GraphQL Admin API.

**Caution:**

API billing resources don't support complex calculations for charges. Instead, the API instructs the billing system to collect specific charges. You determine those charges when you configure your app's pricing model. When you configure the pricing model, you'll need to provide the necessary parameters for the API to collect the desired amount.

***

## Why use Shopify's app billing resources

Shopify's app billing resources provide the following benefits:

* **Simplified payment process**: Charges are directly added to the merchant's Shopify invoice.

* **Increased conversion rates**: Apps that use the billing API resources experience higher rates of customers transitioning from free to paid versions, because charges originate directly from Shopify.

* **Revenue sharing**: You automatically [receive a share of the revenue](https://help.shopify.com/en/partners/how-to-earn#shopify-apps) that Shopify collects.

* **Chargeback handling**: Shopify handles all chargeback-related processes.

* **Flexible pricing models**: You can choose your pricing model and set your own prices. Shopify collects funds and ensures timely payments.

***

## Billing process

The following diagram describes the app billing process and the roles taken by merchants, your app, and Shopify.

![The charge approval page, with the payment method, bill number, payment timeline, approval due by date, and a button labeled Verify and pay](https://shopify.dev/assets/assets/images/apps/billing/billing-summary-BzwD8YQv.png)

1. A merchant starts an action that includes a charge, such as an app installation, a service plan upgrade, or an individual purchase.
2. Your app creates a charge for the merchant, using either the [`appPurchaseOneTimeCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/apppurchaseonetimecreate) or the [`appSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptioncreate) mutation.
3. Shopify verifies the charge and returns a [`confirmationUrl`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptioncreate#field-appsubscriptioncreatepayload-confirmationurl), which is a page that Shopify hosts for the merchant to approve charges.
4. The app should redirect the merchant to the `confirmationUrl`, where the merchant either approves or declines the charge.
5. If the merchant accepts the charge, then they're redirected to a [`returnUrl`](https://shopify.dev/docs/api/admin-graphql/latest/objects/appsubscription#field-appsubscription-returnurl) that your app specified when it issued the charge. If the charge is declined, then Shopify redirects the merchant to the Shopify admin, and provides a notification message about the app charge being declined.

**Note:**

Subscription upgrades and downgrades, for example going from a basic tier to a premium tier, or a premium tier to a basic tier, go through this flow.

### App actions to set up purchases

The app billing process requires your app to perform actions that set up purchases.

**React Router:**

Shopify provides an app package for React Router to help you configure charges for your app and make calls to the GraphQL Admin API's billing resources. If your app isn't React Router based, then you can use [the code examples in the reference](https://shopify.dev/docs/api/shopify-app-react-router/latest/apis/billing) as a general guide to your app's configuration.

#### Configure a pricing model

A pricing model is how you monetize your app. Each pricing model configuration must contain an `amount`, a `currencyCode`, and an `interval`. You can also set the parameters that are allowed by the GraphQL Admin API's [`appSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate) and [`appPurchaseOneTimeCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appPurchaseOneTimeCreate) mutations that are used for the charges.

React Router apps can set up plans by passing in the `billing` configuration when `shopifyApp` is called.

Learn more about [pricing models](https://shopify.dev/docs/apps/launch/billing#pricing-models).

#### Gate requests

Gating requests require merchants to pay for the app before they can access specific routes. To gate requests, you can verify whether there's an active payment and require one if there isn't. The following is an example for the process:

* Indicate which plans enable access to a specific route.

* Pass a check to determine if there's a purchase for any of the plans.

* Require a purchase if one isn't detected.

  React Router apps can use the `admin.billing.require` function. The function verifies that there's an active payment and requires one if there isn't. You can send multiple plans to `require`. It passes if there's a purchase for any of the plans and returns information on the active purchase.

**Tip:**

Call the function in loaders and actions to avoid ungated requests. If you want to gate multiple routes, then use a layout [like this example](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/routes/app.tsx) in the React Router template.

#### Request payment

If your billing check doesn't find a purchase, then you can decide where to take the merchant. The following are examples:

* Request payment right away for one of the purchase configurations.

* Redirect the merchant to a page where they can select a plan.

  * In the plan selection page, you'll need to authenticate with the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql) for access. React Router apps can call `authenticate.admin`.

***

## Pricing models

The pricing model determines the charges that are collected for your app.

You can use Shopify's app billing API resources to implement one or more of the following models:

| Type | Description | Use cases | Learn how |
| - | - | - | - |
| **Subscription fee** | Charge either an annual or 30-day recurring fee to use the app, charge a capped fee based on usage, or employ both. | Charge a capped fee for dropshipping.Charge merchants a fee every 30 days and a fee per SMS message sent on their behalf. | * [Time-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions)
* [Usage-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)
* [Combination](https://shopify.dev/docs/apps/launch/billing/subscription-billing/combine-time-and-usage)
* [Additional use cases](https://shopify.dev/docs/apps/launch/billing/subscription-billing/complex-pricing-models) |
| **One-time purchase** | Charge once for the app, or charge once to enable limited use. | Charge merchants a flat fee for translating their storefront.Enable merchants to purchase credits to use in your app. | [One-time charges and multiple one-time charges](https://shopify.dev/docs/apps/launch/billing/support-one-time-purchases) |

***

## Pricing adjustments

A pricing adjustment modifies an app's subscription fee or price. App billing API resources support the following price adjustments:

| Type | Description | Eligibility |
| - | - | - |
| **[App credits](https://shopify.dev/docs/apps/launch/billing/award-app-credits)** | Grant a sum that merchants can put towards future purchases, subscriptions, or usage charges. | Merchants who have the app installed |
| **[Subscription discounts](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)** | Offer a percentage or fixed-price discount on an app subscription for a set number of billing cycles. | New subscribersMerchants with existing subscriptions |
| **[Free trials](https://shopify.dev/docs/apps/launch/billing/offer-free-trials)** | Delay the start of an app's billing cycle by a number of days. This enables merchants to experiment with apps before they commit to paying.Available only to merchants that agree to a new subscription. Can't be added to existing subscriptions. | New subscriptions onlyCan't be added to existing subscriptions |
| **[Refunds](https://shopify.dev/docs/apps/launch/billing/refund-app-charges)** | Issue a full or partial refunds for a specific app charge. | All users |

***

## Supported currencies

You can match your app charges to a merchant's local billing currency if they use one of the [supported currencies](https://help.shopify.com/manual/your-account/manage-billing/your-invoice/local-currency).

Retrieve the merchant's local billing currency with the GraphQL Admin API's [`shopBillingPreferences`](https://shopify.dev/docs/api/admin-graphql/latest/queries/shopBillingPreferences) query, passing the currency value as input.

***

## Webhook topics

In addition to the [mandatory webhook topics](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance), Shopify provides the following webhook topics for billing:

* [`APP_PURCHASES_ONE_TIME_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-apppurchasesonetimeupdate): Triggered when the status of an `AppPurchaseOneTime` object is changed.

* [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-appsubscriptionsupdate): Triggered when the status, or capped amount, of an `AppSubscription` object is changed, and when a subscription's status changes.

* [`APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-appsubscriptionsapproachingcappedamount): Triggered when the balance used on an app subscription crosses 90% of the capped amount.

***

## Developer tools and resources

Explore the developer tools and resources available for app billing:

[GraphQL Admin API\
\
](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)

[Review the GraphQL Admin API resources for app billing.](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)

[Partner API\
\
](https://shopify.dev/docs/api/partner)

[Use the Partner API to create app credits.](https://shopify.dev/docs/api/partner)

[Rect Router billing functions\
\
](https://shopify.dev/docs/api/shopify-app-react-router/latest/apis/billing)

[Learn about the functions that React Router apps can use to bill merchants.](https://shopify.dev/docs/api/shopify-app-react-router/latest/apis/billing)

***

## Best practices

Consider the following best practices when developing your app's [pricing model](https://shopify.dev/docs/apps/launch/billing):

| Practice | Benefit | Example |
| - | - | - |
| **Provide simple and intuitive pricing** | Makes it easier for merchants to understand the pricing model and encourages adoption | If your app provides a single set of features for all merchants, then consider setting up time-based subscriptions at 30 or 365-day intervals. |
| **Limit the number of plans** | Makes it easier for merchants to compare plans and identify which plan works best for them. | If your app provides tiered features, then consider setting up a basic plan and a pro planSet one plan that includes ads and a second plan that's add-free. |
| **Offer free trials** | Encourages merchants and Partners that develop stores for merchants to try your app before they pay for it. This helps users learn your app's value and recommend the app to others. | A 30-day period where the app is used free of charge, which transitions to an annual paid plan after that. |
| **Create charges in the merchant's local billing currency** | Enables merchants to better budget their app spend, which prevents confusion and provides a better app experience. | If a merchant is in India, then bill them in Indian Rupees (INR). If they're in Canada, then bill them in Canadian Dollars (CAD).Refer to [supported currencies](https://shopify.dev/docs/apps/launch/billing#supported-currencies). |

***

---


<!-- PAGE 8/53: Managed pricing -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/managed-pricing -->

# Managed App Pricing

Managed app pricing lets you define your app’s pricing plans directly in the Shopify Partner Dashboard, without needing to use the Billing API. Shopify hosts your app’s plan selection page, and automates most common billing tasks, such as recurring charges, free trials, proration, test charges, and price updates.

For most developers, managed pricing is simpler and more consistent than coding your own billing logic using the Billing API.

***

## Set up managed pricing

Managed pricing is the default option when you submit a new public app for approval. You can opt in to managed pricing for existing apps by editing your pricing settings. You can switch back to manual pricing at any time.

Managed pricing is available for free, monthly, and annual recurring plan types.

![Plan and pricing card with options for Managed Pricing or Manual billing with the API](https://shopify.dev/assets/assets/images/apps/billing/managed-pricing-opt-in-B5UmrEbY.png)

### Opt in to managed pricing

If you've already created plans with the Billing API that aren't compatible with managed pricing, then you'll need to remove them before you can switch.

1. From your Partner Dashboard, click **Apps > All Apps** and click the name of the app you want to update pricing for.
2. Click **Distribution**.
3. Beside **Shopify App Store listing**, click **Manage listing**.
4. Under **Published languages**, click **Edit** for the locale you want to update.
5. Under **Pricing content**, click **Manage** to open the Pricing index page.
6. Click **Settings**.
7. Select **Managed pricing**.
8. In the confirmation dialog, click **Switch**.

***

## Plan selection page

When using managed pricing, Shopify hosts your plan selection page. It’s visible in the Shopify admin, and allows merchants to view and select their plan.

![4 app pricing plans rendered in Shopify admin](https://shopify.dev/assets/assets/images/apps/billing/managed-pricing-plan-selection-qcktHHMX.png)

Your app's plan selection page URL follows this pattern:

```text
https://admin.shopify.com/store/:store_handle/charges/:app_handle/pricing_plans
```

### Testing your plan selection UI

You can validate that plan selection works as expected by following the [test charge documentation](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review#test-your-app-s-billing-system).

***

## Public plans

Public plans are available to all merchants. Plans are visible on your app’s [plan selection page](#plan-selection-page) as well as on the Shopify App Store. You can add up to four public plans.

A plan's billing model (its cost, billing periods, free trial availability) is edited separately from its description (its display name and list of supported features). This lets you describe a single plan in multiple languages, both on the Shopify App Store and your plan selection page.

### Step 1: Add a public plan

1. From your Partner Dashboard, click **Apps > All Apps** and click the name of the app you want to update pricing for.
2. Click **Distribution**.
3. Beside **Shopify App Store listing**, click **Manage listing**.
4. Under **Published languages**, click **Edit** for the locale you want to update.
5. Under **Pricing content**, click **Manage** to open the Pricing index page.
6. Under **Public plans**, click **Add** to open the plan editor.
7. Under **Billing**, select whether the plan is free, monthly, yearly, or monthly with a yearly option.
8. (If required) Under **Monthly charge**, enter a price.
9. (If required) Under **Yearly charge**, enter a price.
10. (Optional) Under **Free trial duration**, enter the number of days you want to offer.
11. (Optional) Under **Welcome link**, add a path or URL where the merchant will be [redirected](#welcome-links) after approving the plan charge.
12. Click **Save**.

### Step 2: Add plan descriptions for each language

Public plans share the same billing model and price details across all your app listings. But plan descriptions are localized, so that you can translate the plan name and its list of top features for each locale.

1. From your Partner Dashboard, click **Apps > All Apps** and click the name of the app you want to update pricing for.
2. Click **Distribution**.
3. Beside **Shopify App Store listing**, click **Manage listing**.
4. Under **Published languages**, click **Edit** for the locale you want to update.
5. Under **Pricing content**, find your recently added or updated plan.
6. Under **Display name**, give the plan a name.
7. Under **Top features**, describe the app features available under this plan.
8. Click **Save**.

Make sure to add plan descriptions for each translated app listing. A plan will only display to merchants if it has a description for the current language.

***

## Private plans

Private plans are only available to a list of stores that you select. This is useful if you need to support a bespoke feature set and pricing for a complex or high-needs client. If all you need is a price incentive, then offering a [discount or trial extension](#discounts-and-trial-extensions) may be a simpler option.

Because private plans are created for a limited number of merchants, they don't support translation. Private plans show up on your [plan selection page](#plan-selection-page), but are only visible to users who are logged into an authorized store account.

You can create up to 10 private plans. You can add up to 20 authorized stores per private plan.

### Add a private plan

1. From your Partner Dashboard, click **Apps > All Apps** and click the name of the app you want to update pricing for.
2. Click **Distribution**.
3. Beside **Shopify App Store listing**, click **Manage listing**.
4. Under **Published languages**, click **Edit** for the locale you want to update.
5. Under **Pricing content**, click **Manage** to open the Pricing index page.
6. Under **Private plans**, click **Add** to open the plan editor.
7. Under **Billing**, select whether the plan is free, monthly, yearly, or monthly with a yearly option.
8. (If required) Under **Monthly charge**, enter a price.
9. (If required) Under **Yearly charge**, enter a price.
10. (Optional) Under **Free trial duration**, enter the number of days you want to offer.
11. (Optional) Under **Welcome link**, add a path or URL where the merchant will be [redirected](#welcome-links) after approving the plan charge.
12. Under **Display name**, add a name for the private plan.
13. Under **Description**, describe the plan features.
14. Under **Stores with plan access**, add up to 20 store domains (such as `example.myshopify.com`).
15. Click **Save**.

***

## Welcome links

A welcome link is the URL where merchants are redirected after approving your app plan charge. You can configure welcome links on a per-plan basis to customize your app onboarding experience. A welcome link can point to a [page in your app](#app-home-welcome-links), or to an [external URL](#external-welcome-links).

We recommend that you query the Billing API for [subscription status](https://shopify.dev/docs/api/admin-graphql/current/enums/AppSubscriptionStatus) after approval for charge status changes.

### App Home welcome links

For apps rendered in the Shopify admin, you can specify a relative path to your app root, such as `/welcome`. A `charge_id` URL parameter with a transaction ID is appended to all redirect URLs.

### External welcome links

If you have a standalone app, or prefer to link to an external site, then you can redirect to a valid URL (including the `http` or `https` protocol). URL parameters for the `charge_id` and the merchant shop domain are appended to redirect URLs.

***

## Proration logic

### Trial proration

Managed app pricing tracks trial days over a 180-day period to prevent users from repeatedly reinstalling apps to exploit free trial periods. For example, if a merchant uses 12 out of 15 trial days on a Pro Plan, uninstalls, then reinstalls the app 90 days later, they'll still have 3 trial days left for the Pro Plan.

If you update your trial periods, then previously consumed trial days are subtracted from the new totals.

### Plan downgrading

Downgrading from a paid plan to a free plan is deferred, meaning it's effective at the end of the paid plan’s current cycle.

***

## Discounts and trial extensions

You can issue discounts or extend app trial periods through your Partner Dashboard. Staff members need the [**Manage credits and refunds**](https://help.shopify.com/partners/dashboard/account-access#sensitive-permissions) permission to manage discounts.

### Issue a discount

1. From your partner dashboard, search for the name of the merchant you want to offer a discount. Click the merchant name in the **Store** column of the search results.
2. Beside **Discount**, click **Create**.
3. Under **App**, search for your app by name and select it.
4. Select the type, value, and duration of the discount.
5. Click **Create**.
6. In the confirmation dialog, click **Apply** to confirm the discount.

### Extend a trial period

1. From your partner dashboard, search for the name of the merchant whose trial you want to extend. Click the merchant name in the **Store** column of the search results.
2. Beside **Trial extension**, click **Create**.
3. Under **App**, search for your app by name and select it.
4. Under **Extra trial days**, enter the number of days to extend the merchant's trial.
5. Click **Create**.
6. In the confirmation dialog, click **Apply** to confirm the trial extension.

For both discounts and trial extensions, Shopify sends an email to the merchant on your behalf confirming the change. The merchant doesn't need to re-subscribe to the plan. The discount is applied to their subscription automatically, starting on the next billing cycle.

***

## Test charges

To simplify testing your app's pricing, managed pricing has implemented [free testing for dev stores](https://shopify.dev/docs/apps/launch/billing/offer-free-trials#set-up-free-testing).

When a development store subscribes to a plan, Shopify creates a test subscription for that store. Your account isn't charged for test subscriptions.

**Note:**

Test subscriptions don't convert to paid when you transfer a store. After transferring, you'll need to create a new plan.

***

## Webhooks

To receive a webhook when a subscription is updated, register for the [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/unstable/enums/WebhookSubscriptionTopic#value-appsubscriptionsupdate) topic. Note that webhooks can take several minutes to deliver. Make sure your app can handle [webhook delays](https://shopify.dev/docs/apps/build/webhooks/best-practices#manage-delays) and follow Shopify's [best practices for webhooks](https://shopify.dev/docs/apps/build/webhooks/best-practices).

***

## Limitations

* Managed pricing currently supports only fixed, recurring pricing models (for example, $10/month or $100/year).
* Once you opt in, you can’t create new recurring application charges using the Billing API. Charges created before opting into managed pricing continue to process as expected.
* When testing a draft app during development, its [plan selection page](#plan-selection-page) might return a 404 error if the development store and the app listing are set to different locales. This issue doesn't affect production stores or published apps.

***

---


<!-- PAGE 9/53: Redirect to plan selection -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/redirect-plan-selection-page -->

# Redirect to the plan selection page

A common pattern is to redirect merchants to your [plan selection page](https://shopify.dev/docs/apps/launch/billing/managed-pricing#plan-selection-page) after they install your app. However, because apps are rendered in the Shopify admin inside an iframe, they don’t have permission to manipulate the parent browser window, including redirects.

[Shopify's React Router package](https://shopify.dev/docs/api/shopify-app-react-router) provides utilities that allow apps to redirect elsewhere in the Shopify admin. This ensures a smoother, more seamless user experience while working within iframe constraints.

***

## Requirements

* An app [scaffolded with React Router](https://shopify.dev/docs/apps/build/scaffold-app). This includes the [@shopify/shopify-app-react-router](https://shopify.dev/docs/api/shopify-app-react-router) package by default.
* Your app needs to have [Managed Pricing enabled](https://shopify.dev/docs/apps/launch/billing/managed-pricing#opt-in-to-managed-pricing), with at least one plan configured.

***

## Check subscription status in React Router

The example code in this section demonstrates the basic steps required to implement this behavior in a React Router app:

1. Check if the logged-in user has an active app subscription.
2. If not, then redirect to the plan selection page.
3. If there is an active subscription, then render your app’s content normally.

The [@shopify/shopify-app-react-router](https://shopify.dev/docs/api/shopify-app-react-router) package includes built-in utilities for handling [billing queries](https://shopify.dev/docs/api/shopify-app-react-router/apis/billing#example-check) and [redirects](https://shopify.dev/docs/api/shopify-app-react-router/authenticate/admin#example-redirect). You can use these utilities in your [React Router loaders](https://reactrouter.com/start/framework/data-loading) to check the user’s plan subscription status and redirect if needed.

In this example, the subscription plan check runs at the app's root route, so it works no matter which app route the user arrives at.

The redirect uses the web URL for the plan selection page, which requires both the store handle and your app handle. The store handle is dynamic and should be extracted from the shop domain (for example, "cool-shop" from "cool-shop.myshopify.com"). The app handle is defined in your `shopify.app.toml` file.

```js
// app/routes/app.jsx


export const loader = async ({ request }) => {
  // Replace with the "app_handle" from your shopify.app.toml file
  const appHandle = "YOUR_APP_HANDLE";


  // Authenticate with Shopify credentials to handle server-side queries
  const { authenticate } = await import("../shopify.server");


  // Initiate billing and redirect utilities
  const { billing, redirect, session } = await authenticate.admin(request);


  // Check whether the store has an active subscription
  const { hasActivePayment } = await billing.check();


  // Extract the store handle from the shop domain
  // e.g., "cool-shop" from "cool-shop.myshopify.com"
  const shop = session.shop; // e.g., "cool-shop.myshopify.com"
  const storeHandle = shop.replace('.myshopify.com', '');


  // If there's no active subscription, redirect to the plan selection page...
  if (!hasActivePayment) {
    return redirect(`https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`, {
      target: "_top", // required since the URL is outside the app scope
    });
  }


  // ...Otherwise, continue loading the app as normal
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};
```

***

## Next Steps

* Learn more about [Managed Pricing](https://shopify.dev/docs/apps/launch/billing/managed-pricing)

***

---


<!-- PAGE 10/53: Offer free trials -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/offer-free-trials -->

# Offer free trials

Free trials enable merchants to experiment with apps before they commit to paying for them. Shopify Partners are more likely to recommend apps that they've used before.

To help increase your app sales, use the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql) to offer free app trials for merchants to try. You can also use trials to allow affiliate Partners trial access to your app [when they build stores on behalf of merchants](https://experience.shopify.com/developmentstore).

***

## Set a free trial duration

Free trials delay the start of an app's billing cycle by a number of specified days.

You can use the GraphQL Admin API's [`appSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-trialdays) mutation to add a free trial. To extend a free trial, use the Admin API's [`appSubscriptionTrialExtend`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionTrialExtend) mutation.

**Note:**

If a merchant adds an app to their Shopify store during a free trial period, then any app-related charges are included in the merchant's next invoice.

***

## Set up free testing

Free testing doesn't create an app charge in Shopify. You can identify a development store by querying the GraphQL Admin API's [`ShopPlan`](https://shopify.dev/docs/api/admin-graphql/latest/objects/ShopPlan) resource. Development stores return the following key/value pair:

```json
{
"partnerDevelopment": true
}
```

We recommend subscribing to the [`SHOP_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-shopupdate) webhook to get notified if the development store changes to a paid plan. If you receive this webhook, then block access to your app and create an app charge for the paid plan. After the user agrees to the charge, unblock their access to the app.

**Note:**

If you make your app free for development stores, then contact [Shopify Support](https://partners.shopify.com/current/support/) to get your app listed on our [Partner-friendly app list](https://apps.shopify.com/collections/partner-friendly-apps?utm_source=API%20docs%3A%20app%20promotion\&utm_medium=web\&utm_campaign=Partner%20engagement).

***

## Limitations

* Free trials are available only to merchants who agree to a new subscription, and can't be added to existing subscriptions.

***

## Next steps

[Best practices\
\
](https://shopify.dev/docs/apps/launch/billing)

[Learn best practices for app billing.](https://shopify.dev/docs/apps/launch/billing)

***

---


<!-- PAGE 11/53: About subscription billing -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing -->

# About subscription billing

An app subscription is a pricing model where users pay a recurring fee to access an app or certain features within the app.

The subscription pricing model is based on time-based, usage-based, or a combination of time and usage-based subscriptions.

The following guide explains how subscription models work at Shopify and the different subscription types that you can implement with the GraphQL Admin API's billing objects and mutations.

***

## How it works

An app can have only one active subscription for each merchant. Merchants must approve the subscription, and any recurring charges are billed automatically.

If a merchant changes their subscription while their current plan is active, then they need to accept a new recurring app charge. The existing subscription is canceled and replaced by the new subscription after the merchant approves it. Charges and credits can be [prorated](#proration), and charges can be [deferred](#deferral), when merchants move to a new plan depending on the subscription change.

**Note:**

When you're creating a new app subscription for a merchant who already has an existing subscription, you can use the GraphQL Admin API's [`AppSubscriptionReplacementBehavior`](https://shopify.dev/docs/api/admin-graphql/latest/enums/AppSubscriptionReplacementBehavior) enum to determine how the change is handled.

When an app is uninstalled, Shopify automatically cancels the subscription. A credit isn't applied to cover the cost of the rest of the billing period. Merchants can reinstall and use the app for the remainder of the billing period.

When a store's billing account freezes, associated app subscriptions also freeze.

***

## Subscription types

You can create the following types of subscriptions for your app:

| Type | Description | Example use case |
| - | - | - |
| **[Time-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions)** | Charge the merchant continuously at set intervals.Provides a payment for each billing cycle. Supported cycles are annual and 30-day. | Apps that charge a consistent, recurring amount for a service, such as charging $X USD every 30 days for analytics and automation on email campaigns. |
| **[Usage-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)** | Charge based on app use. Merchants pay for the app continuously.Provides a constant stream of revenue and merchants continue to get updates for the app that they subscribe to. | Apps that charge a fee per action, such as charging $0.05 an email for the first 1000 contacts and $0.025 an email for every contact thereafter. |
| **[Combined time and usage-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/combine-time-and-usage)** | Combines a recurring charge fee structure with charges based on app use. | Apps that perform multiple functions, some of which can be covered by a fee every 30 days and others that are charged by use, such as analytics on email campaigns with scaling charges based on the number of contacts. |

***

## Proration

Proration ensures that app subscribers aren't underpaying or overpaying for the service that they receive. Charges can be [prorated](#prorated-charges), and [prorated credits](#prorated-credits) can be issued.

### Prorated charges

New subscription charges are prorated when a merchant upgrades to a subscription with a higher price during the current billing cycle. The amount owed is based on the following variables:

* What the merchant has already paid

* The cost difference between the plans

* The time left in the current billing cycle

  The following is the equation:

```text
plan1_cost + (plan2cost - plan1cost) * (cycle_days_left / total_cycle_days) = total_cost
```

For example, if a merchant begins a 30-day billing cycle on a $5.00 plan, and upgrades to a $15.00 plan on day 15 of the billing cycle, then the merchant is charged $10.00 for the upgraded plan.

```text
$5.00 + ($15.00 - $5.00) * (15/30) = $10.00
```

### Prorated credits

**Caution:**

Avoid crediting on top of prorated credits. Before you issue a credit for an app downgrade, consult the **Payouts** page in the [Partner Dashboard](https://www.shopify.com/partners) to verify whether Shopify has already issued a prorated credit.

New subscription charges are prorated when a merchant downgrades to a subscription with a lower price during the current billing cycle. The amount owed is based on the following variables:

* The cost difference between the plans

* The time left in the current billing cycle

  The following is the equation:

```text
(plan2cost - plan1cost) * (cycle_days_left / total_cycle_days) = total_cost
```

For example, if a merchant begins a 30-day billing cycle on a $20.00 plan, and then downgrades to a $10.00 plan on day 15 of the billing cycle, then the merchant is offered prorated credits.

```text
($20.00 - $10.00) * (15/30) = $5.00
```

The Partner payout is automatically adjusted based on the issued credit and the Partner revenue share. The following image illustrates the timeline:

![The billing cycle starts on day five of the month. On day 15, the subscription is canceled and the billing cycle is canceled. On day 25, which is within the same billing cycle, the merchant resubscribes to the app and billing cycle 2 begins. On day five of the following month, the merchant is charged.](https://shopify.dev/assets/assets/images/apps/billing/billing-cycle-without-trial-BcUdWEKX.png)

If a new subscription includes trial days, then the merchant is still charged at the beginning of the next 30-day app billing cycle, but the bill includes a prorated credit to account for the trial days. The following image illustrates the timeline:

![The billing cycle starts on day five of the month. On day 15, the subscription is canceled. On day 25, the merchant resubscribes to the app, within the same billing cycle, with ten free trial days. On day five of the following month, the merchant is charged a prorated fee, being credited for the ten overlapping billing cycle days.](https://shopify.dev/assets/assets/images/apps/billing/billing-cycle-with-trial-B8aujSeb.png)

Refer to an example of [canceling an app subscription and issuing prorated credits](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCancel#examples-Cancel_an_app_subscription_on_a_shop_and_issue_prorated_credits).

***

## Deferral

In the following scenarios, new subscription plans are deferred until the current plan's billing cycle completes:

* A merchant switches from one annual subscription to another annual subscription with a lower price.

* A merchant switches from an annual plan to a 30-day plan.

* A new subscription has a different discount configured.

  For example, if a merchant begins an annual billing cycle on a $200.00 plan, and then downgrades to a 30-day billing cycle on a $10.00 plan, the 30-day billing cycle for $10.00 won't begin until the end of the annual billing cycle.

***

## Cancelling subscriptions

When a merchant uninstalls your app, their app subscription is automatically canceled. Learn more about available [subscription charge details](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings#subscription-charge-details).

If you want to cancel a subscription on behalf of a merchant, then you can use the [`appSubscriptionCancel`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCancel) mutation. Refer to [an example of how it's done](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCancel#examples-Cancel_an_app_subscription_on_a_shop).

***

## Get started

[Time-based subscription billing\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions)

[Use the GraphQL Admin API to create a time-based pricing model for your app.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions)

[Usage-based subscription billing\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)

[Use the GraphQL Admin API to create a usage-based pricing model for your app.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)

[Time and usage-based subscription billing\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/combine-time-and-usage)

[Use the GraphQL Admin API to create a combined time and usage-based pricing model for your app.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/combine-time-and-usage)

[Additional use cases\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/complex-pricing-models)

[Learn how you can create subscription pricing models for additional use cases.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/complex-pricing-models)

[Subscription discounts\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Learn about offering subscription discounts.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

***

---


<!-- PAGE 12/53: Create time-based subscriptions -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions -->

# Create time-based subscriptions

A time-based subscription is a pricing model that charges a consistent, recurring amount for a service. Shopify offers billing intervals for every 30 days and every 365 days.

Merchants must approve the pricing plan. After accepting the charges, the merchant is redirected to a URL that you provide.

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

***

## Step 1: Create the subscription

1. [Refer to an example](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#examples-Create_a_subscription_for_an_app_on_a_recurring_pricing_plan_only_) of creating an app subscription.

2. Make a request to the `appSubscriptionCreate` mutation with the following information:

   * [`name`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-name)
   * [`returnURL`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-returnurl)

3. Use the [`appRecurringPricingDetails`](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/AppPlanInput#field-appplaninput-apprecurringpricingdetails) field on the line item's plan to provide the following information:

   * [`currencyCode`](https://shopify.dev/docs/apps/launch/billing#supported-currencies)

   * `price`

   * `interval`

     **Note:**

     The `interval` field accepts `ANNUAL` or `EVERY_30_DAYS`. If not provided, then the default of `EVERY_30_DAYS` is applied.

***

## Step 2: Monitor subscription updates

To receive a notification when a subscription status changes, such as when a charge is successful, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-appsubscriptionsupdate) webhook topic.

***

## Next steps

[Discounts\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Learn about offering subscription discounts.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Prorated and deferred charges\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

[Learn how Shopify handles prorating and deferring app subscription charges.](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

***

---


<!-- PAGE 13/53: Create usage-based subscriptions -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions -->

# Create usage-based subscriptions

A usage-based subscription is a pricing model that charges merchants continuously based on app use during Shopify's 30-day billing cycle.

Merchants must approve the pricing plan. After accepting the charges, the merchant is redirected to a URL that you provide.

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

***

## Step 1: Create the subscription

Make a request to the [`appSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptioncreate) mutation with the following information:

* [`name`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-name)

* [`returnURL`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-returnurl)

* `terms`

  Merchants review the terms of the subscription when they accept the pricing plan.

* `cappedAmount`

  The `cappedAmount` is the maximum that a merchant is billed for during the 30-day billing cycle. The `currencyCode` must be one of the [supported currencies](https://shopify.dev/docs/apps/launch/billing#supported-currencies).

The following mutation is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## JSON response

```json
{
  "data": {
    "appSubscriptionCreate": {
      "userErrors": [],
      "confirmationUrl": "https://{shop}.myshopify.com/admin/charges/4028497976/confirm_recurring_application_charge?signature=BAh7BzoHaWRsKwc4AB7wOhJhdXRvX2FjdGl2YXRlVA%3D%3D--987b3537018fdd69c50f13d6cbd3fba468e0e9a6",
      "appSubscription": {
        "id": "gid://shopify/AppSubscription/4028497976",
        "lineItems": [
          {
            "id": "gid://shopify/AppSubscriptionLineItem/4028497976?v=1&index=0",
            "plan": {
              "pricingDetails": {
                "__typename": "AppRecurringPricing"
              }
            }
          },
          {
            "id": "gid://shopify/AppSubscriptionLineItem/4028497976?v=1&index=1",
            "plan": {
              "pricingDetails": {
                "__typename": "AppUsagePricing"
              }
            }
          }
        ]
      }
    }
  },
  ...
}
```

Shopify uses the payload's `AppSubscription.id` and the `AppSubscriptionLineItem.id` to generate data for app usage records.

***

## Step 2: Create an app usage record

After you've created the usage pricing plan and the merchant has accepted the plan, you can create a usage record with the [`appUsageRecordCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appUsageRecordCreate) mutation. The usage record needs to include the `AppSubscriptionLineItem.id` of the `AppSubscription` object that the `appSubscriptionCreate` mutation returns.

The following mutation is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL mutation

```graphql
mutation {
  appUsageRecordCreate(
    subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/4019585080?v=1&index=0",
    description: "Super Mega Plan 1000 emails",
    price: {
      amount: 1.00,
      currencyCode: USD
    }
  ) {
    userErrors {
      field,
      message
    },
    appUsageRecord {
      id
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "appUsageRecordCreate": {
      "userErrors": [],
      "appUsageRecord": {
        "id": "gid://shopify/AppUsageRecord/14518231"
      }
    }
  },
  ...
}
```

***

## Step 3: Monitor app usage limits

Merchants can use the Shopify admin to change their subscription's capped amount. The capped amount is the maximum amount of usage to bill for within the 30-day billing cycle.

To receive a notification when merchants change the capped amount, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-appsubscriptionsupdate) webhook topic.

To receive a notification when merchants reach or exceed 90% of their capped amount, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-appsubscriptionsapproachingcappedamount) webhook topic.

***

## Step 4: Monitor subscription status changes

To receive a notification when a subscription status changes, such as when a charge is successful, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-appsubscriptionsupdate) webhook topic.

***

## Next steps

[Discounts\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Learn about offering subscription discounts.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Capped amount\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/update-max-charge)

[Learn how to update the maximum amount that merchants can be charged for a subscription.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/update-max-charge)

***

---


<!-- PAGE 14/53: Combine time and usage -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/combine-time-and-usage -->

# Combine time and usage-based subscriptions

You can implement a pricing model for your app that combines a recurring, [time-based](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions) subscription plan with [charges based on use](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions) with. Combined plans are supported for 30-day billing intervals.

Merchants must approve the pricing plan. After accepting the charges, the merchant is redirected to a URL that you provide.

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

***

## Step 1: Create the subscription

Make a request to the [`appSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptioncreate) mutation with the following information:

* [`name`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-name)

* [`returnURL`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#argument-returnurl)

* `terms`

  Merchants review the terms of the subscription when they accept the pricing plan.

* `cappedAmount`

  The `cappedAmount` is the maximum that a merchant is billed for during the 30-day billing cycle. The `currencyCode` must be one of the [supported currencies](https://shopify.dev/docs/apps/launch/billing#supported-currencies).

The following mutation is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## JSON response

```json
{
  "data": {
    "appSubscriptionCreate": {
      "userErrors": [],
      "confirmationUrl": "https://{shop}.myshopify.com/admin/charges/4028497976/confirm_recurring_application_charge?signature=BAh7BzoHaWRsKwc4AB7wOhJhdXRvX2FjdGl2YXRlVA%3D%3D--987b3537018fdd69c50f13d6cbd3fba468e0e9a6",
      "appSubscription": {
        "id": "gid://shopify/AppSubscription/4028497976",
        "lineItems": [
          {
            "id": "gid://shopify/AppSubscriptionLineItem/4028497976?v=1&index=0",
            "plan": {
              "pricingDetails": {
                "__typename": "AppRecurringPricing"
              }
            }
          },
          {
            "id": "gid://shopify/AppSubscriptionLineItem/4028497976?v=1&index=1",
            "plan": {
              "pricingDetails": {
                "__typename": "AppUsagePricing"
              }
            }
          }
        ]
      }
    }
  },
  ...
}
```

Shopify uses the payload's `AppSubscription.id` and the `AppSubscriptionLineItem.id` to generate data for app usage records.

***

## Step 2: Create an app usage record

After you've created the usage pricing plan and the merchant has accepted the plan, you can create a usage record with the [`appUsageRecordCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appUsageRecordCreate) mutation. The usage record needs to include the `AppSubscriptionLineItem.id` of the `AppSubscription` object that the `appSubscriptionCreate` mutation returns.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL mutation

```graphql
mutation {
  appUsageRecordCreate(
    subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/4019585080?v=1&index=0",
    description: "Super Mega Plan 1000 emails",
    price: {
      amount: 1.00,
      currencyCode: USD
    }
  ) {
    userErrors {
      field,
      message
    },
    appUsageRecord {
      id
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "appUsageRecordCreate": {
      "userErrors": [],
      "appUsageRecord": {
        "id": "gid://shopify/AppUsageRecord/14518231"
      }
    }
  },
  ...
}
```

***

## Step 3: Monitor app usage limits

Merchants can use the Shopify admin to change their subscription's capped amount. The capped amount is the maximum amount of usage to bill for within the 30-day billing cycle.

To receive a notification when merchants change the capped amount, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-appsubscriptionsupdate) webhook topic.

To receive a notification when merchants reach or exceed 90% of their capped amount, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-appsubscriptionsapproachingcappedamount) webhook topic.

***

## Step 4: Monitor subscription status changes

To receive a notification when a subscription status changes, such as when a charge is successful, subscribe to the GraphQL Admin API's [`APP_SUBSCRIPTIONS_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/webhooksubscriptiontopic#value-appsubscriptionsupdate) webhook topic.

***

## Next steps

[Discounts\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Learn about offering subscription discounts.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Capped amount\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/update-max-charge)

[Learn how to update the maximum amount that merchants can be charged for a subscription.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/update-max-charge)

[Prorated and deferred charges\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

[Learn how Shopify handles prorating and deferring app subscription charges.](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

***

---


<!-- PAGE 15/53: Complex pricing models -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/complex-pricing-models -->

# Complex pricing models

**Caution:**

Annual subscriptions don't support usage billing.

To tailor your app subscriptions to support more complex pricing models, use usage-based billing. For example, if your app has a default subscription and you want to enable merchants to purchase an optional, add-on subscription for a different product line, you can do the following:

* Modify each subscription to reflect the additional modules that are available.

* Track module billing in your application.

* Use usage charges to bill the merchant for the desired amount at the desired time.

  This guide shows how flexible usage-based billing is, and how app developers can leverage it to bill merchants for more complex pricing models. This is especially beneficial for larger app subscribers. The guide uses add-on modules as an example. You can also refer to [an example mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate#examples-Create_a_subscription_with_add_on_modules).

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

* Your app has the `applications_billing` [access scope](https://shopify.dev/docs/api/usage/access-scopes).

  Learn how to [configure your access scopes using Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration).

***

## Step 1: Account for additional spend in a subscription

Create a subscription [for a usage-based pricing plan](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions). You should set the capped amount to cover all the costs that you expect to charge merchants in the 30-day billing interval. For example, to charge the merchant $60 every 30 days for a base subscription, $0.10 per email as a usage-based charge, and an additional $30/day for an add-on module, your usage cap should be $30 and a reasonable average for email usage costs over a 30-day period.

***

## Step 2: Keep track of billing intervals and usage

In your app, keep track of the billing cycles and/or usage that's associated with any additional charges. For example, if you want to bill biweekly, then you can create a recurring job that [creates a usage charge](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions) for the desired amount every two weeks.

***

---


<!-- PAGE 16/53: Update the maximum charge -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/update-max-charge -->

# Update the maximum charge for a subscription

Update the maximum amount that merchants can be charged for their subscription. You should do this if you change your pricing model.

**Note:**

If you try to create a usage record for a usage pricing plan with an amount that's less than the new usage record, then the request fails. You need to increase the `cappedAmount`, and then obtain merchant approval before you can create more usage records.

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

***

## Step 1: Retrieve charge data

Make a request to the [`AppSubscription`](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppSubscription) object for the following data:

* `id`

* `cappedAmount`

  The `cappedAmount` is the maximum that a merchant is billed for during the 30-day billing cycle. The `currencyCode` must be one of the [supported currencies](https://shopify.dev/docs/apps/launch/billing#supported-currencies).

* `balanceUsed`

  The following query is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## JSON response

```json
{
  "data": {
    "node": {
      "lineItems": [
        {
          "plan": {
            "pricingDetails": {
              "terms": "$1 for 100 emails",
              "cappedAmount": {
                "amount": "20.0",
                "currencyCode": "USD"
              },
              "balanceUsed": {
                "amount": "0.0",
                "currencyCode": "USD"
              }
            }
          }
        }
      ]
    }
  },
  ...
}
```

***

## Step 2: Update the capped amount

Update the app subscription's capped amount by passing the `AppSubscription` ID to the [`appSubscriptionLineItemUpdate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionLineItemUpdate) mutation as an argument.

The following mutation is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## JSON response

```json
{
  "data": {
    "appSubscriptionLineItemUpdate": {
      "userErrors": [],
      "confirmationUrl": "https://domain.myshopify.com/admin/charges/4019585080/confirm_update_capped_amount?signature=BAh7BzoHaWRsKwc4AJbvOhJhdXRvX2FjdGl2YXRlRg%3D%3D--a93b35054feb213f04f1ee35ef5b569617ce6823",
      "appSubscription": {
        "id": "gid://shopify/AppSubscription/4019585080"
      }
    }
  },
  ...
}
```

***

## Next steps

[Discounts\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

[Learn about offering subscription discounts.](https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts)

***

---


<!-- PAGE 17/53: Offer subscription discounts -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/subscription-billing/offer-subscription-discounts -->

# Offer subscription discounts

Creating an app subscription with a discount is a way to incentivize new merchants to try out the app at a lower cost. You can use the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql) to offer a percentage-value or fixed-price discount.

***

## How it works

You can apply subscription discounts for a set number of billing cycles, such as 20% off for six billing cycles. You can discount subscriptions for new and existing subscribers.

Taxes, Shopify service fees, and revenue share are calculated based on the discounted price and not the base price.

### When discounts begin

A discount can be applied to annual and 30-day subscriptions. Subscription discounts apply the next time that the subscription is charged. If you change the app subscription price, then the discount applies to the remaining portion of the current billing interval and the subscription's future billing intervals.

If you offer trial days with discounts, then the discount applies after the trial ends and when the app billing interval begins. If an app subscription is currently in a trial period and you add an app subscription discount, then the trial ends and the subscription with the discount applies immediately.

If you have specified a set number of billing intervals for your discount, then the time starts counting down from the moment that the discount is applied. Trial periods are ignored. If you don't specify a limit to the number of billing intervals for the discount, then the discount is considered limitless and applies indefinitely to the subscription.

### When proration affects discounts

If your new subscription requires prorating, such as when the subscription's price or billing interval is changed, then the discounted price is used when Shopify calculates the prorated amount.

If the new subscription doesn't require proration, then the discounted price starts from the renewal date.

Learn more about [prorated charges and credits](https://shopify.dev/docs/apps/launch/billing/subscription-billing#proration).

### When discounts end

You can remove a discount from a subscription at any time. [Create a new subscription](https://shopify.dev/docs/apps/launch/billing/subscription-billing), without a discount, for the merchant to approve.

The merchant is charged the discounted price for the remainder of the billing interval unless a proration is required, such as for an increase or decrease in price. If a price change is created with a discount, then the discount is applied to the remaining value until the next subscription.

***

## Next steps

[Best practices\
\
](https://shopify.dev/docs/apps/launch/billing)

[Learn best practices for app billing.](https://shopify.dev/docs/apps/launch/billing)

***

---


<!-- PAGE 18/53: Support one-time purchases -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/support-one-time-purchases -->

# Support one-time app purchases

A single one-time app charge uses a pricing model similar to purchasing a product, where you make a one-time payment at the time of purchase. Multiple app charges follow a pay-as-you-go pricing model, meaning that when use of a service or product has reached a certain limit, another payment is made to continue using it. In this case, the one time charge represents multiple charges that your app creates.

Merchants must approve the pricing plan. After accepting the charges, the merchant is redirected to a URL that you provide.

***

## Requirements

* Your app can make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the GraphQL Admin API.

***

## Step 1: Create the charge

1. [Refer to an example](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appPurchaseOneTimeCreate#examples-Create_a_app_one_time_purchase_app_) of creating a one-time app charge.

2. Make a request to the `appPurchaseOneTimeCreate` mutation with the following information:

   * [`name`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appPurchaseOneTimeCreate#argument-name)
   * [`price`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appPurchaseOneTimeCreate#argument-price)
   * [`returnUrl`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appPurchaseOneTimeCreate#argument-returnurl)
   * [`currencyCode`](https://shopify.dev/docs/apps/launch/billing#supported-currencies)

***

## Step 2: Monitor updates to one-time app purchases

To receive notifications when merchants update their one-time app purchases, subscribe to the GraphQL Admin API's [`APP_PURCHASES_ONE_TIME_UPDATE`](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic#value-apppurchasesonetimeupdate) webhook topic.

***

## Next steps

[Viewing charges\
\
](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings)

[Learn about viewing app charges and earnings.](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings)

[Best practices\
\
](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

[Learn about app billing best practices.](https://shopify.dev/docs/apps/launch/billing/subscription-billing)

***

---


<!-- PAGE 19/53: Award app credits -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/award-app-credits -->

# Award app credits

You can use the [Partner API](#award-app-credits-using-the-partner-api) to give credits to merchants who've installed your app. You can also award app credits using the [Partner Dashboard](#award-app-credits-from-the-partner-dashboard). Merchants can use these app credits to get discounts on future app purchases, monthly subscription fees, and usage charges.

***

## How it works

When you award merchants app credits, the amount is withdrawn from your Partner account based on your revenue share.

There are two scenarios to understand regarding revenue deduction:

* **No revenue deduction**: If the app credit is applied to a pending charge (such as an unpaid invoice), you won't see a deduction from your revenue share.
* **Revenue deduction**: You'll only see a deduction when the app credit amount exceeds any pending charges on the merchant's account.

In other words, Shopify won't deduct from your revenue share for credits that offset amounts the merchant hasn't paid yet.

To use the Partner API, you'll need to implement triggers for the charge, such as when a merchant installs an app, upgrades their service plan, or makes an individual purchase.

***

## Award app credits using the Partner API

To award store credits for your app, you can use the Partner API's [`appCreditCreate`](https://shopify.dev/docs/api/partner/) mutation.

***

## Award app credits from the Partner Dashboard

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. In the search bar of the Partner Dashboard, enter the name of the store that you want to award app credits to.
3. In the search results, select the store.
4. On the right side of the store page, next to the **App credits** card, click **Send**.
5. On the **App credits** page, select the associated app name.
6. Specify the currency and amount to credit.
7. Optional: Add a note with the reason for awarding credits.
8. Click **Send**.

If the app credit was successfully awarded, a new event displays on the store's page in your Partner Dashboard, and the merchant receiving the app credit can view the sent amount in the **Billing** section of their Shopify admin.

### Required permissions

Owners can issue app credits by default. Staff members can issue app credits if they have the `Manage credits and refunds` permission.

Learn more about [managing staff member permissions](https://help.shopify.com/partners/dashboard/account-access).

***

## Limitations

The total amount of credits can't exceed the total amount of pending payouts in your Partner account.

**Note:**

To view pending payouts, refer to the **Payments** page on your [Partner Dashboard](https://www.shopify.com/partners).

***

## Next steps

[Best practices\
\
](https://shopify.dev/docs/apps/launch/billing)

[Learn best practices for app billing.](https://shopify.dev/docs/apps/launch/billing)

***

---


<!-- PAGE 20/53: Refund app charges -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/refund-app-charges -->

# Refund app charges

From the [app charge overview](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings#app-charge-overview-page) page for a particular app charge, you can issue a full or partial refund to the merchant.

***

## How it works

When you issue a refund to a merchant for an app or theme, Shopify refunds you only for any commission collected. The processing fee charged on the app or theme sale is not refunded. [Learn how to view your Shopify fee invoices](https://help.shopify.com/partners/getting-started/getting-paid#fee-and-commission-invoices).

You can issue multiple refunds for the same charge when a partial refund is completed, as long as there's a remaining balance on the charge. When there's no remaining balance, the button to issue the refund isn't available.

***

## Required permissions

Store owners can issue refunds by default. Staff members require the `Manage refunds` and `Manage app` permissions. [Learn more about managing staff member permissions](https://help.shopify.com/partners/dashboard/account-access).

***

## Limitations

The following are limitations associated with issuing refunds:

* You can only refund charges that the merchant has paid for. If an app charge hasn't been paid, then you can [credit the charge](https://shopify.dev/docs/apps/launch/billing/award-app-credits) to remove it from the merchant's bill.

* Apps can't issue refunds for charges that are higher than $1000.00 USD. To process a refund that meets this criterion, contact [Shopify Support](https://partners.shopify.com/current/support/).

* Apps can't issue refunds for invoices that are older than 12 months. To process a refund that meets this criterion, contact [Shopify Support](https://partners.shopify.com/current/support/).

* If a merchant paid for their invoice with an Automated Clearing House (ACH) bank transfer, then apps can only refund charges on invoices that are less than 90 days old.

***

## Issue a refund for an app charge

You can issue a full or partial refund for an app charge through the [Partner Dashboard](https://www.shopify.com/partners).

**Note:**

Merchants don't receive an automatic notification of the refund status, so you must follow up with the merchant and ask them to check their invoice to make sure that the refund went through.

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. In the Partner Dashboard search bar, enter the name of the store with the app charges that you want to check.
3. In the search results, click the name of the store.
4. Next to the app charge that you want to check, click the link in the **Details** column.
5. Click the arrow to open the charge, and then click **Issue refund**.
6. In the **Refund amount** field, enter the amount that you want to refund. You can refund the full amount or a partial amount.
7. Click **Refund**.

After the refund is complete, the charge details are updated to include the refund.

***

## Next steps

[Best practices\
\
](https://shopify.dev/docs/apps/launch/billing)

[Learn best practices for app billing.](https://shopify.dev/docs/apps/launch/billing)

***

---


<!-- PAGE 21/53: View charges and earnings -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/billing/view-charges-earnings -->

# View charges and earnings

You can view data on charges and transactions using the following mechanisms:

* [Partner Dashboard](#app-charge-data-in-the-partner-dashboard)

* [GraphQL Admin API](#transaction-data-through-the-graphql-admin-api)

***

## App charge data in the Partner Dashboard

You can view the following data by page in the [Partner Dashboard](https://www.shopify.com/partners):

| Page | Data |
| - | - |
| [**App charge overview**](#app-charge-overview-page) | * Recurring app subscription charges
* Usage-based app subscription charges
* One-time app charges |
| [**Store**](#store-page) | App charges for a specific store |
| [**Payouts**](#payouts-page) | App charges for a specific payout |
| [**App history**](#app-history-page) | App charge details |

***

## App charge overview page

**Note:**

In the event of a discrepancy between the overview page and the [**Payouts** page](#payouts-page), the information on the **Payouts** page should be considered the accurate reference.

The app charge overview page provides the most comprehensive information regarding charges and earnings. The page provides the following details:

* Merchant information, including a link to the store where the app is installed

* The name of the app that the merchant was charged for, including a link to the app

* The status of the app charge or subscription

* The list of merchant payment transactions that are associated with the charge

  Clicking the arrow next to a transaction displays the following details:

* An itemized list of the Shopify revenue share fee, processing fee, and your net profit as the app's developer

* A link to the Partner payout that includes the app charge. The payout link isn't applicable to pending payouts.

  ![The app charge overview page listing details for a subscription to a Basic plan. The overview page includes the app subscription ID, a clickable link to the app and the store on which the app is installed, payment invoice details, and the option to issue a refund](https://shopify.dev/assets/assets/images/api/subscriptions/app-charge-overview-page-3PlSBT1q.png)

  The overview page includes [additional charge details](#subscription-charge-details) for subscription charges.

### Subscription charge details

You can view the following additional details for subscription charges:

* A description of the charge, such as $15 every 30 days for an app subscription charge.

* The date on which the charge was created.

* The charge's status, which can be one of the following:

  | Status | Description |
  | - | - |
  | **Pending** | The merchant hasn't yet approved or declined the charge. |
  | **Activated** | The charge is currently active.For some payments, such as wire transfers, Shopify marks the charge as active when the payment is in flight. |
  | **Declined** | The merchant declined the charge. |
  | **Canceled** | The merchant or the developer canceled the subscriptionIf a payment doesn't go through, then Shopify retries the charge. Only shut off a merchant's app access after Shopify freezes the charge. |
  | **Frozen** | The subscription is on hold due to a store subscription non-payment. The charge reactivates after the subscription payments resume. |
  | **Expired** | The merchant didn't accept the charge within two non-business days. |

***

## Transaction data through the Graph​QL Admin API

You can use the following billing resources on the GraphQL Admin API to view transaction data:

| Transaction data | Resource | Learn how |
| - | - | - |
| Single app purchase | `AppPurchaseOneTime` | [Example](#single-app-purchase) |
| Multiple app purchases | `currentAppInstallation` | [Example](#multiple-app-purchases) |
| Single app subscription | `currentAppInstallation` | [Example](#single-app-subscription) |
| Multiple app subscription | `AppSubscription` | [Example](#multiple-app-subscriptions) |
| App usage records for a single subscription | `AppSubscription` | [Example](#app-usage-records-for-a-single-subscription) |
| App usage records for multiple subscriptions | `currentAppInstallation` | [Example](#app-usage-records-for-multiple-subscriptions) |
| App usage record | `currentAppInstallation` | [Example](#app-usage-record-by-id) |

***

## View app revenue

You can view your app's revenue and retrieve data on transactions using the following mechanisms:

* [Partner Dashboard](#viewing-app-charges-in-the-partner-dashboard)

* [GraphQL Admin API](#querying-billing-data-with-the-graphql-admin-api)

### Requirements

* To use the Partner Dashboard, you require a [Partner account](https://www.shopify.com/partners).

* To view the Partner Dashboard's app charge overview and **Payouts** pages, store owners and staff require the `View financials` permission.

* To use the GraphQL Admin API, your app must be able to make [authenticated requests](https://shopify.dev/docs/api/admin-graphql#authentication) to the API.

### Viewing app charges in the Partner Dashboard

The following procedures explain how to view app charges and data from the Partner Dashboard:

#### App charge overview page

1. Open [**App distribution**](https://partners.shopify.com/current/apps) on your Partner Dashboard.
2. Select the app that you want to view charges for.
3. On the **Overview** page, scroll to **Latest app history**.
4. Optional: Select **View all app history** and navigate through the pages.
5. In the **Event Details** column, click **Open payments**.
6. To view transaction details, next to a transaction click the inverted caret (▼).

#### Store page

1. Open [**App distribution**](https://partners.shopify.com/current/apps) on your Partner Dashboard.
2. In the search bar, enter the name of the store with the app charges that you want to check.
3. In the search results, select the store.
4. Next to the app charge that you want to check, click the link in the **Details** column.

#### Payouts page

1. Open [**App distribution**](https://partners.shopify.com/current/apps) on your Partner Dashboard.
2. In the sidebar, click **Payouts**.
3. On the **Payouts** page, click the payout with the app charges that you want to check.
4. Next to the app charge that you want to check, click the link in the **Type** column.
5. For details, next to a transaction click the inverted caret.

#### App history page

1. Open [**App distribution**](https://partners.shopify.com/current/apps) on your Partner Dashboard.
2. Click the name of the app with the charges that you want to check.
3. In the sidebar, click **Insights** > **App history**.
4. In the table next to the app charge that you want to check, in the **Event Details** column, click **Open payments**.
5. For details, next to a transaction click the inverted caret.

### Querying billing data with the Graph​QL Admin API

Use the following examples to familiarize yourself with billing data in the GraphQL Admin API. The currency code must be one of the [supported currencies](https://shopify.dev/docs/apps/launch/billing#supported-currencies).

#### App purchases

You can query a [single purchase](#single-app-purchase) or [multiple purchases](#multiple-app-purchases).

##### Single app purchase

Query a single purchase with the [`AppPurchaseOneTime`](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppPurchaseOneTime) object. Pass the app purchase ID as an argument. You can retrieve this ID from the [**Payouts**](#payouts-page) page.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  node(id: "gid://shopify/AppPurchaseOneTime/5308422") {
    ... on AppPurchaseOneTime {
      price {
        amount
        currencyCode
      }
      createdAt
      id
      name
      status
      test
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "node": {
      "price": {
        "amount": "100.0",
        "currencyCode": "USD"
      },
      "createdAt": "2023-09-01T19:17:09Z",
      "id": "gid://shopify/AppPurchaseOneTime/5308422",
      "name": "Super Duper Expensive action",
      "status": "ACTIVE",
      "test": true
    }
  },
  ...
}
```

#### Multiple app purchases

Query multiple purchases using [`currentAppInstallation`](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentAppInstallation). Specify the number of purchases to return by passing `first` or `last` as an argument.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  currentAppInstallation {
    oneTimePurchases(first: 2) {
      edges {
        node {
          ...on AppPurchaseOneTime {
            price {
              amount
              currencyCode
            }
            createdAt
            id
            name
            status
            test
          }
        }
      }
    }
  }
}
```

## JSON response

```json
{
   "data": {
     "currentAppInstallation": {
       "oneTimePurchases": {
         "edges": [
           {
             "node": {
               "price": {
                 "amount": "100.0",
                 "currencyCode": "USD"
               },
               "createdAt": "2023-08-30T19:17:09Z",
               "id": "gid://shopify/AppPurchaseOneTime/5308422",
               "name": "Super Duper Expensive action",
               "status": "ACTIVE",
               "test": true
             }
           },
           {
             "node": {
               "price": {
                 "amount": "100.0",
                 "currencyCode": "USD"
               },
               "createdAt": "2023-09-01T18:22:00Z",
               "id": "gid://shopify/AppPurchaseOneTime/5701638",
               "name": "Another Super Duper Expensive action",
               "status": "EXPIRED",
               "test": true
             }
           }
         ]
       }
     }
   },
   ...
}
```

#### App subscriptions

You can query a [single subscription](#single-app-subscription) or [multiple subscriptions](#multiple-app-subscriptions).

##### Single app subscription

Query a single subscription using the [`AppSubscription`](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppSubscription) object. Pass the subscription ID as an argument.

The subscription ID is returned when you create a subscription. The `AppSubscription` object can also return the app subscriptions that are associated with the installation.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  node(id: "gid://shopify/AppSubscription/4019585080") {
    ...on AppSubscription {
      billingInterval
      createdAt
      currentPeriodEnd
      id
      name
      status
      test
      lineItems {
        plan {
          pricingDetails {
            ...on AppRecurringPricing {
              interval
              price {
                amount
                currencyCode
              }
            }
            ...on AppUsagePricing {
              terms
              cappedAmount {
                amount
                currencyCode
              }
              balanceUsed {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "node": {
      "billingInterval": "EVERY_30_DAYS",
      "createdAt": "2023-09-01T15:50:50Z",
      "currentPeriodEnd": null,
      "id": "gid://shopify/AppSubscription/4019585080",
      "name": "Super Duper Capped Pricing Plan",
      "status": "CANCELLED",
      "test": true,
      "lineItems": [
        {
          "plan": {
            "pricingDetails": {
              "terms": "$1 for 100 emails",
              "cappedAmount": {
                "amount": "20.0",
                "currencyCode": "USD"
              },
              "balanceUsed": {
                "amount": "0.0",
                "currencyCode": "USD"
              }
            }
          }
        }
      ]
    }
  },
  ...
}
```

##### Multiple app subscriptions

Query multiple subscriptions using [`currentAppInstallation`](https://shopify.dev/docs/api/admin-graphql/latest/objects/currentAppInstallation). Specify the number of subscriptions to return by passing `first` or `last` as an argument.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  currentAppInstallation {
    allSubscriptions(first: 2) {
      edges {
        node {
          lineItems {
            plan {
              pricingDetails {
                __typename
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                }
                ... on AppUsagePricing {
                  balanceUsed {
                    amount
                    currencyCode
                  }
                  cappedAmount {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          createdAt
          id
          name
          status
          test
        }
      }
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "currentAppInstallation": {
      "allSubscriptions": {
        "edges": [
          {
            "node": {
              "lineItems": [
                {
                  "plan": {
                    "pricingDetails": {
                      "__typename": "AppRecurringPricing",
                      "price": {
                        "amount": "4.99",
                        "currencyCode": "USD"
                      }
                    }
                  }
                },
                {
                  "plan": {
                    "pricingDetails": {
                      "__typename": "AppUsagePricing",
                      "balanceUsed": {
                        "amount": "0.0",
                        "currencyCode": "USD"
                      },
                      "cappedAmount": {
                        "amount": "100.0",
                        "currencyCode": "USD"
                      }
                    }
                  }
                }
              ],
              "createdAt": "2023-08-30T17:00:16Z",
              "id": "gid://shopify/AppSubscription/2816132",
              "name": "Gift Basket Plan",
              "status": "EXPIRED",
              "test": true
            }
          },
          {
            "node": {
              "lineItems": [
                {
                  "plan": {
                    "pricingDetails": {
                      "__typename": "AppRecurringPricing",
                      "price": {
                        "amount": "4.99",
                        "currencyCode": "USD"
                      }
                    }
                  }
                },
                {
                  "plan": {
                    "pricingDetails": {
                      "__typename": "AppUsagePricing",
                      "balanceUsed": {
                        "amount": "0.0",
                        "currencyCode": "USD"
                      },
                      "cappedAmount": {
                        "amount": "100.0",
                        "currencyCode": "USD"
                      }
                    }
                  }
                }
              ],
              "createdAt": "2023-09-01T19:42:43Z",
              "id": "gid://shopify/AppSubscription/2962896",
              "name": "Gift Basket Plan",
              "status": "EXPIRED",
              "test": true
            }
          }
        ]
      }
    }
  },
  ...
}
```

#### App usage records

Query an app usage record for a [single subscription](#app-usage-records-for-a-single-subscription) or records for [multiple subscriptions](#app-usage-records-for-multiple-subscriptions). You can also query a specific app usage record by its ID.

##### App usage records for a single subscription

Query the app usage record for a single subscription using the [`AppSubscription`](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppSubscription) object. Pass the subscription ID as an argument. You can specify the number of records to return by passing `first` or `last` as an argument.

The subscription ID is returned when you create a subscription. The `AppSubscription` object can also return the app subscriptions that are associated with the installation.

The following is an example:

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  node(id: "gid://shopify/AppSubscription/4019585080") {
    ...on AppSubscription {
      lineItems {
        usageRecords(first: 5) {
          edges {
            node {
              id
              description
              createdAt
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "node": {
      "lineItems": [
        {
          "usageRecords": {
            "edges": [
              {
                "node": {
                  "id": "gid://shopify/AppUsageRecord/14518231",
                  "description": "Super Mega Plan 1000 emails",
                  "createdAt": "2019-05-30T16:03:31Z",
                  "price": {
                    "amount": "1.0",
                    "currencyCode": "USD"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  },
  ...
}
```

##### App usage records for multiple subscriptions

Query the app usage record for a single subscription using [`currentAppInstallation`](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentAppInstallation). You can get the `usageRecords` from the `lineItems` field of `allSubscriptions`. Specify the number of records to return by passing `first` or `last` as an argument.

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  currentAppInstallation {
    allSubscriptions(first: 2) {
      edges {
        node {
          id
          status
          lineItems {
            id
            usageRecords(first: 5) {
              edges {
                node {
                  id
                  description
                  createdAt
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "currentAppInstallation": {
      "allSubscriptions": {
        "edges": [
          {
            "node": {
              "id": "gid://shopify/AppSubscription/2816132",
              "status": "EXPIRED",
              "lineItems": [
                {
                  "id": "gid://shopify/AppSubscriptionLineItem/2816132?v=1&index=0",
                  "usageRecords": {
                    "edges": []
                  }
                },
                {
                  "id": "gid://shopify/AppSubscriptionLineItem/2816132?v=1&index=1",
                  "usageRecords": {
                    "edges": []
                  }
                }
              ]
            }
          },
          {
            "node": {
              "id": "gid://shopify/AppSubscription/2962896",
              "status": "EXPIRED",
              "lineItems": [
                {
                  "id": "gid://shopify/AppSubscriptionLineItem/2962896?v=1&index=0",
                  "usageRecords": {
                    "edges": []
                  }
                },
                {
                  "id": "gid://shopify/AppSubscriptionLineItem/2962896?v=1&index=1",
                  "usageRecords": {
                    "edges": []
                  }
                }
              ]
            }
          }
        ]
      }
    }
  },
  ...
}
```

##### App usage record by ID

Query a specific app usage record using the [`AppUsageRecord`](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppUsageRecord) object. Pass the app usage record ID as an argument.

## POST https://{shop}.myshopify.com/api/{api\_version}/graphql.json

## GraphQL query

```graphql
query {
  node(id: "gid://shopify/AppUsageRecord/14518231") {
    ...on AppUsageRecord {
      createdAt
      description
      id
      price {
        amount
        currencyCode
      }
    }
  }
}
```

## JSON response

```json
{
  "data": {
    "node": {
      "createdAt": "2023-09-01T16:03:31Z",
      "description": "Super Mega Plan 1000 emails",
      "id": "gid://shopify/AppUsageRecord/14518231",
      "price": {
        "amount": "1.0",
        "currencyCode": "USD"
      }
    }
  },
  ...
}
```

***

---


<!-- PAGE 22/53: About deployment -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment -->

# About deployment

This guide explains how to make your Shopify app available to merchants. You'll learn about hosting options and deployment requirements, whether you're building with [Shopify React Router](https://shopify.dev/docs/apps/build/build) or another framework.

***

## General requirements for deployment

Before deploying your app:

* Review your [app's launch requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist) and [learn about the launch process](https://shopify.dev/docs/apps/launch)
* [Test your app functionality](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files#test-your-app-functionality) in a development environment
* Make sure your local `shopify.app.toml` configuration file is accurate

**Note:**

The [Shopify React Router template](https://shopify.dev/docs/apps/build/build) automatically handles key deployment requirements such as authentication, session management, webhook handling, and environment configuration.

***

## How it works

When you deploy a Shopify app, you're making your code available to merchants. This involves:

* Moving your code from your local development environment to a hosting service
* Connecting your hosted app to Shopify through [Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps) or the [Dev Dashboard](https://dev.shopify.com/dashboard/)
* Managing app extensions and configurations through app versions

Your hosting service manages the app's runtime environment and handles incoming requests through authenticated connections.

***

## Deploying to production

If you're planning on deploying your app for use in production, then consider creating a separate app. The app might use the same repository and code base that you use for development and testing, but has its own record and configuration in the Dev Dashboard.

**Note:**

When deploying a Shopify app, we need to be able to reliably determine which extensions have been added, updated, and removed from your app. This means that we need to map extension code to our records of your extensions on Shopify.

To achieve this, [app extensions](https://shopify.dev/docs/apps/build/app-extensions) are idenitified by extension user identifiers (UIDs) that are set in the `shopify.extension.toml` file. Extension UIDs are unique, source-defined, and app-scoped, so they can be shared across production, staging, and development apps.

By default, UIDs are automatically added when you create a new extension using `shopify app extension generate`, or when you run `shopify app deploy`. UIDs are deterministic based on the extension handle, so they will always be the same for extensions with the same app handle value.

**Note:**

[App extensions](https://shopify.dev/docs/apps/build/app-extensions) are all managed with the Shopify CLI. If you want to make any changes to app extensions, you must deploy new versions from the Shopify CLI.

***

## Hosting and deployment options

Choose a deployment method based on your app's requirements:

### Hosting providers

The following are common providers for hosting traditional Shopify apps with backend servers:

[Deploy to Google Cloud Run\
\
](https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run)

[Learn how to deploy your Shopify app to Google Cloud Run.](https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run)

[Deploy to Fly.io\
\
](https://fly.io/shopify)

[Learn how to deploy your Shopify app to Fly.io.](https://fly.io/shopify)

[Deploy to Render\
\
](https://docs.render.com/deploy-shopify-app)

[Learn how to deploy your Shopify app to Render.](https://docs.render.com/deploy-shopify-app)

### Manual deployment

If you're comfortable with app hosting and deployment, or if you have specific infrastructure requirements, then you can deploy to a preferred hosting service that can run JavaScript apps:

[Manual deployment guide\
\
](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service)

[Choose this option if you need complete control over your hosting environment or have specific infrastructure requirements.](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service)

***

## App versions

After setting up your [app configuration](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration) or creating [app extensions](https://shopify.dev/docs/apps/build/app-extensions), you can deploy these components together and release a new app version to users.

[App versions overview\
\
](https://shopify.dev/docs/apps/launch/deployment/app-versions)

[Learn about the deployment model for app configuration and extensions.](https://shopify.dev/docs/apps/launch/deployment/app-versions)

[Deploy and release app versions\
\
](https://shopify.dev/docs/apps/launch/deployment/deploy-app-versions)

[Learn how to deploy app configuration and extensions to Shopify.](https://shopify.dev/docs/apps/launch/deployment/deploy-app-versions)

[Deploy in a CD pipeline\
\
](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline)

[Learn how to deploy in a CI/CD pipeline.](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline)

***

## Next steps

After you have deployed your app, it's time to [review distribution options](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method).

***

---


<!-- PAGE 23/53: Deploy to Google Cloud Run -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run -->

# Deploy apps to Google Cloud Run

This guide shows you how to deploy a Shopify app to [Google Cloud Run](https://cloud.google.com/run), making your app available to merchants in production. Deploying to Google Cloud Run provides a scalable, managed hosting solution that handles the infrastructure so you can focus on your app's functionality.

**Note:**

This guide focuses on [deploying a Shopify app](https://shopify.dev/docs/apps/launch/deployment) to [Google Cloud Run](https://cloud.google.com/run) as it generalizes well to many common frameworks used to develop apps. Consult the deployment documentation if you'd rather [deploy to another supported provider](https://shopify.dev/docs/apps/launch/deployment#hosting-and-deployment-options), or [follow general guidelines to manually deploy elsewhere](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service).

**A note on permissions and settings:**

This tutorial demonstrates deploying a CLI-scaffolded React Router app to Google Cloud Run using simplified permissions and default service accounts. These settings work for learning and development but are likely over-permissive for production environments.

Review and adjust IAM permissions and service accounts to match your organization's security requirements before deploying production apps.

***

## What you'll learn

In this guide you'll learn how to do the following tasks:

* Retrieve sensitive configuration details about your Shopify app needed to deploy.
* Configure a Cloud Run project to host a Shopify app, including providing access to secrets specific to your Shopify app.
* Deploy your app's code to either a single or multiple regions on Google Cloud Run, depending on your needs.
* Test your deployment by reconfiguring your development store to use your new deployment.

**Note:**

References in this guide assume you're deploying a Shopify app built with [Shopify React Router](https://shopify.dev/docs/apps/build/build), which automatically handles key deployment requirements such as authentication, session management, webhook handling, and environment configuration.

***

## How it works

When you deploy a Shopify app, you're making your code available to merchants. This involves:

* Moving your code from your local development environment to a hosting service
* Connecting your hosted app to Shopify through the Partner Dashboard
* Managing app extensions and configurations separately through app versions

Your hosting service manages the app's runtime environment and handles incoming requests through authenticated connections set up in the Partner Dashboard.

This guide focuses on the first step - moving code from your local development environment to a hosting service. You will set up a very basic project on Google Cloud Run, and deploy your app there.

***

## Requirements

* [Scaffold](https://shopify.dev/docs/apps/build/scaffold-app) and then [Build](https://shopify.dev/docs/apps/build/build) a Shopify app.
* [Test your app functionality](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files#test-your-app-functionality) in a development environment
* [Install](https://cloud.google.com/sdk/docs/install) the `gcloud` CLI and authenticate with your account.

***

## Step 1: Gather app configuration

Gather the configuration details and credentials from your local development environment that you'll need to deploy your app to a hosting service.

1. Use the Shopify CLI to export the API token, API secret, and scopes from your Shopify app into the terminal session by running the following command:

   ##### Mac/Linux (bash)

   ```bash
   eval $(shopify app info --web-env)
   ```

   ##### Windows (PowerShell)

   ```powershell
   shopify app info --web-env | Invoke-Expression
   ```

2. Generate a `shopify.app.toml` configuration file for the version of your app you're going to deploy by running the `app config link` command below (if you haven't done so already):

   ## Terminal

   ```bash
   shopify app config link
   ```

***

## Step 2: Create and connect a project

In this step you will create project to act as a production workspace for this tutorial, as well as a [service](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) that will contain your actual running app code.

1. Create identifying environment variables for both the service and the project you will reuse throughout this tutorial:

   ##### Mac/Linux (bash)

   ```bash
   export PROJECT_ID="my-app-name-project" && export SERVICE_NAME="my-app-name-service"
   ```

   ##### Windows (PowerShell)

   ```powershell
   $env:PROJECT_ID="my-app-name-project"; $env:SERVICE_NAME="my-app-name-service"
   ```

2. Create a project on Google Cloud Run:

   ## Terminal

   ```bash
   gcloud projects create $PROJECT_ID
   ```

3. Connect your repository to the new project so that all the commands that follow in this tutorial will apply to the project:

   ## Terminal

   ```bash
   gcloud config set project $PROJECT_ID
   ```

***

## Step 3: Configure your project

With the project created, you'll now need to configure the project with the necessary APIs and permissions to deploy and run your Shopify app.

1. Enable the required APIs for deployment ([Cloud Run Admin API](https://cloud.google.com/run/docs/reference/rest), [Cloud Build API](https://cloud.google.com/build/docs/api), [Secret Manager API](https://cloud.google.com/secret-manager/docs/reference/rest), and the [Artifact Registry API](https://cloud.google.com/artifact-registry/docs/reference/rest)), using the `services enable` command:

   ## Terminal

   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
       secretmanager.googleapis.com artifactregistry.googleapis.com
   ```

2. Export your Google Cloud account email address to the environment variable `$USER_EMAIL`:

   ##### Mac/Linux (bash)

   ```bash
   export USER_EMAIL="salma.ayad@example.com"
   ```

   ##### Windows (PowerShell)

   ```powershell
   $env:USER_EMAIL="salma.ayad@example.com"
   ```

3. Grant yourself the necessary roles by running the following command:

   ##### Mac/Linux (bash)

   ```bash
   for role in "roles/run.developer" "roles/secretmanager.admin" "roles/iam.serviceAccountUser" "roles/cloudbuild.builds.editor"; do
     gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:$USER_EMAIL" --role="$role"
   done
   ```

   ##### Windows (PowerShell)

   ```powershell
   foreach ($role in @("roles/run.developer", "roles/secretmanager.admin", "roles/iam.serviceAccountUser", "roles/cloudbuild.builds.editor")) {
     gcloud projects add-iam-policy-binding $env:PROJECT_ID --member="user:$env:USER_EMAIL" --role="$role"
   }
   ```

***

## Step 4: Manage secrets

In order for your Shopify app to run successfully on Cloud Run, it needs access to the environment variables you defined at the beginning of this tutorial. This involves defining secrets for each variable, and configuring them so that can be accessed at runtime.

In Cloud Run, this means first granting access to a service account (in this case, the [Compute Engine default service account](https://docs.cloud.google.com/compute/docs/access/service-accounts#default_service_account)) that will handle your deployments. Later in **Step 5** you'll run another command that will actually make the variables accessible at runtime.

1. Create secrets in Secret Manager, using the API key and API secret environment variables you created earlier to create secrets for each of them:

   ##### API key

   ```bash
   echo $SHOPIFY_API_KEY | gcloud secrets create shopify-api-key --data-file=-
   ```

   ##### API secret

   ```bash
   echo $SHOPIFY_API_SECRET | gcloud secrets create shopify-api-secret --data-file=-
   ```

   You can verify that the secrets were created successfully by running the command below:

   ## Terminal

   ```bash
   gcloud secrets list
   ```

2. Run the command below to find and export the unique `PROJECT_NUMBER` associated with your project:

   ##### Mac/Linux (bash)

   ```bash
   PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   ```

   ##### Windows (PowerShell)

   ```powershell
   $env:PROJECT_NUMBER = gcloud projects describe $env:PROJECT_ID --format="value(projectNumber)"
   ```

3. Use `PROJECT_NUMBER` to build the default service account email address associated with your project, and then give it access to the secrets you defined previously through the [Secret Manager Secret Accessor role](https://cloud.google.com/secret-manager/docs/access-control):

   ## Terminal

   ```bash
   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   ```

***

## Step 5: Deploy your app to Cloud Run

Deploy your app code to Cloud Run and configure it with the necessary environment variables to make it accessible online. Note that in the steps below, it's expected that the first deployment will fail.

**Note:**

This section outlines commands and requirements for deploying your Shopify app to a single region on Google Cloud Run. Alternatively, your actual requirements (for example, high availability or serving a global user base) may require you instead to deploy to [multiple regions](https://docs.cloud.google.com/run/docs/multiple-regions).

In that case, skip ahead to [Deploy to multiple regions](#optional-deploy-to-multiple-regions) if you need multi-region support.

1. Define the [region location](https://cloud.google.com/run/docs/locations) your app will be deployed to. Run the command below, substituting the region example with one of your choosing:

   ##### Mac/Linux (bash)

   ```bash
   export SERVICE_REGION="us-central1"
   ```

   ##### Windows (PowerShell)

   ```powershell
   $env:SERVICE_REGION="us-central1"
   ```

2. Deploy your code to the Cloud Run service you've defined by running the command below from your Shopify app's project directory:

   ## Terminal

   ```bash
   gcloud run deploy $SERVICE_NAME \
       --source . \
       --region $SERVICE_REGION \
       --set-secrets="SHOPIFY_API_KEY=shopify-api-key:latest,SHOPIFY_API_SECRET=shopify-api-secret:latest" \
       --set-env-vars="SCOPES=$SCOPES" \
       --port 3000 \
       --allow-unauthenticated
   ```

   This first deployment *will* fail with the error `The user-provided container failed to start`, and this is expected. The Shopify app fails at runtime when it's unable to locate the expected `SHOPIFY_APP_URL` environment variable, which you haven't yet defined.

   This variable corresponds to the unique URL of the service you've just deployed, but you couldn't access *until* it was deployed.

   **Note:**

   By default, [Shopify React Router](https://shopify.dev/docs/apps/build/build) built apps run on port 3000 defined in their `Dockerfile`, while the Cloud Run service uses port 8088. This behavior is overwritten in the passed `--port` flag in the command above.

   Update the command if you have overwritten this default port, or if your app has a different one.

   The `--source .` flag uses [Google Cloud's buildpacks and Cloud Build](https://docs.cloud.google.com/run/docs/deploying-source-code) to automatically build container images from your source code. An Artifact Registry Docker repository will be built automatically for you in your `SERVICE_REGION`. For production deployments, consider building and submitting custom container images and passing the `--image` flag instead.

3. Run the following command to retrieve the service URL now that the service has deployed:

   ## Command

   ```bash
   SHOPIFY_APP_URL=$(gcloud run services list --filter="metadata.name:$SERVICE_NAME" --format="get(URL)")
   ```

4. Rerun the deploy command again, now including the expected `SHOPIFY_APP_URL` environment variable in that command:

   ## Command

   ```bash
   gcloud run deploy $SERVICE_NAME \
         --source . \
         --region $SERVICE_REGION \
         --set-secrets="SHOPIFY_API_KEY=shopify-api-key:latest,SHOPIFY_API_SECRET=shopify-api-secret:latest" \
         --set-env-vars="SCOPES=$SCOPES,SHOPIFY_APP_URL=$SHOPIFY_APP_URL" \
         --port 3000 \
         --allow-unauthenticated
   ```

5. Visit `SHOPIFY_APP_URL` or run the command below to verify the service is functioning correctly:

   ## Command

   ```bash
   gcloud run services describe $SERVICE_NAME --region $SERVICE_REGION
   ```

***

## Step 6: Set up a production database

The default SQLite database used in local development won't work for your deployed app on Cloud Run long term. Sessions and data would be lost on every deployment.

To fix this, you'll set up a persistent PostgreSQL database using Cloud SQL and configure your app to use it in production while keeping SQLite for local development.

1. Create a `prisma/schema.prod.prisma` file for your production schema with the following content:

   ## prisma/schema.prod.prisma

   ```text
   generator client {
     provider = "prisma-client-js"
   }


   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }


   model Session {
     id                  String    @id
     shop                String
     state               String
     isOnline            Boolean   @default(false)
     scope               String?
     expires             DateTime?
     accessToken         String
     userId              BigInt?
     firstName           String?
     lastName            String?
     email               String?
     accountOwner        Boolean   @default(false)
     locale              String?
     collaborator        Boolean?  @default(false)
     emailVerified       Boolean?  @default(false)
     refreshToken        String?
     refreshTokenExpires DateTime?
   }
   ```

   The new file should be identical to your existing `prisma/schema.prisma` file, with only the `datasource db` configuration changing to now suit the PostgreSQL `provider`.

2. Update your `Dockerfile` to match the following contents:

   ## Dockerfile

   ```dockerfile
   FROM node:20-alpine
   RUN apk add --no-cache openssl curl


   # Download Cloud SQL Auth Proxy
   RUN curl -o /cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.linux.amd64
   RUN chmod +x /cloud-sql-proxy


   EXPOSE 3000


   WORKDIR /app


   ENV NODE_ENV=production


   COPY package.json package-lock.json* ./


   RUN npm ci --omit=dev && npm cache clean --force


   COPY . .


   # Use production schema for PostgreSQL
   RUN cp prisma/schema.prod.prisma prisma/schema.prisma


   # Delete SQLite migrations (incompatible with PostgreSQL)
   RUN rm -rf prisma/migrations


   RUN npm run build


   # Copy and set permissions for startup script
   RUN chmod +x start.sh


   CMD ["sh", "start.sh"]
   ```

   Notice what's changed here:

   1. **\[4-6] Download Cloud SQL Auth Proxy:** The [Cloud SQL Proxy](https://docs.cloud.google.com/sql/docs/mysql/sql-proxy) creates a standard TCP endpoint at `localhost:5432` inside the container, allowing Prisma to connect using familiar TCP connections.
   2. **\[20-21] Use production schema for PostgreSQL:** Prisma requires the database `provider` to be hardcoded at build time. Instead of changing the local behavior of this app, these lines overwrite the schema using PostgreSQL only in the production context.
   3. **\[23-24] Delete SQLite migrations (incompatible with PostgreSQL):** SQLite migrations would fail when applied to a PostgreSQL database, so they are deleted. You will use `prisma db push` to create tables directly from the schema instead in a later step in this tutorial.
   4. **\[28-31] Copy and set permissions for startup script:** Because app requires that the database connection is available when Prisma interacts with it, running the multiple commands required to make this work is simpler when included in a dedicated script.

3. Create a `start.sh` script in your project root containing the following:

   ## start.sh

   ```bash
   #!/bin/sh


   # Start Cloud SQL Proxy in background
   /cloud-sql-proxy --port 5432 ${INSTANCE_CONNECTION_NAME} &


   # Wait for proxy to be ready
   sleep 3


   # Run production setup and start the app
   npm run setup:prod && npm run start
   ```

   This script launches the Cloud SQL Proxy before the app starts, ensuring the database connection is available when Prisma tries to generate the client and sync the schema.

4. Add a `setup:prod` script to your `package.json` file to specifically handle migrations in the production context:

   ## package.json

   ```bash
   "setup:prod": "prisma generate && prisma db push"
   ```

5. Enable the [Cloud SQL Admin API](https://docs.cloud.google.com/sql/docs/mysql/admin-api) on the project:

   ## Terminal

   ```bash
   gcloud services enable sqladmin.googleapis.com
   ```

6. Create a password for your database:

   ## Terminal

   ```bash
   export DB_PASSWORD="your-secure-password"
   ```

7. Create a PostgreSQL database instance that will persist across deployments:

   ## Terminal

   ```bash
   gcloud sql instances create ${SERVICE_NAME}-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=$SERVICE_REGION \
     --root-password=$DB_PASSWORD
   ```

   **Note:**

   This command can take as long as 10 minutes to complete.

   You can verify the instance is running correctly at this point by running the following command:

   ## Terminal

   ```bash
   gcloud sql instances describe ${SERVICE_NAME}-db --format="get(state)"
   ```

   **Note:**

   This command should return `RUNNABLE`.

8. Create an application database called `shopify_app` in the instance:

   ## Terminal

   ```bash
   gcloud sql databases create shopify_app --instance=${SERVICE_NAME}-db
   ```

9. Retrieve the Service Account you've configured in this tutorial:

   ## Terminal

   ```bash
   SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE_NAME --region=$SERVICE_REGION --format="value(spec.template.spec.serviceAccountName)")
   ```

10. Grant the [Cloud SQL Client](https://docs.cloud.google.com/sql/docs/mysql/roles-and-permissions) role for the Service Account:

    ## Terminal

    ```bash
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/cloudsql.client"
    ```

11. Get the Cloud SQL connection name:

    ## Terminal

    ```bash
    CONNECTION_NAME=$(gcloud sql instances describe ${SERVICE_NAME}-db --format="get(connectionName)")
    ```

12. Build the DATABASE\_URL connection string:

    ## Terminal

    ```bash
    DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@localhost:5432/shopify_app"
    ```

13. Update the Cloud Run service with all configurations:

    ## Terminal

    ```bash
    gcloud run services update $SERVICE_NAME \
      --region=$SERVICE_REGION \
      --add-cloudsql-instances=$CONNECTION_NAME \
      --update-env-vars="DATABASE_URL=$DATABASE_URL,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME,SHOPIFY_APP_URL=$SHOPIFY_APP_URL"
    ```

14. Deploy the updated application:

    ## Terminal

    ```bash
    gcloud run deploy $SERVICE_NAME \
      --source . \
      --region=$SERVICE_REGION \
      --allow-unauthenticated
    ```

***

## Step 7: Connect your app to Shopify

Connect your deployed app to Shopify by updating your app configuration with the new service URL and testing the integration.

1. Update your `shopify.app.toml` file with the Cloud Run service URL:

   ## shopify.app.toml

   ```toml
   application_url = "https://gcp-test-app-xyz123-uc.us-central1.run.app"
   ```

2. Push your configuration to your Shopify development store to verify the service is now accessible:

   ## Terminal

   ```bash
   shopify app deploy
   ```

3. Test that the core functionality of your app is still working, now that your store is communicating with the Cloud Run service rather than your local installation.

***

## Optional: Deploy to multiple regions

Your app may serve a global user base, require high availability, or otherwise have regionally-specific performance considerations. In these cases, you can deploy to multiple regions, then use a global load balancer to route traffic to the nearest region.

**Note:**

Multi-region deployment adds complexity and cost (load balancer fees). For most apps, single-region deployment is sufficient. Consult [Step 5](#step-6-connect-your-app-to-shopify) if you don't need multi-region support.

Make sure to complete steps 1-6 in the tutorial above before proceeding.

### Step 1: Deploy to regions

1. Choose your target regions from the [available Cloud Run locations](https://cloud.google.com/run/docs/locations). In this guide, we'll use `us-central1` (United States), `europe-west1` (Belgium), and `asia-northeast1` (Tokyo). Replace in the subsequent commands with your real world requirements.

2. Deploy your app to each region using the command below:

   ##### Mac/Linux (bash)

   ```bash
   for region in us-central1 europe-west1 asia-northeast1; do
     gcloud run deploy $SERVICE_NAME-$region \
       --source . \
       --region $region \
       --set-secrets="SHOPIFY_API_KEY=shopify-api-key:latest,SHOPIFY_API_SECRET=shopify-api-secret:latest" \
       --set-env-vars="SCOPES=$SCOPES,DATABASE_URL=$DATABASE_URL,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
       --add-cloudsql-instances=$CONNECTION_NAME \
       --port 3000 \
       --no-allow-unauthenticated
   done
   ```

   ##### Windows (PowerShell)

   ```powershell
   foreach ($region in @("us-central1", "europe-west1", "asia-northeast1")) {
     gcloud run deploy "$env:SERVICE_NAME-$region" `
       --source . `
       --region $region `
       --set-secrets="SHOPIFY_API_KEY=shopify-api-key:latest,SHOPIFY_API_SECRET=shopify-api-secret:latest" `
       --set-env-vars="SCOPES=$env:SCOPES,DATABASE_URL=$env:DATABASE_URL,INSTANCE_CONNECTION_NAME=$env:CONNECTION_NAME" `
       --add-cloudsql-instances=$env:CONNECTION_NAME `
       --port 3000 `
       --no-allow-unauthenticated
   }
   ```

   In this tutorial, all regions connect to the same Cloud SQL instance. The database remains in the original `$SERVICE_REGION`, which may add latency for distant regions. Like the single region deployment in previous steps, this command will fail for each region until we provide the load balancer URL in a later step.

   **Note:**

   We use `--no-allow-unauthenticated` because the load balancer will handle public access.

3. Create a [Network Endpoint Group (NEG)](https://docs.cloud.google.com/load-balancing/docs/negs) for each regional Cloud Run service:

   ##### Mac/Linux (bash)

   ```bash
   for region in us-central1 europe-west1 asia-northeast1; do
     gcloud compute network-endpoint-groups create $SERVICE_NAME-neg-$region \
       --region=$region \
       --network-endpoint-type=serverless \
       --cloud-run-service=$SERVICE_NAME-$region
   done
   ```

   ##### Windows (PowerShell)

   ```powershell
   foreach ($region in @("us-central1", "europe-west1", "asia-northeast1")) {
     gcloud compute network-endpoint-groups create "$env:SERVICE_NAME-neg-$region" `
       --region=$region `
       --network-endpoint-type=serverless `
       --cloud-run-service="$env:SERVICE_NAME-$region"
   }
   ```

### Step 2: Configure load balancer

1. Create a backend service that will route traffic to your regional services:

   ## Terminal

   ```bash
   gcloud compute backend-services create $SERVICE_NAME-backend \
     --global \
     --load-balancing-scheme=EXTERNAL_MANAGED
   ```

2. Add each NEG as a backend:

   ##### Mac/Linux (bash)

   ```bash
   for region in us-central1 europe-west1 asia-northeast1; do
     gcloud compute backend-services add-backend $SERVICE_NAME-backend \
       --global \
       --network-endpoint-group=$SERVICE_NAME-neg-$region \
       --network-endpoint-group-region=$region
   done
   ```

   ##### Windows (PowerShell)

   ```powershell
   foreach ($region in @("us-central1", "europe-west1", "asia-northeast1")) {
     gcloud compute backend-services add-backend $env:SERVICE_NAME-backend `
       --global `
       --network-endpoint-group="$env:SERVICE_NAME-neg-$region" `
       --network-endpoint-group-region=$region
   }
   ```

3. Create a URL map to route all traffic to your backend service:

   ## Terminal

   ```bash
   gcloud compute url-maps create $SERVICE_NAME-url-map \
     --default-service=$SERVICE_NAME-backend
   ```

4. Reserve a static external IP address for your load balancer:

   ## Terminal

   ```bash
   gcloud compute addresses create $SERVICE_NAME-ip \
     --global
   ```

5. Retrieve the IP address:

   ## Terminal

   ```bash
   LOAD_BALANCER_IP=$(gcloud compute addresses describe $SERVICE_NAME-ip \
     --global \
     --format="get(address)")
   ```

6. In your domain registrar, create an A record pointing to the load balancer IP address:

   Type: A

   Name: app (or your subdomain)

   Value: \[LOAD\_BALANCER\_IP]

   Going forward, your load balancer URL will be `https://app.yourdomain.com` (or your chosen subdomain).

7. Wait for DNS propagation (typically 5-15 minutes) and verify the command below returns your load balancer IP address:

   ## Terminal

   ```bash
   nslookup app.yourdomain.com
   ```

8. Create a managed SSL certificate for your domain:

   ## Terminal

   ```bash
   gcloud compute ssl-certificates create $SERVICE_NAME-ssl-cert \
     --domains=app.yourdomain.com \
     --global
   ```

9. Create an HTTPS target proxy:

   ## Terminal

   ```bash
   gcloud compute target-https-proxies create $SERVICE_NAME-https-proxy \
     --url-map=$SERVICE_NAME-url-map \
     --ssl-certificates=$SERVICE_NAME-ssl-cert
   ```

10. Create a global forwarding rule using the reserved IP:

    ## Terminal

    ```bash
    gcloud compute forwarding-rules create $SERVICE_NAME-forwarding-rule \
      --global \
      --address=$SERVICE_NAME-ip \
      --target-https-proxy=$SERVICE_NAME-https-proxy \
      --ports=443
    ```

11. Check SSL certificate provisioning status:

    ## Terminal

    ```bash
    gcloud compute ssl-certificates describe $SERVICE_NAME-ssl-cert \
      --global \
      --format="get(managed.status)"
    ```

    Wait for status to change from `PROVISIONING` to `ACTIVE` before testing. This can take up to 60 minutes.

### Step 3: Redeploy and verify

1. Grant public access to each regional service so the load balancer can route traffic to them:

   ## Terminal

   ```bash
   for region in us-central1 europe-west1 asia-northeast1; do
     gcloud run services add-iam-policy-binding $SERVICE_NAME-$region \
       --region=$region \
       --member="allUsers" \
       --role="roles/run.invoker"
   done
   ```

2. Export the newly defined load balancer URL:

   ## Terminal

   ```bash
   export LOAD_BALANCER_URL="https://app.yourdomain.com"
   ```

3. Redeploy each regional service with the load balancer URL:

   ##### Mac/Linux (bash)

   ```bash
   for region in us-central1 europe-west1 asia-northeast1; do
     gcloud run deploy $SERVICE_NAME-$region \
       --source . \
       --region $region \
       --update-env-vars="SHOPIFY_APP_URL=$LOAD_BALANCER_URL"
   done
   ```

   ##### Windows (PowerShell)

   ```powershell
   $env:LOAD_BALANCER_URL="https://app.yourdomain.com"

   foreach ($region in @("us-central1", "europe-west1", "asia-northeast1")) {
     gcloud run deploy "$env:SERVICE_NAME-$region" `
       --source . `
       --region $region `
       --update-env-vars="SHOPIFY_APP_URL=$env:LOAD_BALANCER_URL"
   }
   ```

4. Verify that your load balancer is routing traffic correctly:

   ## Terminal

   ```bash
   curl -I https://app.yourdomain.com
   ```

   You can test from different geographic locations using services like [Global Ping](https://www.globalping.io/) to verify regional routing.

5. Update your `shopify.app.toml` file with your load balancer URL:

   ## shopify.app.toml

   ```toml
   application_url = "https://app.yourdomain.com"
   ```

6. Push your configuration to your Shopify development store to verify the service is now accessible:

   ## Terminal

   ```bash
   shopify app deploy
   ```

7. Test that the core functionality of your app is still working, now that your store is communicating with the Cloud Run services rather than your local installation.

***

## Next steps

Now that your app is deployed and connected to Shopify, you can explore these related topics:

* [Launch your app](https://shopify.dev/docs/apps/launch) to learn about app distribution and the review process.

***

---


<!-- PAGE 24/53: Deploy to a hosting service -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service -->

# Deploy to a hosting service

[Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps) lets you use your local environment to run your app during development. However, you might want to deploy your web app to test the functionality in a different environment, or deploy your app to a production environment to get it ready for [distribution](https://shopify.dev/docs/apps/launch/distribution).

For example, when you embed your app in the Shopify admin or Shopify Point of Sale using [App Bridge](https://shopify.dev/docs/api/app-bridge/previous-versions/app-bridge-from-npm/app-setup), you need to host your app's pages so Shopify can display them in an iframe or mobile webview.

In this guide, you'll learn how to deploy your [Shopify app template](https://shopify.dev/docs/apps/build/scaffold-app) for testing or production using your preferred hosting provider. You'll also learn the steps for building and running an app in production mode, without using Shopify CLI.

**Note:**

You can also deploy your app with a [common provider](https://shopify.dev/docs/apps/launch/deployment/#hosting-and-deployment-options).

***

## What you'll learn

In this guide you'll learn how to do the following tasks:

* Create a new app configuration
* Set up your container and database
* Build and run your app
* Deploy your Shopify app configuration
* Test your app

***

## Requirements

* You've [created an app using Shopify CLI](https://shopify.dev/docs/apps/build/scaffold-app), or you've [migrated your app](https://shopify.dev/docs/apps/build/cli-for-apps/migrate-from-dashboard) to work with Shopify CLI.

- You've selected your hosting service, and your account is able to create and deploy apps on it.

***

## Step 1: Create an app configuration file

Create or link your app to an `app.toml` file. We recommend that developers have one configuration for development, and a separate one for production. That way, you can continue to develop your app after deploying it, without affecting your production environment.

1. Either create a new configuration, or use an existing one:

   ## Terminal

   ```terminal
   shopify app config link
   ```

2. Get the necessary environment variables to deploy your app:

   ## Terminal

   ```terminal
   shopify app env show
   ```

3. Note down the `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `SCOPES` values. You'll need to set them as environment variables before you can run your deployed app.

***

## Step 2: Build your app

**Tip:**

If your hosting provider supports Docker containers, then you can skip this step because the template comes with a [Dockerfile](https://github.com/Shopify/shopify-app-template-react-router/blob/main/Dockerfile) that builds the app. Most providers have a CLI that can handle the deployment. For more information, refer to your provider's documentation.

The [Shopify React Router app template](https://github.com/Shopify/shopify-app-template-react-router) comes set up with Vite, which can build the bundles that you'll need to host your app. If your provider doesn't support Docker, then you'll need to build the app yourself.

1. Copy your app's code to your container.

2. Install the app's dependencies:

   ## Terminal

   ##### npm

   ```terminal
   npm ci
   ```

   ##### yarn

   ```terminal
   yarn install --frozen-lockfile
   ```

   ##### pnpm

   ```terminal
   pnpm install --frozen-lockfile
   ```

3. Run the `build` script with your package manager. This will create a `build` folder in your project that contains the compiled app:

   ## Terminal

   ##### npm

   ```terminal
   npm run build
   ```

   ##### yarn

   ```terminal
   yarn build
   ```

   ##### pnpm

   ```terminal
   pnpm run build
   ```

With this, your app will be ready to run, but you'll still need to set up a few things before you can do that.

***

## Step 3: Set up your database

Now you'll decide which database you'll use, and where to host it. There are several cloud platforms that provide specialized database containers. You can use whichever storage strategy you're most comfortable working with.

By default, the React Router app template uses an [SQLite](https://sqlite.org/) database (through the [`@shopify/shopify-app-session-storage-prisma`](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma) package), which is automatically set up by Prisma when you run the `setup` script.

After your database is set up, update the `/prisma/schema.prisma` file to point to it. We recommend [using an environment variable](https://www.prisma.io/docs/orm/prisma-schema/overview#example), to allow using a different database for development and production.

Before deciding on which database to use, understand that the template default quickly sets you up for development but has the following limitations:

* SQLite is file-based, so it must run in a container that provides filesystem access.
* You can only use multiple web containers if you create a separate container or volume for the database.
* It can be slower than more powerful systems like Postgres or MySQL for very large databases.

**Caution:**

Some hosting providers, such as [Fly.io](https://fly.io/), might put web containers to sleep when they're idle, which resets the disk and wipes the SQLite database. You can persist your data across redeploys by creating a separate volume for the database file.

### Encrypting data at rest

While Shopify will always use HTTPS to transfer data securely to and from the app, we recommend that apps encrypt their session data at rest to add another layer of security to your data.

Specifically, apps should encrypt the access tokens in their storage to prevent unwanted access to shop data, in case their database is compromised. Most cloud providers make it possible to encrypt your data in their containers by default.

***

## Step 4: Set up environment variables

Apps created using Shopify CLI use environment variables for some configuration. During local development, Shopify CLI provides the environment variables directly to the environment. However, to deploy your app, you'll need to set these values manually in your hosting provider.

You'll need to set the variables that you [obtained previously](#step-1-create-an-app-configuration-file), along with some other values, in your production environment. For information on how to do that, refer to your provider's documentation.

**Caution:**

Some variables represent API secrets or secure keys. These variables should be stored securely as secrets in your production environment, and should never be committed to a repository.

The following environment variables need to be provided:

| Variable | Required | Description |
| - | - | - |
| `SHOPIFY_APP_URL` | Yes | The URL origin where the app will be accessed when it's deployed, including the protocol. This will be provided by your platform. **Example**: `https://my-deployed-app.fly.dev` |
| `SHOPIFY_API_KEY` | Yes | The client ID of the app, retrieved [using Shopify CLI](#step-1-create-an-app-configuration-file). |
| `SHOPIFY_API_SECRET` | Yes | The client secret of the app, retrieved [using Shopify CLI](#step-1-create-an-app-configuration-file). This value should be stored securely. |
| `SCOPES` | No | The app's access scopes, retrieved [using Shopify CLI](#step-1-create-an-app-configuration-file). This is **optional** if you're using [Shopify-managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation). |
| `PORT` | No | The port on which to run the app. For apps built using the [React Router app template](https://github.com/Shopify/shopify-app-template-react-router), this variable needs to be set to the same value as the `EXPOSE` value in the `Dockerfile`. Defaults to `3000`. |

***

## Step 5: Deploy your configuration

Before running the app on your hosting provider, you'll need to update your Shopify settings by deploying your TOML file using Shopify CLI.

1. In the `shopify.app.*.toml` file for your deployment environment, set `application_url` to the same as the `SHOPIFY_APP_URL` environment variable:

   ## shopify.app.toml

   ```toml
   application_url = "<SHOPIFY_APP_URL>"


   [auth]
   redirect_urls = [
     "<SHOPIFY_APP_URL>/auth/callback",
   ]
   ```

2. Deploy your configuration to apply the changes to Shopify:

   ## Terminal

   ```terminal
   shopify app deploy
   ```

**Caution:**

To continue developing your app, you'll need to switch back to your development environment by running `shopify app config use`.

***

## Step 6: Run your app

**Tip:**

If your hosting provider supports Docker containers, then you should deploy your app to your provider, typically using their CLI, instead of running `start`. The Dockerfile will set up and run the app when you deploy it.

After you've set up your database and environment variables, you can run your app.

1. Run the `setup` script to create or update your database:

   ## Terminal

   ##### npm

   ```terminal
   npm run setup
   ```

   ##### yarn

   ```terminal
   yarn setup
   ```

   ##### pnpm

   ```terminal
   pnpm run setup
   ```

2. Run the application with the `start` command:

   ## Terminal

   ##### npm

   ```terminal
   npm run start
   ```

   ##### yarn

   ```terminal
   yarn start
   ```

   ##### pnpm

   ```terminal
   pnpm run start
   ```

If the database or environment variables aren't set up properly, the `start` script will fail to run. Check your logs if your app fails to start after deploying it.

***

## Step 7: Test your deployed app

After you update your app URLs and have deployed the new app version, you can test your app in a development store to make sure that it's configured correctly.

1. In the [Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard), go to your app's **Home** page.
2. In the **Installs** section, click **Install app** and choose a store to test the app.

***

## Re-deploying your app

As you continue developing your app, you can re-deploy it with the following steps:

1. Select your production app with Shopify CLI:

   ## Terminal

   ```terminal
   shopify app config use
   ```

2. Deploy your app configuration and extensions, if you made any changes:

   ## Terminal

   ```terminal
   shopify app deploy
   ```

1) Stop your production server, and re-run the `build` and `start` scripts.

***

## Next steps

* Keep developing your app. When you make changes that you want to deploy to production, you can deploy your app again.
* [Select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method) for your app and distribute it to users.

***

---


<!-- PAGE 25/53: About app versions -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment/app-versions -->

# About app versions

After you set up your [app configuration](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration) or create one or more [app extensions](https://shopify.dev/docs/apps/build/app-extensions), you can deploy these components together and release a new app version to users. An app version is a snapshot of your app configuration and all extensions.

***

## Deployment workflow

Your app configuration and all extensions are versioned together as a single [app version](https://shopify.dev/docs/apps/launch/deployment/app-versions).

When you run the [`deploy` command](https://shopify.dev/docs/api/shopify-cli/app/app-deploy) using [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), an app version is created and released. You can revert to a previous app version at any time. You can also create an app version from the Dev Dashboard.

Releasing an app version replaces the current active version that's served to stores that have your app installed. It might take several minutes for app users to be upgraded to the new version.

**Tip:**

If you want to deploy app configuration and extensions to Shopify regularly, then you can [integrate Shopify CLI into your CI/CD pipeline](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline) to programmatically deploy your app components using the [`deploy` command](https://shopify.dev/docs/api/shopify-cli/app/app-deploy).

***

## How app versions are created

The contents of your app version are different depending where you create it.

For details about creating and managing app versions, refer to [Deploy and release app versions](https://shopify.dev/docs/apps/launch/deployment/deploy-app-versions).

| Tool | App version contents |
| - | - |
| Shopify CLI | An app version created using Shopify CLI contains the following:- The app configuration from the local [configuration file](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration).
- The local version of the app's extensions. If you have an extension in your deployed app, but the extension code doesn't exist locally, then the extension isn't included in the version. |
| Dev Dashboard: App version create page | An app version created from the version create page in the Dev Dashboard contains the configuration on that page, as well as any extensions that are present on the current active version of the app. |

***

---


<!-- PAGE 26/53: Deploy and release app versions -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment/deploy-app-versions -->

# Deploy app versions

After you change your app configuration or create one or more app extensions, you can release those changes to users by creating and releasing an app version. An app version is a snapshot of your app configuration and all extensions. You can revert to a previous app version at any time by releasing an older app version.

Releasing an app version doesn't release your web app. When you're ready to deploy your app to production, you need to deploy your web app to your own hosting solution. For more information, refer to [Deploy your web app](https://shopify.dev/docs/apps/launch/deployment).

If you want to deploy app configuration and extensions to Shopify regularly, then you can [integrate Shopify CLI into your CI/CD pipeline](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline) to programmatically deploy your app components using the [`deploy` command](https://shopify.dev/docs/api/shopify-cli/app/app-deploy).

**Caution:**

This page describes the new process for deploying and releasing app extensions, known as simplified deployment. If you haven't changed your app since September 5, 2023, then your development workflow might need to change. For an overview of the changes from the previous deployment model and how they might impact your workflow, refer to [App versions](https://shopify.dev/docs/apps/launch/deployment/app-versions).

***

## Create and release an app version

When you're ready to release your changes to users, you can create and release an app version. An app version is a snapshot of your app configuration and all extensions.

The contents of your app version [depend on where you create it](https://shopify.dev/docs/apps/launch/deployment/app-versions#how-app-versions-are-created). You can create an app version using Shopify CLI or the Dev Dashboard. However, to create an app version that includes extensions, you need to create it using Shopify CLI.

Before you create a new app version, you can [preview your app extensions locally](https://shopify.dev/docs/apps/build/cli-for-apps/test-apps-locally).

Some app versions need to be reviewed by Shopify before they can be released.

You can also set up your [CI/CD pipeline](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline) to deploy your app configuration and extensions programmatically.

### Release an app version using Shopify CLI

Follow these steps to create an app version using Shopify CLI:

1. Navigate to your app directory.

2. Run the following command.

   Optionally, you can provide a name or message for the version using the `--version` and `--message` flags.

   ## Terminal

   ```terminal
   shopify app deploy
   ```

Releasing an app version replaces the current active version that's served to stores that have your app installed. It might take several minutes for app users to be upgraded to the new version.

After you release your new app version, you can view the version details in the Dev Dashboard, or by running the [`versions list`](https://shopify.dev/docs/api/shopify-cli/app/app-versions-list) command in Shopify CLI.

**Tip:**

If you want to create a version, but avoid releasing it to users, then run the `deploy` command with a `--no-release` flag. You can release the unreleased app version using Shopify CLI's [`release`](https://shopify.dev/docs/api/shopify-cli/app/app-release) command, or through the Dev Dashboard.

### Release app configuration using the Dev Dashboard

Follow these steps to update app configuration and release an app version using the Dev Dashboard:

1. From the Dev Dashboard, go to [**Apps**](https://dev.shopify.com/dashboard).
2. Select your app from the list.

1) Click **Versions**.
2) From the **Versions** page, click **Create a version**.
3) Click **Release**.
4) Optional: enter a name and message for the version.
5) Click **Release** again to confirm the release of a new version.

Releasing an app version replaces the current active version that's served to stores that have your app installed. It might take several minutes for app users to be upgraded to the new version.

After you release your new app version, you can view the version details in the Dev Dashboard. You can also see the list of versions belonging to the app with the [`versions list`](https://shopify.dev/docs/api/shopify-cli/app/app-versions-list) command in Shopify CLI.

### Integrate Shopify CLI into your CI/CD pipeline

You can deploy your app configuration and any app extensions that you [generated](https://shopify.dev/docs/api/shopify-cli/app/app-generate-extension) using Shopify CLI in a [CI/CD pipeline](https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline).

Your app configuration and all extensions are versioned together as a single [app version](https://shopify.dev/docs/apps/launch/deployment/app-versions).

***

## Release an existing app version

If you created an app version without releasing it, or you want to roll back to a previous app version, then you can release it using Shopify CLI or the Dev Dashboard.

### Release an existing app version using Shopify CLI

1. Navigate to your app directory.

2. Run the following command. Replace `VERSION` with the name of the version that you want to release.

   ## Terminal

   ```terminal
   shopify app release --version=VERSION
   ```

**Tip:**

To look up the name of a previous version, use the [`versions list`](https://shopify.dev/docs/api/shopify-cli/app/app-versions-list) command.

### Release an existing app version through the Dev Dashboard

1. From the Dev Dashboard, click [Apps](https://dev.shopify.com/dashboard) and then select your app from the list.
2. Click **Versions**.
3. From the **Versions** page, select the app version that you want to release.
4. On the app version page, click **Release**.

***

## Submit an app version for review

Depending on the extension types included in your app version, your version might need to be reviewed by Shopify. To understand which extension types require a review, refer to the [list of extension types](https://shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions).

***

## Next steps

[Learn how to remove an app extension from your app](https://shopify.dev/docs/apps/build/app-extensions/remove-app-extension).

***

---


<!-- PAGE 27/53: Deploy app components in a CD pipeline -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/deployment/deploy-in-ci-cd-pipeline -->

# Deploy app components in a CD pipeline

If you have app configuration and extensions that you want to deploy to Shopify regularly, then you can integrate Shopify CLI into your CI/CD pipeline to programmatically deploy your app components using the `deploy` command.

Note that the `deploy` command deploys everything in your project at once. You can't deploy only some extensions. You also can't deploy your app configuration on its own.

**Caution:**

The `shopify app config push` Shopify CLI command is no longer supported. If you're using this command in your workflow, follow [these steps](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration#migrate-from-config-push) to update app configuration with the `deploy` command.

***

## What you'll learn

In this tutorial, you'll learn how to set up your CI/CD pipeline to deploy your app programmatically. To do so, you'll gather the information necessary to run Shopify CLI commands, and then add a step to your CI/CD pipeline that installs Shopify CLI and deploys your app components.

***

## How it works

**Caution:**

Any extensions that aren't present in the environment you're deploying from are removed.

Your app configuration and all extensions are versioned together as a single [app version](https://shopify.dev/docs/apps/launch/deployment/app-versions).

When you run the [`deploy` command](https://shopify.dev/docs/api/shopify-cli/app/app-deploy) using [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), an app version is created and released. You can revert to a previous app version at any time.

Releasing an app version replaces the current active version that's served to stores that have your app installed. It might take several minutes for app users to be upgraded to the new version.

**Note:**

If you want to create a version, but want to avoid releasing it to users, then run the `deploy` command with a `--no-release` flag.

You can release the unreleased app version using Shopify CLI's [`release`](https://shopify.dev/docs/api/shopify-cli/app/app-release) command, or through the Dev Dashboard.

***

## Requirements

* You've [scaffolded an app using the latest version of Shopify CLI](https://shopify.dev/docs/apps/build/scaffold-app).

***

## Step 1: Create a production app configuration file

If you don't already have an [app configuration file](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration) for the production copy of your app, then use the `app config link` command to create or link to an existing app.

## Terminal

```terminal
shopify app config link
```

Learn more about [creating and linking app configurations](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files).

***

## Step 2: Generate an App Automation Token

Create an App Automation Token through the [Dev Dashboard](https://dev.shopify.com/dashboard/). Open your app, go to **Settings**, and use the **App Automation Token** section to generate a token.

To learn more about creating and managing App Automation Tokens, refer to [Manage App Automation Tokens](https://shopify.dev/docs/apps/build/dev-dashboard/app-automation-tokens).

***

## Step 3: Integrate Shopify CLI into your pipeline

After you retrieve your deployment variables and App Automation Token, you can integrate Shopify CLI into your continuous deployment pipeline using your CI/CD provider.

The CD pipeline step should install [Shopify CLI](https://shopify.dev/docs/api/shopify-cli).

To deploy to Shopify programmatically using your CD pipeline step, include the following:

* An environment variable that contains the App Automation Token [that you generated](#step-2-generate-an-app-automation-token) in the Dev Dashboard.

  **Info:** Where possible, you should protect the authentication token value by masking it or storing it as a secret.

* The name of your app configuration file that you [created](#step-1-create-a-production-app-configuration-file).

* A step that sets up Node.js and installs your project's Node dependencies. The package manager that you use should match your project's lockfile.

  * If you're using GitHub Actions, then you can use [actions/setup-node](https://github.com/actions/setup-node).
  * If you're using CircleCI, then you can use [circleci/node](https://circleci.com/developer/orbs/orb/circleci/node).

* Steps that install [the other dependencies for your project](#additional-project-dependencies).

* A step that runs the CLI `deploy` command with the `--config` and `--allow-updates` flags set.

### Link commits to app versions

You can link a source control commit to an app version by adding the [`--source-control-url=<url>`](https://shopify.dev/docs/api/shopify-cli/app/app-deploy#flags) flag to the `deploy` command. The link that you provide appears in the details page for the app version in the Dev Dashboard. This information allows team members to easily view the corresponding source commit or revision for an app version.

To learn how to use this flag to provide a GitHub commit URL for an app version in your CI/CD workflow, refer to [examples](#examples).

### Controlling extension and configuration deployment

The `--allow-updates` and `--allow-deletes` flags on the `app deploy` and `app release` commands control the allowed changes to your app configuration and extensions in non-interactive terminal sessions.

* **`--allow-updates`**: Lets you deploy new app configuration and extensions, and update existing ones.
* **`--allow-deletes`**: Lets you delete app configuration and extensions.

**Caution:**

Deleting app configuration and extensions also deletes related data on stores that have your app installed. To avoid accidentally deleting store data, use only the `--allow-updates` flag in your default CI/CD workflow. Use the `--allow-deletes` flag or its equivalent environment variable (`SHOPIFY_FLAG_ALLOW_DELETES`) only for manual workflow runs when you need to delete configuration or extensions.

### Additional project dependencies

The dependencies that are required to deploy your app extension depend on the technologies that you use to build the extension. Below are examples of common additional dependencies you'll need:

| App extension type | Additional dependencies |
| - | - |
| Extensions that use [Shopify Functions](https://shopify.dev/docs/apps/build/functions), including product, order, and shipping discount extensions | Your function language |

### Examples

The sections below provide examples of common CI/CD pipeline tools: GitHub Actions and CircleCI.

#### Git​Hub Actions

Below is an example of a step that you might add to your GitHub Actions workflow. It deploys app components to Shopify when code is pushed to the `main` branch.

The package manager that you use in your GitHub Action should match your project's lockfile.

## .github/workflows/deploy-extensions.yml

##### npm

```yml
name: Deploy app
on:
  push:
    branches:
      - main
jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - name: Install npm dependencies
        run: npm install
      - name: Install Shopify CLI
        run: npm install -g @shopify/cli@latest
      - name: Deploy
        env:
          # Token from the Dev Dashboard
          SHOPIFY_APP_AUTOMATION_TOKEN: ${{ secrets.SHOPIFY_APP_AUTOMATION_TOKEN }}
          COMMIT_URL: ${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}
        run: shopify app deploy --config production --allow-updates --source-control-url "$COMMIT_URL"
```

##### Yarn

```yml
name: Deploy app
on:
  push:
    branches:
      - main
jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'yarn'
      - name: Install npm dependencies
        run: yarn install
      - name: Install Shopify CLI
        run: yarn global add @shopify/cli@latest
      - name: Deploy
        env:
          # Token from the Dev Dashboard
          SHOPIFY_APP_AUTOMATION_TOKEN: ${{ secrets.SHOPIFY_APP_AUTOMATION_TOKEN }}
          COMMIT_URL: ${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}
        run: shopify app deploy --config production --allow-updates --source-control-url "$COMMIT_URL"
```

##### pnpm

```yml
name: Deploy app
on:
  push:
    branches:
      - main
jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - name: Install npm dependencies
        run: pnpm install
      - name: Install Shopify CLI
        run: pnpm install -g @shopify/cli@latest
      - name: Deploy
        env:
          # Token from the Dev Dashboard
          SHOPIFY_APP_AUTOMATION_TOKEN: ${{ secrets.SHOPIFY_APP_AUTOMATION_TOKEN }}
          COMMIT_URL: ${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}
        run: shopify app deploy --config production --allow-updates --source-control-url "$COMMIT_URL"
```

#### Circle​CI

The following config file defines a job that's triggered by a CircleCI workflow.

The package manager that you use in your job should match your project's lockfile.

## .circleci/config.yml

##### npm

```yml
version: 2.1
orbs:
  node: circleci/node@5.0.2
jobs:
  deploy:
    docker:
      - image: cimg/node:20.5.0
    environment:
      COMMIT_URL: << pipeline.project.git_url >>/commit/<<pipeline.git.revision>>
    steps:
      - checkout
      - node/install-packages:
          with-cache: true
      - run:
          name: Install Shopify CLI
          command: npm install -g @shopify/cli@latest
      - run:
          name: Deploy
          environment:
            # SHOPIFY_APP_AUTOMATION_TOKEN should be present as a secret
          command: |
            shopify app deploy --config production --allow-updates --source-control-url $COMMIT_URL
workflows:
  version: 2
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

##### Yarn

```yml
version: 2.1
orbs:
  node: circleci/node@5.0.2
jobs:
  deploy:
    docker:
      - image: cimg/node:20.5.0
    environment:
      COMMIT_URL: << pipeline.project.git_url >>/commit/<<pipeline.git.revision>>
    steps:
      - checkout
      - node/install:
          install-yarn: true
      - node/install-packages:
          pkg-manager: yarn
          with-cache: true
      - run:
          name: Install Shopify CLI
          command: yarn global add @shopify/cli@latest
      - run:
          name: Deploy
          environment:
            # SHOPIFY_APP_AUTOMATION_TOKEN should be present as a secret
          command: |
            shopify app deploy --config production --allow-updates --source-control-url $COMMIT_URL
workflows:
  version: 2
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

***

---


<!-- PAGE 28/53: About app distribution -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution -->

# About app distribution

After you've added features to your app, you need to decide how to distribute it to merchants.

The way you choose to distribute your app depends on its purpose and your audience. You can't change the distribution method after you select it, so make sure that you understand the different capabilities and requirements of each type.

***

## Capabilities and requirements

The following table shows the capabilities and requirements that are associated with each distribution method:

| Distribution model | Number of stores | App type | Authorization or authentication method | Approval required | Limitations |
| - | - | - | - | - | - |
| [Public distribution](https://shopify.dev/docs/apps/launch/app-store-review) | Can be installed on multiple Shopify stores | Public | * If embedded, [token exchange](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange) and [session tokens](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens)* If not embedded, [authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant) | [Yes](https://shopify.dev/docs/apps/launch/app-requirements-checklist) | Must [sync certain data](https://www.shopify.com/legal/api-terms) with Shopify |
| [Custom distribution](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method#install-a-custom-app-on-multiple-stores) | Installed on a single Shopify store, on multiple stores that belong to the same Plus organization or any [transfer-disabled development stores](https://shopify.dev/docs/storefronts/themes/tools/development-stores/transfer-development-stores#transfer-disabled-stores) | Custom | * If embedded, [token exchange](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange) and [session tokens](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens)* If not embedded, [authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant) | No | Can't use the [Billing API](https://shopify.dev/docs/apps/launch/billing) to charge merchants |
| Shopify admin | Installed on a single Shopify store | Custom | [Authenticate in the Shopify admin](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) | No | * Can't use [Shopify App Bridge](https://shopify.dev/docs/api/app-home) to display in the Shopify admin* Can't use [app extensions](https://shopify.dev/docs/apps/build/app-extensions)* Can't use the [Billing API](https://shopify.dev/docs/apps/launch/billing) to charge merchants |

**Note:**

Checkout apps and extensions have [design requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist#design-requirements-for-checkout-apps) that apply to custom apps as well as public apps. Be sure that your app meets [all requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist) for its functionality and distribution type.

### Requesting a content size limit exception

Theme app extensions are subject to [file and content size limits](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#file-and-content-size-limits). If your app uses [custom distribution](https://shopify.dev/docs/apps/launch/distribution), or your app has been granted [Built for Shopify](https://shopify.dev/docs/apps/launch/built-for-shopify) status in the Shopify App Store, then you can request an exception to the 100 KB Liquid size limit for a theme app extension. File an exemption request [using this form](https://forms.gle/rTvBRBPHjxdNFSbHA).

Increasing your app's Liquid size could potentially impact its performance. Regular monitoring and optimization is advised.

***

## Deprecated app types

The following app types can no longer be created:

* **Private apps**: Deprecated as of January 2022. A private app was a type of app that one merchant could install directly on their store. If you want to create an app specifically for one merchant's store, then you can create a custom app instead. As of January 20, 2023, all private apps have been automatically migrated and converted to custom apps.
* **Unpublished apps**: Deprecated as of December 9, 2019. An unpublished app was a type of public app that one or many merchants could install and had all the same functionality as other public apps. However, the app didn't require any approval from Shopify.

***

## Next steps

[Learn how to select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method).

***

---


<!-- PAGE 29/53: Select a distribution method -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/select-distribution-method -->

# Select a distribution method

Before you can share your app with merchants, you need to select a distribution method in the Partner Dashboard.

The way you choose to distribute your app depends on its purpose and your audience. You can't change the distribution method after you select it, so make sure that you understand the different [capabilities and requirements](https://shopify.dev/docs/apps/launch/distribution#capabilities-and-requirements) of each type.

When you create an app through the Dev Dashboard or using [Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps), you can select from the following distribution methods:

* **Public distribution**: Select this method to make your app public. You can distribute or sell your app to many merchants through the Shopify App Store using this method.
* **Custom distribution**: Select this method if you've built a custom app that you want to distribute to one store or multiple stores on the same Plus organization using a link.

If you have separate apps for development and production in the Dev Dashboard, then you should select the distribution method in the production app.

**Note:**

If you create a custom app [through the Shopify admin](https://help.shopify.com/en/manual/apps/custom-apps), then you can't change the app distribution method.

[Learn about the features and limitations of this app type](https://shopify.dev/docs/apps/launch/distribution#capabilities-and-requirements).

***

## Select a distribution method

1. From the Partner Dashboard, go to [**App distribution**](https://partners.shopify.com/current/apps).
2. Select your app from the list.
3. Click **Choose distribution**.
4. Select a distribution method, and then click **Select**.

If you selected **Public distribution**, then you can start creating your Shopify App Store listing and, when your app is ready, submit your app to the app review team for review. Learn more about [submitting an app to the Shopify App Store](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review).

If you selected **Custom distribution**, then you can [install your custom app](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method#install-a-custom-app-on-multiple-stores) on one store or multiple stores that are part of the same Plus organization.

***

## Install a custom app on multiple stores

**Note:**

If you created a custom app before July 26, 2023, then you need to [contact Partner Support](https://partners.shopify.com/current/support/) to enable installing the custom app on multiple stores.

If you created a custom app after July 26, 2023, then you can complete the following steps to install the custom app on multiple stores:

1. After you select **Custom distribution**, enter the store's myshopify.com or admin.shopify.com [domain](https://help.shopify.com/manual/domains).
2. Optional: To limit your app's installs to one store, uncheck **Allow multi-store installs for one Plus organization**.
3. To create the app install link, click **Generate link**.
4. Copy the install link.

After you've copied the install link, you can send it to your users so that they can install your app. For example, you can share the install link by email with the storeowner.

***

---


<!-- PAGE 30/53: Support your customers -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/support-your-customers -->

# Support your customers

***

## Support requirements

All public apps are required to provide at least one support channel that allows merchants to get help. Shopify doesn't provide merchant support for apps built by third parties. App developers are required to support merchants in a timely manner.

Having a valid support email address on file is always required, even if email isn't your preferred support channel.

***

## How merchants request support

Shopify displays "Get support" links to merchants in several places:

* App settings page in the Shopify admin
* Apps in App Home display a support link in the top-right action menu
* Shopify App Store listing

By default, these links open a contact form in a modal so that merchants can ask for help. Shopify relays the message to your support email address on file. In some cases, this email address is publicly visible, such as on the Shopify App Store.

#### App settings

!["Get support" link in app settings](https://shopify.dev/assets/assets/images/apps/launch/distribution/support/get-support-app-settings-C5tYO1aY.png)

#### Embedded app

!["Get support" link in an app in the Shopify admin](https://shopify.dev/assets/assets/images/apps/launch/distribution/support/get-support-embedded-B7BeJ-m6.png)

#### Shopify App Store

!["Get support" link in the Shopify App Store](https://shopify.dev/assets/assets/images/apps/launch/distribution/support/get-support-app-store-Bh6LNPmw.png)

***

## Support channels

You can select your preferred contact method for merchants seeking support. The available support channel options are:

* Required: Email (default)
* Optional: Support portal URL (such as a forum or ticketing system)
* Optional: Phone number (display-only)

In addition, apps in [App Home](https://shopify.dev/docs/api/app-home) can use [custom support events](#custom-support-events) to trigger advanced functionality for logged-in users.

### Set your preferred support channel

You can edit your preferred support channel at any time:

1. From your Partner Dashboard, open the primary app listing that you want to edit.
2. In the **Support** section of **App Store listing content**, select your preferred support channel.
3. Enter your email under **Support email address**. An email address is always required.
4. (Optional) If you selected "Support portal", then enter your URL under **Support portal URL**.
5. Click **Save**.

### Provide localized support channels

By default, all localized app listings inherit the preferred support channel from your primary app listing. You can override this behavior by locale to provide different contact methods for each language.

1. From your Partner Dashboard, open the localized app listing that you want to edit.
2. In the **Support** section of **App Store listing content**, uncheck **Use support channels from primary listing**
3. Enter your email under **Support email address**. An email address is always required.
4. (Optional) If you selected "Support portal", then enter your URL under **Support portal URL**.
5. Click **Save**.

***

## Custom support events

[Apps in App Home](https://shopify.dev/docs/api/app-home) can use App Bridge to extend the "Get support" action. This enables advanced functionality such as initiating a real-time chat directly in your app.

Custom support events are only available for logged-in users in the Shopify admin. Your preferred support channel is used in all other contexts.

### Step 1: Create a new admin link extension

To opt into custom support events, you need to enable [admin link extensions](https://shopify.dev/docs/apps/build/admin/admin-links). This allows you to update the behavior of "Get support" links throughout the Shopify admin:

1. In your terminal, navigate to your app project.

2. Generate a new link extension with the Shopify CLI (requires v3.71+):

   ## Terminal

   ```sh
   shopify app generate extension --template support_link --name support-link
   ```

   This generates a new extension with this file structure:

   ## App project root

   ```sh
   {app}/extensions/support-link
     ├── README.md
     ├── locales
     │   ├── en.default.json     // Default extension locale
     └── shopify.extension.toml  // Extension config
   ```

3. Open `{app}/extensions/support-link/shopify.extension.toml` and update it to target your selected app route:

   ## {app}/extensions/support-link/shopify.extension.toml

   ```toml
   #...
   [[extensions.targeting]]
   target = "admin.app.support.link"
   text = "t:text"
   # Select any app route, in this case "/help"
   url = "app://help"
   #...
   ```

4. Run `shopify app dev` to test that your extension works as expected.

5. Run `shopify app deploy` to deploy your extension to production.

Now, when merchants click "Get support" for your app from anywhere in the Shopify admin, they'll be redirected to the app's `/help` route.

### Step 2 (Optional): Register your callback in App Bridge

You can optionally trigger additional custom behavior in your app with a callback function. If the user was redirected to your app from elsewhere in the Shopify admin by a [link extension](#step-1-create-a-new-admin-link-extension), then the callback fires after the designated app route has loaded. If the user is already in your app, then the callback fires without redirecting.

The `registerHandler` method registers your callback function with App Bridge. We recommend registering this callback in your app's global context, so that it's available from any app route.

## File

```js
// Define the callback function
const handler = () => {
  // implement your custom functionality
  openLiveChat();
};


// Register the callback
shopify.support.registerHandler(handler);
```

Check the App Bridge API reference for complete details on the [App Bridge Support API](https://shopify.dev/docs/api/app-home/apis/support).

***

## Best practices and recommendations

Apps that provide great support have higher merchant satisfaction, get better reviews, and make more sales. Ultimately, choosing the right tooling and methodology to best support your app's users is up to you.

Check the Shopify Partner Blog for more on [how to build effective app support processes](https://www.shopify.com/partners/blog/how-to-build-an-effective-and-friendly-app-support-process), along with [advice from experienced app developers](https://www.shopify.com/partners/blog/expert-advice-on-how-to-10x-app-support).

***

---


<!-- PAGE 31/53: Sunsetting your app -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/sunsetting-your-app -->

# Sunsetting your app

Removing an app can have serious implications for merchants who rely on its functionality. To ensure the best possible experience for merchants who use your app, you must adhere to the following process when sunsetting your app.

**Note:**

The guidelines in this section apply to both [full and limited visibility](https://shopify.dev/docs/apps/launch/distribution/visibility) apps in the Shopify App Store.

***

## Sunsetting process

Follow this timeline to ensure that your users have enough warning that your app will be sunset, allowing them the opportunity to find alternate solutions.

Before you sunset your app, you need to complete the following steps:

1. [Contact Shopify Support](https://partners.shopify.com/current/support/) to initiate sunsetting for your app.

2. Set your [app listing visibility](https://shopify.dev/docs/apps/launch/distribution/visibility) to **Limited visibility** to prevent further installs from the Shopify App Store. Limited visibility apps can still be installed, but you can use [webhooks](https://shopify.dev/docs/api/webhooks) to monitor for new installations.

3. Send a minimum of two communications to merchants who have an [active install](https://shopify.dev/docs/apps/launch/distribution/track-app-usage#view-active-merchant-installs) of your app informing them that the app is being sunset.

4. Cancel all app subscriptions for the stores that are using your app using the GraphQL Admin API's [`appSubscriptionCancel`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCancel) mutation.

5. Remove your app from your servers.

   **Caution:**

   You must complete steps 1-5 prior to removing your app from your servers.

***

## Thirty days before you sunset the app

* [Contact Shopify Support](https://partners.shopify.com/current/support/) to have your app unpublished from the Shopify App Store. Unpublishing your app stops new users from downloading your app during the sunsetting period. When you contact Support, include a link to the app you're sunsetting, the date on which you want the app unpublished, and the official sunset date.

  **Note:**

  Only Shopify Support can unpublish your app from the Shopify App Store. Unpublishing an app isn't the same as setting the [app listing visibility to **Limited visibility**](https://shopify.dev/docs/apps/launch/distribution/visibility).

* After you receive confirmation from Shopify that your app will be unpublished, cancel any [recurring app charges](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCancel) through the GraphQL Admin API (including active, frozen, pending, or accepted charges).

* After the app is unpublished, send an email to your users that explains that your app will be sunset, provides the sunset date, and suggests that users uninstall the app from their storefront. If you're migrating users to a new Shopify app that you have developed, then include instructions on how to do so. Otherwise, instruct merchants to uninstall the app and find an alternative.

***

## Two weeks before you sunset the app

* Post a notice in your app, notifying users that the app will not function after the sunset date.

* Offer support to any users who need it during this period.

***

## One week before you sunset the app

* Send an email reminding users of the sunset date. If merchants contact you for alternate apps to use, then direct them to the [Shopify App Store](https://apps.shopify.com/).

***

## On the sunset date

* [Contact Shopify Support](https://partners.shopify.com/current/support/) to provide a copy of the communications you sent to users and confirm the next steps for your app's removal.

* Check the number and type of remaining installs you have on your app. Because removing an app can have serious implications for merchants who rely on its functionality, Shopify Support might ask you to send an additional email and wait 15 days if there are a high number of active merchant installs.

  You can [view how many merchants have installed your app](https://shopify.dev/docs/apps/launch/distribution/track-app-usage#view-active-merchant-installs) and what plans they're on.

* Remove the app from your servers rather than deleting it from the **Apps** page in your Dev Dashboard.

  **Caution:**

  Client IDs and historical app data aren't available if you delete the app from your Dev Dashboard. We therefore recommend that you retain your app in the Dev Dashboard.\
  \
  Retaining your app lets you reuse the same client ID if you decide to relaunch your app in the future. Additionally, keeping your app in the Dev Dashboard retains historical app data, such as revenue, number of installs, and support interactions.

***

---


<!-- PAGE 32/53: Go-to-market success -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/go-to-market-success -->

# Go-to-market success

After your app is [approved](https://shopify.dev/docs/apps/launch/app-requirements-checklist), by default it will be [listed](https://shopify.dev/docs/apps/launch/distribution/visibility) on the Shopify App Store. Shopify also features a selection of high-quality apps in places like the Shopify admin and on the homepage of the Shopify App Store.

Here’s what you can do to help make sure your app is successful:

* [Improve your app quality to become Built for Shopify](https://shopify.dev/docs/apps/launch/built-for-shopify). Apps that meet all of our criteria are eligible for Built for Shopify status. Along the way, you can qualify for smaller achievements that grant you more limited benefits, such as indicators of high quality on your app listing, special merchandising, or opportunities for promotion on various Shopify surfaces.

* [Avoid prohibited actions](https://shopify.dev/docs/apps/launch/app-store-review/policy-violations) to make sure your app continues to be listed on the Shopify App Store.

* [Market your app through Shopify](https://shopify.dev/docs/apps/launch/marketing) to reach merchants in the Shopify community.

* [Use the Shopify App Store Ad Badge](https://shopify.dev/docs/apps/launch/marketing/shopify-brand-assets) in your advertising and on social media to increase merchant confidence in your app.

* [Send out a press release](https://shopify.dev/docs/apps/launch/marketing/write-press-release) to announce the launch of your app.

* [Manage reviews from merchants](https://shopify.dev/docs/apps/launch/marketing/manage-app-reviews). Merchants can review your app in the Shopify App Store. Learn how to address feedback and work with negative reviews.

* [Offer tech support](https://shopify.dev/docs/apps/launch/distribution/support-your-customers) for merchants who have issues or want to get more out of your app.

* [Track usage of your app](https://shopify.dev/docs/apps/launch/distribution/track-app-usage) so that you have the data to help you make decisions and improvements.

***

---


<!-- PAGE 33/53: Track app usage -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/track-app-usage -->

# Track app usage metrics with the Partner Dashboard

You can find detailed information about your apps' revenue, installations, and reviews on the **Apps** page in your Partner Dashboard. From there, you can see at a glance how each of your apps is performing, how merchants are using your apps, and how much revenue your apps have generated.

***

## View app analytics

Analytics for each app appear on its **Overview** page in your Partner Dashboard.

For data that includes a percentage change, the change compares data for the date range shown in the dashboard with the cumulative data prior to the start of that date range.

For example, when you look at the number of app installs for the last 90 days, the percentage change compares the number of installs during the past 90 days to the total number of installs from the day that your app was created up to the start of that 90-day period. If your app was installed 1000 times during its first year, and then was installed 100 times during the following 90 days, then the percentage change for that 90-day period would be 10% (100/1000).

To view analytics for an app:

1. Log in to your [Partner Dashboard](https://app.shopify.com/services/partners/auth/login).

2. Click **Apps**.

3. Click the name of the app whose details you want to view. You'll see a range of metrics on its **Overview** page:

   ![An example app analytics dashboard, showing the merchant growth, installs, earnings, and uninstalls for an app.](https://shopify.dev/assets/assets/images/apps/store/success/tracking-usage/app-analytics-dashboard-HT6lLGCI.png)

   By default, the dashboard shows data for the last 30 days. If you want to see data for a different date range, then select one from the date picker. To learn more about the metrics that appear on this page, see [App metric definitions](#app-metric-definitions).

4. If you want to export your data to a CSV file, then click **Export** and select the data to export:

   * **Current merchants**
   * **Earnings**
   * **History**

   **Note:**

   The data that appears on the app's **Overview** page reflects a delay of up to 10 minutes. You can refresh your browser page to show the most recent available data.

***

## View active merchant installs

To view your active merchant installs, complete the following steps:

1. From your [Partner Dashboard](https://partners.shopify.com/organizations), click **Apps**.
2. Click the name of the app that you want to view.

On the app **Overview** page, the number of **Merchants with your app** is displayed in the top right corner.

***

## Export active install data

For a more detailed list of the merchants who have installed your app, you can export install data:

1. From your [Partner Dashboard](https://partners.shopify.com/organizations), click **Apps**.
2. Click the name of the app that you want to view.
3. Click **Export** and select **Export Current Merchants**.
4. Check your email inbox for a message indicating that the export was completed.
5. Open the email and click **Download CSV file** to save the CSV.

The CSV file can be imported to most spreadsheet programs and provides additional details, such as the type of plan merchants are on, when the app was installed, and whether it was organic or attributed to a paid ad campaign.

***

## App metric definitions

The following table includes definitions for the metrics that appear on the **Overview** page:

| Total earnings to date | The sum of an app's pending payments and payments received. |
| - | - |
| Merchants with your app | The total number of active stores with the app installed. Active stores include any stores currently on a paid or trial plan, staff stores, and development stores. This number excludes stores that are canceled or frozen. |
| Merchant growth | The cumulative number of active stores with the app installed over the selected date range. |
| Installs | The total number of installs over the selected date range. An install occurs after a merchant approves the permissions shown on the OAuth grant screen. This number excludes stores that are canceled or frozen. |
| Uninstalls | The total number of uninstalls over the selected date range. An uninstall occurs after a merchant has removed an app from their store. |
| Time to uninstall | The number of stores that have uninstalled an app over the selected date range. Time periods are:- Same day as install
- 1-14 days from install
- 15-90 days from install
- 91+ days from install |
| Re-opened stores | The number of previously closed stores that have been activated again. All apps that were installed prior to closing are considered to be active again when the store is re-opened. |
| Closed stores | The number of stores that have closed (the merchant is no longer an active Shopify customer) with your app installed at the time of closing. This number includes stores that are canceled or frozen. |
| Earnings | The sum of the app's pending and previous payouts, minus any application credits that have been deducted, for the selected date range. The amount doesn't include any payments from merchants who have yet to pay an outstanding balance to Shopify. To learn more about how earnings are calculated, see [*Earnings*](#earnings).**Application credits** will be subtracted from this amount for any payments. |
| Payouts you received | The amount you have received from Shopify after fees and adjustments have been deducted. |
| Next payout | The amount that you will receive for your next payout from Shopify. |
| Pending payment | The total of all payments that Shopify has collected, before credits. |
| One-time charges | The sum of an app's earnings through the [ApplicationCharge](https://shopify.dev/docs/api/admin-rest/latest/resources/applicationcharge) API. It includes all pending and previous payments made through the API. |
| Recurring application charges | The sum of an app's earnings through the [RecurringApplicationCharge](https://shopify.dev/docs/api/admin-rest/latest/resources/recurringapplicationcharge) API. It includes all pending and previous payments made through the RecurringApplicationCharge API, but excludes payments made through the [UsageCharge](https://shopify.dev/docs/api/admin-rest/latest/resources/usagecharge) API. |
| Usage charges | The sum of an app's earnings through the [UsageCharge](https://shopify.dev/docs/api/admin-rest/latest/resources/usagecharge) API. It includes all pending and previous payments made through the API. |
| Application credits | The sum of an app's earnings through the [ApplicationCredit](https://shopify.dev/docs/api/admin-rest/latest/resources/applicationcredit) API. Application credits should always be negative. |
| Average rating | The average of all the app's merchant ratings from the Shopify App Store. |

**Note:**

The data in the dashboard might vary slightly from the data gathered by other reporting tools and services. For information on why the data can vary, see [Report discrepancies](https://help.shopify.com/manual/reports-and-analytics/discrepancies).

***

## Earnings

The earnings amount refers to how much an app developer has been paid. It includes both paid out amounts and pending payments, and it reflects the deduction of Shopify's revenue share and any application credits. Your share of the revenue is defined in the [Shopify Partner revenue share](https://help.shopify.com/partners/how-to-earn#shopify-apps) agreement.

Payments occur after a merchant has paid their Shopify invoice. The payment schedule depends on the type of charges made by the app:

* For a RecurringApplicationCharge, it can take up to 37 days from the time a merchant agrees to the charge to the time that the charge appears as an earning in your Partner Dashboard.
* For an ApplicationCharge, merchants are invoiced immediately and the charge will appear as an earning in your Partner Dashboard within 7 days.

***

## App history

Important user interactions with your app are tracked as events, which you can view in the app history log in your Partner Dashboard. The app history log displays all the tracked events for your app, with the most recent events appearing at the top. The following events are available:

* [Application charge events](#application-charge-events)
* [Application credit events](#application-credit-events)
* [Application install events](#application-install-events)
* [Recurring charge events](#recurring-charge-events)
* [Usage charge events](#usage-charge-events)

### View app history

1. From your [Partner Dashboard](https://partners.shopify.com/), click **Apps**.
2. Click the name of your app.
3. In the sidebar, click **Insights** > **App history**.

### Application charge events

The following table includes definitions of application charge events:

| Charge accepted | The ApplicationCharge has been accepted by the merchant but not activated by the developer. |
| - | - |
| Charge activated | The ApplicationCharge has been activated by the app developer and will appear on the merchant's next invoice. |
| Charge declined | The ApplicationCharge has been declined by the merchant. |
| Charge expired | The merchant has taken no action 48 hours after being presented with an ApplicationCharge (for example, the merchant has not accepted or declined the charge). |

### Application credit events

The following table includes definitions of application credit events:

| Credit applied | The ApplicationCredit has been added to the store. Funds are deducted from the app developer's upcoming payment. |
| - | - |
| Credit failed | The ApplicationCredit was not added. Reasons why a credit could not be added include:- ApplicationCredit amount exceeds the amount paid from the store owner to the app developer in the last 30 days
- App developer does not have available funds to credit the store (pending receivables is less than credit amount) |
| Credit pending | The ApplicationCredit has been created but it has either failed or not yet been applied. |

### Application install events

The following table includes definitions of application install events:

| Installed | The app was installed on the store. An install occurs after a merchant approves the permissions shown on the OAuth grant screen. |
| - | - |
| Uninstalled | The app was uninstalled from the store. An uninstall occurs after a merchant has removed an app from their store. |

### Recurring charge events

The following table includes definitions of recurring charge events:

| Recurring charge accepted | The RecurringApplicationCharge has been accepted by the merchant but not activated by the developer. |
| - | - |
| Recurring charge activated | The RecurringApplicationCharge has been activated by the app developer and will appear on the merchant's next invoice. |
| Recurring charge canceled | The merchant has canceled the existing RecurringApplicationCharge. Examples of a canceled charge event include:- merchant has uninstalled the app
- merchant has changed app plan type
- merchant no longer wants to pay for the app |
| Recurring charge declined | The RecurringApplicationCharge has been declined by the merchant. |
| Recurring charge expired | The merchant has taken no action 48 hours after being presented with an RecurringApplicationCharge (for example, the merchant has not accepted or declined the charge). |
| Recurring charge frozen | The RecurringApplicationCharge has been suspended. Future payments for the app are on hold until the charge is unfrozen. Examples of a frozen charge event include:- merchant no longer has an active Shopify subscription |
| Recurring charge unfrozen | The RecurringApplicationCharge has been reactivated. A new billing cycle will commence on the day the RecurringApplicationCharge is unfrozen. Examples of an unfrozen charge event include:- merchant has resumed an active Shopify subscription |

### Usage charge events

The following table includes definitions of usage charge events:

| Usage charge applied | After a merchant has agreed to a UsageCharge, a UsageCharge is applied after the charge is created. |
| - | - |

***

---


<!-- PAGE 34/53: App listing visibility -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/visibility -->

# App listing visibility

All apps [distributed through the Shopify App Store](https://shopify.dev/docs/apps/launch/distribution) must have an [app listing](https://shopify.dev/docs/apps/launch/app-requirements-checklist#writing-a-shopify-app-store-listing) page on the Shopify App Store, but you can choose whether the page is fully visible or has limited visibility.

Listing your app on the Shopify App Store is the easiest way to promote your app to Shopify merchants, but you can choose to make your app have limited visibility. You can [change your app’s visibility](#change-your-app-s-visibility) at any time.

**Note:**

Only public apps can be listed on the Shopify App Store. Custom apps are built exclusively for a single Shopify store or Plus organization and aren't listed on the Shopify App Store. For more information on distributing your app, refer to [Distributing your app](https://shopify.dev/docs/apps/launch/distribution).

***

## Comparing fully visible and limited visibility apps

Merchants can install both fully visible and limited visibility apps from an app listing page that uses a Shopify App Store URL. However, only fully visible apps are indexed and appear in the following places:

* Relevant [category](https://shopify.dev/docs/apps/launch/app-store-review/app-listing-categories) pages
* Shopify App Store search results
* Third-party search engine results

***

## Change your app’s visibility

1. Log in to your [Partner Dashboard](https://partners.shopify.com/organizations).
2. Click **Apps**.
3. Click the name of the app whose listing status you want to change.
4. Click **Distribution**.
5. Click **Create listing** or **Manage listing**.
6. Find the **App Store visibility** card.
7. Select either **Limit visibility** or **Make fully visible**.

***

---


<!-- PAGE 35/53: App revenue share -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/distribution/revenue-share -->

# Revenue share for Shopify App Store developers

Shopify's revenue share model is designed to help app developers grow. You keep 100% of your first $1,000,000 USD in gross app revenue earned from January 1, 2025, and 85% of earnings above that. All billing is subject to a 2.9% processing fee and applicable sales tax.

***

## Get started

To access the revenue share plan, you need to register with the Shopify App Store for a one-time fee of $19 USD per Partner account. If you distribute your app to multiple merchants, you need to publish it through the Shopify App Store. Registration isn't required if you're only developing custom apps for a single merchant.

To register:

1. Go to [**Partner Dashboard**](https://partners.shopify.com/current/stores) > [**Settings**](https://partners.shopify.com/current/settings).

2. In the **App Store registration** section, click **Register now**.

3. On the **Register for the Shopify App Store** page, enter the following information:

   * Whether your account is owned by an individual or an entity.
   * Whether you have any [Associated Developer Accounts](https://help.shopify.com/partners/dashboard/associated-accounts), and the owner email address and business name for each.

4. Review your information to verify that it adheres to the Associated Developer Accounts requirements in the [Partner Program Agreement](https://www.shopify.com/partners/terms).

5. Click **Add payment method** and enter your payment information.

6. Click **Register**.

***

## Associated Developer Accounts

During registration, you must link all of your Associated Developer Accounts to ensure revenue is tracked correctly. An Associated Developer Account is any Partner account that you or an associated developer has registered with Shopify. Failing to register is a violation of the [Partner Program Agreement](https://www.shopify.com/partners/terms).

Your gross app revenue is calculated across all Associated Developer Accounts, so all related accounts count toward the $1,000,000 USD threshold. Even though revenue is calculated together, payouts are still made separately at the Partner account level.

Learn more about [Associated Developer Accounts](https://help.shopify.com/en/partners/dashboard/associated-accounts) on the Shopify Help Center.

***

## How revenue share works

Revenue share is calculated based on gross sales, not net sales. Refunds aren't taken into account. If you earn revenue across multiple apps, revenue share is based on the cumulative revenue of all your apps, including apps developed under any [Associated Developer Accounts](#associated-developer-accounts). Revenue share is still paid out separately at the Partner account level.

### Standard rates

For developers with annual app earnings under $20,000,000 USD per year, these standard rates apply:

| Lifetime gross app revenue | Revenue share rate |
| - | - |
| First $1,000,000 USD | 0% |
| Above $1,000,000 USD | 15% |

Developers who earned $20,000,000 USD or more through the Shopify App Store in the prior calendar year, or who have a gross company revenue of $100,000,000 USD or more, pay 15% revenue share on all app revenue. The 0% rate on the first $1,000,000 USD doesn't apply.

Eligibility is reassessed annually. Shopify will reach out to confirm eligibility as needed.

### Theme Store and referral revenue

Other income, such as from the Shopify Theme Store or referrals, isn't included in Shopify App Store revenue share calculations. Learn more about [theme revenue share](https://shopify.dev/docs/storefronts/themes/store/revenue-share).

***

## Fees and taxes

All billing is subject to a 2.9% processing fee and applicable sales tax. Fees and taxes are charged separately from revenue share.

Earnings in some countries or regions are subject to additional [regulatory operating fees](https://help.shopify.com/en/partners/how-to-earn#regulatory-operating-fee).

***

## View your earnings and fees

You can review your earnings and fees in the [Partner Dashboard](https://partners.shopify.com/current/stores):

* [View app charges for a specific store](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings#store-page)
* [View app charges in the Payouts page](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings#payouts-page)
* [View app charges from the App history page](https://shopify.dev/docs/apps/launch/billing/view-charges-earnings#app-history-page)
* [Download a CSV of your payouts](https://help.shopify.com/partners/getting-started/getting-paid#export-your-payouts)
* [Review the Shopify fees invoice](https://help.shopify.com/partners/getting-started/getting-paid#shopify-fees-invoice)

You can also use the [Shopify Partner API](https://shopify.dev/api/partner) to programmatically access the data found in your Partner Dashboard.

***

## Additional terms

For additional terms related to earning money in the Shopify App Store, refer to [Shopify Partner earnings](https://help.shopify.com/partners/how-to-earn#shopify-apps) and the [Partner Program Agreement](https://www.shopify.com/partners/terms).

***

---


<!-- PAGE 36/53: About the Shopify App Store -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review -->

# About the Shopify App Store

With targeted recommendations and relevant categories, the [Shopify App Store](https://apps.shopify.com) is the best place for Shopify merchants to find apps that they can use to build their business. As an app developer, you can create apps for the Shopify App Store to reach millions of entrepreneurs around the world, and use Shopify's Billing API to create pricing models that let you grow your own app development business.

Your App Store listing is the foundation for all app discovery. Whether merchants find your app through browsing the App Store, receiving recommendations in their admin workflow, or asking Sidekick for help, all these experiences draw from your public App Store listing information including your description, features, pricing, and reviews.

***

## Getting your app approved

When you’re ready to [distribute your app on the Shopify App Store](https://shopify.dev/docs/apps/launch/distribution), you need to submit it to Shopify’s App Approval team and make sure it meets all requirements.

* View the complete list of [app requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist).
* Learn more about the [app review process](https://shopify.dev/docs/apps/launch/app-store-review/review-process).
* Find out if your app needs to meet the [protected customer data requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).
* Learn more about our [support requirements](https://shopify.dev/docs/apps/launch/distribution/support-your-customers) for app developers.

***

## Charging for your app

Shopify’s Billing API lets you charge merchants a one-time fee for your public app, or you can charge them for an ongoing subscription.

Apply for our reduced revenue share plan to pay only 15% revenue share on all app revenue, reduced from 20%. [Eligible developers](https://shopify.dev/docs/apps/launch/distribution/revenue-share#calculating-shopify-app-store-revenue) pay 0% revenue share on the first $1,000,000 USD earned.

* Learn more about [using the Billing API](https://shopify.dev/docs/apps/launch/billing).
* Learn more about [app revenue share](https://shopify.dev/docs/apps/launch/distribution/revenue-share).

***

## Marketing and supporting your app

After your app is [listed](https://shopify.dev/docs/apps/launch/distribution/visibility) on the Shopify App Store, you can market and support your app to make it more successful. Successful developers market their app both through Shopify and externally, offer great customer service to merchants, and manage their app reviews.

Get advice on [being successful in the Shopify App Store](https://shopify.dev/docs/apps/launch/distribution/go-to-market-success).

***

## Improving quality and getting promoted

Merchants want apps that are easy to use, safe, and performant, and that solve their problems. To help merchants to find apps that meet their needs, Shopify adds indicators of quality to apps, and promotes high quality apps on various surfaces, including the Shopify App Store, in-admin, and Sidekick. Apps that meet all of our criteria are given Built for Shopify status, our highest level of recognition and achievement.

To learn about our quality standards, and how you can earn achievements that grant you quality indicators and promotion opportunities, refer to [Built for Shopify](https://shopify.dev/docs/apps/launch/built-for-shopify).

***

## Shopify App Store ads

As an app developer, you can create search ads to help merchants discover your apps in the Shopify App Store. Ads are shown to merchants on the search results page above the organic search results.

* Learn more about [Shopify App Store ads](https://shopify.dev/docs/apps/launch/marketing/advertising).

***

---


<!-- PAGE 37/53: About the app review process -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/review-process -->

# About the app review process

When you submit an app, it goes through an app review process to make sure that it meets Shopify's [requirements for safe, quality apps](https://shopify.dev/docs/apps/launch/app-requirements-checklist). Shopify's app requirements are the same for both [fully visible and limited visibility](https://shopify.dev/docs/apps/launch/distribution/visibility) public apps. If you’re planning to list your app on the Shopify App Store, then Shopify also reviews the content that you provided for your listing page.

To reduce the time it takes to review your app and help the process go smoothly, use tips outlined in the following sections as you build your app and draft your submission. To learn about the most common reasons why apps aren't accepted, refer to [Common review problems](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review#common-app-review-problems).

***

## Review process

Your app must meet all requirements on the App Store review page before your app is reviewed. During the review process your app changes status: Draft, Submitted, Reviewed, and Published. You can learn about the status of your app on your App Store review page.

### Preliminary steps

When you create a public app, it starts with the **Draft** status. You must fix any issues that are identified on the Shopify App Store review page before you can [submit your app](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review) for review. After you make the changes, you can click the **Submit your app** button to send your app for review.

### App review

After you submit your public app for review, it moves to the **Submitted** status and you receive an email confirming that your submission was received. You can withdraw from the review process at any time by clicking **Withdraw** in the status banner.

If your app doesn't meet core requirements that prevent a reviewer from reviewing your app, then your app moves to the **Paused** status and then you’ll receive an email that outlines required changes. After you make the required changes to your app, you can resubmit by click **Submit fixes** in the status banner.

After your app meets the core requirements, Shopify assigns a reviewer to your submission, and they begin to review your app. If your app requires additional fixes that need to be discussed with your reviewer, then it moves to the **Reviewed** status. You'll receive an email that outlines the next steps and you need to reply to continue the process.

After your app has been approved by the app review team, you'll receive an email confirming that your app has moved to the **Published** status and now displays on the Shopify App Store.

**Note:**

By default, all approved app listings are visible in the Shopify App Store. Learn more about [listing visibility](https://shopify.dev/docs/apps/launch/distribution/visibility).

***

## Next step

[Prepare your app for review](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review): Before you submit your app for review, you need to test it on a development store to check for any bugs or errors.

***

---


<!-- PAGE 38/53: Submit your app for review -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review -->

# Submit your app for review

After you complete the automated checks and [prepare your app for submission](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review), you can submit your app for review.

**Caution:**

Submitting apps with errors, beta versions of apps, apps that don’t meet requirements, or apps with incomplete submissions can delay the process or cause your app not to be approved.

***

## Contact throughout the review process

The app submission email that you provided in the **Contact information** section of your listing form is where Shopify will email you during review. To ensure that you receive all emails, add <app-submissions@shopify.com> and <noreply@shopify.com> to your allowed senders list in your email service provider’s settings.

If you don’t have access to your Partner account email, then contact [Partner support](https://help.shopify.com/en/partners/about#partner-support).

***

## Shopify App Store review page

Start your app review journey on the Shopify App Store review page. You'll be guided to complete mandatory fields and automated tests to prep your app for submission and reduce common errors. Your progress is auto-saved as you complete each step. After this process is complete, you can submit your app for review by the Shopify App Store Review team.

### Configuration setup

The configuration section guides you to set up items such as URL(s) for your app, compliance webhooks, the app icon, and API contact details.

* **URLs**: When you set up domains for your application, make sure you don't include the words "Shopify" or "Example". Avoid using misspelled or abbreviated versions of "Shopify", as this isn't permitted according to our [Partner Program Agreement](https://www.shopify.com/ca/partners/terms).

* **Compliance webhooks**: Apps that are distributed through the Shopify App Store must subscribe to [compliance webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance#subscribe-to-compliance-webhooks).

* **App icon**: The [app icon](https://shopify.dev/docs/apps/launch/app-requirements-checklist#2-app-icon) must be 1200 x 1200 pixels in size and in either JPEG or PNG format.

* **App setting**: The API contact email shouldn't contain the word "Shopify". Avoid any misspellings or abbreviations of "Shopify", as they aren't permitted according to our [Partner Program Agreement](https://www.shopify.com/ca/partners/terms).

* **Add an emergency contact for your account**: You need to provide an email and phone number in case critical technical issues with your app arise and we need to contact you. Your emergency developer contact email will be used for providing [technical updates](https://shopify.dev/docs/api/usage/versioning/updates), so that we can communicate critical information about your app.

### Create a listing

Every app submission must specify a primary language and create at least one Shopify App Store listing. The app listing is a source of key information about your app. Ensure that all [app listing requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist#5-app-listing) are met.

### Protected customer data

If your app requires the use of [protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data), then you can access the request form from this page. If the app doesn't require this data, then you can choose to opt out. Applying for protected customer data isn't possible while the app is under review.

### Automated checks for common errors

The Shopify App Store review page enables you to run automated checks for common errors to ensure that your app is ready for submission. These checks must be run and completed successfully to ensure functionality and reduce your app’s time spent in review. If you fail one or more of these checks, address the issue(s) and then you can rerun the checks.

***

## Temporary suspensions

Partners may be temporarily suspended from submitting their app if they do any of the following things:

* Consecutively failing to address issues highlighted by the app reviewer after two or more exchanges.

* Repeatedly submitting the app for review with new and growing numbers of issues.

* Failing to respond to our app review emails after repeated attempts.

* Refusing to accept the outcome of exemption requests.

  If your app is suspended, then your app moves to the **Suspended** state and you can resubmit your app for review on the date shown in the status banner. Suspensions affect only the app currently being reviewed. There is no impact to other apps owned by the Partner, the Partner account itself, or people from the Partner organization.

  Repeatedly getting suspended will lead to longer suspensions.

***

---


<!-- PAGE 39/53: Pass app review -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review -->

# Pass app review

Before you submit your app to Shopify, you should do some final tests, validations, and administrative tasks to ensure that it's ready for review, and ready for merchants to use the app in production.

The app review team will only review production-ready apps. If you submit an app that is incomplete or has errors that prevent us from reviewing its features, then it won't be approved.

After you've tested your app and made sure that it meets all of our [app requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist), you can [submit your app for approval](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review). These instructions apply to all apps.

Ensure you agree to follow the terms outlined in the [Partner Program Agreement](https://www.shopify.com/partners/terms) and the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms). If at any point you don’t meet these terms, then Shopify [restricts your access to Partner services](https://help.shopify.com/en/partners/faq/removal).

***

## Run an AI self-review against your codebase

Before you submit, you can run a self-review of your app against every [Shopify App Store requirement](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) that can be evaluated from a local codebase. An AI agent reads the requirements, inspects your project, and returns a report of likely passing, likely failing, and needs-review items. The same command appears in the pre-submission checklist on the Shopify App Store review page, but you can run it any time while you build.

The [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) includes the self-review skill. After you install the Toolkit, invoke the skill from your agent chat:

## Agent chat

```terminal
/shopify-app-store-review
```

**Note:**

The AI self-review only covers requirements that can be checked against code. Requirements that depend on your app listing content, live app behavior, or merchant-facing UX aren't included. The Shopify app review team still verifies all requirements after you submit.

***

## Install your app on a development store

Development stores can be used to test apps to ensure they're free of bugs or otherwise incomplete. If you don’t have a development store, then you can [create one](https://shopify.dev/docs/api/development-stores#create-a-development-store-to-test-your-app).

**Tip:**

You can also install your app on a development store [using Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps).

1. Log in to your [Dev Dashboard](https://dev.shopify.com/dashboard).
2. Click **Apps**.
3. Click the name of your app to navigate to the App overview page.
4. On the app overview page, in the **Installs** section, click **Install app**.
5. Select the development store you wish to use.

The app should be automatically installed to your dev store. If you are instead directed to the OAuth grant screen, you can manually install your app. If the app doesn't get automatically installed, or you don't see the OAuth grant screen, then you might need to double check your app’s code, as well as the app [URLs and redirects](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#ask-for-permission). You can avoid this by using [Shopify managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation).

***

## Check your OAuth installs for errors

**Note:**

Tip: If you [configure your app using Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration), then your app will automatically use [Shopify managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation). You can skip this step.

Before submitting your app, make sure to test your app’s [URLs and redirects](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#ask-for-permission). Before submitting your app, make sure its App URL and allowed redirection URL redirect merchants to the OAuth screen as expected. If they don't redirect merchants to the OAuth grant screen, then your app won't be approved.

1. In your Dev Dashboard, click **Apps**.
2. Click the name of your app.
3. Click **Versions**.
4. Click the active version. This represents the currently released version of your app.
5. Check your app URL and your redirect URLs.
6. Review and test the URLs that you provided.

For more information about using OAuth to communicate with Shopify, refer to [Getting started with OAuth](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant).

***

## Test your app’s billing system

All charges associated with apps submitted to the Shopify App Store must use the [Shopify Billing API](https://shopify.dev/docs/apps/launch/billing).

You need to test your app's billing system before you submit your app to the Shopify App Store. To test your app without incurring a real charge, you can have your app create a test charge before you install it on your development store. To have your app create a test charge, you can change your app's charge requests to include `"test": true`. This will create a test charge when you install the app so that you don't incur a real charge on your account.

Your Billing API integration must meet the [Shopify App Store billing requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist#b-billing).

When you have finished testing, you must change all of your app's charge requests to include `"test": false`, or merchants who install your app won't be charged.

***

## Request access to protected customer data

If your app uses customer data, then you need to meet the [protected customer data requirements](https://shopify.dev/docs/apps/launch/protected-customer-data#request-access-to-protected-customer-data) and then apply for access to this data in the **API Access** > **Protected customer data access** section of your Partner Dashboard.

***

## Common app review problems

Apps often need to be updated or re-submitted for a few common reasons.

Resubmitting your app slows down the review process. To avoid delays, before submitting your app, learn how you can avoid these problems with the solutions in the following table.

| Category | Reason | Solution | Failure requires app re-submit |
| - | - | - | - |
| Billing | * Pricing information isn’t accurate
* Merchants aren’t able to upgrade or downgrade pricing plans
* App doesn’t use the required Shopify Billing API | - Make sure your pricing information is up-to-date on your submission form.
- Allow merchants the ability to switch between pricing plans.
- Use the Shopify Billing API to process all charges associated with your app. | No |
| Installation | * When the app is installed, it doesn’t immediately redirect to the OAuth grant screen
* The app returns a fatal error after installation
* The app doesn’t re-install properly | - Test that your app [successfully obtains an access token](https://shopify.dev/docs/apps/build/authentication-authorization)
- If you're using authorization code grant, make sure your redirect URL works correctly. The app must redirect merchants to the UI after it’s installed.
- Test re-installation. Your app should re-install for merchants who’ve previously installed it. | Yes |
| Embedding | * The app switches between embedded and not embedded versions | - Use Shopify App Bridge, if your app is embedded. This allows redirects to take merchants to the embedded version of the app.
- Use session token authentication, if your app is embedded. This lets merchants interact with your app without continually providing their login information. | Yes |
| User interface | * The app interface is broken and unusable upon installation
* The app has web errors such as 404s, 500s, and 300s | - Make sure the UI is operational so that merchants can interact with it.
- Make sure your error messages are clear and informative. | Yes |
| App Testing | * The app is submitted without proper testing instructions or credentials
* App must be a finished product and in a stable state | - Ensure that you include testing information and test credentials in the app submission form. Include a short screencast of how your app should work.
- Ensure that you properly test your app for bugs and ensure your app is a complete, finished product. | Yes |
| Online store apps | * The app isn't using theme app extensions.
* The app isn't showing widgets properly on the storefront | - Modifications to an online store theme must use theme app extensions.
- Widgets must be shown without error in the online store | Yes |

***

## Next step

[Submit your app](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review): If you've followed all of the requirements to create your app, then you're ready to submit your app for review by the Shopify app review team.

***

---


<!-- PAGE 40/53: App listing categories -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/app-listing-categories -->

# App listing categories

App categories, subcategories, and tags allow merchants to find apps that meet their specific needs.

You need to categorize your app on the [app listing form](https://shopify.dev/docs/apps/launch/app-requirements-checklist#3-app-categorization). A primary tag is required, and should represent your app's main function. You can add a secondary tag if the primary doesn't fully describe your app's function. For example, if your app manages email marketing and SMS marketing, you should add tags for both of these functions. If your app is mainly for email marketing and only has a small SMS marketing features, then you should add only the email marketing tag.

As part of the app review process, Shopify app review team will review and confirm that your app is classified accurately.

We regularly review app classification as a part of our taxonomy governance. Ongoing governance can also result in changes to the taxonomy. Both of these activities could result in changes to the categories, subcategories, and tags applied to an app.

**Tip:**

To discover categories applicable to your app, research apps that are similar to yours on the Shopify App Store and use the categories that they use.

The Shopify App QA team will continue to be involved to ensure that apps are classified accurately.

If your app capabilities change and you want to change how your app is categorized, then you can submit an appeal to change the app categorization by using the link in the app submission form. After the Shopify app review team completes their review, they'll send a response, whether it's approved or rejected.

#### App category details

Each category requires additional structured features about your app. This makes it easier for merchants to identify and compare relevant app features by category.

You can select up to 25 structured features per category field in the app submission form and they will appear on the app listing. These details can be updated at any time and don't require an appeal for review.

We've curated the most common features that merchants might be looking for within each category. If your app has more functionality than what's listed for each category, then consider either using your [features list](https://shopify.dev/docs/apps/store/requirements#6-feature-list) to specify the functionality or let us know in [this feedback form](https://docs.google.com/forms/d/e/1FAIpQLSf-hVr_fbYXZ1nb6kUueIXqUf_WsyY5KyycFKS0KFxMOUl4xQ/viewform).

***

## List of app categories, subcategories, and tags

Apps can be assigned to one of the following categories:

* [Sales channels](#sales-channels)
* [Finding products](#finding-products)
* [Selling products](#selling-products)
* [Orders and shipping](#orders-and-shipping)
* [Store design](#store-design)
* [Marketing and conversion](#marketing-and-conversion)
* [Store management](#store-management)

Each category is divided into subcategories, and each subcategory has multiple tags associated with it.

| Categories | Subcategories | Tags |
| - | - | - |
| **Sales channels**: Apps that let merchants sell to customers using sales channels. | **Selling online**: Apps that let merchants sell across online platforms. | **Marketplaces**: Apps for publishing products on online marketplaces. |
| **Product feeds**: Apps that let merchants use structured data files to manage product information. | | |
| **Store data importer**: Apps that migrate product and store data between Shopify and other platforms. | | |
| **Selling online - Other**: Apps related to other ways to sell online. | | |
| **Selling in person**: Apps that help merchants make more in-person sales. | **Retail**: Apps that let in-person sellers accept payment or sync inventory. | |
| **Store locator**: Apps that help customers find retail locations for a store. | | |
| **SKU and barcodes**: Apps that help merchants create SKUs and barcodes for products. | | |
| **Selling in person - Other**: Apps related to other ways to sell in person. | | |
| **Finding products**: Apps that help merchants find and source products for their store. | **Sourcing options**: Apps that connect merchants with vendors to purchase products. | **Dropshipping**: Apps that manage third-party inventory and fulfillment services. |
| **Print on demand (POD)**: Apps that manage third-party custom product design, printing, and shipping. | | |
| **Wholesale**: Apps that let merchants buy or sell products wholesale. | | |
| **Sourcing options - Other**: Apps related to other sourcing methods. | | |
| **Selling products**: Apps that expand a merchant's product offerings or payment options. | **Payment options**: Apps that offer customers different ways to pay for products. | **Subscriptions**: Apps that let customers pay for ongoing subscriptions for products. |
| **Payments**: Apps that let merchants offer customers financing options. | | |
| **Cash on delivery (COD)**: Apps that help merchants collect and verify payment during delivery. | | |
| **Payment options - Other**: Apps related to other payment options. | | |
| **Pricing**: Apps that let merchants sell products using different pricing strategies. | **Pricing optimization**: Apps that help merchants optimize their pricing strategy. | |
| **Pricing quotes**: Apps that help create custom prices or offer ways to request quotes. | | |
| **Pricing - Other**: Apps related to other pricing options. | | |
| **Digital goods and services**: Apps that let customers pay for access to events or digital products. | **Digital products**: Apps that let merchants sell and deliver digital products. | |
| **NFTs and tokengating**: Apps that let merchants sell NFTs and tokengated perks. | | |
| **Event booking**: Apps that let merchants sell access to classes, shows, and other events. | | |
| **Digital goods and services - Other**: Apps related to other digital goods and services. | | |
| **Custom products**: Apps that display product options or variants to customers. | **Product variants**: Apps that let customers pick multiple product variations. | |
| **Custom file upload**: Apps that let customers add images and custom info to their order. | | |
| **Custom products - Other**: Apps related to other custom products. | | |
| **Store design**: Apps that help merchants customize the look and feel of their store. | **Storefronts**: Apps that let merchants customize their online store or create a custom app. | **Page builder**: Apps that let merchants build and customize pages within their theme. |
| **Mobile app builder**: Apps that help build mobile apps for customers to shop on iOS or Android. | | |
| **Storefronts - Other**: Apps related to other storefront options. | | |
| **Site optimization**: Apps that help merchants optimize site traffic and performance. | **SEO**: Apps that help boost and manage search engine optimization (SEO). | |
| **Accessibility**: Apps that support accessibility when shopping on a store using assistive technology. | | |
| **Site optimization - Other**: Apps related to other site optimization methods. | | |
| **Search and navigation**: Apps that help merchants enhance navigation and search on their store. | **Search and filters**: Apps that let customers browse and find products using search and filters. | |
| **Navigation and menus**: Apps that let merchants add wayfinding elements to their store. | | |
| **Search and navigation - Other**: Apps related to other search and navigation options. | | |
| **Images and media**: Apps that help merchants create and manage digital assets for their store. | **Image gallery**: Apps that group and display a collection of images on a store. | |
| **Image editor**: Apps that help merchants edit and optimize images. | | |
| **Video and livestream**: Apps that let create video content including shoppable reels and live selling. | | |
| **3D/AR/VR**: Apps that help customers visualize and try on products in real life. | | |
| **Images and media - Other**: Apps related to other image and media options. | | |
| **Design elements**: Apps that let merchants add animation, SFX, or other graphics to their store. | **Animation and effects**: Apps that let merchants add animation or music to their store. | |
| **Badges and icons**: Apps that add customizable icons or buttons to a store. | | |
| **Design elements - Other**: Apps related to other design elements. | | |
| **Notifications**: Apps that help display announcements and draw attention to customers. | **Banners**: Apps that create and display banners or announcement bars on a store. | |
| **Pop-ups**: Apps that create and display pop-up windows on a store. | | |
| **Forms**: Let merchants add forms to their store for capturing customer info. | | |
| **Notifications - Other**: Apps related to other notification options. | | |
| **Content**: Apps that let merchants customize content about their products or business. | **Metafields**: Apps that add custom info and functionality to pages. | |
| **Product content**: Apps for creating product descriptions or product listings. | | |
| **Blogs**: Apps that help display and manage posted content like blogs. | | |
| **Content - Other**: Apps related to other content options. | | |
| **Product display**: Apps that manage how products are presented on a storefront. | **Product comparison**: Apps that let customers compare products and decide what to buy. | |
| **Collections**: Apps that help merchants import, export, and bulk update collections. | | |
| **Product display - Other**: Apps related to other product display methods. | | |
| **Internationalization**: Apps that let customers shop in their language or currency on a store. | **Currency and translation**: Apps that can manage multiple currencies or languages. | |
| **Geolocation**: Apps that let merchants show different experiences based on customer location. | | |
| **Cookie consent**: Apps that protect or control access to customer data like cookies. | | |
| **Internationalization - Other**: Apps related to other internationalization options. | | |
| **Orders and shipping**: Apps that help merchants manage and process orders for customers. | **Orders**: Apps that help merchants keep track of customer orders. | **Order tracking**: Apps that let merchants give order info to customers via the store or notifications. |
| **Order editing**: Apps that let merchants make updates to orders. | | |
| **Invoices and receipts**: Apps that manage order documents like invoices, receipts, or packing slips. | | |
| **Orders - Other**: Apps related to other order management methods. | | |
| **Shipping solutions**: Apps that help merchants fulfill orders and ship to customers. | **Shipping**: Apps for shipping out products, including packaging, labeling, and reporting. | |
| **Shipping rates**: Apps that calculate and display shipping rates to customers during checkout. | | |
| **Third-party logistics (3PL)**: Apps that let merchants hire third-party logistic providers (3PLs) to store and ship products. | | |
| **Delivery and pickup**: Apps that let merchants offer local delivery or pickup for orders. | | |
| **Shipping solutions - Other**: Apps related to other shipping solutions. | | |
| **Inventory**: Apps that help merchants keep track of available stock and inventory. | **Inventory sync**: Apps that sync inventory details between Shopify and other platforms. | |
| **Inventory optimization**: Apps that help optimize stock and inventory levels. | | |
| **ERP**: Apps that integrate and automate operations like finance, project management, etc. | | |
| **Inventory - Other**: Apps related to other inventory management methods. | | |
| **Returns and warranty**: Apps for offering customer warranties, insurance, and easy returns. | **Returns and exchanges**: Apps that manage product returns or exchanges. | |
| **Warranties and insurance**: Apps that let customers add warranties or insurance to purchases. | | |
| **Returns and warranty - Other**: Apps related to other warranty and return options. | | |
| **Marketing and conversion**: Apps that help merchants promote and motivate customers to buy. | **Advertising**: Apps that help merchants promote products and reach new customers. | **Ads**: Apps that run paid search ads, social media ads, native ads, etc. |
| **Affiliate programs**: Apps that help sell products through a network of people and companies. | | |
| **Advertising - Other**: Apps related to other advertising methods. | | |
| **Marketing**: Apps that let merchants reach out directly to customers. | **Email marketing**: Apps that automate, manage, or send email marketing to customers. | |
| **SMS marketing**: Apps that automate, manage, or send SMS marketing to customers. | | |
| **Web push**: Apps that send and manage push alerts for customers. | | |
| **Abandoned cart**: Apps that encourage customers to finish a purchase after leaving their cart. | | |
| **Marketing - Other**: Apps related to other marketing methods. | | |
| **Checkout**: Apps that improve checkout and adding products to cart. | **Cart customization**: Apps that let merchants customize and add features to the cart page. | |
| **Order limits**: Apps that limit the number or weight of items that customers can buy. | | |
| **Checkout - Other**: Apps related to other checkout options. | | |
| **Promotions**: Apps that let merchants offer discounts or special sales for products. | **Discounts**: Apps that help create and manage discount codes and sales. | |
| **Giveaways and contests**: Apps that let customers win prizes from giveaways or contests. | | |
| **Promotions - Other**: Apps related to other promotion options. | | |
| **Gifts**: Apps that let customers buy products as gifts for other people. | **Gift cards**: Apps that let customers send gift cards to other people. | |
| **Gift wrap and messages**: Apps that let customers request gift wrapping or add a message. | | |
| **Gifts - Other**: Apps related to other gift options. | | |
| **Upsell and bundles**: Apps that encourage customers to shop for related products before checkout. | **Product bundles**: Apps that let merchants sell multiple products in a single bundle. | |
| **Upsell and cross-sell**: Apps that encourage customers to purchase additional upgrades, add-ons, etc. | | |
| **Countdown timer**: Apps that display how much time is left for customers to buy a product. | | |
| **Stock alerts**: Apps for sharing inventory updates, like running low or back in stock. | | |
| **Pre-orders**: Apps that let merchants accept orders in advance for upcoming products. | | |
| **Upsell and bundles - Other**: Apps related to other upsell and bundle options. | | |
| **Social trust**: Apps that encourage shopping based on customer trends. | **Product reviews**: Apps that collect or display product ratings and testimonials from customers. | |
| **Social proof**: Apps that signal customer shopping trends like recent orders, trending products, etc. | | |
| **Social trust - Other**: Apps related to other social trust methods. | | |
| **Customer loyalty**: Apps for encouraging customers to buy again (rewards, registries, donations). | **Loyalty and rewards**: Apps that manage customer rewards and loyalty programs. | |
| **Wishlists**: Apps that let customers create and save lists of products for later. | | |
| **Donations**: Apps that let customers give donations to charity or environmental causes. | | |
| **Customer loyalty - Other**: Apps related to other customer loyalty options. | | |
| **Store management**: Apps that help merchants to manage their store. | **Operations**: Apps that help merchants manage tasks and automate their work. | **Workflow automation**: Apps that automate multiple tasks like customer management, bulk fulfillment, etc. |
| **Bulk editor**: Apps that update multiple products at once for pricing, images, etc. | | |
| **Staff notifications**: Apps for keeping staff, vendors, or suppliers updated via email, Slack, etc. | | |
| **Analytics**: Apps that analyze and generate insights or recommendations for a store. | | |
| **Operations - Other**: Apps related to other operations. | | |
| **Security**: Apps that help with legal, fraud, and security measures. | **Legal**: Apps that help with legal compliance, terms and conditions, etc. | |
| **Fraud**: Apps that detect, flag, or prevent fraudulent transactions. | | |
| **Anti theft**: Apps that protect digital assets like images from being copied or stolen. | | |
| **Accounts and login**: Apps that manage customer account creation, log in, passwords, etc. | | |
| **Security - Other**: Apps related to other security measures. | | |
| **Finances**: Apps that help merchants manage their money and financial records. | **Accounting**: Apps that run accounting operations like managing cash flow, expenses, etc. | |
| **Taxes**: Apps that help merchants collect, calculate, or submit tax info. | | |
| **Finances - Other**: Apps related to other finance options. | | |
| **Support**: Apps that let merchants provide help and resolve issues for customers. | **Chat**: Apps that allow customers to connect with merchants via chat. | |
| **Helpdesk**: Apps that manage helpdesks or workflows for customer support tickets. | | |
| **FAQ**: Apps that create and display pages for frequently asked questions (FAQs). | | |
| **Surveys**: Apps that collect customer sentiment about a business through surveys, polls, etc. | | |
| **Support - Other**: Apps related to other support options. | | |

***

---


<!-- PAGE 41/53: Policy violations -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/policy-violations -->

# Shopify App Store policy violations

We value our app developers and strive for the best app experience possible. App developers are expected to adhere to the [Partner Program Agreement](https://www.shopify.com/partners/terms) and [API License and Terms of Use](https://www.shopify.com/ca/legal/api-terms).

If you violate any of the terms in the [Partner Program Agreement](https://www.shopify.com/partners/terms) or [API License and Terms of Use](https://www.shopify.com/legal/api-terms), we'll take appropriate actions to address the issue(s). The actions vary depending on the specific policy that's been violated. For more information, please review [Enforcement of Shopify’s Partner Program Policies](https://help.shopify.com/partners/faq/removal).

***

## Reporting violations

If you encounter an app that doesn't adhere to the [Partner Program Agreement](https://www.shopify.com/partners/terms) or [API License and Terms of Use](https://www.shopify.com/ca/legal/api-terms), you can [report a violation](https://www.shopify.com/legal/tools/report-an-issue/report-a-partner-violation).

We appreciate your collaboration in making the Shopify App Store the best commerce app marketplace in the world.

***

---


<!-- PAGE 42/53: About app quality checks -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/app-store-review/app-quality-checks -->

# About app quality checks

Shopify uses a quality check process to verify that all apps [distributed through the Shopify App Store](https://shopify.dev/docs/apps/launch/distribution) meet the specified requirements.

The requirements for apps in the Shopify ecosystem can be updated without notice to ensure the best possible merchant experience. Even if your app has previously gone through the Shopify App Store [review process](https://shopify.dev/docs/apps/launch/app-store-review/review-process), the ongoing app quality check process verifies that your app continues to meet the most recent requirements.

If your app is selected for a quality check, then you'll receive an email with further instructions.

***

## Contact throughout the quality check process

During the quality check process, a member of our App Excellence Team will contact you at the App submission contact email set in your app's listing. To ensure that you receive these emails, add `app-audits@shopify.com` and `noreply@shopify.com` to your allowed senders list in your email service provider’s settings.

If you have any questions or would like more information, respond directly to the quality check email. The App Excellence Team will stay in contact with you by email until the quality check process is complete.

If you don’t have access to your Partner account email, then contact [Partner support](https://help.shopify.com/en/partners/about#partner-support).

***

## App quality check process

When your app undergoes a quality check, you receive an email notifying you that your app is in the quality check process. If applicable, the email includes a list of required changes that you need to make to your app. The required changes are always based on the [Shopify App Store requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist).

If the quality check email has a list of changes that you need to make to your app, then you have 30 days to make those changes. After you make the changes, respond to the quality check email and describe the changes that you've made. A member of our App Excellence Team will review your app. If the changes you made meet the current requirements, then the quality check is complete.

**Caution:**

If you don't respond to the initial quality check email within 7 days, then your app will be demoted. If you fail to make required changes to your app within 30 days, then your app might be unpublished.

***

---


<!-- PAGE 43/53: About Shopify App Store ads -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising -->

# About Shopify App Store ads

You can buy ads on the Shopify App Store to help more merchants discover your apps.

***

## Available ad types

There are three ad types available on the Shopify App Store: Search results, category and subcategory pages, and the homepage.

Each type is visually similar, but their layout and the number of available placements differs by device type, whether desktop or mobile.

| Type | Desktop placements | Mobile placements |
| - | - | - |
| Search results | 4 | 3 |
| Category and subcategory pages | 4 | 2 |
| Homepage | 4 | 4 |

#### Search results

![Search results page with ads on the Shopify App Store.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/app-store-ads-placement-search-BBLk60hb.png)

#### Category pages

![Category page with ads on the Shopify App Store.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/app-store-ads-placement-category-DzjZ6yHX.png)

#### Homepage

![Homepage ads on the Shopify App Store.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/app-store-ads-placement-homepage-B3ItszCl.png)

Ads are always clearly marked with a badge to indicate that they aren't organic app listings. On the homepage and category pages, ads appear in a section labeled **Sponsored apps**.

***

## Pricing

All ads use a Cost-Per-Click (CPC) model. This is an industry-standard model that uses pay-per-click auction bidding to determine when to show ads and which ads are shown. You pay only for each click on your ad.

The actual cost per click is calculated based on a first-price auction model. This means that the price you pay for a click on your ad is the same as the bid amount that you entered for the ad placement or search keyword that led to your ad being displayed.

While all ad types use CPC pricing, the bidding process and costs differ for each ad type.

### Homepage and category ads

When you create a homepage or category ad, you specify the bid amount that you would pay to have your ad shown. When a merchant visits the homepage or the selected category, an auction takes place where advertisers who want to show their ad compete by submitting their bid. The ads from the winning advertisers in each auction are shown in a ranked order.

### Search ads

When you create a search ad, you specify the keywords for which you want your ad to be shown. Whenever a merchant searches for any search term, an auction takes place where advertisers who want to show their ad for related keywords compete by submitting their bid. The ads from the winning advertisers in each auction are shown in a ranked order.

Keywords aren't always sold to the highest bidder. Your app's relevance to the search term and merchant is factored in as well. Keywords cost less for highly relevant apps, and their ads rank higher than others for the same auction.

![Example that shows relevance and bids of four ads](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/app-store-ads-relevance-Dt3TUTXI.png)

In the example above, the first ad displays in position 1 and pays only $0.50 because of its high relevance. The last ad won’t be displayed because it did not win the auction to be within the first 3 ad slots. Its bid and relevance combination was too low, even though its bid was the highest.

Ad positions can change because they depend on the advertisers' bids and the relevance of their ads. For example, an ad in position 3 can move to position 1. Increases or decreases in bids immediately change ad rankings. This means that if you increase your bid for a particular keyword, then your ad's position can immediately be improved in the search results for that keyword.

If no one else competes for the same opportunity in an auction, then you automatically win and your ad is the only one that displays. In this case, your ad will display in the top position.

***

## Restrictions and limitations

* Only apps published in the Shopify App Store can advertise.
* Only Shopify Partners are eligible to purchase ads. Shopify doesn't advertise its own apps on the Shopify App Store.
* You must be in good standing with the [Shopify Partner Terms of Service](https://www.shopify.ca/partners/terms), including any applicable commercial terms.
* You can create ads for multiple apps, but each ad must promote a single app.
* After you create an ad, you can't edit it to advertise a different app. Instead, create a new ad.

***

## In this section

* [About ad billing](https://shopify.dev/docs/apps/launch/marketing/advertising/ad-billing)
* [Check ad performance](https://shopify.dev/docs/apps/launch/marketing/advertising/check-ad-performance)
* [Create ads in the Shopify App Store](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads)
* [Ads FAQ](https://shopify.dev/docs/apps/launch/marketing/advertising/faq)
* [Manage ads on the Shopify App Store](https://shopify.dev/docs/apps/launch/marketing/advertising/manage-ads)
* [About Ad permissions](https://shopify.dev/docs/apps/launch/marketing/advertising/permissions)

***

---


<!-- PAGE 44/53: Create ads -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads -->

# Create ads in the Shopify App Store

You can create and manage ads from your Partner Dashboard, including setting your budget, picking keywords or placements, and monitoring your ad performance.

***

## Search ads

Search ads display on search result pages, and require you to bid on one or more [keywords](#keywords).

1. From your [Partner Dashboard](https://partners.shopify.com/organizations), click **Apps** > **App ads**.
2. Click **Create ad**.
3. Select an app to advertise. You'll see a [preview](#previews) of your ad.
4. Under **Ad placement**, select **Search results**.
5. Under **Device targeting**, select whether to target users on mobile, desktop, or both.
6. 💎 **[BFS exclusive](#merchant-plan-based-targeting):** Under **Merchant targeting**, select the merchant types you want your ad displayed to.
7. Under **Geotargeting**, select whether to target all countries and regions, or only specific ones.
8. Under **Name your ad**, enter a name for your ad campaign. A distinctive name will help you quickly tell campaigns apart when running multiple ads.
9. Under **Set a budget**, set the maximum amount you’re willing to spend per day. Ad budgets are managed in USD.
10. If you selected **Target specific countries and regions**, then click **Add countries/regions** to edit your list of targeted locales.
11. Under **Keywords**, click **Add keywords**.
12. Enter the [keywords](#keywords) you want to bid on, then click **Add**.
13. For each keyword you chose, set a [bid amount](#bidding). This is the maximum cost-per-click on your ad from searches that match your keyword.

* Learn more about [budgets](#budget) and [bid suggestions](#bid-suggestions).

1. Click **Save**.
2. Click **Start ad** to start your campaign.

***

## Category ads

Category ads display on category and subcategory pages. Apps are only eligible to advertise within their own categories. For example, an Image Gallery app can't advertise in the Accounting category, and Accounting apps can't advertise in the Image Gallery category.

1. From your [Partner Dashboard](https://partners.shopify.com/organizations), click **Apps** > **App ads**.
2. Click **Create ad**.
3. Select an app to advertise. You'll see a [preview](#previews) of your ad.
4. Under **Ad placement**, select **Category pages**, and the category or subcategory you want to target.
5. Under **Device targeting**, select whether to target users on mobile, desktop, or both.
6. 💎 **[BFS exclusive](#merchant-plan-based-targeting):** Under **Merchant targeting**, select the merchant types you want your ad displayed to.
7. Under **Geotargeting**, select whether to target all countries and regions, or only specific ones.
8. Under **Name your ad**, enter a name for your ad campaign. A distinctive name will help you quickly tell campaigns apart when running multiple ads.
9. Under **Set a budget**, set the ad's **Daily budget** and **Cost-per-click bid**.

* Learn more about [budgets](#budget) and [bid suggestions](#bid-suggestions).

1. Click **Start ad** to start your campaign.

***

## Homepage ads

All apps are eligible to advertise on the homepage.

1. From your [Partner Dashboard](https://partners.shopify.com/organizations), click **Apps** > **App ads**.
2. Click **Create ad**.
3. Select an app to advertise. You'll see a [preview](#previews) of your ad.
4. Under **Ad placement**, select **Homepage**.
5. Under **Device targeting**, select whether to target users on mobile, desktop, or both.
6. 💎 **[BFS exclusive](#merchant-plan-based-targeting):** Under **Merchant targeting**, select the merchant types you want your ad displayed to.
7. Under **Geotargeting**, select whether to target all countries and regions, or only specific ones.
8. Under **Name your ad**, enter a name for your ad campaign. A distinctive name will help you quickly tell campaigns apart when running multiple ads.
9. Under **Set a budget**, set the ad's **Daily budget** and **Cost-per-click bid**.

* Learn more about [budgets](#budget) and [bid suggestions](#bid-suggestions).

1. Click **Start ad** to start your campaign.

***

## Previews

When creating an ad, you'll see a preview of what it will look like when it runs.

The appearance of your ad is based on information in the associated app listing, and can't be customized. To change the content of your ad, you need to [edit your app listing](https://shopify.dev/docs/apps/launch/app-requirements-checklist#5-app-listing) directly. Any changes that you make to your app listing are subject to review.

![Example of an ad in the Shopify App Store](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/app-store-ad-example-BUjy8Oet.png)

***

## Bidding

When you set a bid price for your ad, you choose the amount that you'll pay when a merchant clicks on your ad. You can change your bid prices at any time.

Every time a user loads the homepage, loads a category page, or searches for a keyword, Shopify's ad platform runs an auction for the available ad placements. Your ad will automatically bid in any relevant auctions as long as it has enough daily [budget](#budget) remaining.

To win an auction, both your bid price and [app relevance score](#relevance) need to be high enough. The ads that win the auction are displayed to merchants.

### Bid suggestions

When setting your ad's budget and cost-per-click price, you might be presented with bid suggestions. Bidding within the suggested range increases your ad's competitiveness in auctions, making it more likely that your ad will be displayed.

Bidding in the suggested range doesn't guarantee winning bids. The best way to determine whether your bids are appropriately priced is to experiment with different bid amounts and [monitor the results](https://shopify.dev/docs/apps/launch/marketing/advertising/check-ad-performance).

Bid suggestions take into account your app's current [relevance score](#relevance) when applicable. If there’s not enough data to make a suggestion, then a default bid is shown. The absence of a suggested bid or bid range means that your app's relevance score is too low to be competitive in an auction.

***

## Relevance

Shopify calculates a contextual relevance score for your app, based on a range of factors. These factors can include your app's click-through rate, search performance, and whether it’s available for the merchant to install.

In general, apps with higher relevance are [more likely to win auctions](https://shopify.dev/docs/apps/launch/marketing/advertising#pricing), and to win with lower bid prices. If an app's relevance score is too low, then it can't compete in auctions.

***

## Budget

Your budget is the maximum amount that you'll be charged for your ad each day. The Shopify App Store ad platform slows and stops bidding on your behalf when your total ad spend gets close to your daily budget amount.

***

## Keywords

Keywords are the foundation of [search ads](#search-ads), so it’s a good idea to spend time researching and testing keywords to make sure that you'll get the best results. Keywords aren't used for Homepage or Category ads.

* [Choosing keywords](#choosing-keywords)
* [Keyword match types](#keyword-match-types)
* [Entering keywords](#entering-keywords)
* [Negative keywords](#negative-keywords)
* [Keyword conflicts](#keyword-conflicts)

### Choosing keywords

When choosing keywords, it's a good idea to imagine what your customers are searching for. Think about what words describe your app, or the features it provides. If you inserted your Google Analytics Tracking ID in your app listing, then you can already see the keywords that bring traffic to your app listing. To learn more, refer to [Tracking your listing traffic](https://shopify.dev/docs/apps/launch/marketing/track-listing-traffic).

You can also use the autocomplete feature on the Shopify App Store to see what popular search terms are related to any keywords you have in mind. You can use the same approach on Google or other search engines, or use the free [Google Keyword Planner Tool](https://ads.google.com/intl/en_ca/home/tools/keyword-planner/).

### Keyword recommendations

Keyword recommendations are provided to help you better identify high performing keywords. The recommendations are generated based on factors like converting organic keywords, popular sub-category and category keywords. Keyword recommendations default to exact match.

### Keyword match types

Keywords have 2 match types: broad match and exact match. It's important to understand how each type works because you'll need both of them to get the most out of your ads.

#### Broad match

Broad match is the default match type for keywords. Ads might appear for synonyms, related keywords, misspellings, and other variations. Plural and singular forms are treated the same under broad match, so you don't need to enter a plural and singular form of the same keyword.

Broad match is effective for discovering keywords. For example, if you add the broad match keyword "email," then your ad might appear for the search term "email campaigns." Or if you had "image filter" as a broad match keyword, then you can also match on the search term "image edit" because both terms contain the word "image."

#### Exact match

Exact match keywords require the search term to be exactly equivalent to your keyword. However, exact matches are case-insensitive. For example, `Email` and `email` are treated as the same keyword.

Exact match keywords are enclosed in square brackets. For example, `[edit product photo]`. When adding keywords, you can enter a keyword in brackets and the match type will automatically be exact.

#### Entering keywords

* You can add up to 100 keywords for each ad.
* Enter the keyword you want to add, or paste keywords separated by commas.
* Use `[ ]` to bracket your keywords if you want them to be exact matches.
* You can enter broad and exact matches in the same comma-separated list.

### Negative keywords

Negative keywords are search terms that you don't want to point to your ad. After you enter negative keywords, your ad won't be shown for any searches that contain those keywords. This can help you to avoid bidding on search terms that don't convert for your app.

There are a few different reasons to use negative keywords:

* Blocking keywords that convert at a cost that's too high for your budget

* Preventing merchants from installing your app when it doesn't offer features that they're looking for

* Excluding keywords that aren't relevant for your app

  For example, suppose that you create an app that reduces the file size for images on merchants' stores. Your ad appears on searches for "photo compression" because this is your app's main feature. But it's possible your ad appears also for a similar term like "photo filters" if you have keywords that broadly match on the word "photo." This isn't a great result, because your app doesn't include filters. To avoid this behavior, you can add "filter" as a broad match negative keyword in your ad, so that any search term with the word "filter" won’t trigger your ad to bid for the keyword.

  Negative keywords also have 2 match types: broad match and exact match. They work the same way as keyword targeting, except that they prevent your ad from bidding on search terms that match the negative keywords that you've entered.

#### Add search terms as negative keywords

To add multiple search terms as negative keywords:

1. From your Partner Dashboard, click **Apps > Ads**.
2. Click the name of the ad.
3. Click the **Search terms** tab.
4. Select the search terms you want to add as negatives.
5. Click **Actions** > **Add as negative keywords**.

#### Keyword conflicts

When you choose keywords, make sure that your keywords and negative keywords don't conflict. Keyword conflicts can prevent your ad from being shown, even for relevant search queries.

For example, you want to target the keyword "shipping" with a broad match, but you don't want to include any search terms that contain "shipping rates". If you entered "shipping rates" as a broad match negative keyword, then you might see limited impressions for your ad because the term "shipping" is in your negative keywords. This means that any term that contains "shipping" won't trigger your ad to compete in auctions. Instead, you should use an exact match for the negative keywords "shipping rate" and "shipping rates", or just use a broad match negative keyword of "rate".

***

## Device targeting

You can target your ads based on whether merchants browsing the Shopify App Store on mobile or desktop devices. By default, ads target both device types.

When [reviewing reports](https://shopify.dev/docs/apps/launch/marketing/advertising/check-ad-performance) on your ads, you can filter by device type for insights into relative conversion rates and performance.

If for any reason Shopify can't determine the merchant's device type, they're treated as a Desktop user.

***

## Geotargeting

Select whether you want to target your ad to specific countries and regions, or target your ad to all countries and regions. We recommend targeting all countries and regions unless your app is only available in certain markets. If you select Target specific countries and regions, then you can select the countries and regions that you want to target.

If you want to target your ad to certain countries and regions, then consider creating one ad for each country or region. This lets you monitor and adjust bids and keywords for each country or region.

***

## Merchant plan-based targeting

**Note:**

BFS Plan-based targeting is exclusive to [Built for Shopify developers](https://shopify.dev/docs/apps/launch/built-for-shopify).

There are two options available for plan-based targeting:

* **Target specific [Shopify plans](https://help.shopify.com/manual/intro-to-shopify/pricing-plans/plans-features)**: Your ad will reach merchants who are logged in and using the selected Shopify plans.

* **Target all merchants**: Your ad will reach all merchants, regardless of their Shopify plan or login status.

  Campaigns can combine plan and geographic targeting. However, once you’ve added plan-based targeting to a campaign, it can be edited but not removed. For example, it’s not possible to revert to targeting **All merchants** once you've added plan-based targeting.

  When plan-targeted ads and non-targeted ads compete for the same [keywords](#keywords), the higher bid wins. To ensure your plan-targeted ads remain competitive, we recommend setting higher bids for them.

***

---


<!-- PAGE 45/53: Manage ads -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/manage-ads -->

# Manage ads on the Shopify App Store

After you [create an ad](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads), you can make changes to it from your Partner Dashboard.

***

## Editing ads

Most ad settings can be edited while the ad is running. Ad name, daily budget, device targeting, geotargeting, and [search keywords](#updating-keywords) can all be updated.

However, the app itself, its ad placement, and [plan-based ad targeting](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#merchant-plan-based-targeting) can’t be edited after the fact. To make changes to these settings, stop the campaign and create a new one.

### Updating ad settings

To edit an ad campaign's settings:

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. Click **Apps** > **App ads**.
3. In the ads index, click the campaign that you want to modify.
4. Click **Edit**.
5. Make your updates to any available settings.
6. Click **Save**.

### Updating keywords

For [search ads](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#search-ads), you can also edit your [keywords](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#keywords) directly from the campaign overview.

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. Click **Apps** > **App ads**.
3. To add new keywords, click **+ Keywords**.
4. To update a keyword cost-per-click bid, edit the amount in the **Bid per click** column, then click **Save**.
5. To update a keyword's status, use the toggles in the **Status** column to set it to **Active** or **Paused**.
6. To remove keywords from the campaign entirely, select them and click **Actions** > **Remove keywords**.

You can make bulk edits by checking more than one keyword, then selecting an option under **Actions**.

### Editing bids

You can edit your [cost-per-click bids](https://shopify.dev/docs/apps/launch/marketing/advertising#pricing) at any time. It's a good idea to [monitor ad performance](https://shopify.dev/docs/apps/launch/marketing/advertising/check-ad-performance) for each campaign to ensure you’re bidding effectively.

***

## Ad statuses

You can keep track of your ads on the **Ads** page in your Partner Dashboard. Each ad has one of the following statuses:

* **Active** - Your ad is being shown for searches on the Shopify App Store (as long as you’ve entered a winning keyword bid), and you're charged each time a merchant clicks on it.
* **Paused** - Your ad isn't being shown on the Shopify App Store and you aren't being charged.
* **On hold** - Your ad has been created, but there's a problem with the payment option: a payment option hasn't been added, there was a payment error, or your ad account has been suspended.
* **Stopped** - Your ad isn’t being shown on the Shopify App Store because it has been stopped due to a change with your app’s status. Stopped ads can’t be reactivated.
* **Archived** - Your ad is hidden from the Shopify App Store. Archived ads can be unarchived later.
* **Limited by budget** - Your ad is out of budget or almost out of budget. When your budget is low, your ads will be shown less frequently on the Shopify App Store to avoid overspending. After your budget is used up, your ad won't be shown on the Shopify App Store until you increase your budget.

***

---


<!-- PAGE 46/53: Check ad performance -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/check-ad-performance -->

# Check ad performance

You can view detailed reports for each of your search ads on the **Ads** page in your Partner Dashboard.

***

## View a report

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. Click **Apps** > **App ads**.
3. Click the ad that you want to view the report for.
4. (Optional). Filter results by placement, geography, device type, or other factors.

Ads metrics are reported in real time. Refresh any report to view the latest metrics.

***

## Report metrics

Search Ad reports include the following metrics:

| Metric | Description |
| - | - |
| Average position | The average position on the page where your ad is shown. To learn more about ad positions, refer to [Average position](#average-position). |
| Bid Per Click | The dollar amount you pay every time a merchant clicks on your ad. Your bid price per click is entered in an auction, which determines whether your ad will be shown based on the bid prices of your competitors. The higher your bid price, the more likely it is that your ad will be shown. |
| Click through rate (CTR) | The total number of clicks divided by the total number of impressions. |
| Clicks | The number of times that your ad was clicked. This excludes duplicates. One impression can result in only one click. |
| Cost per click (CPC) | The total cost divided by the number of times your ad was clicked. |
| Cost per install | The total cost divided by the number of times your app was installed as attributed to the ad. |
| Conversion rate | The number of paying installs divided by the total number of installs on your ad. |
| Customer acquisition cost | The total ad spend divided by the number of customers acquired. |
| Customers | The total installs that resulted in an app purchase after clicking your ad. Customers are attributed to search terms or homepage ads using a 30 day last click attribution basis. Customers are reported using the date of impression. Customers are available for impressions served on or after May 5, 2020. |
| Devices | The device types on which your ads were displayed, either desktop or mobile. |
| Daily budget | The amount that you spend on the ad per day while it's active. |
| Impressions | The number of times that your ad was shown. Impressions are not unique to a viewer. This means that if someone searches or visits the homepage twice in a row and your ad appears twice, then 2 impressions are counted for the ad. |
| Installs | The number of installs attributed to your ad, based on a 30 day post-click attribution. |
| Install rate | The number of installs divided by the total number of clicks on your ad. You can compare various ads' install rates independent of their click through rate performance. |
| Match type | Whether a search keyword uses broad or exact matching. To learn more, refer to [Keyword match types](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#keyword-match-types). |
| Relevance | A measure of how relevant the keyword is to the search ad. Ads are more likely to appear in searches for keywords with higher relevance. Ads are less likely to appear in searches for keywords with low relevance, and might not appear in searches at all. |
| Return on ad spend | The total customer revenue divided by the total spend. |
| Revenue | The total customer revenue received from your ad. Revenue is the total amount paid by the merchant and not adjusted for revenue share. Revenue is reported on the [impression date](https://shopify.dev/docs/apps/launch/marketing/advertising/faq#customer-and-revenue-attribution). Revenue is available for impressions served on or after May 5, 2020. |
| Spend | The charges incurred from clicks to your ad. |
| Visibility | The percentage of impressions in which your ad appeared on the first search results page or homepage. This is a percentage of first page auctions in which your ad has participated. For example, 50% visibility means that your ad showed up on the first page for 50% of first page auctions in which it participated. An ad's visibility can be affected by factors such as overlapping bids on search terms or low relevance. Visibility is available for impressions served on or after March 11, 2020. |

***

## How clicks are counted

In some cases, the way that clicks are processed can cause a given report for a period of time to change. This can happen in the following cases:

* Shopify has identified clicks from bots, which weren't filtered before. These clicks are removed retroactively, and the cost is credited back to advertisers.
* An impression occurs, but the click takes place after the data processing window for clicks has closed. This click and its spend will be considered a click at the time of the impression event for reporting purposes.

For billing purposes, the click is billed for the cycle in which it occurs. This means that if an impression occurs in one billing cycle but the click occurs in the next billing cycle, then the click is billed in the later billing cycle.

***

## How installs are counted for ads

App Store ads use a 30-day post-click conversion attribution window. This means that an install is counted as an install for the ad only if the merchant installed your app within 30 days of clicking on your ad. In many cases, the merchant installs your app on the same day that they clicked your ad, but in some cases they install it later.

***

## Average position

Average position measures the overall placement of your ad in the available inventory. Placement varies by [ad type](https://shopify.dev/docs/apps/launch/marketing/advertising#available-ad-types) and [device](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads#device-targeting).

Ad positions start with the most visually prominent, numbered **Position 1**, and count up. The lower the number, the more prominent the placement. Positions are numbered from left to right, then top to bottom, then first page to last page.

***

## Report types

### Campaign performance summary

To view overall campaign performance, navigate to the **Ads** page in your Partner Dashboard. You can export a summary of all your campaigns showing aggregated metrics including impressions, clicks, installs, spend, customers, and revenue. This report helps you compare performance across multiple campaigns.

### Campaign performance timeseries

View your campaign metrics broken down by day to identify trends and patterns. This report shows the same metrics as the summary but provides daily granularity, helping you understand how performance changes over time. You can export this data for a single campaign or across all campaigns.

### Keyword report

To view the keyword report, click an ad from the **Ads** page in your Partner Dashboard. From there, you can sort the data in each column to analyze the performance of individual keywords.

For example, you can sort by cost per install to find the keywords that are costing you the most.

If certain keywords are consistently costing more than others, then you might choose to pause those keywords. You might also discover high-performing keywords that have a relatively low amount in the **Cost per install** column. For those keywords, you might want to increase your bid so that you can increase your ad's impressions.

You can also export **keywords by target** to see how keyword performance varies across different countries, shop plans, or device types.

### Negative keywords report

Export your list of negative keywords to review which search terms you're excluding from your campaigns. Negative keywords prevent your ads from showing for irrelevant searches, which helps improve your return on ad spend.

### Search term report

You can use the **Search term** report to optimize your ad by finding out exactly what search terms merchants are using when they see your ad. This report lets you review the search terms that matched your keywords, which can help you find new keywords to target. It can also help you find the search terms that you don't want to target, which helps you better define your list of negative keywords.

The **search terms by target** report provides the same information broken down by country, shop plan, or device type, helping you understand how search activity varies across different merchant segments.

### Targeting breakdown reports

These reports let you review your ad performance broken down by your targeting criteria:

* **Country or region**: Performance by geographic location
* **Shop plan**: Performance across different Shopify plan tiers (Trial, Retail, Basic, Grow, Advanced, Plus)
* **Device type**: Performance on desktop versus mobile devices

You can view targeting breakdowns for campaign-level metrics, keyword-level metrics, and search term metrics.

***

---


<!-- PAGE 47/53: Ad billing -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/ad-billing -->

# About ad billing

Each time someone clicks on one of your ads, a charge is added to your balance. You get billed for the charges from App Store ads either every 30 days or when your balance across all ad campaigns exceeds $100. Your bill will be in US dollars.

To pay your bill, you can use a valid credit card from Visa, Mastercard, or American Express. You can't use a prepaid credit card. If there is a problem with charging your credit card, then your ads will be put on hold until the problem is resolved.

***

## Reviewing invoices for App Store ads

To view invoices for App Store ads, go to **Settings** > **Ad billing** in your Partner Dashboard. Each invoice includes all ads that incurred charges during the period of the invoice.

***

## How ads are billed

Since search ads use Cost Per Click (CPC) bidding, you're charged only when someone clicks on your ad. The amount that you're charged is always the same as the bid amount that you specified for the keyword that triggered your ad. To learn more about how CPC billing works, refer to [Pricing](https://shopify.dev/docs/apps/launch/marketing/advertising#pricing).

Clicks can sometimes be reprocessed, which can cause a report for a given period of time to be different from the last time you viewed it. This can also cause your bill for one period of time to be slightly different from a previous bill for the same period of time. There are a few different reasons why clicks are reprocessed:

* Shopify identified bot clicks that were not filtered before. These are removed retroactively, and the related charges are credited back to advertisers.
* An ad impression was followed by a click, but that click occurred after the data processing window for the current billing cycle. This click and the associated ad spend are counted at the time of the impression event, not at the time of the click. But the click will be billed in your next billing cycle, even though it's attributed to the ad impression within the previous billing cycle.

***

## Ad credits

In some cases, Shopify gives you ad credits during special promotions. When you redeem an ad credit, the credit is automatically applied towards the cost of App Store ads. You can also use your ad credit to test keywords and find an optimal bid per click for each keyword.

### Redeem an ad credit

1. Go to **Settings** > **Ad billing** to see if you're currently eligible for an ad credit.
2. Add a credit card, then click **Save**.
3. Click **Redeem credit**.

**Note:**

After all of your available ad credit has been applied to your App Store ads, Shopify starts charging ads to the credit card that you added.

After you redeem an ad credit, you'll see your remaining available credit on the **Ad billing** page in your Partner Dashboard. If your ad credit is applied during a billing cycle, then the invoice for that cycle shows the amount of ad credit that was used.

***

## Taxes

Taxes are charged automatically, depending on the business address that you specified on the **Settings** page in your Partner Dashboard. If you're located in a jurisdiction where taxes are applied to advertising purchases, then you will see the tax amount on your invoice. "Shopify Inc" is a Canada-based business entity that's used by Shopify to charge taxes.

You can include a VAT or tax number on invoices by adding it as a note under **Settings > Invoices** in your Partner Dashboard.

**Note:**

Shopify can't provide advice about taxes. If you have any questions about how taxes are applied to advertising purchases, then you should contact a local tax authority or a tax accountant.

***

---


<!-- PAGE 48/53: Ad permissions -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/permissions -->

# About Ad permissions

If you have an **Owner** account, then you can update your team members' permissions in the Partner Dashboard. When you update your team members' permissions, it changes how each member can interact with your ads on the Shopify App store.

There are three permissions related to Shopify App Store ads that you can give to a team account:

* **View financials**: View the **Ad billing** page. This permission also allows the team member on view and edit payout information on the **Settings** page.

* **View ads**: View the ad reporting dashboard.

* **Manage ads**: Create and make changes to Shopify App Store ads. This permission gives **View ads** access by default.

  For more information about managing your team's accounts, refer to the Partner documentation on [managing your team's accounts](https://help.shopify.com/partners/dashboard/account-access).

***

## Update a team member's ad permissions

1. Log in to your [Partner Dashboard](https://www.shopify.com/partners).
2. Click **Team**, and then click the name of the team member whose permissions you want to update.
3. In the **Sensitive permissions** section, select the ad permissions that you want the team member to have.
4. Click **Save**.

***

---


<!-- PAGE 49/53: Ads FAQ -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/advertising/faq -->

# Ads FAQ

As an app developer, you can [create ads](https://shopify.dev/docs/apps/launch/marketing/advertising/create-ads) to help merchants discover your apps in the Shopify App Store. Below are the most frequently asked questions about ads in the Shopify App Store.

***

## Running and displaying ads

This section covers questions about running and displaying ads on the Shopify App Store.

### Why doesn't my ad appear in search results?

There are some common reasons why your ad might not appear on a given search results page:

* Your bid for a keyword isn't high enough.
* For search ads: your app is not relevant for the keywords that you're bidding on.
* Your ad budget has been exhausted.
* The computer used to access the search results is using a VPN (virtual private network).
* The Shopify App Store is experiencing unusual traffic patterns, such as a high number of searches or homepage visits being made in a short period of time.

### If I have 2 ads but they share keywords, which one wins the auction?

They will enter the auction together, and one will be chosen based on the bid and, for search ads, the relevance to the search.

### Can I run ads in a language other than English?

Yes. Advertisers can bid on non-English keywords. If there are merchant searches for non-English keywords, then ad impressions can appear. Accents and special characters are stripped from ad impressions.

### Do ads appear for merchants who have already installed the related app?

No. If a merchant has installed your app, then they won't see an ad for it. But if a merchant has uninstalled your app, then they will be eligible to see your ad again.

### Do ads show on shops that are not compatible with my app based on the install requirements that I specified in my app listing?

No.

### Is there a minimum bid?

Yes. The system enforces a minimum bid. If your bid is below this minimum bid, then your ad will not be displayed.

### Is there a minimum budget?

Yes. The minimum budget is $5.00 per day.

### Can I run multiple ads for the same app?

Yes.

### Can my ads link to a page other than my app listing?

No. Ads link to the app listing to make sure the merchants have a consistent user experience within the Shopify App Store.

***

## Paying for ads

This section covers questions about applying ad credits and alternative methods of paying for ads.

### Can I apply my ad credit to multiple ads?

Yes. Your ad credit will be automatically applied to all of your currently running search ads.

### Will my credit card be charged if I spend only $40 out of my $100 of ad credit?

No. Shopify starts charging you for ads only after your full ad credit has been applied to search ads.

### Are there other ways to pay for ads?

No. Currently, credit card is the only supported payment method for ads.

***

## Customer and revenue attribution

### Why are my customer and revenue metrics changing for any given date over time?

You might notice customer and revenue metrics for a given date (for example, June 1, 2020) increasing over time. This is due to the following factors:

* Customer and revenue numbers are attributed to the date the impression was served.

* Business models vary; those with deferred revenue will see more of this type of post dated updating of metrics.

  For example, revenue for June 1 when you pull the numbers on July 1st might be $0 because of free trials. Revenue for June 1 when you pull the numbers October 1 might be $200 because merchants have had time to convert into paying customers, upgrade their plans, and pay the subscription fee over a few months.

  For more complete results, we recommend looking at customer and revenue numbers 60 days after the impression was served, and periodically checking on older data to see if there has been additional revenue received.

  The following sample charts illustrate a typical customer conversion rate and return on ad spend chart for a recurring revenue business over time:

#### Customer conversion chart

![Screenshot of an example customer conversion chart](https://shopify.dev/assets/assets/images/api/customer-conversion-chart-bIxn0vhl.png)

#### Return on ad spend chart

![Screenshot of an example revenue chart](https://shopify.dev/assets/assets/images/api/return-on-ad-spend-BNFzrokw.png)

### I was running an ad and earned money from a merchant upgrading their plan on X day.​Why do I see no revenue in my reports?

We credit the customer / revenue conversion to the date the ad impression was served, and not the date the merchant became a paying customer, or generated revenue. Refer to [What is impression date attribution?](#what-is-impression-date-attribution).

### What is impression date attribution?

Impression date attribution is when we credit the customer / revenue conversion to the date the ad impression was served, and not the date the merchant became a paying customer, or generated revenue.

In the following example timeline, the date for all of the merchant's revenue charges would be tied to June 1:

| Event | Time |
| - | - |
| Merchant searches "marketing" and clicks on ad | June 1 |
| Merchant installs app | June 1 |
| Merchant upgrades and pays first app charge | June 30 |

### Why is attribution calculated using the impression date?

Attributing customer and revenue data to the impression date ensures that revenue is attributed to the activity that led to the customer conversion / revenue event. It also allows advertisers to identify both the keyword that the merchant came from, and the time that the merchant searched for the app.

With this information, advertisers can identify keywords that convert at a high rate, and any patterns in conversion dates.

### When do customer and revenue metrics stop updating?

Customer metrics stop updating when all possible merchants have converted to a paid plan. Revenue metrics stop updating when all converted merchants have stopped paying for the app.

### How are customers counted?

Customers are merchants who have installed your app and have paid for services that resulted from an ad.

### How is revenue counted?

Revenue is counted as successful charges issued by you to the merchant. The charges are attributed to an install that resulted from an ad.

### Are churned customers factored into the customers count?

No.

### Are refunds factored into the revenue number?

No.

### Does the revenue figure factor in the revenue sharing amount?

No.

### How long of a delay can there be between the install and a customer converting?

The total maximum potential delay is up to 64 days and any free trial period. The timeframes are broken down as follows:

* **Post-click install attribution window:** Up to 30 days delay
* **Merchant monthly billing cycle:** Up to 29 days delay
* **Reconciliation period by Shopify:** Up to 5 days

### What dates are customer and revenue metrics available for?

Customer and revenue metrics are available for ads that ran starting May 5, 2020.

### Why do my customer and revenue charts trend down?

That shape of chart is not necessarily a bad thing. This happens because you pay for ads up front, but do not earn revenue until after the click or install.

Refer to the questions [Why are my customer and revenue metrics changing for any given date over time?](#why-are-my-customer-and-revenue-metrics-changing-for-any-given-date-over-time) and [What is impression date attribution?](#what-is-impression-date-attribution) for why your charts might look a certain way.

### If a merchant converts to a paid plan months installing your app, then will that be counted in the customer and revenue metrics?

Yes, as long as the merchant installed your app after clicking an ad.

### If a merchant uninstalls and re-installs your app without clicking an ad, then will the revenue earned from the latest install be counted towards ad revenue?

No. Only revenue earned on the install attributed to ads is counted.

***

---


<!-- PAGE 50/53: About marketing your app -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing -->

# About marketing your app

After your app is approved, you can market your app in many ways to promote and grow your business.

* [Writing a press release for your app](https://shopify.dev/docs/apps/launch/marketing/write-press-release): Although receiving positive reviews is one of the best ways to promote your app, you can also publish press releases to help get your product noticed.
* [Shopify brand assets for marketing your app](https://shopify.dev/docs/apps/launch/marketing/shopify-brand-assets): Our brand assets and guidelines can help you showcase your presence on the Shopify App Store in your marketing materials.
* [Tracking your listing traffic](https://shopify.dev/docs/apps/launch/marketing/track-listing-traffic): You can get more information about how merchants are finding your app listing in the Shopify App Store by tracking your listing traffic with Google Analytics or Facebook Pixel.
* [Shopify App Store advertising](https://shopify.dev/docs/apps/launch/marketing/advertising): Create search ads to help merchants discover your apps in the Shopify App Store.

***

## Marketing your app externally

Listing your app in the Shopify App Store is just the first step. After your app is live, you can reach merchants through channels outside of the Shopify community to promote your app and build trust with your users.

Driving traffic to your app from outside of Shopify can help improve your app's ranking on the Shopify App Store. Also, if your app gets a significant amount of outside traffic, then your app can be listed in the **Trending apps** section on the app store's homepage.

**Note:**

If you choose to make your app have [limited visibility](https://shopify.dev/docs/apps/launch/distribution/visibility), then it won't show up in Shopify App Store search results, category pages, or the **Trending apps** list.

### Webinars

Hosting webinars is a great way to engage merchants who want to understand a particular feature or ask any questions they might have about your app. You can use webinars to show merchants new features or best practices for using your app. Webinars can also help you build documentation for your app and figure out issues and areas of growth for your app.

There are many tools that you can use to host your own webinars, including [GoToWebinar](https://www.gotomeeting.com/en-ca/webinar), [Adobe Connect](http://www.adobe.com/products/adobeconnect/apps/adobe-connectmobile.html), or [Google Hangouts](https://hangouts.google.com). You might also want to consider a service like [YouTube Live Events](https://support.google.com/youtube/answer/2474026?hl=en), which will record your webinar and save it for merchants who missed it or are looking for a video tutorial.

### Video tutorials

You can reach a larger audience of Shopify merchants by publishing video tutorials about your app. You can upload your tutorials to a service like [YouTube](https://www.youtube.com/) or [Vimeo](https://vimeo.com/) to have them indexed on search engines for specific keywords. Video sharing services will make your videos easily accessible by merchants and let you distribute your videos across other platforms.

Videos can also easily be embedded into your documentation or your social media, which can potentially be boosted for additional traffic. You can also use videos in email marketing campaigns to show off new features.

### Social media marketing

After you have created written content, recorded videos, and webinars, you should consider distributing these materials through social media.

Social Media retargeting is a popular marketing technique that can help you reach far more people than you could alone. You can use [Facebook retargeting](https://www.facebook.com/business/learn/facebook-ads-reach-existing-customers) to identify and target specific demographics of people who might be interested in your app. Facebook will allow you to create an audience that revolves around a specific target event that you want to occur. This can help you drive engagement, get exposure to your app, or see merchants interact with a specific feature in your app. You should be able to gain insights on who has been viewing your online content and specifically target your marketing efforts to those merchants.

You can use Facebook retargeting to create dedicated ads or even boost a post within your actual Facebook page to reach an audience outside of your current scope. You can choose to focus on increasing engagement, clicks to your link, or awareness.

### Email marketing

Email marketing lets you stay in touch with your merchants and keep them engaged. You can send emails about new features, or generate more traffic for your webinars. You can also let your merchants reach you directly by email, which can help increase trust and let you build relationships with your users.

Some services will let you collect email addresses from potential merchants, so you can send them more information about your app. Facebook Ads also has the ability to collect email addresses which you can import into these services as part of your email marketing initiatives.

You can use email services like [AWeber](https://www.aweber.com/) to make email marketing easier.

### Engage with online communities

Being active in external forums can help you access an audience with relevant interests and skillsets. Participating in these forums allows you to build relationships through continuous conversations, and interact with merchants who might be interested in your app. Reaching out to communities in this way can also help build trust with merchants.

Consider larger community groups like the [Shopify Community forums](https://community.shopify.com), [Shopify Blogs](https://www.shopify.com/partners/blog/topics/shopify-app-development), or [Reddit](https://www.reddit.com/), where you can actively engage with the merchant community and provide value to them and their business.

### Write a press release

See our guide on [writing a press release for your app](https://shopify.dev/docs/apps/launch/marketing/write-press-release).

***

## Promoting your app in the Shopify community

After your app goes live, you can use several methods to promote it to the Shopify community.

### Using the Shopify Community forums

You can promote yourself and your apps by creating value for merchants and other Partners in the Shopify Community forums. Being an active member in the forums and helping merchants solve issues will build trust with other members of the Shopify community. You can also suggest your app to merchants if you think it will help solve their issues. Participating in the forums can also give you ideas for improving your app, or building new apps.

**Note:**

Before using Shopify Community forums, make sure you're familiar with the [Community Code of Conduct](https://community.shopify.com/c/announcements/code-of-conduct/m-p/491969#M23). Be mindful of promoting your app, as it might be considered as spamming behavior.

### Making a Partner-friendly app

Partner-friendly apps can be installed for free by other Shopify Partners. This helps promote your app to other developers, as well as Partners who are helping merchants to set up their store. If other Partners use your app and enjoy it, then they can help promote your app to merchants.

To make your app Partner-friendly, you need to [offer free testing for development stores](https://shopify.dev/docs/apps/launch/billing/offer-free-trials).

### Making a freemium app

Freemium apps are free to download, but offer merchants in-app purchases that add extra features. Making a freemium app allows merchants to see how your app can add value to their store before they pay. The merchant can then decide to purchase your premium features. Offering a freemium app increases retention over time and increases the initial install rate. After you've shown merchants the value that your app can provide, you can consider transitioning your freemium app to a paid app.

### Improving your app listing

A successful app listing will meet the needs of both of its two main audiences: Shopify merchants and the Shopify App Store search engine. Merchants read your app listing to understand the value of your app before they decide to install it on their store. The Shopify App Store search engine parses the information in your app listing to determine when to show your app to merchants.

**Note:**

Only [fully visible](https://shopify.dev/docs/apps/launch/distribution/visibility) apps appear in Shopify App Store search results and category pages.

To learn about what kind of information you should include in your app listing, refer to [Writing a Shopify App Store listing](https://shopify.dev/docs/apps/launch/app-requirements-checklist). This guide explains how to prepare each section of your app listing so that it appeals to Shopify merchants.

To improve your app listing for the Shopify App Store search engine, you can try the following:

* Fill out as many of the fields in your app listing form as you can, including optional fields.

* Proofread your app listing to make sure that it doesn't have any grammatical errors or spelling mistakes.

* Create a short list of keywords and key phrases to focus on in your app listing. The [Google Ads Keyword Planner](https://ads.google.com/intl/en_ca/home/tools/keyword-planner/) is free to use and can help you generate ideas and suggestions. When you add keywords and key phrases to your app listing, they should flow logically with the rest of the content.

* Make sure that you don't overuse the keywords and key phrases that you choose, since this can decrease your app's discoverability in the Shopify App Store.

* Avoid using symbols in your keywords. For example, use "tshirt" instead of "t-shirt".

* Use multiple common spellings and terms to increase your search index coverage. For example, you should optimize for both "popup" and "pop up".

* Study on-page SEO to understand the basics of how search engines work, and learn how to apply them to improving your app's SEO on the Shopify App Store.

  After you make changes to your listing, you can measure their impact by tracking how many merchants install your app after reading the revised listing on the Shopify App Store. You can also [track your listing traffic with Google Analytics or Facebook pixel](https://shopify.dev/docs/apps/launch/marketing/track-listing-traffic) to see how and where merchants are finding your listing in the Shopify App Store.

### Using merchant feedback

You can add positive feedback from merchants to your marketing material to help promote your app. You can collect feedback from reviews on the Shopify App Store, or by talking to merchants directly.

Getting positive reviews in the Shopify App Store can increase your app's SEO and encourage new merchants to try your app. For more information about reviews, see our guide on [managing app reviews](https://shopify.dev/docs/apps/launch/marketing/manage-app-reviews).

**Caution:**

Never create fake reviews, or offer merchants incentives for leaving positive reviews. If you do, then you'll be [removed from the Shopify App Store](https://shopify.dev/docs/apps/launch/app-store-review/policy-violations).

### Word-of-mouth marketing

If merchants enjoy using your app, then they will be more likely to recommend your app to other merchants. You can follow our [app requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist) to improve your app and provide good service to merchants using your app.

***

## Case studies

The following case studies feature developers that have successfully marketed their apps to build awareness, attracted traffic to their Shopify App Store listing and their own web and social channels, converted traffic to installs, and built a loyal base of customers.

* **eVouch**: Learn how New Zealand-based [eVouch used the Shopify App Challenge](https://www.shopify.com/partners/blog/evouch-case-study) to design, develop and publish an app in just 8 weeks.
* **Yoast**: With years of experience in SEO, Netherlands-based [Yoast shares how they built their Shopify App](https://www.shopify.com/partners/blog/yoast) and the tactics they used to successfully launch and gain their first customers.
* **Marsello**: Australian developer [Marsello shares how they use merchant frustrations and feedback](https://www.shopify.com/partners/blog/marsello-case-study) to build and continually improve their all-in-one-marketing app.
* **Chatdesk**: New York-based [Chatdesk discuss their vision behind their software company](https://www.shopify.com/partners/blog/chatdesk-app-developer-case-study) and how they looked at solving problems as the basis for building their Shopify App.
* **Maestrooo**: France-based developer [Maestrooo outline the methods and techniques they use](https://www.shopify.com/partners/blog/shopify-plus-expert-maestrooo) to manage developing apps, themes, and client work.

***

## Connect with other developers

Share, learn, and find new opportunities with other developers around the world. Consider joining and engaging with the [.dev Community](https://community.shopify.dev).

***

---


<!-- PAGE 51/53: Write a press release -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/write-press-release -->

# Write a press release for your app

Although receiving positive reviews is one of the best ways to promote your app, you can also publish press releases to help get your product noticed.

***

## Press release guidelines

Before you distribute a press release about your app, make sure that you reach out to **<press@shopify.com>** and let us know! If you will be mentioning Shopify, then we will need to review the release and share it with our legal team.

The review process can take up to a week to complete, so we recommend reaching out with your final press release as soon as possible. If you have any questions about the process or your release, please reach out to **<press@shopify.com>** and we’ll get back to you as soon as we can.

***

## Press release template

You can follow this paragraph-by-paragraph template to write an effective press release:

***

A HEADLINE THAT IS CLEAR AND TO THE POINT

CITY, STATE, DATE - The first paragraph of your release is the most important. It should have a short summary of what you are announcing and include all critical information so that if someone only read this paragraph, they would know all major details. Typically it’s best to avoid phrasing like “excited to announce,” as that can be a bit overdone.

The second paragraph of your release can go into a bit more detail, perhaps providing background information or additional context needed.

“This is the part of your release where you should have a quote from an executive at your company. The quote should include content commenting on the significance of the announcement. The quote can provide color to the announcement that would otherwise not be included in the fact-based release.”

This paragraph, if needed, can provide even more detail or even could be a chart that goes more into the features, pricing or availability specifics.

“Here’s another place for a quote, perhaps from a partner or someone else at a different company who is commenting on the exciting nature of this announcement.”

For your last paragraph, you should include a call to action such as to visit the website for additional details.

About Your Company

You should include your boilerplate at the bottom of your release.

***

---


<!-- PAGE 52/53: Shopify brand assets -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/shopify-brand-assets -->

# Shopify brand assets for marketing your app

Shopify wants to provide Shopify app developers with the tools that they need to promote and grow their business on the Shopify App Store. To help you showcase your presence on the Shopify App Store in your marketing materials, we've created the following Shopify brand assets and guidelines for you to use in any digital display ads and digital properties (such as a website or email).

Before downloading and using the Shopify brand assets, make sure that you read and fully understand the usage guidelines below.

***

## Shopify App Store Ad Badge

Below are the two official badge assets for using the Shopify brand when you market your Shopify app:

![Both badges show the Shopify logo and the text 'Find it on the Shopify App Store'. The preferred badge shows a white logo and text on a black background. The alternative badge shows a black logo and text on a white background.](https://shopify.dev/assets/assets/images/api/getting-your-app-approved/shopify-app-badges-BpwehvX8.png)

[Download the badge assets](https://shopify.dev/zip/shopify-app-store-badges.zip)

***

## Using the Shopify App Store Ad Badge

Having all partners use a standardized ad badge helps to create consistency across the Shopify ecosystem, and helps to build merchant awareness and trust in the Shopify App Store. To keep this consistency, the asset shouldn't be altered in any way.

### Prohibited alterations

To keep consistency in how the Shopify App Store Ad Badge is used, you must never make any of the following alterations:

* Crop any part of the badge

* Stretch or squash the badge

* Rotate or tilt the badge

* Modify the colors

* Add a gradient or shadow

* Animate the badge

* Accessorize the badge or layer other images over the top of it

* Add a border or treatment around the badge

* Layer the badge over another logo or branded image

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-remove-button-parts-DDrsoB_L.png)

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-squash-or-stretch-pTepJUlF.png)

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-rotate-or-tilt-BJo8wN_4.png)

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-use-busy-backgrounds-B_tsyDBe.png)

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-add-gradients-or-shadows-BRPQNTLW.png)

  ![](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/dont-change-colors-CbwXVX5b.png)

### Minimum size and spacing

The badge looks best when it's big enough to read and has room to breathe. The badge shouldn't be smaller than 30 px in height. It should have a minimum clear space around it equal to half the height of the badge. Don't place any typography, imagery, or other graphical images inside the clear space.

![The badge has empty space outlined around it, equal to half the height of the badge itself.](https://shopify.dev/assets/assets/images/api/getting-your-app-approved/size-and-spacing-CDfru1Yn.png)

***

## Usage guidelines

The use of the Shopify App Store Ad Badge (the "Badge") is subject to our [Trademark Usage Guidelines](https://www.shopify.com/press/brand). Use of the Badge must be explicitly authorized by Shopify in writing. For Developers who are part of the Shopify Partner Program, this authorization is provided in Part A, Section 5.2 of the [Shopify Partner Program Agreement](https://www.shopify.ca/partners/terms#part-a). Where used on a web page, the Badge should include embedded hyperlinks to your app listing page on the Shopify App Store.

***

---


<!-- PAGE 53/53: Track your listing traffic -->
<!-- SOURCE: https://shopify.dev/docs/apps/launch/marketing/track-listing-traffic -->

# Track your listing traffic

You can get more information about how merchants are finding your app listing in the Shopify App Store by tracking your listing traffic with Google Analytics or Facebook Pixel. [Optimize your listing](https://shopify.dev/docs/apps/launch/marketing#improving-your-app-listing) for both merchants and the Shopify App Store search engine, by gaining a better understanding of how merchants currently discover your app.

**Note:**

Both [full and limited visibilty](https://shopify.dev/docs/apps/launch/distribution/visibility) apps can add Google Analytics or Facebook Pixel tracking, but limited visible apps won't show up in Shopify App Store search results or category pages.

***

## Set up Google Analytics for your app listing

1. Log in to your [Partner Dashboard](https://partners.shopify.com/organizations).
2. Click **Apps**.
3. Click the name of your app.
4. Click **Distribution**.
5. Click **Create listing** or **Manage listing**, and then click the listing that you want to edit.
6. In the **Tracking information** section, next to **Google analytics code (optional)**, enter your GA4 measurement ID.
7. Click **Save**.

### Migrating from Universal Analytics to Google Analytics 4

Google Universal Analytics is being sunset in July 2023. If you previously used Universal Analytics for your app listing and you want to migrate to Google Analytics 4, then follow the [process to set up Google Analytics](#set-up-google-analytics-for-your-app-listing), but replace your UA tracking ID with your new GA4 tracking ID.

Depending on how you use Universal Analytics, you might need to perform the following additional steps:

* If you use Universal Analytics audiences, then you need to [migrate audiences to GA4](https://support.google.com/analytics/answer/11184423).
* If you use Universal Analytics to track Google Ad conversions on your app listing, then you need to [migrate conversion tracking to GA4](https://support.google.com/analytics/answer/11184423).

### Full-funnel app install attributions

To provide full details of the app installation funnel, the Shopify App Store uses [Google Analytics 4's Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4) for server-side events (like app installation). To receive these events, an app listing must be on Google Analytics 4 and have entered an API secret generated in the Google Analytics UI.

The following events are sent to Google Analytics and display in the Real-time view. However, event parameters might take up to 24 hours to propagate and need to be added as an [Event-scoped Custom Dimension](https://support.google.com/analytics/answer/10075209?hl=en#zippy=%2Ccreate-an-event-scoped-custom-dimension%2Ccreate-a-custom-metric%2Canalyze-an-event-scoped-custom-dimension).

| Event name | Parameters | Description |
| - | - | - |
| `shopify_app_install` | * `api_key`
* `shop_id`
* `shop_name`
* `shop_url` | Sent when a merchant finishes installing an app. |
| `shopify_app_ad_click` | - `api_key`
- `surface_type`
- `surface_detail` | Sent when a merchant visits an app listing from a Shopify App Store ad click. |

To generate an API secret:

1. Log into your [Google Analytics](https://analytics.google.com/analytics/web/#/).
2. Click on the **Admin** icon in the bottom left corner.
3. Click on **Data Streams** under Property settings.
4. Select the measurement stream which corresponds to the **Measurement ID** which you have added to your app listing.
5. Click on **Measurement Protocol API secrets** and click **Create** to generate a new API Secret.

To add the API secret to your app listing:

1. Log in to your [Partner Dashboard](https://partners.shopify.com/organizations).
2. Click **Apps**.
3. Click the name of your app.
4. Click **Distribution**.
5. Click **Create listing** or **Manage listing**, and then click the listing that you want to edit.
6. In the **Tracking information** section, next to **Google analytics code (optional)**, ensure you have upgraded to Google Analyitics 4.
7. Enter your API Secret.
8. Click **Save**.

### Google e-commerce events

To enhance tracking for e-commerce related interactions, the following events have been implemented:

| Event name | Parameters | Description |
| - | - | - |
| [`view_item`](https://developers.google.com/analytics/devguides/collection/ga4/reference/events?sjid=2649380085872637034-NC\&client_type=gtag#view_item) | * `currency`
* `value`
* `items`
* `item_id`
* `item_name`
* `price`
* `quantity` | Sent when a merchant views an app's details page |
| [`add_to_cart`](https://developers.google.com/analytics/devguides/collection/ga4/reference/events?sjid=2649380085872637034-NC\&client_type=gtag#add_to_cart) | - `currency`
- `value`
- `items`
- `item_id`
- `item_name`
- `price`
- `quantity` | Sent when a merchant clicks the **Install** button |

### Other events

You might want to track the following additional Shopify-specific events in Google Analytics. These events are triggered client-side from the Shopify App Store.

| Event name | Parameters | Description |
| - | - | - |
| `Add App button` | * `event_category`: Always returns `Shopify App Store`.
* `event_label`: The app's handle. | Sent when a app user clicks **Install** on an App Listing page. |
| `Open app button` | - `event_category`: Always returns `Shopify App Store`.
- `event_label`: The app's handle. | Sent when a app user clicks **Open** on an App Listing page. |

***

## Set up Facebook Pixel for your app listing

1. Log in to your [Partner Dashboard](https://partners.shopify.com/organizations).
2. Click **Apps**.
3. Click the name of your app.
4. Click **Distribution**.
5. Click **Create listing** or **Manage listing**, and then click the listing that you want to edit.
6. In the **E. Tracking** section, next to **3. Facebook Pixel (optional)**, enter your Facebook Pixel tracking ID.
7. Click **Save**.

### Meta Pixel events

To enhance tracking for e-commerce related interactions, the following events have been implemented:

| Event name | Parameters | Description |
| - | - | - |
| `ViewContent` | * `content_ids`
* `content_name`
* `currency`
* `value` | Sent when a merchant views an app's details page |

### Meta Pixel full-funnel app install attributions

The Shopify App Store uses [Meta's Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api) to track server-side events like app installations and provide full installation funnel details. To receive these events, your app listing needs a configured Facebook Pixel and an access token from Facebook Events Manager.

Events are sent to Meta Pixel and appear in Events Manager. Event parameters may take up to 24 hours to fully appear in Facebook's attribution reporting.

| Event name | Parameters | Description |
| - | - | - |
| `AddToCart` | * `content_ids`
* `content_name`
* `currency`
* `value` | Sent when a merchant clicks the **Install** button |
| `Purchase` | - `shop_name`
- `shop_url`
- `value`
- `currency`
- `content_ids`
- `content_type` | Sent when a merchant finishes installing an app |

To generate an access token:

1. Log into your [Facebook Events Manager](https://business.facebook.com/events_manager2/).
2. Select your pixel from the data sources.
3. Click on **Settings**.
4. Scroll down to **Conversions API**.
5. Click **Generate Access Token**.
6. Copy the generated token. It will only be shown once.

To add the access token to your app listing:

1. Log in to your [Partner Dashboard](https://partners.shopify.com/organizations).
2. Click **Apps**.
3. Click the name of your app.
4. Click **Distribution**.
5. Click **Create listing** or **Manage listing**, and then click the listing that you want to edit.
6. In the **Tracking information** section, next to **Facebook Pixel (optional)**, enter your pixel ID.
7. Enter your access token in the **Facebook Pixel Access Token** field.
8. Click **Save**.

***

## URL parameters

After you've set up Google Analytics or Facebook Pixel for your app listing, Shopify passes additional URL parameters when a merchant visits your app listing from the Shopify App Store. You can see parameters such as the following in your Google Analytics or Facebook Pixel dashboard:

![The additional parameters shown in the Google Analytics or Facebook Pixel dashboard](https://shopify.dev/assets/assets/images/api/being-successful-in-the-app-store/ga-parameters-DgoVsLAh.png)

These are noteworthy parameters which can appear in the URL and their meaning:

| Parameter | Description | Possible values |
| - | - | - |
| locale | The language that the merchant has selected in the Shopify App Store. | * `zh-CN`: Chinese (Simplified)
* `zh-TW`: Chinese (Traditional)
* `cs`: Czech
* `da`: Danish
* `nl`: Dutch
* `fi`: Finnish
* `fr`: French
* `de`: German
* `hi`: Hindi
* `it`: Italian
* `ja`: Japanese
* `ko`: Korean
* `nb`: Norwegian (Bokmal)
* `pl`: Polish
* `pt-PT`: Portuguese
* `pt-BR`: Portuguese (Brazilian)
* `es`: Spanish
* `sv`: Swedish
* `th`: Thai
* `tr`: Turkish |
| surface\_type | The type of page the merchant came from to get to your app listing. | - `home`: The home page of the Shopify App Store.
- `search`: The organic search result on the Shopify App Store.
- `search_ad`: The paid search result on the Shopify App Store.
- `category`: One of the category pages on the Shopify App Store.
- `collection`: One of the collection pages on the Shopify App Store.
- `story`: One of the story pages on the Shopify App Store.
- `partners`: One of the partner pages on the Shopify App Store.
- `app_details`: One of the app listing pages on the Shopify App Store.
- `app_group`: One of the app extension pages on the Shopify App Store. |
| surface\_detail | Details about the page that the merchant came from. | * For `home`, this is the descriptive handle of the section of the home page where the merchant found your app.
* For `search`, this is the merchant's search query.
* For `category`, this includes the titles of the category and the subcategories, joined by a hyphen.
* For `collection`, this is the title of the collection where the merchant found your app.
* For `story`, this is the descriptive handle of the section of the story page where the merchant found your app.
* For `app-details`, this is the unique handle of the app listing page where the merchant found your app. |
| surface\_inter\_position | The section on the page where the merchant found your app. | - For `home`, this is the section of the Shopify App Store home page where the merchant found your app. The sections are numbered from the top, starting with 1.
- For `search`, this is the page of search results where the merchant found your app.
- For `category`, this is the page of category results where the merchant found your app.
- For `collection`, this is the page of collection results where the merchant found your app.
- For `story`, this is the section of the story page where the merchant found your app. The sections are numbered from the top, starting with 1.
- For `app-details`, this is the section of the app listing page where the merchant found your app. The sections are numbered from the top, starting with 1. |
| surface\_intra\_position | The position within the section of the page where the merchant found your app. The positions are numbered left to right, top to bottom, starting with 1. | * For `home`, this is the position of your app within the section.
* For `search`, this is the position of your app on the results page.
* For `category`, this is the position of your app on the category page.
* For `collection`, this is the position of your app on the collection page.
* For `story`, this is the position of your app within the section.
* For `partners`, this is the position of your app on the partner page.
* For `app-details`, this is the position of your app within the section. |

***

---

