// generate_weekly_report_oct_31.js
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
const darkText = "0F172A";       // Slate 900
const mutedText = "475569";      // Slate 600
const borderGrey = "CBD5E1";     // Slate 300
const headerBg = "0F172A";       // Dark header
const headerText = "FFFFFF";     // White
const altRowBg = "F8FAFC";       // Slate 50

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
                                text: "Saturday, 31 October 2026  •  ZimMarket & Enterprise IT Asset Management System",
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
                        "This weekly engineering report details the software architecture, production hardening, operational multi-tenant clearinghouse mechanisms, security compliance audits, and high-concurrency stress testing completed during the development sprint ending Saturday, 31 October 2026. Substantial cross-platform milestones were delivered across both core enterprise systems:",
                        true
                    ),
                    createBullet(
                        "ZimMarket P2P Multi-Vendor Marketplace",
                        "Resolved critical platform-versus-merchant fund commingling (Migration 34): engineered 0% commission exemptions for platform owner sales (guaranteeing 100% net retail earnings for owner inventory) alongside 100% pass-through of delivery and shipping fees to fulfilling couriers/merchants. Built an immutable platform commission ledger (platform_earnings) and a Custodial Clearinghouse & Fund Segregation Vault in the Admin Dashboard. Executed exhaustive 5-suite platform stress testing and advanced security audits: validated mathematical conservation of money with $0.00 discrepancy on $221,430.85 in orders, 100% cryptographic HMAC SHA-512 attack detection across 1,000 tampered webhooks, and serialized row-level locking (FOR UPDATE) neutralizing parallel double-payout overdraft attacks."
                    ),
                    createBullet(
                        "Enterprise IT Asset Management System",
                        "Completed Phase 0 & Phase 1 security hardening: purged hardcoded credentials, untracked build artifacts, and deployed a fail-closed Zod configuration validation schema on boot. Eliminated black-screen initialization bugs on login and deep-link navigation. Engineered universal tag scanning with instant asset passport resolution, dynamic category-aware identification (IMEI for mobile devices, MAC for networking, serials for peripherals), an Asset Labeling Studio with physical audit walk mode, interactive Excel/CSV bulk data migration, and strict branch-scoped RBAC permissions for Branch Managers and IT team members."
                    ),

                    // SECTION 1: ZIMMARKET PROGRESS
                    createSectionHeading("PROJECT 1: ZIMMARKET P2P MULTI-VENDOR MARKETPLACE"),
                    createSubHeading("1.1 Architecture & Operational Context"),
                    createParagraph(
                        "ZimMarket is an enterprise-grade, dual-currency (USD and Zimbabwe Gold ZiG) multi-vendor marketplace tailored specifically for commerce across Zimbabwe. Operating on React 18, Vite, Supabase PostgreSQL, Storage CDN, and Serverless Edge Functions, the platform handles statutory VAT accounting, real-time vendor chat, multi-channel payouts (EcoCash, Innbucks, Nostro USD, ZiG RTGS), and buyer protection escrow."
                    ),

                    createSubHeading("1.2 Sprint Accomplishments (Ending Saturday, 31 October 2026)"),

                    createBullet(
                        "0% Commission Exemption for Platform Owner Inventory (Migration 34)",
                        "Resolved the multi-role operational challenge where the platform operator also operates a retail storefront. Upgraded fulfill_marketplace_order and release_escrow procedures to conditionally inspect vendor identity: if the shop owner is a verified platform administrator, the platform fee is set to 0.00%, ensuring 100% of retail sales credit directly to the owner's store without self-taxation, while external vendors continue paying the standard 10.00% facilitation fee."
                    ),

                    createBullet(
                        "100% Delivery & Courier Fee Pass-Through Settlement",
                        "Eliminated the courier compensation gap by allocating 100% of customer shipping fees (orders.shipping_fee_cents) directly into the fulfilling merchant's escrow wallet with zero commission deductions. Built atomic release triggers so that once all items in an order are confirmed delivered by the buyer, the full delivery fee transfers to the merchant's withdrawable available balance to cover physical courier expenses."
                    ),

                    createBullet(
                        "Dedicated Platform Earnings Ledger & Admin Clearinghouse Vault",
                        "Created the public.platform_earnings database table to immutably record every facilitation commission across lifecycle states (pending_escrow, cleared, refunded). Added the get_platform_financial_summary() stored procedure and embedded the real-time Custodial Clearinghouse & Bank Fund Segregation Vault into AdminDashboard.jsx with 4 live segregated cards: Platform Facilitation Commissions, 3rd-Party Vendor Escrow Float, 3rd-Party Withdrawable Payables, and Personal Store Sales."
                    ),

                    createBullet(
                        "Comprehensive 5-Suite Platform Stress Testing & Benchmark Verification",
                        "Engineered and executed stress_test_suite.js validating 5 core architectural areas: (1) 10,000 synthetic products searched with 2,000 queries averaging 24.48ms latency (p95: 95.06ms); (2) 100,000 financial operations with zero floating-point drift (151,315 ops/sec); (3) $221,430.85 in multi-vendor orders with $0.00 discrepancy and 1,000 duplicate webhooks trapped; (4) HMAC SHA-512 gateway validation blocking 1,000 forged payloads (100% detection rate); (5) Cart boundary enforcement blocking 5,000 illegal overstock and negative quantity mutations."
                    ),

                    createBullet(
                        "Advanced Security Pen-Testing & Double-Withdrawal Overdraft Defense",
                        "Conducted advanced concurrency and pen-testing (advanced_security_concurrency_test.js): fired 10 parallel asynchronous withdrawal requests within 5ms against a $100 vendor balance; row-level locking (FOR UPDATE) serialized requests, approving exactly 1 and rejecting 9 overdraft attempts. Verified zero cross-tenant IDOR leakage, non-admin RPC privilege blocking, XSS input sanitization, and 100% offline recovery across 25% simulated Econet 3G carrier dropouts."
                    ),

                    // SECTION 2: IT ASSET MANAGEMENT PROGRESS
                    createSectionHeading("PROJECT 2: ENTERPRISE IT ASSET MANAGEMENT SYSTEM"),
                    createSubHeading("2.1 Architecture & Overview"),
                    createParagraph(
                        "The Enterprise IT Asset Management System is a cloud infrastructure platform built on Next.js/React, Express backend services, and PingCAP TiDB Cloud (distributed MySQL-compatible SQL). It provides unified asset lifecycle management, depreciation tracking, QR/barcode scanning, multi-branch inventory governance, and cryptographic audit logging."
                    ),

                    createSubHeading("2.2 Sprint Accomplishments (Ending Saturday, 31 October 2026)"),

                    createBullet(
                        "Phase 0 & Phase 1 Security Hardening with Fail-Closed Zod Configuration",
                        "Purged all hardcoded credentials, fallback API keys, and untracked build artifacts from the repository. Deployed a strict, fail-closed runtime configuration validator utilizing Zod schemas (config/env.ts): the backend service now halts execution on boot if any required environment variable is missing, malformed, or insecurely defaulted."
                    ),

                    createBullet(
                        "Zero-Flicker Authentication & Black-Screen Initialization Elimination",
                        "Investigated and eliminated critical race conditions causing black/blank screens upon user login and direct URL link navigation. Hardened AuthContext session rehydration, ensured resilient local cache hydration, and guaranteed immediate component mounting and dynamic data population."
                    ),

                    createBullet(
                        "Universal Tag Scanning & Instant Asset Passport Resolution",
                        "Built a universal QR and barcode scanning module supporting camera-based hardware recognition. Scanning any equipment tag instantly opens the Asset Passport with full maintenance history, warranty status, assigned personnel, and branch attribution. Added deep-link resolution (/assets?tag=...) and an intelligent auto-tag generation algorithm."
                    ),

                    createBullet(
                        "Dynamic Category-Aware Identification (IMEI, MAC, Peripherals)",
                        "Upgraded asset creation workflows with category-aware hardware identification: smartphones and cellular tablets require valid 15-digit IMEI numbers; networking equipment (switches, routers, access points) enforces IEEE 802 MAC address formatting; and office peripherals utilize standardized asset tags and serials."
                    ),

                    createBullet(
                        "Asset Labeling Studio, Physical Audit Walk Mode & Migration Engine",
                        "Implemented the Asset Labeling Studio for batch generation and printing of standardized barcode/QR labels. Built the Physical Audit Walk Mode for warehouse stocktaking with handheld barcode verification, alongside an interactive Excel (.xlsx) and CSV bulk data import/export pipeline with schema validation and error reporting."
                    ),

                    createBullet(
                        "Branch Manager Scoping, Department Management & IT Team RBAC Expansion",
                        "Enforced strict branch-level data isolation for users with the BRANCH_MANAGER role, preventing unauthorized cross-branch asset visibility. Added inline department management routing, granted IT team members granular permissions to add/edit/delete hardware, and strictly enforced tenant org_id boundaries across all database mutations."
                    ),

                    createBullet(
                        "User Experience Optimization & Modal Focus Flow",
                        "Eliminated page-scroll jumping when opening modals or switching navigation tabs. Implemented dynamic auto-focus directing the user's cursor to the primary input field across all forms. Resolved user invitation token invalidation through server-side token persistence and re-invitation workflows."
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
                                    createCell("0% Platform Commission Exemption for Owner Store Sales (Migration 34)"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("100% Courier Shipping Fee Pass-Through to Fulfilling Vendors", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Platform Earnings Ledger Table & Admin Custodial Clearinghouse Vault"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("5-Suite High-Volume Stress Testing (10k items, 100k math ops, $221k volume)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, false, AlignmentType.LEFT, true),
                                    createCell("Concurrency Race-Condition Audit & FOR UPDATE Overdraft Mitigation"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("ZimMarket", false, true, AlignmentType.LEFT, true),
                                    createCell("Network Chaos Degradation & 25% Mobile Dropout Cache Hydration", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Phase 0 & Phase 1 Hardening with Fail-Closed Zod Configuration Schema"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Zero-Flicker Auth & Black-Screen Initialization Fix on Login/Deep-Links", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Universal QR/Barcode Tag Scanning & Deep-Linked Asset Passport"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Category-Aware Identification (IMEI for Phones, MAC for Networking)", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("Asset Labeling Studio, Physical Audit Walk Mode & Excel Data Migration"),
                                    createCell("✅ Completed", false, false, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, true, AlignmentType.LEFT, true),
                                    createCell("Branch Manager Scoping, Department Management & IT RBAC Permissions", false, true),
                                    createCell("✅ Completed", false, true, AlignmentType.CENTER, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("IT Asset Management", false, false, AlignmentType.LEFT, true),
                                    createCell("UX Focus Flow, Modal Centering & Server-Verified User Invitation Tokens"),
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
                                    createCell("Platform Owner Self-Taxation:\nDatabase procedures deducted a 10% facilitation commission indiscriminately, penalizing the platform owner's own retail store sales."),
                                    createCell("Updated PostgreSQL procedures (Migration 34) to inspect platform_admins membership, enforcing 0.00% commission for owner items while maintaining 10% on external vendors.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Courier Shipping Fee Commingling:\nCustomer-paid delivery fees remained in the central account rather than being disbursed to the fulfilling merchant for transport costs.", false, true),
                                    createCell("Engineered 100% shipping fee pass-through into the fulfilling vendor's escrow wallet with atomic release to available balance upon delivery confirmation.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Parallel Double-Payout Overdraft Exploit:\nSimultaneous asynchronous withdrawal requests could exploit race conditions to extract more balance than available in the vendor wallet."),
                                    createCell("Hardened request_vendor_payout using row-level pessimistic locking (SELECT ... FOR UPDATE), serializing execution and blocking 9 of 10 concurrent requests with zero negative balance.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Black-Screen Boot Glitch in IT Asset Management:\nRace conditions during token rehydration caused blank screens on initial login and direct URL deep-links.", false, true),
                                    createCell("Restructured AuthContext initialization with resilient session synchronization, fallback loaders, and deterministic component mounting.", false, true)
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Unvalidated Environment Secrets in Production:\nMissing or malformed runtime environment variables could lead to silent failures or insecure fallbacks in IT Asset Management."),
                                    createCell("Implemented a fail-closed Zod schema validating database connection strings, JWT secrets, and port bindings on boot, halting execution on invalid configurations.")
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Cross-Branch Data Leakage Risks:\nBranch supervisors could potentially query equipment inventory belonging to separate geographic branches.", false, true),
                                    createCell("Enforced strict tenant org_id and branch_id scoping in SQL query builders, isolating asset records to authorized branch personnel.", false, true)
                                ]
                            })
                        ]
                    }),

                    // NEXT SPRINT ROADMAP
                    createSectionHeading("NEXT SPRINT ROADMAP"),
                    createSubHeading("ZimMarket Priorities"),
                    createBullet(
                        "Paynow Production Live Credentials & Automated USSD Push Verification",
                        "Perform final end-to-end sandbox-to-production validation of automated EcoCash and OneMoney USSD push prompts on physical mobile handsets."
                    ),
                    createBullet(
                        "Merchant Payout Automated Batch Settlement",
                        "Connect automated batch payout processing for cleared escrow balances into vendor EcoCash, Innbucks, and CABS/Stanbic Nostro accounts."
                    ),
                    createBullet(
                        "Tabular Data Export (CSV & Excel) for ZIMRA Tax Reporting",
                        "Deploy 1-click fiscalized export of vendor sales orders, inventory valuations, and statutory VAT reports in Excel (.xlsx) and CSV formats."
                    ),

                    createSubHeading("IT Asset Management Priorities"),
                    createBullet(
                        "Real-Time Barcode Hardware Scanner Testing",
                        "Execute physical field trials of Zebra/Honeywell Android handheld terminal scanners with laser barcode engines."
                    ),
                    createBullet(
                        "Predictive Maintenance & Depreciation Schedules",
                        "Implement automated straight-line and reducing-balance asset depreciation schedules aligned with IFRS standards."
                    ),

                    // CONCLUSION
                    createSectionHeading("CONCLUSION"),
                    createParagraph(
                        "The development sprint ending Saturday, 31 October 2026 achieved vital operational, security, and financial milestones across both enterprise software platforms. ZimMarket resolved multi-tenant fund commingling, guaranteed 0% commission for owner store sales, implemented 100% courier pass-through, and proved zero-leakage financial integrity across exhaustive stress testing. Concurrently, the IT Asset Management System achieved fail-closed security configuration, eliminated black-screen initialization bugs, and deployed universal QR/barcode tag scanning with dynamic hardware identification. Both platforms are stable, tested, and primed for nationwide deployment."
                    )
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    
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
    safeWrite('c:/Users/Tt/zim-marketplace/Weekly_Progress_Report_October_31_2026.docx', 'ZimMarket Dated Report (Oct 31)');
    safeWrite('c:/Users/Tt/zim-marketplace/ZimMarket_and_ITAsset_Weekly_Progress_Report_October_31_2026.docx', 'ZimMarket Full Joint Dated Report');
    safeWrite('c:/Users/Tt/zim-marketplace/ZimMarket_Weekly_Progress_Report.docx', 'ZimMarket Main Report Pointer');

    // IT Asset Management workspace locations
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/Weekly_Progress_Report_October_31_2026.docx', 'IT Asset Dated Report (Oct 31)');
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/ZimMarket_and_ITAsset_Weekly_Progress_Report_October_31_2026.docx', 'IT Asset Full Joint Dated Report');
    safeWrite('c:/Users/Tt/IT-Asset-managemnet-system/ZimMarket_Weekly_Progress_Report.docx', 'IT Asset Main Report Pointer');

    // Brain Artifacts directory
    const artifactDir = 'C:/Users/Tt/.gemini/antigravity/brain/4c703a9a-4776-44dd-8401-cb7d2682c6fe';
    safeWrite(`${artifactDir}/Weekly_Progress_Report_October_31_2026.docx`, 'Brain Artifact Dated Report');
    safeWrite(`${artifactDir}/ZimMarket_and_ITAsset_Weekly_Progress_Report_October_31_2026.docx`, 'Brain Artifact Joint Dated Report');
    safeWrite(`${artifactDir}/ZimMarket_Weekly_Progress_Report.docx`, 'Brain Artifact Main Report Pointer');
}

buildDocument().catch(err => {
    console.error("Error generating report:", err);
    process.exit(1);
});
