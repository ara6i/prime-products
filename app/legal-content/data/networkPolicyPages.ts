import type { PolicyPageContent } from "../types";

const COMPANY_ADDRESS =
  "PrimeStyleAI Inc., 1968 S. Coast Hwy #4471, Laguna Beach, CA 92651";

export const networkTermsPolicy: PolicyPageContent = {
  slug: "terms",
  title: "Complete Terms & Participation Policy",
  eyebrow: "PrimeStyleAI Global Shopping Network · Version 1.1",
  description:
    "The public terms governing shoppers, merchants, creators, suppliers, AI shopping tools, merchant checkout, and participation in the PrimeStyleAI Global Shopping Network.",
  lastUpdated: "September 25, 2026",
  effectiveDate: "Upon publication",
  location: COMPANY_ADDRESS,
  tone: "legal",
  intro: [
    "These public terms govern access to the PrimeStyleAI Global Shopping Network and related PrimeStyleAI or MyAIFitting consumer experiences, websites, portals, applications, APIs, AI Dressing Room, AI Stylist, Outfit Builder, sizing, fit, virtual try-on, product discovery, referral, creator-commerce, merchant, supplier, and related services operated by PrimeStyleAI Inc.",
    "PrimeStyleAI is the technology, AI decision-intelligence, discovery, sizing, styling, virtual try-on, referral, and cross-merchant shopping layer. PrimeStyleAI is not the seller or merchant of record for Network merchandise. Merchandise purchases are completed at the applicable participating merchant, whose checkout terms control the final sale.",
  ],
  quickNotes: [
    "PrimeStyleAI does not complete merchandise checkout or become the seller of Network products.",
    "AI sizing, fit guidance, recommendations, and virtual try-on images are estimates or illustrations—not guarantees.",
    "A separate affirmative consent is required before a submitted body photograph is processed for photo-based sizing or virtual try-on.",
  ],
  sections: [
    {
      title: "1. Scope, company, policy hierarchy and definitions",
      body: [
        "This Policy applies according to your role. Shared provisions apply to everyone; role-specific provisions apply when you participate as a Shopper, Merchant, Creator, Affiliate, Supplier, or other business participant. A separate written agreement, order form, campaign term, data-processing addendum, or merchant-specific transaction term may supplement this Policy.",
        "For use of PrimeStyleAI technology and the Network, this Policy and any applicable PrimeStyleAI written agreement control. For a merchandise purchase completed on a participating merchant's website or application, the merchant's checkout terms, privacy notice, shipping terms, return and refund policy, warranties, and transaction terms govern that retail transaction.",
      ],
      items: [
        "Shopper means an individual using the Network for personal shopping, product discovery, sizing, styling, virtual try-on, or related consumer features.",
        "Merchant means the participating business that offers products and owns or controls the destination cart or checkout; that Merchant is the Seller for its transaction.",
        "Creator includes people or organizations using creator-commerce, styling, content, referral, affiliate, or collaboration features.",
        "Supplier includes manufacturers, wholesalers, dropship suppliers, distributors, and fulfillment suppliers supporting Merchant or Network catalogs.",
        "AI Output includes recommendations, measurement estimates, fit-confidence results, virtual try-on visualizations, style suggestions, product matches, rankings, and generated content.",
      ],
    },
    {
      title: "2. General terms, eligibility and acceptable use",
      body: [
        "You must be legally capable of entering a binding agreement to create an account or enter a business relationship. Photo-based body analysis, saved body profiles, and virtual try-on profile features are intended for users age 18 or older. Do not submit a body photograph or measurement profile of a person under 18.",
        "You must provide materially accurate information, protect your credentials, and promptly report suspected compromise to support@primestyleai.com.",
      ],
      items: [
        "Do not use the Network for unlawful, deceptive, fraudulent, abusive, harassing, infringing, or harmful purposes.",
        "Do not upload another person's image without lawful permission, impersonate a person, create deceptive deepfakes, manipulate reviews or attribution, or submit fraudulent transactions.",
        "Do not bypass security, scrape restricted data, harvest personal information, misuse APIs, reverse engineer protected technology, or interfere with availability.",
      ],
    },
    {
      title: "3. PrimeStyleAI role; Merchant checkout and seller-of-record structure",
      body: [
        "PrimeStyleAI helps Shoppers discover, compare, style, size, virtually try on, and evaluate products offered by participating Merchants. PrimeStyleAI does not take title to Network merchandise and is not the seller or merchant of record for those purchases.",
        "When a Shopper elects to purchase, the Shopper is routed or connected to the applicable Merchant's cart or checkout. The Merchant completes the sale and remains responsible for payment processing, taxes, fulfillment, delivery, product warranties, returns, refunds, chargebacks, and transaction-specific obligations.",
      ],
      items: [
        "Merchant checkout and order confirmation control final price, availability, promotions, tax, shipping, delivery, warranty, and return terms.",
        "Cart prepopulation is a convenience. PrimeStyleAI does not submit the order, accept merchandise payment, provide payment credentials, or finalize the purchase.",
        "A multi-merchant look may require separate carts, payments, shipments, returns, and customer-service contacts for each Merchant.",
      ],
    },
    {
      title: "4. Discovery, ranking, sponsored placement and AI shopping",
      body: [
        "Recommendations may consider compatibility, fit and sizing information, style preferences, budget, occasion, product attributes, availability, price, Merchant participation, historical interaction signals, and other permitted factors.",
        "Results are not guaranteed to be exhaustive or neutral. PrimeStyleAI may receive SaaS, usage, referral, affiliate, attribution, campaign, or other compensation. Sponsored or paid placements will be identified where required.",
      ],
      items: [
        "AI agents may search, compare, coordinate, and assemble products and may transmit authorized selections to a Merchant cart where supported.",
        "AI agents do not independently complete Merchant checkout, submit payment, or bind a Shopper to a merchandise purchase.",
      ],
    },
    {
      title: "5. Consumer and Shopper terms",
      body: [
        "Product descriptions, photos, materials, size charts, colors, inventory, prices, delivery estimates, and claims may be supplied by Merchants or Suppliers. PrimeStyleAI may organize or analyze that information, but the applicable Merchant remains responsible for its listing and transaction.",
        "Digital displays and AI-generated or AI-enhanced imagery may not exactly reproduce actual color, texture, scale, pattern alignment, drape, fit, body shape, or product detail. Illustrative media will be identified when there is a material risk of confusion.",
      ],
      items: [
        "Inventory, price, promotion, and availability are not guaranteed until the Merchant confirms the order.",
        "Merchandise charges, delivery, defects, cancellations, refunds, and exchanges should generally be directed to the Merchant identified at checkout or on the order confirmation.",
      ],
    },
    {
      title: "6. AI sizing, body measurement, fit guidance and virtual try-on",
      body: [
        "PrimeStyleAI may use permitted inputs such as sizing gender selection, height, weight, fit preference, a front-facing body photograph, product data, size charts, and garment attributes to estimate measurements, recommend a size, generate fit guidance, suggest products, build outfits, or create a virtual try-on image.",
        "AI sizing, measurement estimates, fit confidence, style suggestions, product matches, outfit recommendations, and virtual try-on images are probabilistic, estimated, or illustrative outputs. They do not guarantee actual fit, appearance, comfort, tailoring accuracy, return avoidance, or satisfaction.",
      ],
      items: [
        "Results can be affected by posture, camera angle, clothing, lighting, image quality, product data, fabric, grading, preferences, and model limitations.",
        "These tools are not medical devices and are not intended for identification, facial recognition, surveillance, or inference of unrelated sensitive traits.",
      ],
    },
    {
      title: "7. Photo, image-derived data, consent and retention",
      body: [
        "When you choose a photo-based feature, PrimeStyleAI may process your submitted photograph and information derived from it to estimate measurements, proportions, pose, garment placement, or other information needed for sizing, fit, styling, or virtual try-on.",
        "PrimeStyleAI requires separate affirmative consent before processing a submitted body photograph for photo-based sizing, body measurement, or persistent image-derived profile functionality. That consent is separate from acceptance of this Policy and is recorded with the applicable notice version and timestamp.",
      ],
      items: [
        "A one-time body photo not saved to a profile, and transient landmarks or geometry not needed for a saved profile, are deleted within 24 hours after successful processing or feature completion.",
        "An unsaved virtual try-on image may be retained for up to 30 days for delivery, troubleshooting, abuse prevention, and recovery.",
        "Saved profile photos, measurements, body-shape representations, and saved try-on images remain while saved; active copies are deleted as soon as reasonably practicable after deletion or closure and no later than 30 days, subject to narrow legal or security exceptions and any shorter mandatory period.",
        "PrimeStyleAI does not sell, lease, trade, or profit from a covered biometric identifier or template as such.",
      ],
    },
    {
      title: "8. Privacy",
      body: [
        "Depending on how the Network is used, PrimeStyleAI may collect account and contact information, preferences, measurements, photos, Photo-Based Data, saved looks, device and log information, Merchant referrals, creator or supplier participation information, transaction-attribution signals, consent records, and support communications.",
        "We use information to provide and secure the Services, personalize results, operate referrals, support participants, communicate, prevent fraud and abuse, comply with law, and improve the Network as described in the Privacy Policy.",
      ],
      items: [
        "PrimeStyleAI does not require or receive a Shopper's full payment-card number to complete a Merchant merchandise purchase.",
        "Private body photographs submitted for sizing or private virtual try-on are not public content and require separate permission for public promotional use.",
      ],
    },
    {
      title: "9. U.S. state privacy rights and online tracking",
      body: [
        "Depending on residence and applicable law, you may have rights to know, access, correct, delete, or obtain a portable copy of personal information; opt out of certain sale, sharing, targeted advertising, or profiling; limit certain sensitive-information uses; and appeal a denied request.",
      ],
      items: [
        "Where required, PrimeStyleAI recognizes Global Privacy Control and similar legally valid universal opt-out signals.",
        "Requests may be submitted to support@primestyleai.com. We may verify identity and authority before completing a request.",
      ],
    },
    {
      title: "10. Cookies, analytics, attribution and advertising technologies",
      body: [
        "PrimeStyleAI may use strictly necessary storage, preferences, analytics, security, attribution, and advertising technologies as disclosed through the applicable notice or consent interface.",
      ],
      items: [
        "Available choices may include browser controls, a cookie-settings interface, Your Privacy Choices, and Global Privacy Control where legally applicable.",
        "Rejecting optional technologies does not disable storage that is strictly necessary for security, requested features, or remembering privacy choices.",
      ],
    },
    {
      title: "11. Tokens, credits and promotions",
      body: [
        "Tokens and Credits are limited, non-cash digital service units for eligible PrimeStyleAI features. They are not bank deposits, stored monetary value, cryptocurrency, securities, or Merchant merchandise gift cards.",
      ],
      items: [
        "Pricing, expiration, eligible uses, promotional conditions, and reversal rules are shown with the applicable offer.",
        "Tokens are non-transferable unless PrimeStyleAI expressly permits transfer and may be corrected or reversed for error, fraud, chargeback, refund, or abuse.",
      ],
    },
    {
      title: "12. Merchant, brand and retailer participation",
      body: [
        "Merchants are independent businesses and remain responsible for listings, pricing, taxes, checkout, payment processing, fulfillment, delivery, customer service, warranties, returns, refunds, recalls, and compliance for their products and sales.",
      ],
      items: [
        "Merchants must provide accurate catalog, price, availability, policy, and identity information and maintain required rights, licenses, insurance, and product compliance.",
        "Merchant-provided product content may be displayed and processed to operate the Network, subject to the Merchant agreement and applicable rights.",
      ],
    },
    {
      title: "13. Creator, influencer and affiliate participation",
      body: [
        "Creators and Affiliates are independent participants and are not PrimeStyleAI employees merely because they use the Network. Program terms govern eligibility, campaigns, licensing, attribution, compensation, reversals, taxes, and payment timing.",
      ],
      items: [
        "Endorsements must be truthful, reflect genuine experience where claimed, and clearly disclose material connections as required by law and platform rules.",
        "AI-assisted content must not misrepresent actual product use, fit, performance, or personal experience and must be labeled where needed to avoid deception.",
      ],
    },
    {
      title: "14. Supplier and manufacturer participation",
      body: [
        "Suppliers are independent businesses that may provide merchandise, product data, wholesale supply, dropshipping, fulfillment, or return support to participating Merchants. Wholesale, dropship, payment, settlement, and fulfillment relationships follow the applicable Merchant-Supplier agreement.",
      ],
      items: [
        "Suppliers must provide authentic, lawful, safe, properly labeled, accurately described products and accurate origin, material, size, inventory, SKU, shipping, and return information.",
        "Consumer information received through the Network may be used only as needed to fulfill, deliver, return, support, prevent fraud, or comply with law—not for unrelated marketing without separate permission.",
      ],
    },
    {
      title: "15. Orders, shipping, returns, refunds and Merchant disputes",
      body: [
        "The applicable Merchant's order, shipping, cancellation, return, refund, exchange, and warranty terms govern the merchandise transaction, subject to non-waivable consumer law.",
      ],
      items: [
        "Products in one PrimeStyleAI look may be purchased, shipped, delivered, and returned separately by different Merchants.",
        "PrimeStyleAI may help route a return or support request, but that assistance does not make PrimeStyleAI the Seller or obligate it to issue a Merchant refund.",
      ],
    },
    {
      title: "16. Reviews, endorsements, user content and shared looks",
      body: [
        "Reviews must reflect genuine experiences and may not be fake, fabricated, copied, purchased, or misleading. Material incentives must be disclosed where required.",
        "If you intentionally post or share content, you retain ownership of content you own and grant PrimeStyleAI a non-exclusive license to host, format, display, distribute, and technically process it as reasonably necessary to operate, promote, and improve the Network, subject to privacy settings, campaign terms, and law.",
      ],
    },
    {
      title: "17. Intellectual property, trademarks and copyright complaints",
      body: [
        "PrimeStyleAI and its licensors own the Network software, interfaces, documentation, proprietary technology, trademarks, and protected materials. Participants may provide only material they own or are authorized to use.",
      ],
      items: [
        "Copyright and intellectual-property complaints may be sent to support@primestyleai.com with identification of the work, material, location, contact information, good-faith statement, accuracy and authority statement, and signature.",
        "PrimeStyleAI may suspend repeat infringers in appropriate circumstances.",
      ],
    },
    {
      title: "18. Product safety, prohibited products and platform abuse",
      body: [
        "The Network may not be used for counterfeit, stolen, recalled, unsafe, illegal, sanctions-restricted, infringing, or otherwise prohibited products. Objective claims about materials, origin, sustainability, certification, safety, protective performance, or health effects must be supportable.",
      ],
    },
    {
      title: "19. Security, availability, suspension and termination",
      body: [
        "PrimeStyleAI does not guarantee uninterrupted or error-free availability and may reasonably limit features or traffic to protect security and integrity. Accounts, listings, referrals, Tokens, campaigns, or participation may be suspended while investigating fraud, security, consumer harm, counterfeits, legal risk, infringement, or material breach.",
        "Termination does not automatically cancel a merchandise order already placed with a Merchant; the Merchant's terms continue to govern that purchase.",
      ],
    },
    {
      title: "20. Disclaimers, indemnification and limitation of liability",
      body: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE NETWORK, AI OUTPUTS, RECOMMENDATIONS, DIGITAL FEATURES, TOKENS, AND TECHNOLOGY ARE PROVIDED AS IS AND AS AVAILABLE. PRIMESTYLEAI DISCLAIMS IMPLIED WARRANTIES TO THE EXTENT THEY MAY LAWFULLY BE DISCLAIMED. NOTHING HERE WAIVES A RIGHT THAT APPLICABLE LAW DOES NOT ALLOW TO BE WAIVED.",
        "PrimeStyleAI does not manufacture, own, warehouse, sell, ship, or warrant participating Merchant merchandise merely because it is discovered or recommended through the Network. PrimeStyleAI does not guarantee fit, appearance, conversion, return prevention, revenue, or other outcomes.",
        "To the maximum extent permitted by law, PrimeStyleAI's aggregate liability for claims directly arising from the Network will not exceed the greater of the amount paid directly to PrimeStyleAI for the specific service during the preceding 12 months or USD $100, except where law requires a different result.",
      ],
    },
    {
      title: "21. Governing law, disputes, miscellaneous terms and contact",
      body: [
        "California law governs, excluding conflict-of-law principles, except where a Consumer's residence provides non-waivable protections. Before filing a formal claim, the parties will attempt good-faith informal resolution for at least 30 days where permitted. Unless law requires otherwise, unresolved disputes may be brought in a court with lawful jurisdiction in Orange County, California.",
        "PrimeStyleAI may update this Policy as the Network, law, or practices change and will identify a new Last Updated date. Material changes receive additional notice or renewed consent where law or contract requires it.",
      ],
      items: [
        "Policy, privacy, customer-service, accessibility, copyright, and product-safety inquiries may be sent to support@primestyleai.com.",
        COMPANY_ADDRESS,
      ],
    },
    {
      title: "22. Accessibility",
      body: [
        "PrimeStyleAI is committed to improving digital accessibility and usability, including keyboard access, readable contrast, semantic structure, meaningful alternative text, form labels, focus management, captions where appropriate, and accessible error handling.",
        "Accessibility is an ongoing process. Merchant content, third-party services, Supplier assets, AI-generated media, and external Merchant websites may not be fully controlled by PrimeStyleAI. Report a barrier to support@primestyleai.com and identify the page or feature involved.",
      ],
    },
  ],
  contactTitle: "Questions about the Network policy?",
  contactBody: `Contact ${COMPANY_ADDRESS}. The public policy ends with Section 22; internal implementation and legal-review materials are not published here.`,
  contactEmail: "support@primestyleai.com",
};

