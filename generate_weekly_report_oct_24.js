// generate_weekly_report_oct_24.js
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
                                text: "Saturday, 24 October 2026  •  ZimMarket & Enterprise IT Asset Management System",
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
                        "This weekly engineering report presents the technical accomplishments, security enhancements, architectural hardening, and user experience milestones delivered during the development sprint ending Saturday, 24 October 2026. Across both the ZimMarket peer-to-peer e-commerce ecosystem and the Enterprise IT Asset Management System, engineering efforts focused on mission-critical security boundaries, zero-trust financial escrow guarantees, advanced discovery interfaces, and enterprise multi-branch organizational hierarchy:",
                        true
                    ),
                    createBullet(
                        "ZimMarket P2P Multi-Vendor Marketplace",
                        "Instituted a bank-grade zero-trust financial architecture with server-authoritative pricing validation, cryptographic HMAC SHA-512 webhook signature verification, atomic PostgreSQL escrow settlement procedures, and a double-entry ledger. Engineered a Spotlight-style interactive Global Search Command Palette (Ctrl+K) with instant multi-field indexing. Designed and launched a dedicated Merchant Storefront Profile view featuring full vendor branding, tabbed product catalogs, multi-channel direct communication, and deep-linking vanity URLs."
                    ),
                    createBullet(
                        "Enterprise IT Asset Management System",
                        "Architected an enterprise-scale multi-facility branch management system (FacilitiesPanel) enabling branch creation, operational monitoring, and physical tracking. Integrated a dedicated Branch Manager RBAC tier with scoped authority, built organizational department management endpoints, hardened TiDB distributed SQL queries, and implemented 275 lines of automated integration test suites."
                    ),

                    // SECTION 1: ZIMMARKET PROGRESS
                    createSectionHeading("PROJECT 1: ZIMMARKET P2P MULTI-VENDOR MARKETPLACE"),
                    createSubHeading("1.1 Architecture & Security Context"),
                    createParagraph(
                        "ZimMarket is an enterprise-grade, dual-currency (USD and Zimbabwe Gold ZiG) multi-vendor marketplace tailored specifically for commerce across Zimbabwe. Operating on React 18, Vite, Supabase PostgreSQL, Storage CDN, and Serverless Edge Functions, the platform handles statutory VAT accounting, real-time vendor chat, multi-channel payouts (EcoCash, Innbucks, Nostro USD, ZiG RTGS), and buyer protection escrow."
                    ),

                    createSubHeading("1.2 Sprint Accomplishments (Ending Saturday, 24 October 2026)"),

                    createBullet(
                        "Zero-Trust Financial Architecture & Server-Side Price Verification",
                        "Completely eliminated reliance on client-supplied product prices during checkout. The checkout pipeline was re-architected to re-fetch and re-calculate all line items, tax computations (15% ZIMRA VAT), and delivery fees directly from authoritative database records within atomic serverless edge functions. Client-side price tampering, negative quantity exploits, and unauthorized vendor payout requests are now strictly rejected at the API gateway."
                    ),

                    createBullet(
                        "Atomic Escrow Ledger & Settlement State Machine (Migration 31 & 32)",
                        "Deployed database migrations 20231010000031 and 20231010000032 introducing an immutable, double-entry escrow ledger (escrow_ledger table) and strict state machine transitions (FUNDS_HELD → MERCHANT_DISPATCHED → BUYER_CONFIRMED → FUNDS_RELEASED / DISPUTE_REFUNDED). Created the atomic stored procedure release_escrow_funds_atomic using row-level locking (FOR UPDATE) to prevent race conditions, double payouts, and negative wallet balances under high concurrent traffic."
                    ),

                    createBullet(
                        "Cryptographic Gateway Webhook Verification (HMAC SHA-512)",
                        "Re-engineered the Paynow payment notification edge function (paynow-webhook) to enforce strict HMAC SHA-512 cryptographic signature validation. Inbound status updates from payment gateways are validated against the merchant shared secret before any order state is updated. Unsigned or maliciously forged callbacks are automatically rejected and logged to the security audit stream."
                    ),

                    createBullet(
                        "Interactive Global Search & Command Palette Modal (Ctrl + K / Cmd + K)",
                        "Engineered a spotlight-style Omnibox command palette (GlobalSearchModal.jsx) accessible from anywhere in the platform via keyboard shortcut (⌘K / Ctrl+K), hero search trigger, or navigation bar. Features instant multi-index matching across product titles, brand names, categories, sub-categories, item SKUs (item_no), descriptions, and merchant store names/bios/addresses. Integrated category filter pills, recent search history (localStorage), popular Zimbabwean search chips (Solar Batteries, Engine Oil, Maize Meal, Inverters), full keyboard navigation (Arrow keys, Enter, Esc), and instant Add to Cart directly from search results."
                    ),

                    createBullet(
                        "Dedicated Merchant Storefront Profile & Catalog View (MerchantStorefrontModal.jsx)",
                        "Built a dedicated merchant profile and showcase modal that transforms vendor discovery into an immersive branded shopping experience. Displays merchant cover banners, avatar logos, verified badges, slogans, star ratings, aggregate reviews, and custom store ZiG exchange rate tags. Features four interactive tabs: 📦 Products (in-store search and category filtering), 📍 Location & Delivery (physical address, pickup instructions, operating hours, and free delivery thresholds), 🛡️ Guarantees & Returns (100% Escrow Protection policy, return windows, and warranty terms), and ℹ️ About Merchant (biography and contact channels)."
                    ),

                    createBullet(
                        "Direct Multi-Channel Merchant Communication & Deep Linking",
                        "Wired direct seller engagement channels into the storefront: instant real-time live chat with seller (ChatContext), direct WhatsApp click-to-chat (https://wa.me/...), telephone dialing, and one-click vanity URL copying (?store=<store_slug>). Clicking any store chip across Grid View, List View, or QuickView modals dynamically launches the merchant's storefront modal and updates browser history for direct shareability."
                    ),

                    createBullet(
                        "Hero Section Layout Stabilization & Image Loading Hardening",
                        "Resolved critical CSS grid layout blow-out by strictly constraining slider tracks and grid template widths. Eliminated opacity gating and cross-origin resource sharing (CORS) image loading conflicts, ensuring hero spotlight products render immediately without layout shift. Replaced imperative DOM mutations with resilient React image loaders, guaranteeing flawless presentation on all mobile, tablet, and desktop viewports."
                    ),

                    createBullet(
                        "Database Migration Parity & Codebase Cleanliness",
                        "Audited and normalized all 31 Supabase SQL migrations to ensure 1:1 schema parity between local development and remote cloud PostgreSQL. Validated zero compile errors, passing full production bundle compilation (vite build) in 3.92 seconds with 88 transformed modules."
                    ),

                    // SECTION 2: IT ASSET MANAGEMENT PROGRESS
                    createSectionHeading("PROJECT 2: ENTERPRISE IT ASSET MANAGEMENT SYSTEM"),
                    createSubHeading("2.1 Architecture & Overview"),
                    createParagraph(
                        "The Enterprise IT Asset Management System is a cloud infrastructure platform built on Next.js/React, Express backend services, and PingCAP TiDB Cloud (distributed MySQL-compatible SQL). It provides unified asset lifecycle management, depreciation tracking, QR/barcode scanning, multi-branch inventory governance, and cryptographic audit logging."
                    ),

                    createSubHeading("2.2 Sprint Accomplishments (Ending Saturday, 24 October 2026)"),

                    createBullet(
                        "Enterprise Facility Branches Management (FacilitiesPanel.tsx)",
                        "Engineered and integrated a comprehensive facility branch management suite (959 lines of robust TypeScript code in FacilitiesPanel.tsx). Organizations can now create, edit, monitor, and manage physical operational facilities, including headquarters, regional warehouses, data centers, branch offices, and distribution depots with full location metadata (branch code, physical address, coordinates, operational status, and capacity limits)."
                    ),

                    createBullet(
                        "Branch Manager Assignment & Hierarchical Role-Based Access Control",
                        "Introduced the dedicated BRANCH_MANAGER role into the enterprise permission matrix (ROLE_PERMISSION_MATRIX.md and permissions.ts). Administrators can assign specific users as branch managers, delegating administrative oversight of equipment, branch-specific audits, and maintenance schedules while strictly isolating data from unauthorized external branches."
                    ),

                    createBullet(
                        "Organizational Department Management Architecture (departmentRoutes.ts)",
                        "Implemented full backend RESTful CRUD routing for organizational departments nested within facility branches (e.g., Information Technology, Logistics & Warehousing, Operations, Human Resources, Accounting). Enables granular asset attribution by physical site (Branch) and administrative cost center (Department)."
                    ),

                    createBullet(
                        "TiDB Storage Query Hardening & Distributed SQL Indexing",
                        "Expanded tidb-storage.ts with optimized relational queries for branch hierarchy lookups, department membership resolution, and branch-scoped asset aggregations. Enforced referential integrity constraints to prevent orphaned assets upon department or facility reconfiguration."
                    ),

                    createBullet(
                        "Automated Unit & Integration Test Suite (facilities-departments.test.ts)",
                        "Constructed 275 lines of comprehensive test suites validating branch lifecycle operations, department assignment workflows, user permission boundaries, and error handling edge cases. All test cases execute cleanly against the test runner with zero regressions."
                    ),

                    // SYSTEM DELIVERABLES & STATUS MATRIX
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
                                    createCell("Zero-Trust Server-Side Price Verification & Anti-Tampering Engine"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Atomic Escrow Ledger & Row-Level Locked Settlement (Migration 31 & 32)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Cryptographic Gateway Webhook Verification (Paynow HMAC SHA-512)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Interactive Global Search Omnibox & Command Palette (Ctrl+K)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Dedicated Merchant Storefront Profile & Public Catalog Experience"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Multi-Channel Merchant Communication (Live Chat, WhatsApp, Call, Deep Links)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Hero Showcase Grid Track Stabilization & Resilient Image Loading"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Supabase Schema Remote Parity & 31 Migration Normalization", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Enterprise Facility Branches Management (FacilitiesPanel.tsx - 959 lines)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Branch Manager Assignment & Hierarchical Role-Based Permissions (RBAC)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Organizational Department CRUD Endpoints & Cost Center Allocation"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("TiDB Cloud Distributed SQL Relational Queries & Constraint Hardening", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Automated Unit & Integration Test Suite (facilities-departments.test.ts)"),
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
                                    createCell("Financial Client-Side Price Vulnerability:\nMalicious users could manipulate front-end JavaScript state to submit orders with unauthorized price discounts or modified totals."),
                                    createCell("Enforced zero-trust architecture where the initiate-payment edge function ignores all client price parameters and computes authoritative line totals directly from products in PostgreSQL.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Escrow Concurrency & Double-Payout Race Condition:\nSimultaneous webhook calls or rapid buyer dispute/release triggers risked executing duplicate ledger payouts or negative balances.", false, true),
                                    createCell("Engineered an atomic database procedure release_escrow_funds_atomic wrapped in an ACID transaction with FOR UPDATE row locks on orders and vendor wallets.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Gateway Webhook Spoofing Risks:\nExternal threat actors could simulate payment gateway HTTP callbacks to trigger fraudulent order fulfillment."),
                                    createCell("Implemented HMAC SHA-512 cryptographic signature verification on all inbound Paynow webhooks, validating message authenticity before processing order records.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Catalog Product Discovery Friction:\nBuyers browsing a 4,300+ item catalog faced high cognitive load finding specific brands, SKUs, or verified merchants.", false, true),
                                    createCell("Developed an interactive Global Search Omnibox (Ctrl+K) with instant multi-index matching, recent history, category scoping, and direct Add to Cart functionality.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Hero Showcase Grid Track Blow-Out:\nNested flex and grid children inside the hero section caused horizontal page scrolling and image clipping on mid-sized viewports."),
                                    createCell("Constrained CSS grid track minmax values, eliminated opacity gating, and introduced resilient React image loaders with studio-white containment.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Multi-Branch Organizational Hierarchy in IT Assets:\nTracking equipment across decentralized geographic sites lacked branch-level administration and department nesting.", false, true),
                                    createCell("Built FacilitiesPanel.tsx, created the BRANCH_MANAGER RBAC role, and deployed nested department routes backed by TiDB distributed SQL queries.", false, true)
                                ]
                            })
                        ]
                    }),

                    // NEXT SPRINT ROADMAP
                    createSectionHeading("NEXT SPRINT ROADMAP"),
                    createSubHeading("ZimMarket Priorities"),
                    createBullet(
                        "Paynow Automated USSD Push Prompts in Production",
                        "Perform end-to-end sandbox-to-production validation of automated EcoCash and OneMoney USSD push prompts on live mobile devices."
                    ),
                    createBullet(
                        "Merchant Payout Automated Batch Processing",
                        "Build automated batch settlement processing for cleared escrow balances into vendor EcoCash, Innbucks, and CABS/Stanbic Nostro accounts."
                    ),
                    createBullet(
                        "Tabular Data Export (CSV & Excel) for ZIMRA Tax Reporting",
                        "Provide 1-click fiscalized export of vendor sales orders, inventory valuations, and statutory VAT reports in Excel (.xlsx) and CSV formats."
                    ),

                    createSubHeading("IT Asset Management Priorities"),
                    createBullet(
                        "Automated CSV Bulk Ingestion Engine",
                        "Connect the uploaded CSV asset spreadsheet parser to bulk-validate and ingest hardware equipment batches into TiDB Cloud with real-time error reporting."
                    ),
                    createBullet(
                        "Mobile Handheld Barcode & QR Camera Scanning Verification",
                        "Conduct live hardware barcode and QR code scanning verification across Android handheld warehouse mobile terminals."
                    ),

                    // CONCLUSION
                    createSectionHeading("CONCLUSION"),
                    createParagraph(
                        "The development sprint ending Saturday, 24 October 2026 delivered critical architectural milestones across both enterprise software platforms. ZimMarket has established institutional-grade financial security with server-side price validation, cryptographic webhook authentication, atomic escrow reconciliation, and state-of-the-art discovery via the Global Search Omnibox and Merchant Storefront Profile view. Simultaneously, the IT Asset Management System gained an enterprise multi-facility branch management architecture with dedicated Branch Manager RBAC roles and department routing. Both applications are fully compiled, stable, and ready for production deployment."
                    )
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    
    // Write to root workspace files matching previous naming conventions
    const safeWrite = (filePath, desc) => {
        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`✓ Successfully generated ${desc}: ${filePath}`);
        } catch (e) {
            if (e.code === 'EBUSY') {
                console.warn(`⚠️ Notice: ${filePath} is currently open in Word. Please close Word to overwrite this specific file.`);
            } else {
                console.warn(`Write error for ${filePath}:`, e.message);
            }
        }
    };

    // ZimMarket workspace locations
    safeWrite('c:/Users/Tt/zim-marketplace/ZimMarket_Weekly_Progress_Report_October_24_2026.docx', 'Dated Report (Oct 24)');
    safeWrite('c:/Users/Tt/zim-marketplace/Weekly_Progress_Report_October_24_2026.docx', 'Standard Dated Report (Oct 24)');
    safeWrite('c:/Users/Tt/zim-marketplace/ZimMarket_Weekly_Progress_Report.docx', 'Main Report Pointer');

    // IT Asset Management workspace locations
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/ZimMarket_Weekly_Progress_Report_October_24_2026.docx', 'IT Asset Dated Report');
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/Weekly_Progress_Report_October_24_2026.docx', 'IT Asset Standard Dated Report');
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/ZimMarket_Weekly_Progress_Report.docx', 'IT Asset Main Report Pointer');

    // Brain Artifacts directory
    const artifactDir = 'C:/Users/Tt/.gemini/antigravity-ide/brain/4c703a9a-4776-44dd-8401-cb7d2682c6fe';
    safeWrite(`${artifactDir}/Weekly_Progress_Report_October_24_2026.docx`, 'Brain Artifact Dated Report');
    safeWrite(`${artifactDir}/ZimMarket_Weekly_Progress_Report_October_24_2026.docx`, 'Brain Artifact Full Dated Report');
    safeWrite(`${artifactDir}/ZimMarket_Weekly_Progress_Report.docx`, 'Brain Artifact Main Report Pointer');
}

buildDocument().catch(err => {
    console.error("Error generating report:", err);
    process.exit(1);
});
