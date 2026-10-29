import LegalPage, { LegalSection } from "./LegalPage";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "October 29, 2026";

const SECTIONS = [
  { id: "trial", label: "Free trials" },
  { id: "request-window", label: "Refund request window" },
  { id: "not-covered", label: "Renewals, cancellation & exceptions" },
  { id: "processing", label: "How refunds are processed" },
  { id: "contact", label: "Submit a request" },
];

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="This policy explains how free trials, subscription cancellations, and refund requests work for ExecUI services provided by SUL TECH."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
    >
      <LegalSection id="trial" title="1. Free trials">
        <p>
          Plans include different free trial periods: Starter and Standard
          provide 14 days; Premium, Enterprise, and Executive provide one month.
          The exact end date, selected plan, and price that will apply afterward
          are shown during checkout. No subscription fee is charged during the
          trial period. Unless you cancel before the displayed trial end date,
          the subscription may convert to the paid plan selected at checkout.
        </p>
        <p>
          If you do not want the paid subscription to begin, cancel before the
          trial ends using the account billing controls or the payment provider
          shown at checkout. The trial duration for your account is the one
          displayed at checkout.
        </p>
      </LegalSection>

      <LegalSection id="request-window" title="2. Refund request window">
        <p>
          The refund request window begins only after the free trial ends and
          Paddle successfully captures the first subscription payment. You may
          submit a request within 30 days of that first paid charge. This
          initial-subscription refund window applies to the first paid charge
          only; it does not restart for later renewal charges.
        </p>
        <p>
          Requests are reviewed by SUL TECH. A request does not automatically
          qualify for a refund and does not by itself cancel the subscription.
          Nothing in this policy limits a refund or other right that applicable
          law requires us to provide.
        </p>
      </LegalSection>

      <LegalSection id="not-covered" title="3. Renewals, cancellation & exceptions">
        <p>
          Subscriptions renew at the billing interval and price disclosed at
          checkout until canceled. Canceling stops future renewals; it does not
          automatically refund a charge already made or provide a prorated
          refund for unused time in a billing period.
        </p>
        <p>
          This policy does not limit rights that cannot be waived under
          applicable consumer or other mandatory laws. If you believe a charge
          was unauthorized, duplicated, or incorrect, please identify that in
          your request so it can be reviewed promptly.
        </p>
      </LegalSection>

      <LegalSection id="processing" title="4. How refunds are processed">
        <p>
          Refund requests are reviewed by SUL TECH and, when needed, coordinated
          with Paddle support. Refunds are processed manually in Paddle; this
          website does not issue a refund automatically when a request is
          submitted or approved. If approved and issued, the refund is returned
          through the original payment method where supported. Posting times
          depend on Paddle and the financial institution.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="5. Submit a request">
        <p>
          Enterprise administrators can submit a request from their signed-in
          workspace. The form looks up the first captured subscription charge
          and its deadline from Paddle, so you do not need to enter payment
          details. Never submit card or bank credentials.
        </p>
        <p>
          <Link
            to="/account/refunds"
            className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
          >Sign in to submit a refund request</Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
