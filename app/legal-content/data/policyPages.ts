import type { PolicyPageContent } from "../types";

export const POLICY_PAGES = {
  termsOfService: {
    slug: "terms",
    title: "Terms of Service",
    eyebrow: "PrimeStyleAI legal",
    description:
      "The rules for creator pages, merchant campaigns, AI fashion content, tracked links, commissions, payouts, licensing, and use of the PrimeStyleAI platform.",
    lastUpdated: "August 10, 2026",
    effectiveDate: "August 10, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      'These Terms of Service, including the International Creator Program Agreement and Content Policy, are a legally binding agreement between BellagioUSA Inc., a California corporation doing business as PrimeStyleAI ("PrimeStyleAI," "we," "us," or "our"), and each person or entity that accesses or uses the platform ("you").',
      "Creator-specific terms apply when you join the PrimeStyleAI Creator Program. A written Campaign Order controls only for the campaign terms that it expressly changes. Mandatory local law always controls where it cannot be waived.",
    ],
    quickNotes: [
      "Creators choose which opportunities to accept, which packages to offer, and the package prices they set.",
      "Creators receive 100% of the sales commission rate agreed with the merchant; PrimeStyleAI does not take a percentage of that commission.",
      "AI visuals, paid campaigns, gifted products, affiliate links, and other material connections must be clearly disclosed.",
    ],
    sections: [
      {
        title: "1. Scope, eligibility and account rules",
        body: [
          "The platform is available only in supported countries and subject to applicable trade, payment, advertising, tax, work-authorization, and professional rules. You must be at least 18, have legal capacity to contract, and have authority to bind any business for which you accept these Terms.",
          "You must keep your legal name, public creator name, country, business and tax information, social accounts, audience metrics, and payout details accurate. You are responsible for your credentials and activity and must promptly report suspected unauthorized access.",
        ],
        items: [
          "No accounts for minors and no recognizable minor in content without all required approvals and documentation.",
          "No impersonation, duplicate accounts used to obtain benefits, fake audience metrics, or prohibited sanctions evasion.",
          "PrimeStyleAI may require identity, social-account, tax, business, or payment verification before campaigns or payouts are enabled.",
        ],
      },
      {
        title: "2. Definitions",
        items: [
          "Asset means an image, video, audio file, caption, script, look, review, post, link, or related deliverable created, uploaded, or distributed through PrimeStyleAI.",
          "Campaign Order means the electronically accepted written contract for a specific merchant-creator engagement, including services, compensation, products, dates, disclosures, generation allowance, and content rights.",
          "Creator Commission means the percentage or fixed sales commission agreed by the Creator and Merchant for qualifying attributed purchases; it is separate from a Creator Package Fee.",
          "Eligible Product means a product a participating Merchant has authorized for the relevant Creator page, Asset, campaign, or commission program.",
          "Tracked Link means a PrimeStyleAI link or tracked interaction that identifies the referring Creator, page, or Asset and can start or replace attribution.",
          "Digital Replica means a highly realistic computer-generated representation of a real person's voice or visual likeness in content in which that person did not perform or was materially altered.",
        ],
      },
      {
        title: "3. Creator pages and merchant products",
        body: [
          "PrimeStyleAI may provide a shoppable Creator page where a Creator can organize Eligible Products, build looks, publish authorized Assets, and direct shoppers through Tracked Links. The license to use Creator features is limited, revocable, nontransferable, and lasts only while the account remains eligible.",
          "Merchant product images, descriptions, trademarks, and data may be used only for authorized PrimeStyleAI content and within the shown campaign, page, and channel scope. Supplier photos and Merchant product information remain the authoritative product reference.",
        ],
        items: [
          "AI output may vary in color, shape, texture, fit, scale, placement, and detail and must not be presented as proof that a physical product was worn, fits, or performs as shown.",
          "Connecting with a Merchant, listing a product, or generating an Asset does not guarantee approval, inventory, pricing, distribution, sales, commissions, or earnings.",
        ],
      },
      {
        title: "4. Creator Starter Portfolio",
        body: [
          "Eligible early Creators may receive a one-time PrimeStyleAI-funded starter allowance of up to 10 AI try-on images and 4 AI fashion videos using Eligible Products. The dashboard will show the staged release, publication deadline, traffic requirement, measurement period, and expiration that apply.",
          "The allowance is a limited platform benefit—not cash, wages, a gift card, transferable credit, or a promise of employment. Unused capacity expires and returns to PrimeStyleAI. Duplicate accounts, artificial traffic, prohibited content, infringement, fraud, or material misuse can result in pause or revocation.",
        ],
        items: [
          "A required starter post must include the applicable Tracked Link, source label, material-connection disclosure, product notice, and a verifiable publication URL.",
          "PrimeStyleAI-funded generation can itself be a material connection and must be disclosed when it could affect how an audience evaluates the content.",
        ],
      },
      {
        title: "5. Marketplace packages and pricing",
        body: [
          "Creators decide which standardized packages to offer and set their own Creator Package Fees. PrimeStyleAI may display nonbinding recommended ranges based on verified views, engagement quality, audience geography, category fit, content quality, delivery, clicks, conversions, and sales.",
          "Before acceptance, Merchant and Creator must see the Creator Package Fee, Merchant-paid PrimeStyleAI service fee, generation allowance or charge, usage-rights add-ons, Creator Commission, taxes, and total. PrimeStyleAI does not take a percentage of the Creator Commission.",
        ],
        items: [
          "Paid advertising, boosted posts, allowlisting, whitelisting, partnership ads, raw footage, extended usage, exclusivity, rush delivery, and Digital Replica or synthetic-voice rights require separately priced terms unless expressly included in the Campaign Order.",
          "Follower count is a discovery signal, not the sole measure of price or value.",
        ],
      },
      {
        title: "6. Campaign Orders, delivery and cancellation",
        body: [
          "No sponsored campaign becomes active until the Merchant and Creator electronically accept a written Campaign Order and the approved payment provider confirms any required funding authorization. Unless a Campaign Order expressly says PrimeStyleAI is the purchaser, the Merchant is the hiring party and the Creator supplies services to that Merchant.",
          "The Campaign Order must identify the parties, services, Assets, products, platforms, fees, commission, payment due date, deadlines, review period, revisions, generation allowance, disclosures, product-supply terms, cancellation rules, and all content, likeness, territory, term, and paid-ad rights.",
          "Unless the Campaign Order states another lawful period, a Merchant has three business days after complete submission to approve or provide a specific written rejection tied to the accepted brief. If neither occurs, the Asset is accepted for payment purposes, without excusing a later-discovered legal violation or infringement.",
        ],
        items: [
          "The default Creator Package Fee due date is no later than 30 calendar days after the agreed completion condition, or earlier where mandatory law requires.",
          "Merchant-caused product delay or unavailability will be handled through rescheduling, an approved substitution, or cancellation without treating the Creator as having abandoned the campaign.",
          "Timely payment may not be conditioned on the Creator granting new rights, accepting less compensation, or providing additional deliverables after work begins.",
        ],
      },
      {
        title: "7. Content labels and advertising disclosures",
        body: [
          "Every Asset must truthfully identify how it was made—for example, Creator-recorded, Merchant-provided, AI-generated fashion visualization, AI-generated with Creator authorization, or hybrid Creator-recorded and AI-generated. A source label does not replace a disclosure that the Creator was paid, received a free or loaned product, received generation benefits, or earns commission.",
          "Material connections must be disclosed clearly, immediately, and conspicuously in the audience's language. Place the disclosure with or before the endorsement and before any truncated caption. A video endorsement should include the disclosure in the video; visual and audible endorsements should be disclosed in both forms.",
        ],
        items: [
          "Commission example: I earn a commission if you buy through this link.",
          "Paid campaign example: Ad — [Merchant] paid me to create this content.",
          "AI example: AI-generated fashion visualization. Refer to the actual product photos.",
          "Platform disclosure tools should be used where required but may not be sufficient by themselves.",
        ],
      },
      {
        title: "8. Content standards and prohibited conduct",
        body: [
          "Creators may submit only lawful, authorized, truthful, and brand-safe content. Before uploading an Asset, the Creator must own or have documented permission for every person, image, recording, script, font, location, trademark, music track, and other protected element used in every intended channel.",
        ],
        items: [
          "No infringement, counterfeits, impersonation, deceptive claims, fabricated testimonials, fake metrics, artificial traffic, self-referrals, malware, harassment, hate, doxxing, fraud, or illegal activity.",
          "No nudity, sexually explicit material, sexualized minors, or authentic or AI-generated nonconsensual intimate imagery.",
          "No recognizable real person represented by AI without specific written authorization and no material alteration beyond the authorization granted.",
          "No claim of buying, wearing, using, loving, reviewing, or personally experiencing a product unless that is true.",
          "Reports concerning infringement, unlawful content, or nonconsensual imagery may be sent to support@primestyleai.com with the appropriate subject line.",
        ],
      },
      {
        title: "9. Ownership and content licenses",
        body: [
          "Each party keeps the intellectual property it owned or controlled before a campaign. Creators retain ownership of their human-authored original content, subject to the licenses they accept. Merchants retain their product imagery, trademarks, and data. PrimeStyleAI retains its software, models, templates, workflows, databases, interfaces, and branding.",
          "Creators grant PrimeStyleAI a nonexclusive, worldwide, royalty-free operational license to host, format, display, transmit, moderate, analyze, and distribute Creator Content as reasonably necessary to operate the page, fulfill Campaign Orders, provide tracking, prevent fraud, support users, and comply with law.",
          "The standard Merchant-funded license is a nonexclusive, worldwide, 12-month organic-use license for approved campaign Assets after the agreed consideration is satisfied. Paid advertising, allowlisting, raw footage, exclusivity, use beyond 12 months, ownership transfer, voice cloning, and derivative Digital Replicas are not included by default.",
        ],
      },
      {
        title: "10. Creator likeness, digital replicas and synthetic voice",
        body: [
          "Uploading a photograph or Creator-recorded video authorizes only the ordinary hosting and formatting uses stated in these Terms. It does not authorize a new Digital Replica, voice clone, paid advertisement, unrelated endorsement, or materially altered appearance or statement.",
          "A recognizable Creator-likeness AI use requires a separate, specific authorization identifying the Creator, Merchant, Campaign Order, products, source files, type of replica, channels, territory, term, compensation, permitted edits, disclosures, paid-ad scope, and any synthetic-voice permission. Synthetic voice always requires a separate affirmative opt-in.",
        ],
        items: [
          "No perpetual, all-purpose, or unspecified likeness or Digital Replica license is granted.",
          "Creators may withdraw consent for future, not-yet-generated uses, subject to completed Campaign Orders and mandatory law.",
          "Paid use of a Creator's identity must stop when the specific authorized scope or term ends.",
        ],
      },
      {
        title: "11. Digital models and Merchant-provided content",
        body: [
          "PrimeStyleAI may offer fully synthetic fashion models that are separate from Creators and are not influencer endorsements. A synthetic model may present authorized product information but may not claim personal product experience. Synthetic content must carry the applicable AI and product-visualization label.",
          "A Merchant uploading an Asset warrants that it has the rights required for the chosen uses. A Creator may feature a Merchant-provided Asset only by affirmative choice; doing so does not make the Creator its producer, owner, or personal endorser.",
        ],
      },
      {
        title: "12. Shopping Network distribution and data access",
        body: [
          "Creators can choose whether an Asset remains private, appears on a Merchant page, is eligible for Shopping Network discovery, or may be considered for PrimeStyleAI-owned organic social channels. Purchasing generation, a package, or a license does not guarantee editorial placement or social distribution.",
          "Ranking and recommendation signals may include shopper and product relevance, category and location, inventory, freshness, content quality, verified engagement, conversion, Merchant connection, Creator reliability, rights clearance, disclosure compliance, safety, and fraud signals. Paid placement affects ranking only when offered and clearly labeled as paid or sponsored.",
          "Creators can access the profile, Campaign Orders, package terms, content status, tracked clicks, attributed orders, commission status, and analytics PrimeStyleAI makes available. Merchants may receive campaign-specific performance and sales information needed to manage the relationship.",
        ],
      },
      {
        title: "13. Sales attribution and Creator commissions",
        body: [
          "Creator Commission equals Commissionable Net Product Revenue multiplied by the agreed Creator Commission rate. It is calculated separately for each eligible order line. Sales tax, shipping, discounts, canceled quantities, refunds, returns, chargebacks, and stated exclusions are not Commissionable Net Product Revenue.",
          "Unless a Campaign Order or Merchant program clearly states another window before the click, the default referral window is seven days from the most recent qualifying Tracked Link interaction. After the first qualifying purchase, attribution remains open for a 24-hour grace period for additional eligible purchases from the same promoted journey.",
          "When a shopper enters through another Creator's new valid Tracked Link, prior active attribution ends and the new Creator's attribution starts prospectively. Completed purchases are not reassigned.",
        ],
        items: [
          "Creators receive 100% of the Creator Commission rate agreed with the Merchant; lawful tax withholding, returns, chargebacks, and error corrections are not a PrimeStyleAI commission share.",
          "Pending commissions become approved after fulfillment and the applicable cancellation, return, fraud, and chargeback period ends.",
          "A partial return reverses only the affected order-line commission.",
          "Attribution disputes should be reported within 30 days after the relevant order or adjustment first appears, unless applicable law allows more time.",
        ],
      },
      {
        title: "14. Creator fees, payouts and taxes",
        body: [
          "Marketplace payments and Creator payouts may be handled by a third-party payment provider under its verification, clearance, and availability terms. PrimeStyleAI is not a bank, money transmitter, or escrow company merely because it sends payment instructions.",
          "The Creator is entitled to the displayed Creator Package Fee after completing the accepted Campaign Order, plus approved Creator Commissions. Merchant service fees or Merchant processing charges are not deducted from the displayed Creator Package Fee unless a separate Creator-side charge was clearly disclosed and accepted before the campaign.",
          "Each party is responsible for its own taxes. Creators must provide accurate tax, invoice, identity, business, and payout information and are responsible for any registrations, VAT/GST, social insurance, permits, or invoices required by their location.",
        ],
      },
      {
        title: "15. Photos, body data, privacy and security",
        body: [
          "PrimeStyleAI's Privacy Policy and any notice shown at collection govern personal data. Depending on the features used, data may include account and contact details, country and tax information, payout identifiers, social metrics, messages, campaign records, Tracked Link activity, photos, videos, entered or inferred measurements, body landmarks, fit profiles, product selections, device and log data, consent records, and support communications.",
          "Where law treats a body image, face geometry, voiceprint, landmark template, or related information as biometric, special-category, or sensitive data, PrimeStyleAI will present any required separate notice and obtain required affirmative authorization before the covered collection or generation. Accepting these Terms is not blanket consent to biometric processing or a Digital Replica.",
          "Privacy, access, deletion, correction, portability, objection, withdrawal, or restriction requests may be sent to support@primestyleai.com with the subject PRIVACY REQUEST.",
        ],
        items: [
          "PrimeStyleAI will not sell, lease, trade, or otherwise commercialize a Creator's biometric identifier or template as such.",
          "International transfers use an applicable lawful safeguard where one is required.",
          "Personal information is retained only for the disclosed purpose, active license, legal obligation, dispute, fraud-prevention, or other lawful need described in the Privacy Policy.",
        ],
      },
      {
        title: "16. Confidentiality and Merchant relationships",
        body: [
          "Nonpublic launches, pricing, briefs, unreleased Assets, credentials, customer information, and technical information identified as confidential may be used only for the campaign, protected with reasonable care, and disclosed only to people who need it and are bound by similar duties.",
          "Platform communications and Campaign Orders should be used to preserve the agreed scope, rights, and payment record. Creators may not harass Merchants, misrepresent performance, offer undisclosed incentives, divert tracked transactions through fraud, or use Merchant customer information for unrelated solicitation.",
        ],
      },
      {
        title: "17. Independent business status",
        body: [
          "The parties intend the Creator to operate an independent business, not as a PrimeStyleAI employee, agent, partner, franchisee, or joint venturer. Creators choose opportunities, packages, rates, work methods, schedule, location, and ordinary tools and may work for others, subject to accepted campaign terms.",
          "The legal label does not override mandatory worker-classification law. Creators are responsible for their ordinary business, tax, insurance, permit, work-authorization, and equipment obligations unless a Campaign Order allocates a specific item differently.",
        ],
      },
      {
        title: "18. Platform role, AI limitations and no earnings guarantee",
        body: [
          "PrimeStyleAI provides technology for Creator pages, AI visualization, Merchant discovery, campaign contracting, content generation, tracking, and payment instructions. Unless a transaction expressly says otherwise, PrimeStyleAI is not the seller of Merchant products and does not control Merchant inventory, fulfillment, warranties, shipping, returns, legality, or customer service.",
          "To the maximum extent permitted by law, the platform and AI features are provided as is and as available. AI output can contain errors, distortions, inconsistencies, or third-party similarities and may not be unique, copyrightable, accepted, or an exact representation of a body or product.",
          "PrimeStyleAI does not guarantee Merchant selection, campaigns, traffic, views, followers, conversion, sales, commissions, social distribution, product availability, or any level of income. Recommendations, performance scores, fit confidence, measurements, and analytics are estimates, not promises.",
        ],
      },
      {
        title: "19. Moderation, suspension and termination",
        body: [
          "PrimeStyleAI may investigate, label, restrict generation, pause discovery, remove or reduce distribution, hold a genuinely disputed non-wage payout through the payment process, reduce campaign concurrency, suspend, or terminate an account when reasonably necessary for fraud, infringement, artificial traffic, unlawful content, repeated abandonment, disclosure failures, security risk, sanctions, payment risk, or material breach.",
          "Where required or reasonably practicable, PrimeStyleAI will provide the reason and an appeal path. Immediate action may occur to comply with law, address imminent fraud or security risk, protect a person, or prevent repeated violations.",
        ],
        items: [
          "Closing an account stops new Campaign Orders but does not cancel completed orders, earned payments, valid Merchant licenses, tax records, pending return adjustments, or unresolved disputes.",
          "Unused starter or campaign generation capacity expires or is released and has no cash value.",
        ],
      },
      {
        title: "20. Indemnification and limitation of liability",
        body: [
          "To the extent permitted by law, a Creator will defend, indemnify, and hold harmless PrimeStyleAI and its affiliates, officers, directors, and employees from third-party claims arising from Creator Content, missing rights or permissions, misleading or undisclosed endorsements, unlawful conduct, fraud, material breach, or Creator tax and business obligations.",
          "To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, exemplary, punitive, or consequential damages or lost profits, data, goodwill, or business opportunity, subject to the nonwaivable exceptions stated in the Creator Program Agreement.",
          "PrimeStyleAI's aggregate liability to a Creator arising from the Creator Program will not exceed the greater of USD $500 or the Creator Package Fees and Creator Commissions paid or payable to that Creator through PrimeStyleAI during the 12 months before the claim, except where a limitation is prohibited by law and without reducing undisputed payment obligations.",
        ],
      },
      {
        title: "21. Disputes, governing law and general terms",
        body: [
          "Before filing a non-emergency claim, a party should send written notice describing the dispute and requested relief and allow 30 days for good-faith resolution. This does not prevent timely small-claims filing, emergency injunctive relief, a government report, or action needed to preserve a legal deadline.",
          "California law governs, except where United States federal law or nonwaivable law of the Creator's country, work location, or campaign audience applies. Subject to mandatory local forums, venue for a dispute with PrimeStyleAI is the state or federal courts in Los Angeles County, California. The Creator Program Agreement does not require private arbitration.",
          "PrimeStyleAI may update these Terms prospectively. Material changes will receive durable notice with the effective date and a summary, ordinarily at least 15 days in advance unless law or an imminent security or fraud risk makes advance notice impracticable. Changes do not retroactively alter accepted Campaign Orders, activated licenses, or earned payments without agreement or legal requirement.",
        ],
        items: [
          "Mandatory local law and the country schedules shown during onboarding or in a Campaign Order apply to advertising labels, permits, payment, worker status, tax, privacy, AI labeling, content rights, and data transfers.",
          "The Privacy Policy, accepted Campaign Orders, specific AI likeness authorizations, and presented country addenda form part of the agreement for the Creator Program.",
          "Formal legal notices may be sent to support@primestyleai.com with the subject LEGAL NOTICE.",
        ],
      },
    ],
    contactTitle: "Questions about these Terms?",
    contactBody:
      "Contact BellagioUSA Inc. doing business as PrimeStyleAI in Laguna Niguel, California, USA. Use the subject LEGAL NOTICE for formal notices, PRIVACY REQUEST for privacy matters, or COPYRIGHT NOTICE for rights reports.",
    contactEmail: "support@primestyleai.com",
  },

  privacyPolicy: {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "PrimeStyleAI legal",
    description:
      "How PrimeStyleAI handles information across shopper profiles, creator pages, merchant campaigns, tracked links, payments, AI sizing, and virtual try-on services.",
    lastUpdated: "August 10, 2026",
    effectiveDate: "August 10, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      'BellagioUSA Inc., a California corporation doing business as PrimeStyleAI ("PrimeStyleAI," "we," "our," or "us"), respects your privacy and is committed to protecting your personal information.',
      'This Privacy Policy explains how PrimeStyleAI collects, uses, stores, processes, protects, and shares information when shoppers, creators, merchants, developers, and other users access our websites, applications, APIs, software development kits ("SDKs"), creator pages, campaign tools, tracked links, virtual try-on experiences, AI-powered sizing recommendations, and related services (collectively, the "Services").',
      "By creating an account, using the Services, or submitting information through the Services, you acknowledge that you have read and understood this Privacy Policy.",
    ],
    quickNotes: [
      "Shopper and creator profiles may include photographs, measurements, preferences, public content, campaign records, tracked activity, and payout information depending on the features used.",
      "Body images or related geometry receive any additional notice and authorization required by applicable law; accepting platform terms is not blanket consent to biometric processing.",
      "PrimeStyleAI does not sell personal information and does not knowingly share personal information for cross-context behavioral advertising.",
    ],
    sections: [
      {
        title: "1. Scope",
        body: ["This Privacy Policy applies to:"],
        items: [
          "PrimeStyleAI websites.",
          "PrimeStyleAI applications.",
          "PrimeStyleAI SDK integrations.",
          "PrimeStyleAI APIs.",
          "PrimeStyleAI retailer integrations.",
          "PrimeStyleAI shopper and creator profiles.",
          "PrimeStyleAI public creator pages, merchant connections, campaigns, tracked links, commissions, and payouts.",
          "PrimeStyleAI virtual try-on services.",
          "PrimeStyleAI sizing recommendation services.",
        ],
        subsections: [
          {
            title: "This Privacy Policy does not apply to",
            items: [
              "Third-party websites.",
              "Retailer privacy practices.",
              "Third-party authentication providers.",
              "Third-party services not operated by PrimeStyleAI.",
            ],
            body: ["Users should review the privacy policies of any third-party websites or services they access."],
          },
        ],
      },
      {
        title: "2. Definitions",
        subsections: [
          {
            title: "User",
            body: ["Any shopper, creator, merchant representative, developer, or other individual who creates, accesses, or uses a PrimeStyleAI account, page, integration, or profile."],
          },
          {
            title: "Retailer",
            body: ["A merchant, brand, marketplace, or website that integrates PrimeStyleAI services."],
          },
          {
            title: "User Profile",
            body: ["A PrimeStyleAI account or page containing information such as photographs, measurements, preferences, public creator details, profile settings, campaign records, and related information."],
          },
          {
            title: "Generated Output",
            body: ["AI-generated recommendations, sizing suggestions, confidence scores, virtual try-on results, or similar outputs generated by PrimeStyleAI."],
          },
          {
            title: "Personal Information",
            body: ["Information that identifies, relates to, describes, or can reasonably be associated with an individual."],
          },
        ],
      },
      {
        title: "3. Shopper and Creator Profiles",
        body: [
          "PrimeStyleAI offers shoppers reusable profiles for sizing recommendations and virtual try-on experiences across participating websites and applications.",
          "PrimeStyleAI also offers creators public or private profiles that can display authorized looks, Eligible Products, merchant relationships, tracked shopping links, and creator content. Information a creator chooses to publish can be viewed and shared by others.",
          "Users retain control of their profile information and may update or delete profile information at any time, subject to applicable legal obligations and limited backup retention periods.",
        ],
        items: [
          "Profile photographs.",
          "Body measurements.",
          "Height.",
          "Weight.",
          "Sizing preferences.",
          "Clothing fit preferences.",
          "Account information.",
          "Authentication provider information.",
          "Profile history.",
          "Public creator name, biography, country or region, social accounts, audience metrics, content, and merchant connections.",
          "Campaign, link, commission, and payout records.",
        ],
      },
      {
        title: "4. Information We Collect",
        subsections: [
          {
            title: "4.1 Information Provided by Users",
            body: ["Users may provide:"],
            items: [
              "Name.",
              "Email address.",
              "Profile photographs.",
              "Height.",
              "Weight.",
              "Body measurements.",
              "Clothing size preferences.",
              "Fit preferences.",
              "Support communications.",
              "Account settings.",
              "Legal and public creator names, country, business details, and social account information.",
              "Campaign content, messages, publication URLs, product selections, and disclosure records.",
              "Tax forms, payout details, and identity or business verification information where required.",
            ],
          },
          {
            title: "4.2 Authentication Information",
            body: [
              "Users may authenticate through Google, Apple, LinkedIn, and other supported identity providers.",
              "PrimeStyleAI may receive limited account information from these providers, including name, email address, profile image, and account identifier.",
              "PrimeStyleAI does not receive or store passwords associated with third-party authentication providers.",
            ],
          },
          {
            title: "4.3 Photographs and Uploaded Content",
            body: [
              "Users may upload photographs for body measurement estimation, sizing recommendations, virtual try-on experiences, and profile creation.",
              "PrimeStyleAI stores profile photographs to enable reusable user profiles.",
              "Photographs are used solely to provide PrimeStyleAI services and related functionality.",
            ],
            items: [
              "PrimeStyleAI does not use photographs for facial recognition.",
              "PrimeStyleAI does not use photographs for biometric identification.",
              "PrimeStyleAI does not use photographs for identity verification.",
              "PrimeStyleAI does not use photographs for surveillance.",
              "PrimeStyleAI does not use photographs for law enforcement purposes.",
            ],
          },
          {
            title: "4.4 Measurement Information",
            body: ["PrimeStyleAI may collect or generate measurements entered manually by users, estimated through PrimeStyleAI technology, or updated by users at any time."],
            items: [
              "Height.",
              "Weight.",
              "Chest measurements.",
              "Bust measurements.",
              "Waist measurements.",
              "Hip measurements.",
              "Shoulder measurements.",
              "Inseam measurements.",
              "Other body measurements relevant to apparel sizing.",
            ],
          },
          {
            title: "4.5 Automatically Collected Information",
            body: [
              "PrimeStyleAI may automatically collect IP address, browser type, device information, operating system, session information, referral URLs, Tracked Link events, clicks, attributed order events, error logs, API activity, and usage statistics.",
              "This information helps us secure the Services, prevent abuse, improve performance, troubleshoot issues, and maintain reliability.",
            ],
          },
        ],
      },
      {
        title: "5. How We Use Information",
        body: ["PrimeStyleAI may use collected information to:"],
        subsections: [
          {
            title: "Provide Services",
            items: [
              "Generate sizing recommendations.",
              "Generate confidence scores.",
              "Enable virtual try-on functionality.",
              "Operate user profiles.",
              "Authenticate users.",
              "Operate creator pages, merchant discovery, Campaign Orders, tracked links, commissions, and payout instructions.",
            ],
          },
          {
            title: "Improve Services",
            items: [
              "Improve sizing accuracy.",
              "Improve service performance.",
              "Improve reliability.",
              "Improve user experience.",
            ],
          },
          {
            title: "Security",
            items: [
              "Detect abuse.",
              "Detect fraud.",
              "Protect user accounts.",
              "Enforce policies.",
              "Monitor service integrity.",
              "Validate traffic, attribution, campaign performance, returns, chargebacks, and payout eligibility.",
            ],
          },
          {
            title: "Customer Support",
            items: [
              "Respond to inquiries.",
              "Resolve support requests.",
              "Troubleshoot technical issues.",
            ],
          },
          {
            title: "Legal Compliance",
            items: [
              "Comply with applicable laws.",
              "Enforce agreements.",
              "Protect rights and property.",
              "Respond to lawful requests.",
            ],
          },
        ],
      },
      {
        title: "6. Cross-Site Profile Usage",
        body: [
          "PrimeStyleAI profiles may be used across participating websites and applications that integrate the PrimeStyleAI Decision Engine.",
          "When users access participating retailers using their PrimeStyleAI profile, PrimeStyleAI may utilize stored profile information to generate recommended size, size confidence score, and virtual try-on functionality.",
          "Retailers receive only the outputs necessary to provide PrimeStyleAI functionality, such as recommended size and confidence score.",
        ],
        items: [
          "Retailers do not receive direct access to stored profile photographs.",
          "Retailers do not receive direct access to body measurements.",
          "Retailers do not receive direct access to height.",
          "Retailers do not receive direct access to weight.",
          "Retailers do not receive direct access to profile history.",
          "Retailers do not receive direct access to user account information maintained by PrimeStyleAI.",
        ],
      },
      {
        title: "7. Artificial Intelligence Processing",
        body: [
          "PrimeStyleAI utilizes artificial intelligence technologies to provide sizing recommendations, confidence scores, virtual try-on functionality, creator content generation, profile analysis, and related services.",
          "To provide these services, PrimeStyleAI may use proprietary technologies as well as authorized third-party infrastructure providers, including cloud-based artificial intelligence platforms.",
          "PrimeStyleAI may process user-uploaded photographs, videos, voice recordings when specifically enabled, body measurements, product images, product metadata, consent records, and profile information to provide requested PrimeStyleAI features.",
          "PrimeStyleAI does not use user photographs or profile information for advertising purposes.",
          "PrimeStyleAI does not use shopper photographs for identity verification, surveillance, or law-enforcement purposes. If a feature processes body landmarks, face geometry, a voiceprint, or other information treated as biometric or sensitive by applicable law, PrimeStyleAI will provide any required separate notice and obtain required affirmative authorization before the covered processing.",
          "PrimeStyleAI does not permit user-submitted photographs or profile information to be used for training public artificial intelligence models where prohibited by contractual or technical safeguards.",
        ],
      },
      {
        title: "8. Generated Images and Virtual Try-On Content",
        body: [
          "PrimeStyleAI may generate virtual try-on images and related outputs.",
          "Generated images may be stored using authorized cloud storage providers solely for service delivery and user access.",
          "Unless deleted sooner, generated try-on images are generally retained for up to sixty (60) days and are then automatically deleted.",
          "PrimeStyleAI reserves the right to modify retention periods for operational, legal, or security reasons.",
        ],
        items: [
          "Private shopper generations are accessible only through the authenticated experience and are not made public by PrimeStyleAI without the shopper's direction.",
          "Creator content is public only when the creator affirmatively publishes it or accepts distribution through a Creator page, merchant campaign, Shopping Network placement, or other authorized channel.",
          "Participating retailers receive only the shopper outputs needed to provide the requested service unless the user separately directs or authorizes additional sharing.",
          "Generated images may be deleted by the user at any time.",
          "Generated images may be deleted upon user request.",
        ],
      },
      {
        title: "9. Data Retention",
        body: [
          "PrimeStyleAI retains information only for as long as reasonably necessary to provide services, comply with legal obligations, resolve disputes, enforce agreements, and maintain platform security.",
        ],
        subsections: [
          {
            title: "User Profiles",
            body: ["User profiles may be retained until the user deletes the profile, the user requests deletion, PrimeStyleAI determines the account is inactive for an extended period, or retention is otherwise required by law."],
          },
          {
            title: "Profile Photographs",
            body: ["Profile photographs may be retained until the user removes them, the profile is deleted, or PrimeStyleAI receives a valid deletion request."],
          },
          {
            title: "Measurements and Preferences",
            body: ["Measurements, sizing preferences, and profile settings may be retained until deleted or modified by the user."],
          },
          {
            title: "Technical Logs",
            body: ["Security logs, API logs, and system logs may be retained for periods generally ranging from thirty (30) to one hundred eighty (180) days, unless longer retention is required for legal, security, or operational purposes."],
          },
          {
            title: "Creator and Transaction Records",
            body: ["Campaign Orders, consent records, content licenses, tracked transactions, commissions, returns, chargebacks, invoices, tax records, and payout information may be retained for the applicable contract, accounting, tax, fraud-prevention, dispute, and legal limitation periods."],
          },
        ],
      },
      {
        title: "10. User Rights and Profile Management",
        body: [
          "PrimeStyleAI provides users with meaningful control over their information.",
          "Upon deletion, PrimeStyleAI will make reasonable efforts to remove user information from active systems, subject to security requirements, backup recovery systems, fraud prevention requirements, legal obligations, and regulatory compliance obligations.",
          "Certain residual copies may remain temporarily in secure backups until normal deletion cycles occur.",
        ],
        items: [
          "Access profile information.",
          "Update profile information.",
          "Modify measurements.",
          "Replace profile photographs.",
          "Delete generated history.",
          "Delete virtual try-on history.",
          "Export available account information.",
          "Delete their account.",
          "Request deletion of stored data.",
          "Withdraw consent for future processing where consent is the legal basis, without affecting processing already lawfully completed.",
        ],
      },
      {
        title: "11. Sharing of Information",
        body: [
          "PrimeStyleAI does not sell personal information.",
          "PrimeStyleAI does not provide participating retailers with access to stored user photographs, body measurements, height, weight, user profile history, authentication credentials, or PrimeStyleAI account information.",
          "PrimeStyleAI may share campaign-specific creator information, approved content, tracked performance, attributed sales status, and payment information with the merchant or payment provider as necessary to manage an accepted campaign, calculate commission, prevent fraud, and complete payment.",
        ],
        subsections: [
          {
            title: "Service Providers",
            body: ["PrimeStyleAI may share information with authorized providers that assist in cloud hosting, data storage, security monitoring, authentication services, artificial intelligence processing, customer support, and analytics."],
          },
          {
            title: "Legal Authorities",
            body: ["PrimeStyleAI may share information where required by law, court order, subpoena, regulatory request, or to protect rights, safety, property, or security."],
          },
          {
            title: "Corporate Transactions",
            body: ["PrimeStyleAI may share information in connection with mergers, acquisitions, financing transactions, asset sales, or bankruptcy proceedings, subject to applicable confidentiality protections."],
          },
        ],
      },
      {
        title: "12. Subprocessors",
        body: [
          "PrimeStyleAI may engage subprocessors to assist in providing services.",
          "PrimeStyleAI requires subprocessors to implement reasonable safeguards designed to protect personal information.",
          "A current list of significant subprocessors may be provided upon request or through applicable enterprise agreements.",
        ],
        items: [
          "Cloud hosting providers.",
          "Identity providers.",
          "Artificial intelligence providers.",
          "Image storage providers.",
          "Monitoring providers.",
          "Security providers.",
        ],
      },
      {
        title: "13. Security",
        body: [
          "PrimeStyleAI implements administrative, technical, and organizational measures designed to protect information.",
          "No system can guarantee absolute security.",
          "Users acknowledge that no method of transmission or storage is completely secure and that PrimeStyleAI cannot guarantee absolute protection against all security incidents.",
        ],
        items: [
          "Encryption in transit.",
          "Access controls.",
          "Authentication protections.",
          "Network monitoring.",
          "Logging and auditing.",
          "Security reviews.",
          "Infrastructure protections.",
        ],
      },
      {
        title: "14. International Transfers",
        body: [
          "PrimeStyleAI is headquartered in the United States.",
          "Information may be processed, stored, or transferred in the United States, countries where PrimeStyleAI operates, and countries where authorized subprocessors operate.",
          "Where required, PrimeStyleAI will implement appropriate safeguards for international transfers, including contractual protections and other mechanisms recognized under applicable law.",
        ],
      },
      {
        title: "15. GDPR and UK GDPR Rights",
        body: [
          "Where applicable, users may have rights to access personal information, correct inaccurate information, delete personal information, restrict processing, object to processing, obtain portability of information, and withdraw consent where consent is relied upon.",
          "Depending on the processing, PrimeStyleAI may rely on contract performance, legitimate interests, legal obligations, or consent. Where required, users may also complain to their local data protection authority.",
          "Requests may be submitted using the contact information provided below.",
          "PrimeStyleAI will respond within timeframes required by applicable law.",
        ],
      },
      {
        title: "16. California Privacy Rights",
        body: [
          "Residents of California may have rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), including rights to know what personal information is collected, request deletion, request correction, and limit certain uses of information where applicable.",
          "PrimeStyleAI does not sell personal information.",
          "PrimeStyleAI does not knowingly share personal information for cross-context behavioral advertising.",
          "PrimeStyleAI will not discriminate against a user for exercising an applicable privacy right. An authorized agent may submit a request where permitted, subject to verification requirements.",
        ],
      },
      {
        title: "17. Children's Privacy",
        body: [
          "PrimeStyleAI services are not directed toward children.",
          "Users must be at least eighteen (18) years of age or the age of majority in their jurisdiction to create a PrimeStyleAI profile unless otherwise permitted by applicable law and accompanied by appropriate parental or guardian consent.",
          "PrimeStyleAI does not knowingly collect personal information from children.",
          "If PrimeStyleAI becomes aware that information has been collected from a child in violation of applicable law, reasonable efforts will be made to delete such information.",
        ],
      },
      {
        title: "18. Changes to This Privacy Policy",
        body: [
          "PrimeStyleAI may update this Privacy Policy from time to time.",
          "Changes become effective when posted.",
          "Where required by law, users may receive additional notice of material changes.",
          "Continued use of the Services after changes become effective constitutes acceptance of the revised Privacy Policy.",
        ],
      },
      {
        title: "19. Important Disclaimer",
        body: [
          "PrimeStyleAI sizing recommendations, body measurements, confidence scores, virtual try-on experiences, and related outputs are predictive estimates generated through software and artificial intelligence technologies.",
          "These outputs are intended solely to assist purchasing decisions and are not guarantees of actual garment fit, appearance, comfort, performance, satisfaction, or product suitability.",
          "Users and retailers should exercise independent judgment when making purchasing decisions.",
        ],
      },
    ],
    contactTitle: "Contact PrimeStyleAI",
    contactBody:
      "For questions, access, correction, deletion, portability, objection, consent withdrawal, privacy complaints, or security concerns, contact BellagioUSA Inc. doing business as PrimeStyleAI at support@primestyleai.com with the subject PRIVACY REQUEST. We will verify and respond within the time required by applicable law.",
    contactEmail: "support@primestyleai.com",
  },

  cookiePolicy: {
    slug: "cookie-policy",
    title: "Cookie Policy",
    eyebrow: "PrimeStyleAI legal",
    description:
      "How PrimeStyleAI uses cookies and similar technologies across primestyleai.com, applications, developer portals, dashboards, profile services, APIs, SDK-enabled experiences, and related Services.",
    lastUpdated: "June 25, 2026",
    effectiveDate: "June 25, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      "This Cookie Policy explains how PrimeStyleAI uses cookies and similar technologies across PrimeStyleAI websites, applications, developer portals, dashboards, profile services, APIs, and SDK-enabled experiences where applicable, collectively the Services.",
      "This policy should be read together with our Privacy Policy.",
    ],
    quickNotes: [
      "We use cookies to operate, secure, authenticate, and improve the Services.",
      "Cookies may support reusable PrimeStyleAI profiles and cross-site profile functionality.",
      "PrimeStyleAI does not sell personal information as defined by applicable California privacy laws.",
    ],
    sections: [
      {
        title: "1. What Are Cookies?",
        body: [
          "Cookies are small text files placed on your device when you visit a website. Cookies help websites function properly, remember preferences, improve performance, and analyze usage.",
          "We may also use similar technologies such as pixels, web beacons, local storage, SDKs, or tags. For simplicity, all of these are referred to as cookies in this policy.",
        ],
      },
      {
        title: "2. How We Use Cookies",
        body: ["PrimeStyleAI uses cookies and similar technologies to:"],
        items: [
          "Operate and secure the Services.",
          "Authenticate users.",
          "Maintain user sessions.",
          "Remember user preferences.",
          "Support PrimeStyleAI user profiles.",
          "Enable cross-site profile functionality.",
          "Improve performance and reliability.",
          "Measure feature usage and engagement.",
          "Prevent fraud, abuse, and unauthorized access.",
          "Support analytics and service improvements.",
          "Comply with legal and regulatory obligations.",
        ],
      },
      {
        title: "3. Profile and Authentication Cookies",
        body: [
          "PrimeStyleAI may use cookies and similar technologies to maintain user login sessions, authenticate user accounts, support reusable PrimeStyleAI profiles, remember profile preferences, and support cross-site profile functionality across participating websites.",
          "These cookies help provide a consistent user experience across PrimeStyleAI-powered integrations.",
        ],
      },
      {
        title: "4. Types of Cookies We Use",
        subsections: [
          {
            title: "4.1 Strictly Necessary Cookies",
            body: [
              "These cookies are essential for the website to function properly and cannot be disabled. Without these cookies, core features of the Services may not work.",
            ],
            items: ["Account login and authentication", "Security and fraud prevention", "Session management"],
          },
          {
            title: "4.2 Functional Cookies",
            body: ["These cookies allow us to remember choices you make and provide enhanced functionality."],
            items: ["Language or region preferences", "Saved user settings", "Feature personalization"],
          },
          {
            title: "4.3 Analytics & Performance Cookies",
            body: [
              "These cookies help us understand how users interact with our Services so we can improve usability and performance. Analytics data is typically aggregated and anonymized where possible.",
            ],
            items: ["Page visits and navigation patterns", "Feature usage", "Error monitoring and performance metrics"],
          },
          {
            title: "4.4 Analytics Technologies",
            body: [
              "Analytics information may include pages visited, features used, session duration, device type, browser type, performance metrics, and error reports.",
              "Where feasible, analytics data is aggregated or pseudonymized.",
            ],
            items: [
              "Pages visited.",
              "Features used.",
              "Session duration.",
              "Device type.",
              "Browser type.",
              "Performance metrics.",
              "Error reports.",
            ],
          },
        ],
      },
      {
        title: "5. Third-Party Cookies",
        body: [
          "PrimeStyleAI may use trusted third-party providers to support functionality including cloud hosting, authentication services, analytics services, security monitoring, performance monitoring, customer support tools, and artificial intelligence infrastructure.",
          "PrimeStyleAI does not control the privacy practices of third-party providers.",
        ],
      },
      {
        title: "6. Managing Cookies",
        subsections: [
          {
            title: "Browser Controls",
            body: ["Most web browsers allow you to manage cookies stored on your device."],
            items: ["View cookies stored on your device", "Delete cookies", "Block or limit cookies", "Set preferences per website"],
          },
          {
            title: "Important Notes",
            items: [
              "Disabling certain cookies may impact site functionality",
              "Some features may not work properly without cookies",
            ],
          },
          {
            title: "Consent Management",
            body: [
              "Where required by law, such as GDPR or EEA requirements, we may display a cookie banner allowing you to accept or manage cookie preferences.",
            ],
          },
        ],
      },
      {
        title: "7. Do Not Track and Global Privacy Control Signals",
        body: [
          "Some browsers offer a Do Not Track setting. At this time, PrimeStyleAI does not respond to DNT signals, as there is no consistent industry standard for compliance.",
          "Where required by applicable law, PrimeStyleAI may recognize valid Global Privacy Control (GPC) signals as requests to opt out of certain data processing activities.",
        ],
      },
      {
        title: "8. Legal Basis for EEA and UK Users",
        items: [
          "Necessary cookies are processed based on legitimate interest",
          "Non-essential cookies are processed based on consent, where required",
          "You may withdraw consent at any time through browser or cookie settings",
        ],
      },
      {
        title: "9. California Privacy Rights",
        body: [
          "California residents may have rights under the CCPA and CPRA.",
          "PrimeStyleAI does not sell personal information as defined by applicable California privacy laws.",
        ],
      },
      {
        title: "10. Cookie Retention",
        body: [
          "Different cookies may remain active for different periods, including session cookies and persistent cookies.",
        ],
      },
      {
        title: "11. Updates to This Cookie Policy",
        body: [
          "We may update this Cookie Policy periodically. Changes will be reflected by updating the Last Updated date. Continued use of the Services after changes take effect constitutes acceptance of the updated policy.",
        ],
      },
    ],
    contactTitle: "12. Contact Us",
    contactBody:
      "For questions about our use of cookies, contact PrimeStyleAI in Laguna Niguel, California, USA at support@primestyleai.com, privacy@primestyleai.com, or legal@primestyleai.com.",
    contactEmail: "support@primestyleai.com",
  },

  gdprCcpa: {
    slug: "gdpr-ccpa-compliance",
    title: "GDPR & CCPA Compliance Notice",
    eyebrow: "Privacy rights",
    description:
      "How PrimeStyleAI supports GDPR, CCPA, and CPRA rights for eligible users and California residents.",
    lastUpdated: "February 6, 2026",
    effectiveDate: "February 6, 2026",
    tone: "legal",
    intro: [
      "This GDPR & CCPA Compliance Notice explains how PrimeStyleAI complies with the General Data Protection Regulation, the California Consumer Privacy Act, and the California Privacy Rights Act.",
      "This notice supplements our Privacy Policy, Terms of Service, Cookie Policy, Refund & Cancellation Policy, and Pricing Policy.",
    ],
    quickNotes: [
      "PrimeStyleAI is the Data Controller for GDPR and CCPA/CPRA purposes.",
      "Eligible users can request access, correction, deletion, portability, or objection where applicable.",
      "PrimeStyleAI does not sell personal information as defined under CCPA.",
    ],
    sections: [
      {
        title: "1. Who This Notice Applies To",
        body: ["This notice applies to:"],
        items: [
          "Users located in the European Economic Area, United Kingdom, or Switzerland under GDPR",
          "Residents of California under CCPA and CPRA",
          "Other users where additional privacy rights apply based on location",
        ],
      },
      {
        title: "2. Data Controller Information",
        body: [
          "For purposes of GDPR and CCPA/CPRA, PrimeStyleAI is the Data Controller.",
          "Company: PrimeStyleAI. Website: primestyleai.com. Location: Laguna Niguel, California, USA.",
        ],
      },
      {
        title: "3. Categories of Personal Data We Collect",
        body: ["Depending on how you use the Services, we may collect:"],
        items: [
          "Identifiers such as name, email address, and IP address",
          "Account credentials and preferences",
          "Uploaded images for virtual try-on and outfit builder features",
          "Usage data and interaction data",
          "Device and browser information",
          "Payment-related metadata processed by third-party processors",
        ],
      },
      {
        title: "4. Purposes and Legal Bases for Processing",
        body: ["We process personal data only when permitted under GDPR, including:"],
        items: [
          "Contractual necessity to provide the Services you request",
          "Legitimate interests to operate, secure, and improve the Platform",
          "Consent where required, such as non-essential cookies or marketing",
          "Legal obligation to comply with applicable laws",
          "You may withdraw consent at any time where processing is based on consent",
        ],
      },
      {
        title: "5. Your Rights Under GDPR",
        body: ["If you are located in the EEA, UK, or Switzerland, you have the right to:"],
        items: [
          "Access your personal data",
          "Rectify inaccurate or incomplete data",
          "Request erasure, also known as the right to be forgotten",
          "Restrict processing",
          "Object to processing",
          "Data portability",
          "Withdraw consent at any time",
          "Lodge a complaint with a supervisory authority",
        ],
      },
      {
        title: "6. Your Rights Under CCPA / CPRA",
        body: ["If you are a California resident, you have the right to:"],
        items: [
          "Know what personal information we collect, use, and disclose",
          "Access your personal information",
          "Request deletion of personal information",
          "Correct inaccurate personal information",
          "Opt out of the sale or sharing of personal information, if applicable",
          "Limit the use of sensitive personal information",
          "Not be discriminated against for exercising your rights",
        ],
      },
      {
        title: "7. How to Exercise Your Rights",
        body: [
          "To exercise any privacy rights, contact Support@PrimeStyleAI.com. We may request verification of your identity before processing your request.",
        ],
      },
      {
        title: "8. Authorized Agents",
        body: [
          "California residents may designate an authorized agent to submit a request on their behalf. Proof of authorization and identity may be required.",
        ],
      },
      {
        title: "9. Data Retention",
        body: ["We retain personal data only as long as necessary to:"],
        items: ["Provide the Services", "Fulfill contractual and legal obligations", "Resolve disputes and enforce agreements"],
      },
      {
        title: "10. International Data Transfers",
        body: [
          "Your information may be transferred to and processed in countries outside your jurisdiction. We rely on appropriate safeguards such as Standard Contractual Clauses and adequacy decisions where applicable.",
        ],
      },
      {
        title: "11. Automated Decision-Making & Profiling",
        body: [
          "PrimeStyleAI uses automated systems to generate outfit visualizations and styling recommendations. These processes do not produce legal or similarly significant effects. Users may contact us to request clarification or human review where applicable.",
        ],
      },
      {
        title: "12. Security Measures",
        body: ["We implement reasonable technical and organizational safeguards, including:"],
        items: ["Encryption in transit", "Access controls", "Secure cloud infrastructure", "No system can guarantee absolute security"],
      },
      {
        title: "13. Updates to This Notice",
        body: [
          "We may update this compliance notice periodically. The Last Updated date reflects the most current version. Continued use of the Services constitutes acceptance of the updated notice.",
        ],
      },
    ],
    contactTitle: "14. Contact Information",
    contactBody: "For questions or concerns regarding GDPR or CCPA compliance, contact PrimeStyleAI in Laguna Niguel, California, USA.",
  },

  helpCenter: {
    slug: "help-center",
    title: "Help Center & FAQ",
    eyebrow: "Support center",
    description:
      "Answers to common questions about PrimeStyleAI, try-on results, subscriptions, billing, tokens, retailer purchases, and support.",
    tone: "support",
    intro: [
      "Welcome to the PrimeStyleAI Help Center. This page answers common questions about how PrimeStyleAI works, billing, tokens, try-on results, and how to get support.",
      "If you do not see your question here, our support team is happy to help.",
    ],
    quickNotes: [
      "PrimeStyleAI helps you visualize outfits before buying from retailers.",
      "We do not sell clothing or ship physical products.",
      "Support replies are typically sent within 1 to 3 business days.",
    ],
    sections: [
      {
        title: "Getting Started",
        subsections: [
          {
            title: "What is PrimeStyleAI?",
            body: [
              "PrimeStyleAI is a digital fashion decision-support platform that helps you visualize outfits and make more confident purchase decisions before buying from retailers.",
              "We do not sell clothing. All purchases are completed directly on the retailer’s website.",
            ],
          },
          {
            title: "Do I need an account to use PrimeStyleAI?",
            body: ["Yes. An account is required to access try-on features, save outfits, and manage tokens or subscriptions."],
          },
        ],
      },
      {
        title: "Try-On & Outfit Builder",
        subsections: [
          {
            title: "How does the virtual try-on work?",
            body: [
              "You upload a photo and select clothing items from supported retailer catalogs. PrimeStyleAI uses image-generation technology to create an illustrative visualization of how the outfit may look.",
              "Results are for visualization purposes only and may not perfectly reflect real-world fit or appearance.",
            ],
          },
          {
            title: "Why does the try-on not look exactly like the real product?",
            body: ["Try-on images are influenced by several factors and should be treated as illustrative rather than guaranteed."],
            items: ["Image quality", "Garment design and angles", "Technical limitations of image-generation tools"],
          },
          {
            title: "What happens if my try-on image does not generate?",
            body: ["If an image fails to generate due to a technical issue, the tokens used for that attempt will be credited back to your account."],
          },
          {
            title: "Can I edit or delete my uploaded photos?",
            body: ["Yes. You can delete uploaded photos from your account at any time."],
          },
        ],
      },
      {
        title: "Tokens & Usage",
        subsections: [
          {
            title: "What are tokens?",
            body: ["Tokens are usage credits required to generate try-on images, build outfits, or access certain premium features."],
          },
          {
            title: "Do tokens expire?",
            body: [
              "Tokens included with subscriptions typically reset each billing cycle. One-time token packs do not expire unless otherwise stated. Details are shown at purchase.",
            ],
          },
          {
            title: "Can I get a refund for unused tokens?",
            body: [
              "Tokens are non-refundable once delivered, except in cases of duplicate charges or verified technical failures. Please see our Refund & Cancellation Policy for full details.",
            ],
          },
        ],
      },
      {
        title: "Subscriptions & Billing",
        subsections: [
          {
            title: "How do subscriptions work?",
            body: [
              "Subscriptions provide ongoing access to premium features and a monthly allocation of tokens. Subscriptions renew automatically unless canceled.",
            ],
          },
          {
            title: "How do I cancel my subscription?",
            body: ["You can cancel anytime through your account settings. Your access will remain active until the end of the current billing period."],
          },
          {
            title: "Do you offer refunds for subscriptions?",
            body: [
              "Past subscription charges are generally non-refundable. In limited cases involving duplicate charges or major service issues, we may issue a refund at our discretion.",
            ],
          },
        ],
      },
      {
        title: "Retailers & Purchases",
        subsections: [
          {
            title: "Can I buy clothes directly from PrimeStyleAI?",
            body: ["No. PrimeStyleAI does not sell or ship physical products. All clothing and accessories are purchased directly from third-party retailers on their websites."],
          },
          {
            title: "Are prices shown on PrimeStyleAI final?",
            body: ["Prices shown may be estimates or currency conversions for convenience. The final price is always determined on the retailer’s website."],
          },
          {
            title: "Who handles returns or exchanges for retailer products?",
            body: ["All returns, exchanges, shipping issues, and refunds for products must be handled directly with the retailer."],
          },
        ],
      },
      {
        title: "Promotions & Free Tokens",
        subsections: [
          {
            title: "Do you offer promotional or free tokens?",
            body: ["Occasionally, we may issue promotional codes for free or discounted tokens. Codes are intended only for the recipient and may not be shared or resold."],
          },
          {
            title: "What happens if a promotional code is misused?",
            body: ["Misuse of promotional codes may result in revocation of tokens or suspension of the associated account."],
          },
        ],
      },
      {
        title: "Privacy & Security",
        subsections: [
          {
            title: "How is my data protected?",
            body: ["We use industry-standard security measures to protect your data, including encryption and access controls. Your photos are not used to train AI models without your explicit consent."],
          },
          {
            title: "Do you sell my personal information?",
            body: ["No. PrimeStyleAI does not sell personal information."],
          },
        ],
      },
      {
        title: "Support & Contact",
        subsections: [
          {
            title: "How can I contact PrimeStyleAI support?",
            body: ["For all support inquiries, please contact Support@PrimeStyleAI.com or call +1 (949) 364-4449. This is the only official support channel for PrimeStyleAI."],
          },
          {
            title: "When can I expect a response?",
            body: ["We aim to respond to all support inquiries within 1 to 3 business days."],
          },
        ],
      },
      {
        title: "Still Need Help?",
        body: ["If your question is not answered here, reach out to our support team and we will be happy to assist. PrimeStyleAI is here to help you shop with confidence."],
      },
    ],
    contactTitle: "Contact PrimeStyleAI Support",
    contactBody: "For help with your account, tokens, billing, or try-on results, contact our support team.",
  },

  pricingPolicy: {
    slug: "pricing-policy",
    title: "Pricing Policy",
    eyebrow: "Billing transparency",
    description:
      "How PrimeStyleAI pricing, plans, tokens, billing cadence, promotions, and payment processing work.",
    lastUpdated: "February 6, 2026",
    effectiveDate: "February 6, 2026",
    tone: "pricing",
    intro: [
      "This Pricing Policy explains how pricing, plans, tokens, and billing work on PrimeStyleAI, operated through primestyleai.com.",
      "This policy should be read together with our Terms of Service, Privacy Policy, Refund & Cancellation Policy, and Cookie Policy.",
    ],
    quickNotes: [
      "PrimeStyleAI provides digital services only and does not sell physical products.",
      "Subscription tokens typically reset each billing cycle unless stated otherwise.",
      "One-time token packs do not expire unless otherwise stated.",
    ],
    sections: [
      {
        title: "1. Scope of This Pricing Policy",
        body: ["This Pricing Policy applies to:"],
        items: ["Free and paid subscription plans", "One-time token packs", "Promotional offers and discounts", "Billing cadence and plan changes"],
      },
      {
        title: "2. Pricing Structure Overview",
        body: ["PrimeStyleAI offers access to its digital services through:"],
        items: ["Free Plan with limited access", "Paid Subscription Plans with monthly or annual billing", "One-Time Token Packs with non-expiring usage credits unless otherwise stated"],
      },
      {
        title: "3. Free Plan",
        body: ["The Free plan allows new users to try PrimeStyleAI with limited functionality. Typical Free Plan features may include:"],
        items: ["A limited number of one-time tokens", "Basic virtual try-on access", "Standard image quality", "Basic support"],
      },
      {
        title: "4. Subscription Plans",
        body: [
          "PrimeStyleAI offers multiple paid subscription tiers, such as Starter, Pro, and Enterprise, each providing a monthly allocation of tokens and access to enhanced features.",
        ],
        items: [
          "Subscription pricing and included features are displayed at checkout",
          "Subscriptions renew automatically unless canceled",
          "Billing may be monthly or annual, depending on the plan selected",
          "Annual plans may be offered at a discounted effective rate",
          "Each subscription includes a monthly token allowance",
          "Tokens reset each billing cycle unless otherwise stated",
          "Unused monthly subscription tokens do not roll over unless explicitly noted",
        ],
      },
      {
        title: "5. One-Time Token Packs",
        body: ["PrimeStyleAI offers optional one-time token packs that can be purchased separately from subscriptions."],
        items: [
          "One-time token packs do not expire unless otherwise stated",
          "Tokens are added to your account immediately after purchase",
          "Tokens are consumed based on usage priority defined by the Platform",
          "Token packs may include bonus tokens as part of promotional pricing",
          "Token pack pricing, sizes, and bonus structures may change at any time",
        ],
      },
      {
        title: "6. What Tokens Are Used For",
        body: ["Tokens may be required for:"],
        items: ["Virtual try-on image generation", "Outfit builder usage", "High-resolution image outputs", "Advanced styling or premium features"],
      },
      {
        title: "7. Promotional Pricing & Discounts",
        body: ["From time to time, PrimeStyleAI may offer promotional pricing, discounted plans, free or bonus token offers, and promotional codes."],
        items: [
          "Codes are non-transferable unless expressly stated",
          "Codes may be limited to specific users, plans, or timeframes",
          "Abuse, resale, or unauthorized distribution of codes may result in revocation",
          "PrimeStyleAI reserves the right to modify or terminate promotions at any time",
        ],
      },
      {
        title: "8. Billing, Taxes & Payment Processing",
        items: [
          "Payments are processed by third-party payment processors, such as Paddle",
          "The payment processor may act as Merchant of Record",
          "Applicable taxes may be added based on location and law",
          "PrimeStyleAI does not control exchange rates or processor fees",
          "All charges will be clearly disclosed before payment is completed",
        ],
      },
      {
        title: "9. Plan Changes, Upgrades & Downgrades",
        items: [
          "You may upgrade or downgrade your subscription at any time",
          "Changes typically take effect at the next billing cycle unless otherwise stated",
          "Pricing differences resulting from plan changes will be shown before confirmation",
        ],
      },
      {
        title: "10. Pricing Accuracy & Changes",
        body: ["We strive to ensure pricing information is accurate and up to date. However:"],
        items: [
          "Prices may change at any time",
          "Feature availability may vary by plan",
          "Errors or omissions may occur",
          "If a pricing error occurs, PrimeStyleAI reserves the right to correct it and cancel or adjust affected transactions in accordance with applicable law",
        ],
      },
      {
        title: "11. Relationship to Retailer Pricing",
        body: ["PrimeStyleAI does not control pricing, availability, or promotions offered by third-party retailers."],
        items: [
          "Prices shown for retailer products may be estimated or converted for convenience",
          "Final pricing is determined exclusively on the retailer’s website",
          "PrimeStyleAI is not responsible for retailer pricing changes, availability issues, or checkout terms",
        ],
      },
      {
        title: "12. Refunds & Cancellations",
        body: ["All refunds, credits, and cancellations are governed by our Refund & Cancellation Policy. Pricing alone does not guarantee eligibility for a refund."],
      },
      {
        title: "13. Changes to This Pricing Policy",
        body: ["We may update this Pricing Policy periodically. Updates will be reflected by the Last Updated date. Continued use of the Platform after changes become effective constitutes acceptance of the revised policy."],
      },
    ],
    contactTitle: "14. Contact Information",
    contactBody: "For pricing or billing questions, contact PrimeStyleAI in Laguna Niguel, California, USA.",
  },
} satisfies Record<string, PolicyPageContent>;
