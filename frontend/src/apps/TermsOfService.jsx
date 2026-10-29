import LegalPage, { LegalSection } from "./LegalPage";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "October 29, 2026";

const SECTIONS = [
  { id: "agreement", label: "Agreement & eligibility" },
  { id: "service", label: "The service" },
  { id: "accounts", label: "Accounts & administrators" },
  { id: "plans", label: "Plans, trials & payment" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "customer-data", label: "Customer data & privacy" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "availability", label: "Availability & changes" },
  { id: "suspension", label: "Suspension & termination" },
  { id: "warranties", label: "Warranties & liability" },
  { id: "general", label: "General terms & contact" },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These Terms govern access to and use of ExecUI, an enterprise operations platform provided by SUL TECH. They describe the responsibilities of the organization that subscribes and the people it authorizes to use the service."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
    >
      <LegalSection id="agreement" title="1. Agreement & eligibility">
        <p>
          By creating an organization account, accepting these Terms, or using
          ExecUI, you agree to them on behalf of yourself and, if applicable,
          the organization you represent. You confirm that you are authorized
          to bind that organization. If you do not agree, do not access or use
          the service.
        </p>
        <p>
          If your organization has a separate written agreement with SUL TECH
          covering ExecUI, that agreement controls where it expressly conflicts
          with these Terms.
        </p>
      </LegalSection>

      <LegalSection id="service" title="2. The service">
        <p>
          ExecUI provides organization workspaces and the product modules and
          features made available for the selected plan. Available capabilities
          may include customer relationship management, marketing, network
          operations, analytics, business services, and administrative tools.
          Features, limits, and access depend on the plan and configuration
          shown to the organization.
        </p>
        <p>
          The service is intended for organizations and their authorized users.
          You may use it only for your internal business purposes and in
          accordance with these Terms, your plan, and applicable law.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="3. Accounts & administrators">
        <p>
          You must provide accurate account information and keep it current.
          Organization administrators are responsible for managing access,
          assigning roles, removing users who no longer need access, and
          maintaining the confidentiality of account credentials.
        </p>
        <p>
          You are responsible for activity under your account and for ensuring
          that your users comply with these Terms. Notify SUL TECH promptly if
          you suspect unauthorized access or a security incident affecting your
          account.
        </p>
      </LegalSection>

      <LegalSection id="plans" title="4. Plans, trials & payment">
        <p>
          Plan features, billing interval, price, currency, and applicable taxes
          are disclosed at checkout or in a written order. Subscription plans
          renew automatically for the stated billing interval unless canceled
          before the next renewal date. The payment provider identified at
          checkout processes the transaction and may apply its own terms.
        </p>
        <p>
          Starter and Standard plans include a 14-day free trial; Premium,
          Enterprise, and Executive plans include a one-month free trial. The
          applicable trial end date and price are shown at checkout. No
          subscription fee is charged during that displayed trial. Unless the
          subscription is canceled before the trial ends, it may convert to the
          paid plan selected at checkout, and recurring charges will begin as
          disclosed there.
        </p>
        <p>
          Cancellation stops future renewals but does not automatically refund
          a charge already made. Refund requests are governed by our{" "}
          <Link to="/refunds" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Refund Policy
          </Link>
          , subject to rights that applicable law does not allow us to limit.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="5. Acceptable use">
        <p>
          You must not, and must not allow others to:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>use ExecUI unlawfully, deceptively, or to violate another person's rights;</li>
          <li>attempt to access another tenant's workspace, accounts, or data without authorization;</li>
          <li>interfere with the service, bypass access controls, or introduce malicious code;</li>
          <li>reverse engineer or copy the service except where applicable law permits;</li>
          <li>use the service to send unlawful, unsolicited, or harmful communications; or</li>
          <li>resell, sublicense, or make the service available to others except as authorized by SUL TECH in writing.</li>
        </ul>
        <p>
          You are responsible for having the rights and permissions needed for
          the information and content you submit to or process through ExecUI.
        </p>
      </LegalSection>

      <LegalSection id="customer-data" title="6. Customer data & privacy">
        <p>
          As between you and SUL TECH, your organization retains its rights to
          the data and content it submits to ExecUI ("Customer Data"). You grant
          SUL TECH the limited permission to host, process, transmit, and display
          Customer Data as needed to provide, secure, and support the service,
          and as otherwise permitted by your instructions and applicable law.
        </p>
        <p>
          Your organization is responsible for ensuring it has a lawful basis
          for Customer Data it submits and for configuring user access
          appropriately. Our{" "}
          <a href="/privacy" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Privacy Policy
          </a>{" "}
          describes how personal information is handled. Data retention and
          deletion are governed by that policy and any applicable written
          agreement.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="7. Intellectual property">
        <p>
          SUL TECH and its licensors retain all rights in ExecUI, including its
          software, design, documentation, and branding. These Terms grant you
          a limited, non-exclusive, non-transferable right to use the service
          during your subscription, subject to your plan and these Terms.
        </p>
        <p>
          If you provide suggestions or feedback, SUL TECH may use them to
          improve its products without restriction or payment, provided it does
          not disclose your confidential information in doing so.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="8. Availability & changes">
        <p>
          SUL TECH will use reasonable efforts to operate and maintain ExecUI.
          Unless an applicable written agreement says otherwise, the service is
          provided without a guaranteed uptime level or support response time.
          Some capabilities depend on third-party services and integrations
          outside SUL TECH's control.
        </p>
        <p>
          We may update or discontinue features, but will not intentionally
          remove a material paid capability during an active subscription
          without reasonable notice, except when required for security, legal,
          or operational reasons. Any applicable service-level commitments in a
          separate written agreement remain in effect.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="9. Suspension & termination">
        <p>
          You may stop using ExecUI and cancel a subscription through the
          available account billing controls, subject to the cancellation terms
          displayed at checkout. The organization administrator is responsible
          for managing its users and subscription.
        </p>
        <p>
          SUL TECH may suspend or restrict access where reasonably necessary to
          address a security risk, comply with law, respond to a material breach
          of these Terms, or address overdue fees after reasonable notice when
          notice is practical. We will restore access when the reason for
          suspension has been resolved.
        </p>
        <p>
          When a subscription ends, access to paid features may stop. Customer
          Data handling after termination follows the Privacy Policy and any
          applicable written agreement.
        </p>
      </LegalSection>

      <LegalSection id="warranties" title="10. Warranties & liability">
        <p>
          To the extent permitted by law, ExecUI is provided "as available" and
          without warranties not expressly stated in a written agreement.
          SUL TECH does not warrant that the service will be uninterrupted or
          error-free, or that it will meet requirements that were not agreed in
          writing.
        </p>
        <p>
          To the extent permitted by law, neither party will be liable to the
          other for indirect, incidental, special, or consequential loss arising
          from these Terms. Nothing in these Terms excludes or limits liability
          or rights that cannot lawfully be excluded or limited. Any additional
          liability allocation agreed in a signed order or enterprise agreement
          will apply according to that agreement.
        </p>
      </LegalSection>

      <LegalSection id="general" title="11. General terms & contact">
        <p>
          We may update these Terms from time to time. For material changes, we
          will update the effective date and provide notice through the service
          or to an organization administrator where appropriate. Changes apply
          prospectively unless applicable law requires otherwise.
        </p>
        <p>
          These Terms do not specify a governing law or venue. Any such terms in
          a separate written agreement will apply, and nothing here limits
          rights or protections that apply by law.
        </p>
        <p>
          For legal or billing questions, contact SUL TECH through the{" "}
          <Link to="/refunds#contact" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            SUL TECH refund and billing contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
