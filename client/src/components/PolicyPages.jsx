// client/src/components/PolicyPages.jsx
// Terms of Service, Privacy Policy and Refunds & Escrow policy.
// DRAFTS written from how the platform actually works (escrow, 7-day auto-release, refunds,
// KYC). They must be reviewed by a Zimbabwean lawyer before being relied on; the banner says so.
// Facts that the code enforces are referenced so they stay in sync when the code changes:
//   - auto-release after 7 days: supabase/migrations/..._046_escrow_auto_release_and_payout_refs.sql
//   - unpaid orders cancelled after 2 hours: migration 035 expire_stale_pending_orders
//   - notification retention 90 days (047), error-log retention 30 days (049)

const LAST_UPDATED = '21 November 2026';

const pageStyle = {
    maxWidth: '820px',
    margin: '0 auto',
    padding: '32px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    lineHeight: 1.65,
    fontSize: '15px',
};

const h1 = { color: 'var(--text-primary)', fontSize: '28px', margin: '0 0 4px 0' };
const h2 = { color: 'var(--text-primary)', fontSize: '19px', margin: '28px 0 8px 0' };

function DraftBanner() {
    return (
        <div role="note" style={{ margin: '16px 0 8px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--warning, #d97706)', backgroundColor: 'rgba(217, 119, 6, 0.1)', fontSize: '13px', color: 'var(--text-primary)' }}>
            Draft policy, pending review by a Zimbabwean legal practitioner. If anything here is unclear, ask us through the 💬 chat before you buy or sell.
        </div>
    );
}

function PolicyNav({ current, onNavigate }) {
    const links = [
        ['terms', 'Terms of Service'],
        ['privacy', 'Privacy Policy'],
        ['refunds', 'Refunds & Escrow'],
    ];
    return (
        <nav aria-label="Policies" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {links.map(([view, label]) => (
                <button key={view} type="button" onClick={() => onNavigate(view)}
                    className={current === view ? 'btn-primary' : 'btn-secondary'}
                    aria-current={current === view ? 'page' : undefined}
                    style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '20px' }}>
                    {label}
                </button>
            ))}
        </nav>
    );
}

function Terms() {
    return (
        <>
            <h1 style={h1}>Terms of Service</h1>
            <p style={{ margin: 0, fontSize: '13px' }}>Last updated {LAST_UPDATED}</p>
            <DraftBanner />

            <h2 style={h2}>1. What ZimMarket is</h2>
            <p>ZimMarket is an online marketplace where independent sellers ("vendors") list products and buyers purchase them. Unless a listing says it is sold by ZimMarket's own store, the contract of sale is between the buyer and the vendor. ZimMarket provides the platform, takes payment, holds it in escrow and releases it as described in the Refunds &amp; Escrow policy.</p>

            <h2 style={h2}>2. Accounts</h2>
            <ul>
                <li>You must be at least 18, or have a parent or guardian's permission, to create an account.</li>
                <li>Give accurate details and keep your password private. You are responsible for activity on your account.</li>
                <li>Admin accounts must use two-factor sign-in.</li>
                <li>We may suspend accounts used for fraud, abuse, prohibited goods, or to get around these terms.</li>
            </ul>

            <h2 style={h2}>3. Buying</h2>
            <ul>
                <li>Prices are shown in US dollars, with a ZiG equivalent at the displayed rate for information. You pay the amount shown at checkout, which includes delivery where it applies and any promo discount.</li>
                <li>Payments are processed by Paynow (EcoCash, OneMoney, cards and other methods they offer). ZimMarket never sees your card or mobile-money PIN.</li>
                <li>Orders that are not paid within 2 hours are cancelled automatically and the stock is released.</li>
                <li>Confirm delivery in My Orders when your items arrive, or report a problem. If you do neither, payment is released to the vendor 7 days after the item was marked as shipped.</li>
            </ul>

            <h2 style={h2}>4. Selling</h2>
            <ul>
                <li>Vendors must complete identity verification before selling, and must only list goods they have the right to sell and that are legal in Zimbabwe.</li>
                <li>Listings must describe the product honestly, including condition, specifications and price.</li>
                <li>Ship paid orders promptly and mark them as shipped. Sale proceeds, less ZimMarket's commission, become available for withdrawal when the buyer confirms delivery or the 7-day period ends without a reported problem.</li>
                <li>Payouts are sent to the EcoCash or bank details you provide. We record the transaction reference for each payout.</li>
            </ul>

            <h2 style={h2}>5. Prohibited items and conduct</h2>
            <p>No counterfeit, stolen, illegal, hazardous-without-licence or recalled goods; no misleading listings; no harassment in chat; no attempts to take payment outside ZimMarket for orders placed on ZimMarket.</p>

            <h2 style={h2}>6. Fees</h2>
            <p>ZimMarket charges vendors a commission on each sale, shown in the vendor dashboard. Buyers pay the listed price and delivery fee; there is no extra buyer fee unless shown at checkout.</p>

            <h2 style={h2}>7. Liability</h2>
            <p>Vendors are responsible for the goods they sell. ZimMarket's escrow and dispute process is designed to protect both sides, but to the extent the law allows, ZimMarket is not liable for indirect losses, and its liability on any order is limited to the amount paid for that order. Nothing in these terms limits rights you have under the Consumer Protection Act [Chapter 14:44] or other Zimbabwean law that cannot be excluded.</p>

            <h2 style={h2}>8. Changes and governing law</h2>
            <p>We may update these terms; the date above shows the latest version, and significant changes will be announced in the app. These terms are governed by the laws of Zimbabwe.</p>
        </>
    );
}

