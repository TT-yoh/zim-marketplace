// generate_weekly_report_oct_10.js
const { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    BorderStyle, 
    AlignmentType, 
    ShadingType 
} = require('docx');
const fs = require('fs');

const primaryColor = "1E3A8A";   // Deep Blue
const secondaryColor = "0F766E"; // Teal / Success
const accentBlue = "2563EB";     // Royal Blue
const darkText = "0F172A";       // Slate 900
const mutedText = "475569";      // Slate 600
const borderGrey = "CBD5E1";     // Slate 300
const headerBg = "0F172A";       // Dark header
const headerText = "FFFFFF";     // White
const altRowBg = "F8FAFC";       // Slate 50
const highlightBg = "F1F5F9";    // Slate 100

function createCell(text, isHeader = false, isAlt = false, align = AlignmentType.LEFT, bold = false) {
    return new TableCell({
        shading: {
            fill: isHeader ? headerBg : (isAlt ? altRowBg : "FFFFFF"),
            type: ShadingType.CLEAR
        },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: [
            new Paragraph({
                alignment: align,
                children: [
                    new TextRun({
                        text: text,
                        bold: isHeader || bold,
                        color: isHeader ? headerText : darkText,
                        size: isHeader ? 20 : 18,
                        font: "Calibri"
                    })
                ]
            })
        ],
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
            left: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
            right: { style: BorderStyle.SINGLE, size: 4, color: borderGrey }
        }
    });
}

function createBullet(title, description) {
    return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 120, line: 276 },
        children: [
            new TextRun({
                text: `${title}: `,
                bold: true,
                color: darkText,
                size: 20,
                font: "Calibri"
            }),
            new TextRun({
                text: description,
                color: mutedText,
                size: 20,
                font: "Calibri"
            })
        ]
    });
}

function createSubBullet(text) {
    return new Paragraph({
        bullet: { level: 1 },
        spacing: { after: 80, line: 260 },
        children: [
            new TextRun({
                text: text,
                color: mutedText,
                size: 19,
                font: "Calibri"
            })
        ]
    });
}

function createSectionHeading(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                color: primaryColor,
                size: 28,
                font: "Calibri"
            })
        ]
    });
}

function createSubHeading(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                color: darkText,
                size: 22,
                font: "Calibri"
            })
        ]
    });
}

function createParagraph(text, isLead = false) {
    return new Paragraph({
        spacing: { after: 160, line: 276 },
        children: [
            new TextRun({
                text: text,
                size: isLead ? 21 : 20,
                color: isLead ? darkText : mutedText,
                font: "Calibri"
            })
        ]
    });
}