export const networkPrivacyPolicy: PolicyPageContent = {
  slug: "privacy-policy",
  title: "Privacy & Photo Data Policy",
  eyebrow: "PrimeStyleAI Global Shopping Network · Version 1.1",
  description:
    "How PrimeStyleAI collects, uses, discloses, retains, and deletes personal information, submitted photos, and image-derived data across the Network.",
  lastUpdated: "September 25, 2026",
  effectiveDate: "Upon publication",
  location: COMPANY_ADDRESS,
  tone: "legal",
  intro: [
    "This Privacy & Photo Data Policy applies to PrimeStyleAI and MyAIFitting consumer experiences, including shopping, sizing, styling, virtual try-on, Merchant referrals, creator tools, and supplier participation.",
    "Accepting general terms is not blanket consent to photo-based body processing. PrimeStyleAI presents a separate notice and obtains affirmative consent before processing a submitted body photograph for photo-based sizing, body measurement, or persistent image-derived profile functionality.",
  ],
  quickNotes: [
    "One-time photos and transient landmarks are deleted within 24 hours after successful processing or feature completion.",
    "Unsaved virtual try-on images may be retained for up to 30 days; saved data remains until the user deletes it or closes the profile.",
    "PrimeStyleAI does not sell, lease, trade, or profit from a covered biometric identifier or template as such.",
  ],
  sections: [
    {
      title: "1. Information we collect",
      items: [
        "Account, contact, profile, preference, support, and consent information.",
        "Submitted photos, entered measurements, estimated measurements, pose, landmarks, geometry, body-shape representations, sizing profiles, fit feedback, saved looks, and virtual try-on outputs when you choose those features.",
        "Product interactions, Merchant referrals, attribution signals, device, browser, log, security, approximate-location, cookie, and analytics information.",
        "Merchant, Creator, Affiliate, and Supplier application, catalog, campaign, performance, fulfillment, payment-administration, and agreement information where applicable.",
      ],
    },
    {
      title: "2. How we use information",
      items: [
        "Provide sizing, fit, styling, virtual try-on, saved-profile, product discovery, referral, and participant services.",
        "Secure the Network, prevent fraud and abuse, troubleshoot features, provide support, communicate, and comply with law.",
        "Personalize recommendations and improve the Service as disclosed at collection and permitted by law.",
        "Coordinate Merchant handoffs and transmit authorized product, size, color, quantity, and referral selections to a Merchant where supported.",
      ],
    },
    {
      title: "3. Photos, image-derived data and separate consent",
      body: [
        "A submitted photo may be processed to estimate body measurements, proportions, pose, garment placement, or other information needed for sizing, fit, styling, or virtual try-on. Depending on applicable law and technology, some image-derived data may be treated as sensitive personal information, a biometric identifier, or biometric information.",
        "Before covered processing, PrimeStyleAI presents a separate affirmative consent that is distinct from general policy acceptance and records the notice version and timestamp. The tools are not intended for facial recognition, identity authentication, surveillance, or inference of unrelated protected traits.",
      ],
    },
    {
      title: "4. Retention and deletion",
      items: [
        "One-time body photos not saved to a profile: active processing only, then deletion within 24 hours after successful processing.",
        "Transient landmarks or geometry not needed for a saved profile: shortest technically feasible period and deletion within 24 hours after feature completion.",
        "Unsaved virtual try-on images: up to 30 days for delivery, troubleshooting, abuse prevention, and recovery.",
        "Saved photos, measurements, reusable body-shape representations, and saved try-on images: retained while saved and deleted from active systems as soon as reasonably practicable after deletion or closure and no later than 30 days, subject to narrow legal or security exceptions and any shorter mandatory period.",
        "Consent records may be kept as long as reasonably necessary to demonstrate lawful consent and compliance, even after underlying photo or body data is deleted.",
      ],
    },
    {
      title: "5. How we disclose information",
      body: [
        "Information may be disclosed to service providers acting for PrimeStyleAI; participating Merchants as needed for authorized referrals or support; professional advisers; authorities where legally required; and transaction parties in a lawful business transfer.",
        "Private body photos submitted solely for sizing or private virtual try-on are not public user content and are not licensed for public marketing without separate permission. PrimeStyleAI does not require or receive a Shopper's full payment-card number to complete a Merchant merchandise purchase.",
      ],
    },
    {
      title: "6. Cookies, analytics and privacy choices",
      body: [
        "PrimeStyleAI may use strictly necessary storage, preferences, analytics, security, attribution, and advertising technologies as disclosed through the applicable notice or consent interface.",
      ],
      items: [
        "Where legally required, available controls include Cookie Settings or Your Privacy Choices and recognition of Global Privacy Control or similar valid universal opt-out signals.",
        "Browser settings may limit some technologies. Strictly necessary storage may remain active for security, requested features, and remembering privacy choices.",
      ],
    },
    {
      title: "7. Your privacy rights",
      body: [
        "Depending on your residence and applicable law, you may have rights to know, access, correct, delete, or obtain a portable copy of personal information; opt out of certain sale, sharing, targeted advertising, or profiling; limit certain sensitive-information uses; withdraw consent; and appeal a denied request.",
        "Submit a request to support@primestyleai.com. PrimeStyleAI may verify identity and authority before completing a request and will not discriminate for exercising a protected privacy right.",
      ],
    },
    {
      title: "8. Security, international transfers and contact",
      body: [
        "PrimeStyleAI uses reasonable administrative, technical, and organizational safeguards appropriate to the nature of the information. No system can guarantee absolute security. International transfers use applicable safeguards where required.",
        "Privacy questions and requests may be sent to support@primestyleai.com or mailed to the company address below.",
      ],
      items: [COMPANY_ADDRESS],
    },
  ],
  contactTitle: "Privacy or photo-data request?",
  contactBody:
    "Email support@primestyleai.com with the subject PRIVACY REQUEST. Include enough detail to identify the feature and request; do not email a body photograph or payment-card information.",
  contactEmail: "support@primestyleai.com",
};
