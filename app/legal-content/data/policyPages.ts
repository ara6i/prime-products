import type { PolicyPageContent } from "../types";

export const POLICY_PAGES = {
  termsOfService: {
    slug: "terms",
    title: "Terms of Service",
    eyebrow: "PrimeStyleAI legal",
    description:
      "Business terms for using the PrimeStyleAI API, SDK, developer portal, documentation, and related integration tools.",
    lastUpdated: "May 23, 2026",
    effectiveDate: "May 23, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      "These Terms of Service govern access to and use of the PrimeStyleAI Services.",
      "The Services are offered strictly for business use by Customers, Authorized Users, and integrations operating on Customer properties.",
    ],
    quickNotes: [
      "Outputs are simulated AI-generated representations and are not fit guarantees.",
      "Customer remains responsible for its products, sizing charts, marketing claims, and End User relationship.",
      "Customer must protect API credentials and comply with applicable law.",
    ],
    sections: [
      {
        title: "1.1 Definitions",
        items: [
          "Company, we, us, our means PrimeStyleAI.",
          "Customer means the business entity, retailer, or merchant that creates an account or is issued API credentials.",
          "Authorized User means Customer's employees or contractors authorized to access the Services.",
          "End User means Customer's customers or site/app visitors interacting with Customer's properties.",
          "Services means the PrimeStyleAI API, SDK, developer portal, documentation, and related tools.",
          "Output means AI-generated images, visualizations, or other results produced by the Services.",
          "Customer Data means data submitted by Customer or End Users through Customer, including product images and user-uploaded images.",
        ],
      },
      {
        title: "1.2 Eligibility and Authority",
        body: [
          "The Services are offered strictly for business use. By registering or using the Services, you represent and warrant that you are at least 18 years old and have authority to bind the Customer to these Terms. If you use the Services on behalf of Customer, you do so as Customer's agent, and Customer is responsible for your acts and omissions.",
        ],
      },
      {
        title: "1.3 Account Registration, Credentials, and Security",
        items: [
          "Customer is responsible for all activity under its account and credentials, including API keys.",
          "Customer must protect credentials using industry-standard practices, including access controls, secret management, and rotation.",
          "Customer must promptly notify us of any suspected unauthorized access or security incident.",
        ],
      },
      {
        title: "1.4 License and Use of the Services",
        body: [
          "Subject to these Terms and any applicable order form or pilot agreement, PrimeStyleAI grants Customer a limited, non-exclusive, non-transferable, revocable license during the applicable term to access and use the Services solely for Customer's internal business purposes and solely as integrated into Customer's owned or controlled digital properties.",
        ],
      },
      {
        title: "1.5 Acceptable Use and Prohibited Activities",
        items: [
          "No unlawful use and no use that violates privacy, consumer protection, advertising, or intellectual property laws.",
          "No reverse engineering, decompiling, scraping, or attempting to extract source code, model weights, prompts, or underlying system design.",
          "No circumvention of rate limits, access controls, or safety filters.",
          "No submission of content involving minors, explicit sexual content, or illegal, violent, or hate content.",
          "No use to create deepfakes of real persons without authorization or in a misleading manner.",
        ],
      },
      {
        title: "1.6 AI Output Disclaimer and No Sizing or Fit Guarantee",
        body: [
          "Outputs are simulated AI-generated representations. Outputs may not accurately reflect real-world garment fit, sizing, drape, color, texture, pattern alignment, lighting, or other attributes. The Services do not provide professional fitting, tailoring, medical, or biometric services. Customer remains solely responsible for product information, sizing charts, advertising claims, and all customer-facing representations.",
        ],
      },
      {
        title: "1.7 No Performance Guarantees and No Reliance",
        body: [
          "We do not guarantee any business outcome, including conversion lift, revenue impact, return reduction, or customer satisfaction. Any projections, examples, or pilot modeling are illustrative only. Customer agrees not to rely on the Services or Outputs for any purpose other than evaluation and permitted business use and assumes all risk of use.",
        ],
      },
      {
        title: "1.8 Beta Features, Availability, and Third-Party Dependencies",
        body: [
          "Some features may be labeled beta or preview and are provided as-is. Service performance may vary and may be affected by third-party infrastructure and AI providers. We may modify, suspend, or discontinue features at any time.",
        ],
      },
      {
        title: "1.9 Fees, Usage, and Taxes",
        body: [
          "Fees, if any, are governed by an order form, pilot agreement, or separate commercial agreement. Unless otherwise specified, fees are non-refundable. Customer is responsible for applicable taxes, duties, and similar governmental assessments, excluding taxes on our income.",
        ],
      },
      {
        title: "1.10 Intellectual Property and Feedback",
        items: [
          "We retain all right, title, and interest in the Services, including all software, models, algorithms, documentation, and improvements.",
          "Customer retains rights in Customer Data. Customer grants us a limited license to process Customer Data to provide the Services.",
          "If Customer provides feedback, Customer grants us a perpetual, worldwide, royalty-free license to use and incorporate feedback without obligation.",
        ],
      },
      {
        title: "1.11 Confidentiality",
        body: [
          "Each party may receive the other's Confidential Information. Each party will protect the other's Confidential Information using reasonable care and will use it only to perform under these Terms or the applicable agreement. Obligations do not apply to information that is public without breach, independently developed, or lawfully obtained from a third party.",
        ],
      },
      {
        title: "1.12 Suspension and Termination",
        items: [
          "We may suspend or terminate access immediately for violation of these Terms, suspected abuse, security risk, or legal compliance reasons.",
          "Upon termination, Customer must stop using the Services and delete stored credentials and any non-public documentation we provided, except as required for records.",
        ],
      },
      {
        title: "1.13 Disclaimer of Warranties",
        body: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES AND OUTPUTS ARE PROVIDED AS IS AND AS AVAILABLE, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ACCURACY OR RELIABILITY OF OUTPUTS.",
        ],
      },
      {
        title: "1.14 Limitation of Liability",
        body: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) IN NO EVENT WILL PRIMESTYLEAI BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST REVENUE, BUSINESS INTERRUPTION, OR LOSS OF GOODWILL; AND (B) PRIMESTYLEAI'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF (I) USD $100 OR (II) THE FEES PAID BY CUSTOMER TO PRIMESTYLEAI FOR THE SERVICES IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.",
        ],
      },
      {
        title: "1.15 Indemnification by Customer",
        body: [
          "Customer will defend, indemnify, and hold harmless PrimeStyleAI and its officers, directors, employees, and agents from and against any third-party claims, damages, liabilities, and expenses, including reasonable attorneys' fees, arising from Customer Data, Customer's products, sizing, descriptions, marketing claims, sales practices, relationship with End Users, violation of applicable law, or misuse of the Services.",
        ],
      },
      {
        title: "1.16 Compliance, Export, and Sanctions",
        body: [
          "Customer will comply with all applicable laws. Customer represents it is not subject to sanctions and will not use or permit use of the Services in violation of U.S. export controls or sanctions laws, including by providing access to restricted parties or jurisdictions.",
        ],
      },
      {
        title: "1.17 Governing Law, Arbitration, and Class Action Waiver",
        body: [
          "These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules. Any dispute arising out of or relating to these Terms or the Services shall be resolved by binding arbitration administered by the American Arbitration Association in Orange County, California, in English, before a single arbitrator.",
          "EACH PARTY WAIVES THE RIGHT TO A JURY TRIAL AND AGREES THAT CLAIMS MAY BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.",
          "Notwithstanding the foregoing, either party may seek injunctive relief to protect its Confidential Information or intellectual property.",
        ],
      },
      {
        title: "1.18 Changes to the Terms",
        body: [
          "We may update these Terms from time to time. If changes are material, we will post the updated Terms with a new Last Updated date. Continued use of the Services after changes become effective constitutes acceptance.",
        ],
      },
    ],
    contactTitle: "Contact PrimeStyleAI",
    contactBody: "For questions about these Terms, contact PrimeStyleAI in Laguna Niguel, California, USA.",
  },

  privacyPolicy: {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "PrimeStyleAI legal",
    description:
      "How PrimeStyleAI processes information in connection with its developer services, APIs, SDKs, and integrations.",
    lastUpdated: "May 23, 2026",
    effectiveDate: "May 23, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      "This Privacy Policy describes how PrimeStyleAI processes information in connection with the Services.",
      "In most cases, Customer is the data controller for End User data collected on Customer's properties, and PrimeStyleAI acts as a data processor solely to generate Outputs and operate the Services.",
    ],
    quickNotes: [
      "User-uploaded images are processed transiently for rendering and are not stored persistently by default.",
      "Customer is typically the controller for End User data collected through Customer integrations.",
      "PrimeStyleAI does not sell personal information as defined under CCPA/CPRA.",
    ],
    sections: [
      {
        title: "2.1 Data We Process",
        items: [
          "Product images and product metadata provided by Customer.",
          "User-uploaded images and associated request metadata submitted through Customer's integration, processed transiently.",
          "Technical logs and usage data, such as API calls, timestamps, error logs, IP address, and device/browser information, for security and performance.",
          "Account and billing data for Authorized Users, including name, business email, and role, as needed to operate the developer portal.",
        ],
      },
      {
        title: "2.2 How We Use Data",
        items: [
          "Provide and operate the Services, including rendering Outputs, authenticating sessions, and preventing abuse.",
          "Maintain security, rate limiting, and fraud prevention.",
          "Monitor reliability and improve performance through aggregated analytics.",
          "Comply with legal obligations and enforce our Terms.",
        ],
      },
      {
        title: "2.3 Legal Bases Under GDPR and UK GDPR",
        subsections: [
          {
            title: "Contractual Necessity, Art. 6(1)(b)",
            body: ["Customer account administration and providing the Services."],
          },
          {
            title: "Legitimate Interests, Art. 6(1)(f)",
            body: ["Security, abuse prevention, and service improvement."],
          },
          {
            title: "Legal Obligation, Art. 6(1)(c)",
            body: ["Where applicable by law."],
          },
        ],
      },
      {
        title: "2.4 Data Retention",
        body: [
          "User-uploaded images are intended to be processed transiently for rendering and are not stored persistently by default. We retain technical logs for a limited period necessary for security, troubleshooting, and compliance, typically 30 to 180 days, unless a longer period is required by law or agreed in writing. Customer may request details of current retention settings.",
        ],
      },
      {
        title: "2.5 Sharing and Subprocessors",
        body: [
          "We may share data with service providers, also called subprocessors, that help us provide the Services, such as cloud hosting providers and AI infrastructure providers. We require subprocessors to protect data through contractual obligations. A current list of subprocessors may be provided upon request or via a DPA exhibit.",
        ],
      },
      {
        title: "2.6 International Transfers",
        body: [
          "We are based in the United States and may process data in the U.S. and other jurisdictions where we or our subprocessors operate. Where required for transfers from the EEA, UK, or Switzerland, we will use appropriate safeguards such as Standard Contractual Clauses and supplementary measures, typically through a Data Processing Addendum.",
        ],
      },
      {
        title: "2.7 Security",
        body: [
          "We implement reasonable administrative, technical, and organizational measures designed to protect data, including encryption in transit, access controls, and monitoring. No security measure is perfect; therefore, we cannot guarantee absolute security.",
        ],
      },
      {
        title: "2.8 End User Rights",
        body: [
          "Because Customer is typically the controller, End Users should direct privacy requests to the Customer. Where PrimeStyleAI is directly responsible under applicable law, data subjects may request access, correction, deletion, restriction, or portability.",
        ],
      },
      {
        title: "2.9 California Privacy Under CCPA and CPRA",
        body: [
          "PrimeStyleAI does not sell personal information as defined under CCPA/CPRA. California residents may have rights to know, delete, and correct personal information. Because PrimeStyleAI generally acts as a service provider/processor for Customer, requests should be submitted to the Customer first. Authorized Users may contact us for account-related data requests.",
        ],
      },
      {
        title: "2.10 Children's Data",
        body: [
          "The Services are intended for business use and are not directed to children. Customer must not knowingly submit personal data of children to the Services.",
        ],
      },
    ],
    contactTitle: "Contact PrimeStyleAI",
    contactBody: "For privacy questions or requests, contact PrimeStyleAI in Laguna Niguel, California, USA.",
  },

  cookiePolicy: {
    slug: "cookie-policy",
    title: "Cookie Policy",
    eyebrow: "PrimeStyleAI legal",
    description:
      "How PrimeStyleAI uses cookies, local storage, analytics, attribution, and related technologies across myaifitting.com and primestyleai.com.",
    lastUpdated: "February 6, 2026",
    effectiveDate: "February 6, 2026",
    location: "Laguna Niguel, California, USA",
    tone: "legal",
    intro: [
      "This Cookie Policy explains how PrimeStyleAI uses cookies and similar technologies on myaifitting.com and primestyleai.com, collectively the Services.",
      "This policy should be read together with our Privacy Policy.",
    ],
    quickNotes: [
      "We use cookies to operate, secure, and improve the Services.",
      "We may use analytics and affiliate attribution technologies.",
      "We do not use cookies to sell personal data.",
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
        body: ["PrimeStyleAI uses cookies for the following purposes:"],
        items: [
          "To operate and secure our Services",
          "To remember user preferences and settings",
          "To analyze usage and improve performance",
          "To support affiliate attribution and analytics",
          "To prevent fraud, abuse, and misuse",
        ],
      },
      {
        title: "3. Types of Cookies We Use",
        subsections: [
          {
            title: "3.1 Strictly Necessary Cookies",
            body: [
              "These cookies are essential for the website to function properly and cannot be disabled. Without these cookies, core features of the Services may not work.",
            ],
            items: ["Account login and authentication", "Security and fraud prevention", "Session management"],
          },
          {
            title: "3.2 Functional Cookies",
            body: ["These cookies allow us to remember choices you make and provide enhanced functionality."],
            items: ["Language or region preferences", "Saved user settings", "Feature personalization"],
          },
          {
            title: "3.3 Analytics & Performance Cookies",
            body: [
              "These cookies help us understand how users interact with our Services so we can improve usability and performance. Analytics data is typically aggregated and anonymized where possible.",
            ],
            items: ["Page visits and navigation patterns", "Feature usage", "Error monitoring and performance metrics"],
          },
          {
            title: "3.4 Affiliate & Attribution Cookies",
            body: ["PrimeStyleAI participates in affiliate marketing programs."],
            items: [
              "When you click a link to a third-party retailer, affiliate cookies may be placed by the retailer or affiliate network",
              "These cookies help track referrals and attribute commissions",
              "PrimeStyleAI does not control retailer or affiliate network cookies",
              "Retailer and affiliate cookie usage is governed by their own privacy and cookie policies",
            ],
          },
        ],
      },
      {
        title: "4. Third-Party Cookies",
        body: [
          "We may allow third-party services to place cookies on our Services, including analytics providers, payment processors, affiliate networks, infrastructure providers, and security providers.",
          "These third parties may collect information according to their own privacy policies. PrimeStyleAI does not control how third parties use their cookies.",
        ],
      },
      {
        title: "5. Managing Cookies",
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
        title: "6. Do Not Track Signals",
        body: [
          "Some browsers offer a Do Not Track setting. At this time, PrimeStyleAI does not respond to DNT signals, as there is no consistent industry standard for compliance.",
        ],
      },
      {
        title: "7. Legal Basis for EEA and UK Users",
        items: [
          "Necessary cookies are processed based on legitimate interest",
          "Non-essential cookies are processed based on consent, where required",
          "You may withdraw consent at any time through browser or cookie settings",
        ],
      },
      {
        title: "8. Updates to This Cookie Policy",
        body: [
          "We may update this Cookie Policy periodically. Changes will be reflected by updating the Last Updated date. Continued use of the Services after changes take effect constitutes acceptance of the updated policy.",
        ],
      },
    ],
    contactTitle: "9. Contact Us",
    contactBody: "For questions about our use of cookies, contact PrimeStyleAI in Laguna Niguel, California, USA.",
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
          "Company: PrimeStyleAI. Websites: myaifitting.com and primestyleai.com. Location: Laguna Niguel, California, USA.",
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
      "This Pricing Policy explains how pricing, plans, tokens, and billing work on PrimeStyleAI, operated through myaifitting.com and primestyleai.com.",
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