function Privacy() {
    return (
        <>
            <h1 style={h1}>Privacy Policy</h1>
            <p style={{ margin: 0, fontSize: '13px' }}>Last updated {LAST_UPDATED}</p>
            <DraftBanner />

            <p>This policy explains what personal information ZimMarket collects, why, and your rights under the Cyber and Data Protection Act [Chapter 12:07] (2021).</p>

            <h2 style={h2}>What we collect</h2>
            <ul>
                <li><strong>Account:</strong> email address, password (stored only as a secure hash by our authentication provider), and your role (buyer, vendor, admin).</li>
                <li><strong>Orders:</strong> delivery name, address, city, province and phone number; what you bought, prices and order status.</li>
                <li><strong>Payments:</strong> the payment reference and status from Paynow. We do not receive card numbers or mobile-money PINs.</li>
                <li><strong>Vendors:</strong> store details, WhatsApp number, payout details (EcoCash number or bank account) and identity documents for verification.</li>
                <li><strong>Messages:</strong> chats between buyers and vendors, and problem reports.</li>
                <li><strong>Technical:</strong> browser type and the page address when the app hits an error, to help us fix it.</li>
            </ul>

            <h2 style={h2}>Why we use it</h2>
            <ul>
                <li>To run your account, process orders and payments, deliver goods and pay vendors (performing our contract with you).</li>
                <li>To verify vendors and prevent fraud (legitimate interest and legal obligation).</li>
                <li>To send order, shipping and payout notifications in the app.</li>
                <li>To keep financial records required by law.</li>
            </ul>
            <p>We do not sell your personal information or use it for third-party advertising.</p>

            <h2 style={h2}>Who sees it</h2>
            <ul>
                <li>Vendors see the delivery details of orders placed with them, so they can deliver.</li>
                <li>ZimMarket admins see orders, disputes and verification documents to run the platform.</li>
                <li>Service providers who host or process data for us: Supabase (database, authentication and file storage), Vercel (website hosting) and Paynow (payments). Some of these store data outside Zimbabwe, with safeguards required by the Act.</li>
                <li>Authorities, where the law requires it.</li>
            </ul>

            <h2 style={h2}>How long we keep it</h2>
            <ul>
                <li>Order and payment records: as long as tax and financial record-keeping law requires.</li>
                <li>In-app notifications: 90 days. Browser error reports: 30 days.</li>
                <li>Identity documents: while your vendor account is active, and afterwards only as long as the law requires.</li>
            </ul>

            <h2 style={h2}>Your rights</h2>
            <p>Under the Cyber and Data Protection Act you can ask to see the personal information we hold about you, have it corrected, object to its use, or have it deleted where we are not required to keep it. Contact us through the 💬 chat in the app. You can also complain to the Data Protection Authority (POTRAZ).</p>

            <h2 style={h2}>Security</h2>
            <p>Data is encrypted in transit, access is limited by role at the database level, identity documents are stored privately, and admin accounts require two-factor sign-in. No system is perfectly secure; if we learn of a breach affecting you, we will notify you and the Authority as the law requires.</p>
        </>
    );
}

