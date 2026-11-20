const POLICY_DOCUMENTS = [
  {
    id: "terms",
    title: "Terms of Service",
    source: "/terms",
    section: "Plans, trials and payment",
    content: `ExecUI is an organization workspace provided by SUL TECH. Plan features and access depend on the plan and configuration. Starter and Standard plans include a 14-day free trial; Premium, Enterprise and Executive plans include a one-month free trial. The trial end date and price are shown at checkout. Unless canceled before the trial ends, a subscription may convert to the paid plan selected at checkout. Subscriptions renew at the stated billing interval unless canceled before renewal. Cancellation stops future renewals but does not automatically refund a charge already made. Checkout identifies the payment provider and seller; a provider may be the merchant of record or seller for a transaction. Refund requests are governed by the Refund Policy and provider transaction rules.`,
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    source: "/acceptable-use",
    section: "Prohibited use",
    content: `Users may not use ExecUI unlawfully, deceptively, to violate another person's rights, or to facilitate illegal goods, fraud, money laundering, sanctions evasion, payment-card abuse, exploitation, malware, phishing, credential theft, unsolicited bulk messaging, unauthorized access, or bypassing security controls. Users must have authority to access workspace data and must comply with the applicable payment provider's restricted-business rules. Do not store or process health, biometric, government identity, or payment-card data unless SUL TECH expressly agrees in writing. Report suspected abuse or unauthorized access to privacy@execui.app.`,
  },
  {
    id: "refunds",
    title: "Refund Policy",
    source: "/refunds",
    section: "Refund request window",
    content: `A refund request may be submitted within 30 days after the first subscription payment is successfully captured following the free trial. The 30-day request window applies only to that first paid charge and does not restart for renewals. A free trial is not a refund and does not start the request window. The window allows a request to be reviewed; it does not guarantee approval or payment. Submitting a request does not cancel a subscription. Cancellation stops future renewals but does not automatically refund a prior charge or prorate unused time. SUL TECH reviews requests and may coordinate with the payment provider. The provider identified at checkout determines how an approved refund is issued and returned. Do not submit card or bank credentials with a request.`,
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    source: "/privacy",
    section: "Roles, information and data handling",
    content: `For most information processed in ExecUI, the organization is the data controller and ExecUI acts as a data processor on the organization's instructions. ExecUI is the controller for limited account provisioning, billing, security-log, and service-operation data. A payment provider may separately act as controller, merchant of record, or seller for payment data under its own privacy notice. Information may include account and identity data, authentication and security events, customer content, usage and diagnostic data. The organization is responsible for a lawful basis and configuring user access. The service uses tenant-aware data isolation. Personal-data requests should be directed to the organization for workspace data; contact privacy@execui.app for service-level privacy questions.`,
  },
  {
    id: "security",
    title: "Security Policy",
    source: "/security",
    section: "Safeguards and assurance",
    content: `SUL TECH describes administrative, technical and organizational safeguards intended to protect ExecUI and customer information. Safeguards include authentication, role-based and tenant-aware access controls, hashed passwords, encrypted integration credentials at rest, HTTPS/TLS for public service traffic, input validation, rate limits, request timeouts, and audit logging. Suspected incidents are assessed, contained and investigated; affected organizations or individuals are notified when required by law or written commitments. ExecUI does not claim SOC 2, ISO 27001, or another independent certification unless stated in a current written agreement or official certification. Report a suspected vulnerability to privacy@execui.app. This summary is not a certification or service-level guarantee.`,
  },
];

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "can", "does", "for", "from",
  "how", "into", "its", "may", "our", "please", "that", "the", "their",
  "then", "there", "this", "what", "when", "where", "which", "with",
  "you", "your",
]);

function terms(value) {
  return String(value ?? "")
    .toLowerCase()
    .match(/[a-z0-9]{2,}/g)?.filter((term) => !STOP_WORDS.has(term)) ?? [];
}

export function searchPolicyDocuments(query, limit = 3) {
  const queryTerms = [...new Set(terms(query))];
  if (!queryTerms.length) return [];

  return POLICY_DOCUMENTS
    .map((document) => {
      const searchable = terms(`${document.title} ${document.section} ${document.content}`);
      const counts = new Map();
      for (const term of searchable) counts.set(term, (counts.get(term) ?? 0) + 1);
      const score = queryTerms.reduce((total, term) => {
        const frequency = counts.get(term) ?? 0;
        return total + (frequency ? 1 + Math.min(frequency, 4) * 0.15 : 0);
      }, 0);
      return { ...document, score };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.min(5, Math.max(1, limit)))
    .map(({ score, ...document }) => document);
}
