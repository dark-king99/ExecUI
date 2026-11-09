import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "./LegalPage";

const EFFECTIVE_DATE = "November 9, 2026";
const SECURITY_CONTACT = "privacy@execui.app";

const SECTIONS = [
  { id: "overview", label: "Overview and scope" },
  { id: "safeguards", label: "Security safeguards" },
  { id: "customer-responsibilities", label: "Customer responsibilities" },
  { id: "incident-response", label: "Security incidents" },
  { id: "reporting", label: "Report a vulnerability" },
  { id: "assurance", label: "Assurance and limitations" },
];

export default function SecurityPolicy() {
  return (
    <LegalPage
      title="Security Policy"
      intro="This page describes security practices used to protect ExecUI and customer information. It is a high-level overview, not a certification, audit report, or service-level guarantee."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
    >
      <LegalSection id="overview" title="1. Overview and scope">
        <p>
          SUL TECH uses administrative, technical, and organizational
          safeguards intended to protect the confidentiality, integrity, and
          availability of ExecUI. Safeguards are reviewed and may change as the
          service and risks evolve.
        </p>
      </LegalSection>

      <LegalSection id="safeguards" title="2. Security safeguards">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Access control:</strong> authentication, role-based permissions, tenant-aware authorization, and administrative controls are used to limit access to accounts and workspace data.</li>
          <li><strong>Credentials and secrets:</strong> account passwords are stored as password hashes rather than plaintext. Sensitive integration credentials are encrypted at rest. Multi-factor authentication is available for supported account configurations.</li>
          <li><strong>Transport security:</strong> public service traffic is served over HTTPS/TLS. Users should access ExecUI through the official HTTPS site and avoid sharing credentials over insecure channels.</li>
          <li><strong>Application protections:</strong> the service uses input validation, rate limits, request timeouts, and overload controls to help reduce abuse and disruption.</li>
          <li><strong>Auditability:</strong> security-relevant and administrative activity may be logged for service operations, security investigations, and compliance with customer instructions or legal obligations.</li>
          <li><strong>Service providers:</strong> hosting, infrastructure, email, and payment services may be provided by third parties. Their own safeguards and terms also apply to data they process.</li>
        </ul>
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="3. Customer responsibilities">
        <p>
          Organization administrators are responsible for choosing appropriate
          users and roles, protecting credentials, removing access when no
          longer needed, and deciding what information to place in the
          workspace. Do not store payment-card details or regulated sensitive
          information in ExecUI unless a separate written agreement expressly
          allows it.
        </p>
        <p>
          If you suspect that an account or data may have been accessed without
          authorization, notify SUL TECH promptly through the support contact
          linked in our{" "}
          <Link to="/privacy" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Privacy Policy
          </Link>
          . Include the affected organization, approximate time, and relevant
          account information, but do not send passwords, authentication codes,
          or payment credentials.
        </p>
      </LegalSection>

      <LegalSection id="incident-response" title="4. Security incidents">
        <p>
          We assess suspected security incidents, take reasonable steps to
          contain and investigate them, and notify affected organizations or
          individuals when required by applicable law or our written
          commitments. Notices may describe the nature of the incident, steps
          taken, and recommended actions when that information can be shared
          safely and lawfully.
        </p>
      </LegalSection>

      <LegalSection id="reporting" title="5. Report a vulnerability">
        <p>
          Report a suspected vulnerability to{" "}
          <a href={`mailto:${SECURITY_CONTACT}`} className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            {SECURITY_CONTACT}
          </a>
          . Provide a description, affected URL or feature, and safe steps to
          reproduce the issue. Do not access, alter, download, or disclose other
          users' data; disrupt production; or conduct testing beyond what is
          necessary to demonstrate the issue without written authorization.
        </p>
        <p>
          We will review good-faith reports and may request additional
          information. This policy does not create authorization to test
          systems or promise a response time or reward.
        </p>
      </LegalSection>

      <LegalSection id="assurance" title="6. Assurance and limitations">
        <p>
          ExecUI does not claim a SOC 2, ISO 27001, or other independent
          security certification unless separately stated in a current written
          agreement or official certification. No online service can be
          guaranteed completely secure or continuously available. This overview
          does not replace the security, privacy, or service commitments in an
          applicable signed agreement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
