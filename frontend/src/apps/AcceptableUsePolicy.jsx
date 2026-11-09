import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "./LegalPage";

const EFFECTIVE_DATE = "November 9, 2026";
const SECURITY_CONTACT = "privacy@execui.app";

const SECTIONS = [
  { id: "scope", label: "Scope and responsibility" },
  { id: "prohibited", label: "Prohibited use" },
  { id: "customer-data", label: "Data and communications" },
  { id: "provider-rules", label: "Payment provider restrictions" },
  { id: "enforcement", label: "Investigation and enforcement" },
  { id: "reporting", label: "Report a concern" },
];

export default function AcceptableUsePolicy() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      intro="This policy sets rules for using ExecUI safely and lawfully. It applies to organizations, administrators, employees, and anyone using an account or integration connected to the service."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
    >
      <LegalSection id="scope" title="1. Scope and responsibility">
        <p>
          This policy supplements the{" "}
          <Link to="/terms" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Terms of Service
          </Link>
          . The organization that creates a workspace is responsible for its
          users, the content and data it submits, and the products or services
          it uses ExecUI to manage or promote. Users must have authority to
          access the workspace and the data they enter.
        </p>
      </LegalSection>

      <LegalSection id="prohibited" title="2. Prohibited use">
        <p>You may not use, or allow another person to use, ExecUI to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>violate applicable laws, regulations, sanctions, court orders, or another person's privacy, intellectual-property, or other legal rights;</li>
          <li>offer, market, sell, or facilitate illegal goods or services, deceptive schemes, counterfeit goods, or products or services prohibited by the payment provider identified at checkout;</li>
          <li>conduct fraud, money laundering, terrorist financing, sanctions evasion, payment-card abuse, chargeback manipulation, or conceal the identity of a business or transaction;</li>
          <li>promote or facilitate exploitation, human trafficking, non-consensual intimate imagery, child sexual abuse material, or other abusive or violent conduct;</li>
          <li>create, distribute, or operate malware, ransomware, phishing, credential theft, botnets, or other tools or activity intended to compromise systems or accounts;</li>
          <li>send unlawful, deceptive, or unsolicited bulk messages, or misuse contact information for spam or harassment;</li>
          <li>upload or process payment-card security codes, authentication credentials, or other sensitive payment details in ExecUI, except through the payment provider's hosted checkout;</li>
          <li>attempt unauthorized access, bypass authentication or security controls, probe or disrupt the service, or access another organization's workspace or data;</li>
          <li>scrape, copy, reverse engineer, or interfere with the service except as permitted by applicable law or an express written agreement; or</li>
          <li>resell, sublicense, or provide access to ExecUI outside the scope of your plan or written agreement.</li>
        </ul>
        <p>
          Do not use ExecUI to store or process regulated or highly sensitive
          information, including health, biometric, government identity, or
          payment-card data, unless SUL TECH has expressly agreed in writing to
          support that data and use case. You are responsible for securing the
          permissions and legal basis required for data you submit.
        </p>
      </LegalSection>

      <LegalSection id="customer-data" title="3. Data and communications">
        <p>
          You must provide accurate account and billing information, keep
          credentials confidential, promptly remove access that is no longer
          needed, and notify SUL TECH if you become aware of unauthorized use.
          You must have the rights and notices needed to submit personal data,
          files, messages, and contact information to the service.
        </p>
        <p>
          You may not use ExecUI to misrepresent your identity, impersonate
          another person or business, or obscure the source or purpose of
          communications or transactions.
        </p>
      </LegalSection>

      <LegalSection id="provider-rules" title="4. Payment provider restrictions">
        <p>
          Payment providers may impose additional restrictions on merchants,
          products, services, transactions, and customer locations. You must
          comply with the applicable provider's terms and restricted-business
          rules for the payment provider and seller identified at checkout.
          Provider approval of an account or transaction does not authorize an
          otherwise unlawful use of ExecUI.
        </p>
        <p>
          SUL TECH may refuse to support or may suspend a product, transaction,
          account, or integration that creates a legal, security, payment
          network, or provider-compliance risk.
        </p>
      </LegalSection>

      <LegalSection id="enforcement" title="5. Investigation and enforcement">
        <p>
          We may investigate suspected violations, preserve relevant records,
          restrict access, remove content, suspend transactions, or terminate
          accounts where reasonably necessary to protect users, the service,
          payment providers, or the public; comply with law; or enforce our
          agreements. Where practical and lawful, we will notify the account
          administrator and provide an opportunity to address the issue.
        </p>
        <p>
          You may contact us to explain or contest an enforcement action.
          Nothing in this policy limits rights or procedures that applicable
          law requires.
        </p>
      </LegalSection>

      <LegalSection id="reporting" title="6. Report a concern">
        <p>
          Report suspected abuse, unauthorized access, or a policy violation
          to{" "}
          <a href={`mailto:${SECURITY_CONTACT}`} className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            {SECURITY_CONTACT}
          </a>
          . For security vulnerabilities, see the{" "}
          <Link to="/security#reporting" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Security Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
