import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, ShieldCheck, Building2, Users, Lock, Database, Eye } from "lucide-react";
import Footer from "../components/Footer";

// Effective date — bump when the policy materially changes.
const EFFECTIVE_DATE = "July 11, 2026";
const CONTACT_EMAIL = "privacy@execui.app";

function Section({ id, title, icon: Icon, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
            <Icon size={16} />
          </span>
        )}
        {title}
      </h2>
      <div className="prose-slate mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

const TOC = [
  { id: "roles", label: "Who this covers & our roles" },
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use information" },
  { id: "isolation", label: "Multi-tenant data isolation" },
  { id: "sharing", label: "Sharing & subprocessors" },
  { id: "security", label: "How we protect data" },
  { id: "employees", label: "Employee privacy & monitoring" },
  { id: "retention", label: "Data retention" },
  { id: "rights", label: "Your rights & choices" },
  { id: "transfers", label: "International transfers" },
  { id: "cookies", label: "Cookies & local storage" },
  { id: "changes", label: "Changes & contact" },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  // Honor #hash anchors when arriving from the footer links.
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-slate-900 dark:bg-[#0a0a0c] dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a0c]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </button>
          <button onClick={() => navigate("/home")} className="flex items-center transition-transform hover:scale-[1.03]">
            <img src="/execui-logo.png" alt="ExecUI" className="h-7 w-auto object-contain" draggable="false" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <ShieldCheck size={13} />
            Privacy at ExecUI
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            This policy explains how ExecUI handles personal information for the
            organizations that subscribe to the platform (<strong>enterprise
            customers</strong>) and for the people who use it every day
            (<strong>their employees and authorized users</strong>). We built the
            platform so that each organization's data is isolated from every
            other's by design.
          </p>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Effective {EFFECTIVE_DATE}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Table of contents */}
        <nav className="mb-12 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">On this page</p>
          <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {TOC.map((t, i) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="group inline-flex items-baseline gap-2 text-sm text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                >
                  <span className="text-xs tabular-nums text-slate-300 dark:text-slate-600">{String(i + 1).padStart(2, "0")}</span>
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">
          <Section id="roles" title="1. Who this covers & our roles" icon={Building2}>
            <p>
              ExecUI is a business-operations platform provided to organizations
              on a subscription basis. This policy applies to two groups:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Enterprise customers</strong> — the organization (the
                "tenant") that creates an account, and its administrators who
                configure the workspace, invite users, and manage billing.
              </li>
              <li>
                <strong>Employees &amp; authorized users</strong> — the people an
                enterprise customer invites to use ExecUI on its behalf.
              </li>
            </ul>
            <p>
              For most of the information processed in the platform, your
              organization is the <strong>data controller</strong> — it decides
              what data goes into ExecUI and how it is used — and ExecUI acts as a{" "}
              <strong>data processor</strong> that handles that data on the
              organization's instructions under our customer agreement. For a
              limited set of data (account provisioning, billing, security logs,
              and running the service itself), ExecUI is the controller.
            </p>
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-slate-600 dark:text-slate-300">
              <strong>If you are an employee:</strong> your employer chose ExecUI
              and controls the workspace you use. Questions about what personal
              data your employer collects, why, and how long they keep it should
              be directed to your organization first — its own privacy notice and
              HR/IT policies govern your relationship with it.
            </p>
          </Section>

          <Section id="collect" title="2. Information we collect" icon={Database}>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Account &amp; identity</strong> — name, work email, employee ID, job title, department, role, and the organization you belong to.</li>
              <li><strong>Authentication &amp; security</strong> — hashed passwords (we never store them in plain text), multi-factor (TOTP) settings, active sessions, and login/audit events.</li>
              <li><strong>Content you create</strong> — records you enter into CRM, marketing, network, analytics and services modules; messages you send in the in-app directory and department channels; files you attach to entities.</li>
              <li><strong>Configuration &amp; integrations</strong> — connection settings and outbound API secrets you configure (secrets are encrypted at rest; see §6).</li>
              <li><strong>Billing</strong> — plan selection and billing status. Card details are handled by our payment processor, not stored by ExecUI.</li>
              <li><strong>Usage &amp; technical data</strong> — IP address, device/browser information, request logs, and product interactions used to operate, secure, and improve the service.</li>
            </ul>
            <p>
              We do <strong>not</strong> ask for or intentionally collect special
              categories of personal data (such as health or biometric data), and
              ExecUI is not intended for that purpose.
            </p>
          </Section>

          <Section id="use" title="3. How we use information" icon={Eye}>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>To provide the platform and its modules to your organization.</li>
              <li>To authenticate users, enforce role and department permissions, and keep accounts secure.</li>
              <li>To deliver in-app notifications and, where your organization has enabled it, transactional email through our email provider.</li>
              <li>To process subscriptions and payments.</li>
              <li>To monitor performance, prevent abuse and overload, debug issues, and maintain audit trails.</li>
              <li>To comply with legal obligations and enforce our agreements.</li>
            </ul>
            <p>
              We process this data to perform our contract with your organization,
              to pursue our legitimate interests in operating a secure and
              reliable service, and to meet legal obligations. In-app messages and
              content are used to run the product for your organization —{" "}
              <strong>we do not sell personal data, and we do not use your
              organization's content to train external models.</strong>
            </p>
          </Section>

          <Section id="isolation" title="4. Multi-tenant data isolation" icon={Lock}>
            <p>
              ExecUI is multi-tenant: many organizations use the same platform,
              but each organization's data is <strong>logically isolated</strong>.
              Every record is tagged with its organization ("tenant") and every
              database query is automatically scoped to the tenant of the
              signed-in user. This scoping is enforced centrally, so a request
              can only ever read or change data belonging to its own
              organization — cross-tenant access is prevented by construction, not
              left to individual features to remember.
            </p>
            <p>
              Within an organization, access is further limited by{" "}
              <strong>role and department permissions</strong>. For example,
              network-operations tooling and administrative areas (user
              management, roles, billing, integration secrets, organization-wide
              communications) are restricted to authorized administrators.
            </p>
          </Section>

          <Section id="sharing" title="5. Sharing & subprocessors" icon={Users}>
            <p>
              We do not sell personal data. We share information only in these
              cases:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Within your organization</strong> — with other authorized users, according to role and department permissions your administrators configure.</li>
              <li><strong>Service providers (subprocessors)</strong> that help us run the platform, under contract and only as needed:
                <ul className="mt-1.5 list-[circle] space-y-1 pl-5">
                  <li>Cloud hosting &amp; database infrastructure.</li>
                  <li><strong>Paddle</strong> — subscription billing and payment processing.</li>
                  <li><strong>Resend</strong> — outbound transactional email, when enabled by your organization.</li>
                </ul>
              </li>
              <li><strong>Legal &amp; safety</strong> — when required by law, to enforce our terms, or to protect the rights and safety of users and the public.</li>
              <li><strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets, subject to this policy.</li>
            </ul>
          </Section>

          <Section id="security" title="6. How we protect data" icon={ShieldCheck}>
            <p>We apply layered technical and organizational safeguards, including:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Tenant isolation</strong> enforced on every database query (see §4).</li>
              <li><strong>Encryption in transit</strong> (HTTPS/TLS) and <strong>encryption at rest</strong> for sensitive secrets such as stored integration API keys.</li>
              <li><strong>Password hashing</strong> and optional <strong>multi-factor authentication (TOTP)</strong>.</li>
              <li><strong>Role- and department-based access control</strong> across the application.</li>
              <li><strong>Input validation and abuse protection</strong> — request validation, rate limiting, overload shedding, and request timeouts to keep the service available and resistant to attack.</li>
              <li><strong>Audit logging</strong> of security-relevant and administrative actions.</li>
            </ul>
            <p>
              No system can be guaranteed perfectly secure, but we work
              continuously to protect your data and to respond promptly to any
              incident in line with our obligations.
            </p>
          </Section>

          <Section id="employees" title="7. Employee privacy & workplace monitoring" icon={Users}>
            <p>
              ExecUI includes features that record activity for security,
              accountability, and operations — for example <strong>audit logs</strong>{" "}
              of administrative actions, <strong>session lists</strong>, and message
              history within the workspace. Your organization's administrators may
              be able to see this information as part of running the platform.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>In-app messages and department communications are business records within your organization's workspace and are visible according to role and department permissions. <strong>They stay in the app and are not sent to your personal email.</strong></li>
              <li>Content you create in the platform belongs to your organization's workspace, not to your personal account.</li>
              <li>Administrators can invite, update, deactivate, or remove user accounts, and can manage the roles and permissions attached to them.</li>
            </ul>
            <p>
              How your employer uses these capabilities — and any monitoring it
              performs — is governed by <strong>your organization's own policies
              and applicable employment law</strong>, not by ExecUI. If you are an
              employee with questions or requests about your personal data, please
              contact your organization; we will support them in responding.
            </p>
          </Section>

          <Section id="retention" title="8. Data retention">
            <p>
              We retain personal data for as long as your organization maintains
              its account and as needed to provide the service, then delete or
              anonymize it within a reasonable period, unless a longer period is
              required for legal, tax, security, or dispute-resolution purposes.
              Your organization controls much of its own data lifecycle and may
              delete records within the platform. On account termination, we
              handle data in accordance with our customer agreement.
            </p>
          </Section>

          <Section id="rights" title="9. Your rights & choices">
            <p>
              Depending on where you live, you may have rights to access, correct,
              delete, port, or restrict the processing of your personal data, and
              to object to certain processing.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Employees &amp; authorized users:</strong> because your organization controls the workspace data, please direct these requests to your organization first. We will assist them in fulfilling valid requests.</li>
              <li><strong>Enterprise administrators:</strong> you can exercise rights over account-level data ExecUI controls by contacting us at the address below.</li>
            </ul>
            <p>You can also manage your profile, security settings, sessions, and notification preferences directly in your account.</p>
          </Section>

          <Section id="transfers" title="10. International transfers">
            <p>
              ExecUI and its subprocessors may process data in countries other
              than where you are located. Where we transfer personal data across
              borders, we rely on appropriate safeguards (such as standard
              contractual clauses) as required by applicable law.
            </p>
          </Section>

          <Section id="cookies" title="11. Cookies & local storage">
            <p>
              ExecUI uses essential browser storage (such as your authentication
              token and interface preferences) to keep you signed in and to make
              the app work. These are necessary for the service to function. We do
              not use the platform for third-party advertising tracking.
            </p>
          </Section>

          <Section id="changes" title="12. Changes & contact">
            <p>
              We may update this policy from time to time. When we make material
              changes, we will update the effective date above and, where
              appropriate, notify enterprise administrators. Continued use of the
              platform after an update means you accept the revised policy.
            </p>
            <p>
              Questions about this policy or your data can be sent to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                {CONTACT_EMAIL}
              </a>
              . If you are an employee, please contact your organization's
              administrator or its own privacy/IT team first.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/overview")}
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-900"
              >
                Go to your workspace
                <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                onClick={() => navigate("/home")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Back to home
              </button>
            </div>
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
