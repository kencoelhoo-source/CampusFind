import { LegalLayout } from "@/components/layout/LegalLayout";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <LegalLayout title="About CampusFind" updated="September 2026">
      <section>
        <h2>Our Mission</h2>
        <p>
          Misplaced belongings are an everyday campus reality. At St. Francis Institute of Technology (SFIT), lost ID cards, calculators, earbuds, notebooks, and keys often trigger frantic WhatsApp forwards or sit forgotten in security offices.
        </p>
        <p>
          CampusFind is a dedicated, campus-confined Lost &amp; Found portal engineered specifically for SFIT. It replaces scattered bulletin boards and group chats with a centralized, searchable registry designed to return misplaced belongings quickly, securely, and transparently.
        </p>
      </section>

      <section>
        <h2>How It Works</h2>
        <ul>
          <li>
            <strong>Open Browse:</strong> Anyone on campus can browse the active lost and found board without an account.
          </li>
          <li>
            <strong>SFIT Perimeter Security:</strong> Posting and claiming require signing in with an official college Google account (<strong>@student.sfit.ac.in</strong> or <strong>@sfit.ac.in</strong>). Outside domains are strictly barred.
          </li>
          <li>
            <strong>Structured Verification:</strong> To claim an item, students submit private proof (such as lock screen wallpaper details, engravings, or pouch contents). The finder reviews and confirms legitimacy before meeting.
          </li>
          <li>
            <strong>Safe Campus Handovers:</strong> Physical handovers occur only at recognized on-campus spots — the Central Library, Quadrangle, Canteen, or Security Desk.
          </li>
        </ul>
      </section>

      <section>
        <h2>Privacy by Default</h2>
        <p>
          Public notice boards and group chats frequently leak personal phone numbers and emails. CampusFind redacts contact details on public listings. All claim exchanges remain strictly one-on-one between the finder and claimant. Learn more in our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Community &amp; Open Source</h2>
        <p>
          CampusFind was designed and developed by{" "}
          <a
            href="https://github.com/kencoelhoo-source"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ken Coelho
          </a>{" "}
          for the students, faculty, and staff of St. Francis Institute of Technology. The platform is open-source, non-commercial, and engineered to operate permanently at zero cost within cloud free tiers.
        </p>
        <p>
          You can inspect the codebase, suggest improvements, or report issues on{" "}
          <a
            href="https://github.com/kencoelhoo-source"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Guidelines &amp; Terms</h2>
        <p>
          Using CampusFind requires treating fellow students' belongings with integrity. For our community standards and service terms, please review our{" "}
          <Link to="/terms">Terms of Use</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
