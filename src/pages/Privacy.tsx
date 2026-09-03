import { LegalLayout } from "@/components/layout/LegalLayout";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 2026">
      <section>
        <h2>What this covers</h2>
        <p>
          CampusFind is a lost-and-found portal for St. Francis Institute of Technology. This policy explains what we collect, why, and how long we keep it. Using the site means you agree to this policy and the{" "}
          <Link to="/terms">Terms</Link>.
        </p>
      </section>

      <section>
        <h2>Who can create an account</h2>
        <p>
          Access is limited to Google accounts ending in <strong>@student.sfit.ac.in</strong> or <strong>@sfit.ac.in</strong>. Other domains are rejected at sign-in.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>Your Google name and SFIT email when you sign in.</li>
          <li>Item listings you create: title, description, category, location, date, and photos.</li>
          <li>Claim messages, verification questions and answers, meeting notes, and appeals.</li>
          <li>In-app notifications tied to your account.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          We use this data only to run CampusFind: show listings, verify claims, notify the people involved, and keep the campus board accurate. We do not sell personal data or use it for advertising.
        </p>
      </section>

      <section>
        <h2>What other users can see</h2>
        <p>
          Anyone signed in can see listing details and the poster’s display name. Claim text, answers, and meeting details stay between the poster and the claimant. Email addresses are not shown on public cards.
        </p>
      </section>

      <section>
        <h2>Storage and security</h2>
        <p>
          Data is stored in a hosted database with row-level access rules. Photos live in private project storage referenced by your listing. No method of transmission is perfectly secure; do not post government IDs, passwords, or payment details in listings or claims.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          You can delete your own listings from the dashboard. If you want your account and remaining records removed, contact the CampusFind maintainers through the SFIT student community. We may keep minimal logs needed to investigate abuse.
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