async function buildDocument() {
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Calibri",
                        size: 20,
                        color: darkText
                    }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: [
                    // Main Title
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 80 },
                        children: [
                            new TextRun({
                                text: "Weekly Engineering Progress Report",
                                bold: true,
                                size: 36,
                                color: primaryColor,
                                font: "Calibri"
                            })
                        ]
                    }),
                    // Subtitle
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 360 },
                        children: [
                            new TextRun({
                                text: "Saturday, 10 October 2026  •  ZimMarket & Enterprise IT Asset Management System",
                                bold: true,
                                size: 22,
                                color: secondaryColor,
                                font: "Calibri"
                            })
                        ]
                    }),

                    // EXECUTIVE SUMMARY
                    createSectionHeading("EXECUTIVE SUMMARY"),
                    createParagraph(
                        "This weekly engineering report outlines the architectural milestones, core implementations, and technical hardening completed during the sprint ending Saturday, 10 October 2026. Significant cross-platform advancements were delivered across both the ZimMarket peer-to-peer e-commerce ecosystem and the Enterprise IT Asset Management System:",
                        true
                    ),
                    createBullet(
                        "ZimMarket P2P Marketplace",
                        "Accomplished strict role isolation between Buyers and Vendors across navigation, settings, and verification; eliminated UI clutter through modular tabbed layouts; delivered merchant-controlled ZiG currency rate management with automated RBZ feed synchronization; and deployed dedicated KYC verification pipelines for buyers and merchants with Row-Level Security (RLS) and an admin review queue."
                    ),
                    createBullet(
                        "Enterprise IT Asset Management System",
                        "Sanitized all staging and dummy data from PingCAP TiDB Cloud to establish a pristine production genesis baseline; hardened Super Admin authentication and backend isolation; implemented full browser history navigation and automated test suites; added a self-service 'My Profile & Account Settings' modal with 2FA and password management; and resolved edge-case checkout crashes through defensive null handling."
                    ),

                    // SECTION 1: ZIMMARKET PROGRESS
                    createSectionHeading("PROJECT 1: ZIMMARKET P2P MULTI-VENDOR MARKETPLACE"),
                    createSubHeading("1.1 Architecture & Overview"),
                    createParagraph(
                        "ZimMarket is a full-stack, dual-currency (USD & ZiG) multi-vendor e-commerce platform built on Vite React, Supabase PostgreSQL, Storage CDN, and Edge deployment. It is custom-tailored for Zimbabwean retail commerce, handling local logistics, escrow transaction protection, statutory ZIMRA VAT calculation, and mobile money payment integrations (EcoCash, InnBucks, Paynow)."
                    ),

                    createSubHeading("1.2 Sprint Accomplishments (Ending Saturday, 10 October 2026)"),

                    createBullet(
                        "Strict Role Isolation Across Navigation & Settings",
                        "Completely eliminated cross-role pollution. Options, tabs, and actions exclusive to vendors (such as product inventory, payout bank/EcoCash configurations, delivery zones, order fulfillment, and merchant verification) are now strictly filtered and inaccessible to buyers. Similarly, buyer-specific shortcuts (such as shopping carts, personal order history, delivery addresses, and buyer verification) are hidden from vendor dashboards."
                    ),

                    createBullet(
                        "Modular, Uncluttered Tabbed UI Layouts",
                        "Overhauled both the Vendor Dashboard and Profile Settings from massive, scroll-heavy pages into clean, responsive glassmorphic tab bars. Settings are now segmented into 7 dedicated categories: Profile Details, Store Branding & Bio, WhatsApp Contact, Currency & Rates, Shipping Zones, Payout Accounts, and Account Security."
                    ),

                    createBullet(
                        "Dynamic Role-Aware Signup Onboarding",
                        "Integrated intuitive radio button selection ('Shop Customer' vs 'Verified Merchant') directly on the registration interface. Selecting 'Merchant' dynamically presents business onboarding fields—including Store Public Name, WhatsApp business hotline, and physical trading address—automatically provisioning both Supabase Auth metadata and the vendor_profiles table upon account creation."
                    ),

                    createBullet(
                        "Custom Merchant ZiG Exchange Rates & Official RBZ Feed Sync",
                        "Empowered vendors to take command of dual-currency pricing in Zimbabwe's dynamic currency market. Merchants can configure custom ZiG conversion rates with flexible percentage markups/discounts (+/- 5%, 10%), while retaining 1-click synchronization with the official Reserve Bank of Zimbabwe (RBZ) daily exchange feed. Dual currency prices update instantly across product cards, order totals, and checkout balances."
                    ),

                    createBullet(
                        "Strictly Partitioned Verification Forms (Vendor KYC vs Buyer Verification)",
                        "Re-engineered the verification portal so vendors and buyers strictly see only their respective forms. Merchants upload National ID, selfie holding ID, company registration certificates (CR14/Tax Clearance), and physical dispatch locations. Buyers submit full legal names, WhatsApp contact numbers, National ID/Driver's License, and utility bill / EcoCash statement proofs of residence. Neither role is exposed to the other's forms or options."
                    ),

                    createBullet(
                        "New Database Migration & Admin Verification Management",
                        "Created migration 20231010000029_buyer_verification_schema.sql establishing the buyer_verifications table with strict Row Level Security (RLS). Updated AdminDashboard.jsx with live pending verification badges and dedicated verification review tables featuring secure document viewing (🔒 National ID, 🔒 Residence Proof) and 1-click approvals."
                    ),

                    // SECTION 2: IT ASSET MANAGEMENT PROGRESS
                    createSectionHeading("PROJECT 2: ENTERPRISE IT ASSET MANAGEMENT SYSTEM"),
                    createSubHeading("2.1 Architecture & Overview"),
                    createParagraph(
                        "The IT Asset Management System is an enterprise-grade web application engineered on React/Next.js and PingCAP TiDB Cloud (MySQL-compatible distributed SQL). The platform governs multi-facility asset lifecycles, maintenance work orders, budget allocations, barcode/QR tracking, cryptographic tamper-evident audit logging, and hardware depreciation."
                    ),

                    createSubHeading("2.2 Sprint Accomplishments (Ending Saturday, 10 October 2026)"),

                    createBullet(
                        "Production Data Sanitization & TiDB Cloud Genesis Baseline",
                        "Purged all mock assets, demo work orders, and sample accounts from PingCAP TiDB Cloud. Retained a pristine genesis state containing only the primary organization, main facility, and the authenticated Super Admin. Hardened schema-tidb.sql and automated setup scripts to guarantee clean production onboarding."
                    ),

                    createBullet(
                        "Super Admin Identity & Authentication Isolation",
                        "Standardized the root Super Admin credentials to ishmaelt42@gmail.com. Removed hardcoded credentials and unused environment keys from frontend bundles and .env files, ensuring Super Admin authentication is securely validated strictly through backend API endpoints and RBAC middleware."
                    ),

                    createBullet(
                        "Cryptographic SHA-256 Monotonic Audit Chain",
                        "Hardened the tamper-evident audit ledger using SHA-256 hash-chaining. Every asset creation, transfer, maintenance log, and check-in/out event cryptographically signs previous transaction hashes, guaranteeing mathematical tamper verification across audit logs."
                    ),

                    createBullet(
                        "Concurrency Control & Idempotent Deduplication",
                        "Implemented Optimistic Concurrency Control (OCC) with version locking to prevent race conditions during simultaneous asset updates. Backed network retries with idempotency key deduplication to eliminate duplicate checkouts or asset registrations over flaky connections."
                    ),

                    createBullet(
                        "Full Browser History Synchronization & Clean Back-Button Navigation",
                        "Integrated comprehensive HTML5 browser history synchronization (pushState / popstate). When users click the browser Back button, the application smoothly traverses previous views and modals. Reaching the initial root view cleanly transitions back to the Login portal without refresh loops, state corruption, or stuck sessions."
                    ),

                    createBullet(
                        "Automated End-to-End Navigation Test Suite",
                        "Built an automated end-to-end browser test suite verifying router history stacks, modal dismissals, login redirections, and session cleanup across edge cases."
                    ),

                    createBullet(
                        "Self-Service 'My Profile & Account Settings' Modal",
                        "Engineered a comprehensive user profile and settings modal accessible from the application navigation bar. Features include user identity display, assigned branch/department, secure password modification with current password verification, Two-Factor Authentication (2FA) toggling, and a collapsible role-based capability preview."
                    ),

                    createBullet(
                        "Checkout Defensive Null-Safety Hardening",
                        "Resolved a critical black screen crash in the Checkout modal caused by unhandled empty inventory states. Added defensive null-guards, fallback empty states, and safe array mapping, ensuring flawless checkout experiences regardless of catalog quantity."
                    ),

                    // PHASE STATUS TABLE
                    createSectionHeading("SYSTEM DELIVERABLES & STATUS MATRIX"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    createCell("System / Component", true, false, AlignmentType.LEFT, true),
                                    createCell("Milestone / Deliverable", true, false, AlignmentType.LEFT, true),
                                    createCell("Status", true, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Strict Role Partitioning & Navigation Isolation (Vendor vs Buyer)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Redesigned Tabbed Profile & Store Settings (7 Clean Modular Tabs)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Merchant ZiG Custom Exchange Rate Controls & Official RBZ Live Sync"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Role-Partitioned Verification (Vendor KYC vs Buyer ID & Residence)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Buyer Verification Database Table (buyer_verifications) with Supabase RLS"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Admin Dashboard Verification Queue with 1-Click Approvals & Secure Docs", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("PingCAP TiDB Cloud Database Sanitization & Pristine Genesis Setup"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Super Admin Credential Hardening (ishmaelt42@gmail.com backend isolation)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("SHA-256 Monotonic Tamper-Evident Audit Ledger & Hash-Chain Verification"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Optimistic Concurrency Control (OCC) & Idempotent Deduplication", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Browser History Back-Arrow Navigation Routing & Automated Test Suite"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("My Profile & Account Settings Modal (Password change, 2FA, RBAC view)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Checkout Modal Defensive Null Checks (Fix black screen crash on empty inventory)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            })
                        ]
                    }),

                    // CHALLENGES FACED & SOLUTIONS APPLIED
                    createSectionHeading("CHALLENGES FACED & ENGINEERING SOLUTIONS APPLIED"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    createCell("Challenge Encountered", true, false, AlignmentType.LEFT, true),
                                    createCell("Engineering Solution Applied", true, false, AlignmentType.LEFT, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Cross-Role Verification Form Leaks:\nBuyers navigating to account verification were presented with the vendor business registration form, creating confusion and submission friction."),
                                    createCell("Completely partitioned verification into two strictly isolated components based on user role. Vendors only see business KYC forms, while buyers only see individual identity and residence forms.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Page Clutter & Excessive Vertical Scrolling:\nBoth the merchant dashboard and profile settings combined dozens of unrelated fields on a single screen, overwhelming users.", false, true),
                                    createCell("Introduced modular tabbed navigation layouts with clear subcategories, preserving form state across tab changes while reducing visual cognitive load.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZiG Currency Volatility & Rate Rigidness:\nStore owners could not adapt product prices to local exchange variations or official market adjustments without manual per-item editing."),
                                    createCell("Engineered automated exchange rate settings allowing merchants to apply percentage markups/discounts over the live official Reserve Bank of Zimbabwe feed.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Checkout Black Screen Crash:\nWhen launching the checkout modal with an empty or loading asset inventory, the view threw an unhandled exception causing a blank screen.", false, true),
                                    createCell("Implemented defensive null checking, fallback empty states, and safe array mapping, preventing crashes when catalogs are being synchronized or empty.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Browser History Disconnect in Single-Page App:\nClicking the browser's native back button either triggered page reloads or exited the app entirely, breaking user workflows."),
                                    createCell("Wired up pushState/popstate history listeners to keep route states synchronized with native browser controls, enabling intuitive back-navigation and clean logout.")
                                ]
                            })
                        ]
                    }),

                    // NEXT SPRINT ROADMAP
                    createSectionHeading("NEXT SPRINT ROADMAP"),
                    createSubHeading("ZimMarket Priorities"),
                    createBullet(
                        "Paynow Production Live Credentials & USSD Gateway",
                        "Integrate live Paynow merchant ID and secret keys for real-time automated EcoCash/OneMoney USSD payment pushes and webhook order fulfillment."
                    ),
                    createBullet(
                        "Merchant CSV / Excel Sales & Tax Export",
                        "Implement 1-click export of order manifests, stock valuation, and ZIMRA VAT invoices directly to spreadsheet formats."
                    ),

                    createSubHeading("IT Asset Management Priorities"),
                    createBullet(
                        "Live Barcode / QR Scanner Mobile Field Testing",
                        "Perform physical field testing of camera-based QR/barcode scanning across mobile handheld devices in branch warehouses."
                    ),
                    createBullet(
                        "Automated Preventative Maintenance Cron Jobs",
                        "Deploy automated scheduled tasks to generate recurring maintenance work orders based on runtime hours and calendar intervals."
                    ),

                    // CONCLUSION
                    createSectionHeading("CONCLUSION"),
                    createParagraph(
                        "The sprint ending Saturday, 10 October 2026 achieved pivotal milestones across both software systems. ZimMarket now boasts clean role segregation, decluttered tabbed dashboards, dynamic merchant currency controls, and secure multi-tier KYC pipelines. Concurrently, the IT Asset Management platform attained production data readiness, rock-solid navigation ergonomics, cryptographic tamper resistance, and enhanced user security. Both platforms have passed end-to-end compilation checks and are positioned for rapid enterprise adoption."
                    )
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    
    // Save to workspace
    const reportName = 'Weekly_Progress_Report_October_10_2026.docx';
    const reportPath1 = `c:/Users/Tt/zim-marketplace/${reportName}`;
    const reportPath2 = `c:/Users/Tt/zim-marketplace/ZimMarket_and_ITAsset_Weekly_Progress_Report_October_10_2026.docx`;
    fs.writeFileSync(reportPath1, buffer);
    fs.writeFileSync(reportPath2, buffer);
    console.log(`Successfully generated ${reportPath1} and ${reportPath2}!`);

    // Save copy in IT Asset Management directory as well
    try {
        fs.writeFileSync(`c:/Users/Tt/IT-Asset-managemnet-system/${reportName}`, buffer);
        console.log("Successfully saved copy in IT-Asset-managemnet-system!");
    } catch(e) {
        console.warn("Could not copy to IT asset dir:", e.message);
    }

    // Save to artifact directory
    const artifactDir = 'C:/Users/Tt/.gemini/antigravity-ide/brain/4c703a9a-4776-44dd-8401-cb7d2682c6fe';
    try {
        fs.writeFileSync(`${artifactDir}/${reportName}`, buffer);
        console.log("Successfully saved artifact docx copy!");
    } catch(e) {
        console.warn("Artifact copy warning:", e.message);
    }
}

buildDocument().catch(err => {
    console.error("Error generating report:", err);
    process.exit(1);
});
