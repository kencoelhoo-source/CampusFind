import { LegalLayout } from "@/components/layout/LegalLayout";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" updated="September 2026">
      <section>
        <h2>The short version</h2>
        <p>
          CampusFind is a community tool for SFIT students and staff. Use it honestly, only with your college Google account, and treat other people’s belongings with care. These terms sit alongside the{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Eligibility</h2>
        <p>
          You may use CampusFind only if you sign in with <strong>@student.sfit.ac.in</strong> or <strong>@sfit.ac.in</strong>. Accounts from any other domain are not permitted and may be signed out automatically.
        </p>
      </section>

      <section>
        <h2>Your listings and claims</h2>
        <ul>
          <li>Post only items you lost or actually found on or around campus.</li>
          <li>Do not upload photos of other people without a reason, or images that are illegal or harassing.</li>
          <li>Claim only items you believe are yours. False claims can get your access revoked.</li>
          <li>Meet in public campus spaces. CampusFind does not arrange shipping or payments.</li>
        </ul>
      </section>

      <section>
        <h2>Not a guarantee</h2>
        <p>
          We cannot promise that every item will be recovered, that every claim is truthful, or that the service will always be available. High-value, dangerous, or official documents should also be reported to campus administration or security.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not scrape the site, attempt to bypass the email restriction, spam listings, impersonate others, or interfere with other users. We may remove content or disable accounts that break these rules.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          You keep rights to photos and text you upload, and you grant CampusFind a limited license to display them for the lost-and-found service. The CampusFind name and interface remain with the project.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          CampusFind is provided as-is for educational and community use. To the extent allowed by law, the maintainers are not liable for lost items, disputes between users, or outages.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. The date at the top is the latest version. If you do not agree, stop using the service and delete your listings.
        </p>
      </section>
    </LegalLayout>
  );
}
