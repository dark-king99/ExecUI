import LegalPage, { LegalSection } from "./LegalPage";

const EFFECTIVE_DATE = "October 28, 2026";
const REFUND_REQUEST_URL = "https://executiveui.com/refunds";

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
          Some plans may include a free trial of up to one month. The trial
          duration, end date, selected plan, and price that will apply afterward
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
          You may submit a refund request within 14 calendar days of the first
          paid subscription charge. Requests must identify the account and
          transaction, and are reviewed based on the circumstances, payment
          provider requirements, and applicable law. Submitting a request does
          not by itself cancel your subscription.
        </p>
        <p>
          Refund requests for later renewal charges are not covered by this
          initial-charge request window. We may review exceptional cases, and
          nothing in this policy limits a refund or other right that applicable
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
          Approved refunds are returned through the original payment method
          where supported. The time it takes for a refund to appear depends on
          the payment provider and financial institution. Taxes, currency
          conversion, and payment-provider processing are handled according to
          the information shown at checkout and applicable law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="5. Submit a request">
        <p>
          Submit refund requests and include the account email, transaction or
          invoice reference, charge date, and a short explanation:
        </p>
        <p>
          <a
            href={REFUND_REQUEST_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
          >
            Open the SUL TECH refund request page
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
