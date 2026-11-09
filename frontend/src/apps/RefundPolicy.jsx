import LegalPage, { LegalSection } from "./LegalPage";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "November 9, 2026";

const SECTIONS = [
  { id: "trial", label: "Free trials" },
  { id: "request-window", label: "Refund request window" },
  { id: "not-covered", label: "Renewals, cancellation & legal rights" },
  { id: "processing", label: "How requests are reviewed" },
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
          After the free trial ends and the first subscription payment is
          successfully captured, you may submit a refund request within 30 days
          of that charge. This request window applies to the first paid charge
          only and does not restart for later renewals. A free trial is not a
          refund and does not start the request window.
        </p>
        <p>
          This is a window to request and receive a review; it is not a promise
          that every request will be approved or that a refund is guaranteed.
          Requests are assessed under the transaction terms, the payment
          provider’s applicable rules, and mandatory legal rights. Submitting a
          request does not by itself cancel a subscription.
        </p>
      </LegalSection>

      <LegalSection id="not-covered" title="3. Renewals, cancellation & exceptions">
        <p>
          Subscriptions renew at the interval and price disclosed at checkout
          until canceled. Canceling stops future renewals; it does not
          automatically refund a charge already made or provide a prorated
          refund for unused time in a billing period. Use the cancellation
          controls provided for your subscription or contact the payment
          provider identified at checkout.
        </p>
        <p>
          Nothing in this policy limits rights or remedies that cannot be
          waived under applicable law. If you believe a charge was unauthorized,
          duplicated, or incorrect, contact the payment provider and SUL TECH
          promptly so the issue can be investigated.
        </p>
      </LegalSection>

      <LegalSection id="processing" title="4. How refunds are processed">
        <p>
          Submit a request through the in-product refund form where available,
          or through the payment provider’s support process. SUL TECH reviews
          requests and may coordinate with the provider. The provider identified
          at checkout determines how an approved refund can be issued and
          returned; ExecUI does not promise that submitting a form automatically
          issues a refund. Processing and posting times depend on the provider
          and the financial institution. Do not send card or bank credentials
          with a request.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="5. Submit a request">
        <p>
          Enterprise administrators can submit a request from their signed-in
          workspace. Where available, the signed-in form uses billing
          information on file to identify the relevant first paid charge.
          Otherwise, contact the payment provider shown at checkout and SUL
          TECH for assistance. Do not send card or bank credentials.
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
