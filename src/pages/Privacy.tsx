import { LegalLayout } from "@/components/layout/LegalLayout";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 2026">
      <section>
        <h2>What this covers</h2>
        <p>
          CampusFind is a lost-and-found board for St. Francis Institute of Technology. This policy explains what we collect, who can see it, and how long we keep it. Using the site means you agree to this policy and the{" "}
          <Link to="/terms">Terms</Link>.
        </p>
      </section>

      <section>
        <h2>Who can create an account</h2>
        <p>
          Signing in is limited to Google accounts on <strong>@student.sfit.ac.in</strong> or <strong>@sfit.ac.in</strong>. Other domains are rejected. You can browse listings without an account.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>Your Google display name and SFIT email when you sign in. Email is used for the account, not shown on listings.</li>
          <li>Listings you create: title, description, category, campus location, date, and photos.</li>
          <li>Claim messages and optional public pickup notes between you and the other person on a listing.</li>
          <li>In-app notifications about claims on your listings, and email copies of those alerts when mail is configured.</li>
        </ul>
      </section>

      <section>
        <h2>What other people can see</h2>
        <p>
          The board is public. Anyone with the link can see listing titles, descriptions, locations, dates, photos, and the poster’s display name. They cannot see your email.
        </p>
        <p>
          Claim text and pickup notes stay between the poster and the claimant. Do not put phone numbers, ID scans, or home addresses in a listing or claim if you do not want that stored. Use a public campus place (library, canteen, security) — never a private spot.
        </p>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          We use this data only to run CampusFind: show the board, send claim alerts, and let you accept or decline a return. We do not sell personal data or use it for advertising.
        </p>
      </section>

      <section>
        <h2>Storage and security</h2>
        <p>
          Account data lives in a hosted database with row-level access rules. Listing photos are stored so they can be shown on the public board — treat every photo as visible to the campus. Access to posting, claiming, and your inbox requires your SFIT Google account. No method of transmission is perfectly secure.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          You can delete your own listings from Dashboard → Posted. Photos for that listing are removed with it. If you want your account and remaining records removed, contact the CampusFind maintainers through the SFIT student community. We may keep minimal logs needed to investigate abuse.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes in a material way, we will update the date on this page. Continued use after an update means you accept the revised policy.
        </p>
      </section>
    </LegalLayout>
  );
}
