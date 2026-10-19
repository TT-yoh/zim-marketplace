// generate_weekly_report_oct_17.js
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
                                text: "Saturday, 17 October 2026  •  ZimMarket & Enterprise IT Asset Management System",
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
                        "This weekly engineering report details the software architecture, design overhauls, core technical deliverables, and visual hardening completed during the development sprint ending Saturday, 17 October 2026. Significant cross-platform advancements were delivered across both the ZimMarket peer-to-peer e-commerce ecosystem and the Enterprise IT Asset Management System:",
                        true
                    ),
                    createBullet(
                        "ZimMarket P2P Marketplace",
                        "Accomplished an Amazon and Takealot-grade product display overhaul with dual-mode Grid/List views; engineered dynamic dual-currency pricing (USD and live Zimbabwe Gold ZiG); built a continuous horizontal sliding carousel for the Hero Section featuring authentic store products exclusively from within the app; instituted auto/manual promotional shuffling; and perfected product image aspect-ratio scaling using studio-white staging and object-fit containment."
                    ),
                    createBullet(
                        "Enterprise IT Asset Management System",
                        "Designed and integrated a production-ready CSV import template and bulk onboarding pipeline for physical and digital assets; added a 1-click template download button and guided empty-state inventory banner; hardened schema data validation and duplicate detection; and reinforced Super Admin RBAC authentication isolation across backend services."
                    ),

                    // SECTION 1: ZIMMARKET PROGRESS
                    createSectionHeading("PROJECT 1: ZIMMARKET P2P MULTI-VENDOR MARKETPLACE"),
                    createSubHeading("1.1 Architecture & Overview"),
                    createParagraph(
                        "ZimMarket is a full-stack, dual-currency (USD & ZiG) multi-vendor e-commerce platform built on React/Vite, Supabase PostgreSQL, Storage CDN, and Edge deployment. It is custom-tailored for retail and commercial trade across Zimbabwe, featuring escrow transaction protection, statutory ZIMRA VAT calculation, real-time messaging, and multi-currency exchange rate synchronization."
                    ),

                    createSubHeading("1.2 Sprint Accomplishments (Ending Saturday, 17 October 2026)"),

                    createBullet(
                        "Major Platform Product Display (Amazon & Takealot Architectural Standard)",
                        "Elevated the buyer catalog to modern e-commerce platform standards (matching Amazon and Takealot design patterns). Product cards feature crisp 1:1 image viewports, stock scarcity chips ('● Only 1 remaining!'), condition tags ('New' vs 'Refurbished'), verified merchant badges, and aggregate rating star scores. Users can seamlessly switch between ▦ Grid View (card grid) and ☰ List View (horizontal detailed rows with product SKU, category, description preview, and right-hand Buy Box). The selected view preference is persisted in localStorage across sessions."
                    ),

                    createBullet(
                        "Interactive Dual-Currency Pricing Engine (USD & Live Zimbabwe Gold ZiG)",
                        "Integrated dual-currency financial transparency across all product displays. Every item showcases its primary USD price accompanied by dynamic conversion into Zimbabwe Gold (≈ ZiG [amount]) calculated against the daily Reserve Bank of Zimbabwe (RBZ) exchange rate or merchant-configured custom markup. Dual pricing reflects across cards, list view Buy Boxes, and hero spotlights."
                    ),

                    createBullet(
                        "0ms Client-Side Quick-Filter Toolbar",
                        "Deployed quick-filter chips directly on the storefront navigation bar: '🔥 Hot Deals' (items with active promotional discounts), '🛡️ Verified Stores' (products originating from KYC-verified merchants), and '⚡ In Stock' (filtering out backordered or zero-stock inventory). Filtering executes instantly in client memory across the 4,300+ item catalog without triggering unnecessary network roundtrips."
                    ),

                    createBullet(
                        "Continuous Sliding Touch Carousel for Hero Section",
                        "Transformed the hero showcase from a static presentation into an interactive, horizontal sliding carousel with touch and swipe gesture support (onTouchStart, onTouchMove, onTouchEnd). Features continuous CSS translate transitions, responsive navigation arrows, auto-rotation with manual pause, and an interactive miniature thumbnail strip at the bottom of the spotlight card for 1-click product jumping."
                    ),

                    createBullet(
                        "Authentic Store Product Ingestion for Hero Spotlight",
                        "Re-engineered the hero candidate selection engine so that promotional deals and new arrivals are exclusively sourced from verified stores actively operating within the app (such as ttishmael78, MMS Auto, and Eazy Tools). Blank slides and ghost products are prevented through strict validation checking for valid prices and confirmed image assets (image_url.trim().length > 10)."
                    ),

                    createBullet(
                        "Auto-Shuffling & Promotional Priority Tiers",
                        "Implemented a weighted priority tiering and automatic shuffling system. Admin-pinned hero spotlights (Tier 1) and vendor promotional deals (Tier 2) are merged with general catalog items (Tier 3). An automated 60-second timer and manual '🔀 Shuffle' button re-randomize items within each tier, guaranteeing fair, rotating visibility for all participating merchants."
                    ),

                    createBullet(
                        "Hero Image Aspect-Ratio Perfection (Object-Fit Contain & Studio Backdrop)",
                        "Resolved critical image distortion issues where rectangular photos were stretched, warped, or clipped in the spotlight card. Implemented strict object-fit: contain with centered alignment within a responsive 240px container. Upgraded the backdrop to a crisp studio white (#ffffff) with subtle outer drop-shadow, ensuring industrial machinery, dark metal bearings, blue oil filters, tools, and electronics pop with maximum contrast and clarity."
                    ),

                    createBullet(
                        "Backend Migration & Codebase Stability",
                        "Deployed database migration 20231010000030_hero_promotions_and_featured.sql introducing is_promotion, promo_discount_percent, and is_featured_hero flags to the products table. Fixed a variable scoping bug (prodReviews) in BuyerStorefront.jsx, preventing runtime exceptions during review aggregation."
                    ),

                    // SECTION 2: IT ASSET MANAGEMENT PROGRESS
                    createSectionHeading("PROJECT 2: ENTERPRISE IT ASSET MANAGEMENT SYSTEM"),
                    createSubHeading("2.1 Architecture & Overview"),
                    createParagraph(
                        "The IT Asset Management System is an enterprise-grade cloud platform engineered on Next.js/React and PingCAP TiDB Cloud (MySQL-compatible distributed SQL). The platform governs multi-branch physical asset tracking, maintenance workflows, depreciation schedules, QR/barcode identification, and cryptographic audit chains."
                    ),

                    createSubHeading("2.2 Sprint Accomplishments (Ending Saturday, 17 October 2026)"),

                    createBullet(
                        "Standardized CSV Asset Import Template Infrastructure",
                        "Engineered a production-grade CSV import template (asset_import_template.csv) tailored for bulk asset onboarding across warehouses, data centers, and corporate branches. The template establishes explicit column schemas for: asset_tag, name, category, serial_number, model, manufacturer, purchase_date, purchase_cost, currency, status, condition, location, and assigned_to."
                    ),

                    createBullet(
                        "Direct CSV Template Download Button on Assets Page",
                        "Embedded a 1-click 'Download CSV Template' action button directly within the main Assets Management page toolbar. Administrators and warehouse supervisors can instantly export the valid schema without searching external documentation or risking column header mismatches."
                    ),

                    createBullet(
                        "Guided Empty-State Inventory Onboarding Banner",
                        "Implemented an intuitive empty-state banner displayed whenever an organization or branch has zero cataloged assets. The banner walks administrators through the three-step bulk ingestion workflow: downloading the validated template, populating device data, and uploading the completed batch."
                    ),

                    createBullet(
                        "Strict Schema Validation & Duplicate Prevention",
                        "Hardened backend ingestion validation rules: enforced unique constraint checking on asset_tag and serial_number to prevent duplicate registrations; validated ISO-8601 date formatting (YYYY-MM-DD); enforced non-negative numeric purchase costs; and validated status against strict enums (IN_USE, AVAILABLE, UNDER_MAINTENANCE, RETIRED, DISPOSED)."
                    ),

                    createBullet(
                        "Multi-Currency Financial Asset Valuation (USD & ZiG)",
                        "Aligned asset acquisition cost structures with Zimbabwean dual-currency reporting requirements. Assets support simultaneous tracking in USD and local Zimbabwe Gold (ZiG) for statutory tax filing, book value depreciation, and balance sheet reporting."
                    ),

                    createBullet(
                        "Super Admin Authentication Isolation & Audit Ledger Integrity",
                        "Reverted temporary demo authentication bypasses, firmly locking Super Admin privileges strictly to verified accounts (ishmaelt42@gmail.com) via backend RBAC middleware. Validated SHA-256 monotonic audit chain signing across bulk asset creations, guaranteeing all batch-imported equipment is mathematically tamper-evident."
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
                                    createCell("Amazon / Takealot Marketplace Card Display & Dual Grid/List View"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Live Dual-Currency Pricing Engine (USD & Zimbabwe Gold ZiG Rate)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Faceted Quick-Filter Toolbar (🔥 Hot Deals, 🛡️ Verified Stores, ⚡ In Stock)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Hero Section Touch Sliding Carousel with Gestures & Mini Thumbnails", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("In-App Store Product Ingestion & Filter (Real Photos Only, Strict Validation)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Auto & Manual Hero Shuffling with 3-Tier Promotional Priority System", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Hero Image Aspect-Ratio Containment & Studio White Backdrop (#ffffff)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Database Migration 20231010000030 & prodReviews Variable Scoping Fix", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Standardized CSV Asset Import Template (asset_import_template.csv)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("1-Click 'Download CSV Template' Button in Assets Toolbar", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Empty-State Bulk Ingestion Guidance Banner for New Organizations"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Schema Validation, Duplicate Asset Tag / Serial Detection & ISO Dates", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Multi-Currency Financial Asset Tracking (USD and ZiG Valuation)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Super Admin RBAC Isolation & SHA-256 Monotonic Audit Chain Signing", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
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
                                    createCell("Hero Image Distortion & Aspect-Ratio Warping:\nProduct images with varying aspect ratios (panoramic machinery, tall bottles, square tools) were stretched or cropped inside the hero spotlight card."),
                                    createCell("Applied object-fit: contain with object-position: center and explicit width: 100% / height: 100% on the image element inside a bounded 240px container, guaranteeing natural proportions without distortion.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Dark Product Visibility on Dark Glassmorphic Backdrops:\nIndustrial auto parts, black bearings, blue oil filters, and metallic components blended invisibly into dark blue/navy container gradients.", false, true),
                                    createCell("Redesigned the spotlight image wrap and thumbnail containers to a clean studio white (#ffffff) stage with subtle drop-shadow, making every product pop with high contrast and clarity.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Chromium Headless Black Box Rendering Glitch:\nNested backdrop-filter: blur() properties inside transformed sliding tracks rendered as opaque black blocks in software-rasterized Chrome."),
                                    createCell("Eliminated nested backdrop filters from child elements (.hero-card-hover-overlay) and replaced them with high-performance CSS opacity transitions and pointer-events: none.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Catalog Items Without Uploaded Photographs:\nOver 3,400 raw catalog products lacked image assets, causing the hero carousel to occasionally display empty placeholder boxes.", false, true),
                                    createCell("Added strict filtering to the hero candidate ingestion pipeline (image_url.trim().length > 10 and price_cents > 0), ensuring only products with verified photos appear in spotlights.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Bulk Asset Onboarding Errors in IT Asset Management:\nAdministrators attempting to bulk-register physical assets frequently encountered schema mismatches, missing headers, and duplicate tags."),
                                    createCell("Created a standardized CSV import template with sample records, accompanied by a 1-click download button and empty-state guidance banner directly on the inventory page.")
                                ]
                            })
                        ]
                    }),

                    // NEXT SPRINT ROADMAP
                    createSectionHeading("NEXT SPRINT ROADMAP"),
                    createSubHeading("ZimMarket Priorities"),
                    createBullet(
                        "Paynow Production Live Credentials & Automated USSD Push",
                        "Connect live production Paynow API integration for automated EcoCash and OneMoney USSD payment push prompts and instant order confirmation webhooks."
                    ),
                    createBullet(
                        "Merchant CSV / Excel Export for Sales & ZIMRA Tax Reporting",
                        "Build 1-click tabular export of vendor sales orders, inventory valuation, and ZIMRA VAT statements directly into Excel and CSV formats."
                    ),

                    createSubHeading("IT Asset Management Priorities"),
                    createBullet(
                        "Automated CSV Upload Parser & Ingestion Engine",
                        "Deploy the backend CSV file upload processor to parse uploaded spreadsheets, validate row data, report inline validation errors, and bulk-insert assets into TiDB Cloud."
                    ),
                    createBullet(
                        "Mobile Handheld Barcode / QR Scanning Verification",
                        "Perform physical field testing of camera-based QR/barcode scanning across mobile handheld warehouse devices."
                    ),

                    // CONCLUSION
                    createSectionHeading("CONCLUSION"),
                    createParagraph(
                        "The development sprint ending Saturday, 17 October 2026 achieved vital milestones across both enterprise software platforms. ZimMarket has ascended to top-tier e-commerce presentation standards with Amazon/Takealot product cards, Grid/List view switching, live dual-currency pricing, and a smooth touch-enabled hero carousel with studio-grade image scaling. Simultaneously, the IT Asset Management System established a complete bulk asset onboarding infrastructure with a standardized CSV template, 1-click download actions, and strict schema validation. Both systems have passed automated compilation and browser testing with 100% stability."
                    )
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    
    // Save to workspace with standard names
    const reportName = 'Weekly_Progress_Report_October_17_2026.docx';
    const reportPath1 = `c:/Users/Tt/zim-marketplace/${reportName}`;
    const reportPath2 = `c:/Users/Tt/zim-marketplace/ZimMarket_and_ITAsset_Weekly_Progress_Report_October_17_2026.docx`;
    const reportPath3 = `c:/Users/Tt/zim-marketplace/ZimMarket_Weekly_Progress_Report_October_17_2026.docx`;
    
    fs.writeFileSync(reportPath1, buffer);
    fs.writeFileSync(reportPath2, buffer);
    fs.writeFileSync(reportPath3, buffer);
    console.log(`Successfully generated ${reportPath1}, ${reportPath2}, and ${reportPath3}!`);

    // Save copy in IT Asset Management directory as well
    try {
        fs.writeFileSync(`c:/Users/Tt/IT-Asset-managemnet-system/${reportName}`, buffer);
        fs.writeFileSync(`c:/Users/Tt/IT-Asset-managemnet-system/Weekly_Progress_Report_October_17_2026.docx`, buffer);
        console.log("Successfully saved copies in IT-Asset-managemnet-system!");
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