function Refunds() {
    return (
        <>
            <h1 style={h1}>Refunds &amp; Escrow</h1>
            <p style={{ margin: 0, fontSize: '13px' }}>Last updated {LAST_UPDATED}</p>
            <DraftBanner />

            <h2 style={h2}>How escrow works</h2>
            <ol>
                <li>You pay at checkout. ZimMarket holds the money; the vendor does not receive it yet.</li>
                <li>The vendor ships and marks the item as shipped.</li>
                <li>When it arrives, press <strong>"I received my order"</strong> in My Orders. The money is then released to the vendor.</li>
                <li>If you don't confirm or report a problem, the money is released automatically <strong>7 days after the item was marked as shipped</strong>. The date is shown on each item in My Orders.</li>
            </ol>

            <h2 style={h2}>Something wrong? Report it before the 7 days end</h2>
            <p>Press <strong>"Report a problem"</strong> on the item in My Orders and describe what happened (not delivered, damaged, wrong item, not as described). This puts the payment on hold. ZimMarket reviews the case with you and the vendor, usually over WhatsApp or the in-app chat, and may ask for photos.</p>

            <h2 style={h2}>Outcomes</h2>
            <ul>
                <li><strong>Refund:</strong> if the item was not delivered, or is materially different from the listing or faulty, you are refunded what you paid for that item. Where the whole order is refunded, the delivery fee is refunded too.</li>
                <li><strong>Release to vendor:</strong> if the item was delivered as described.</li>
                <li>Return of the goods may be required before a refund; ZimMarket will tell you how.</li>
            </ul>

            <h2 style={h2}>How refunds are paid</h2>
            <p>Refunds are sent to you by ZimMarket (EcoCash, or the method agreed with you), and we record the transaction reference. We aim to pay approved refunds within 7 working days.</p>

            <h2 style={h2}>Cancelled and unpaid orders</h2>
            <p>An order that is never paid is cancelled automatically after 2 hours and nothing is charged. If a payment went through but the order could not be fulfilled, you are refunded in full.</p>

            <h2 style={h2}>Your statutory rights</h2>
            <p>This policy is in addition to your rights under the Consumer Protection Act [Chapter 14:44].</p>
        </>
    );
}

const PAGES = { terms: Terms, privacy: Privacy, refunds: Refunds };

export function PolicyPage({ page, onNavigate }) {
    const Body = PAGES[page] || Terms;
    return (
        <article className="glass-panel" style={pageStyle}>
            <PolicyNav current={page} onNavigate={onNavigate} />
            <Body />
        </article>
    );
}

// Small footer with the policy links, shown under the shop and policy pages
export function SiteFooter({ onNavigate }) {
    return (
        <footer className="site-footer">
            <span>© {new Date().getFullYear()} ZimMarket</span>
            <button type="button" onClick={() => onNavigate('terms')}>Terms</button>
            <button type="button" onClick={() => onNavigate('privacy')}>Privacy</button>
            <button type="button" onClick={() => onNavigate('refunds')}>Refunds &amp; Escrow</button>
        </footer>
    );
}

export default PolicyPage;
