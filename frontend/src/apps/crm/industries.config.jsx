import {
  Signal, Landmark, Truck, Hotel, Home, HeartPulse, GraduationCap,
  HeartHandshake, Umbrella, Factory, Building2,
  UserRound, CreditCard, LifeBuoy, Wrench, TrendingDown, Banknote,
  ShieldAlert, Coins, Store, CalendarCheck, PartyPopper, MessageSquareWarning,
  Star, FileSignature, CalendarClock, FileText, ShoppingCart, MapPin, Tag,
  ClipboardList, BookOpen, Receipt, Users, FolderKanban, Package, Stamp,
} from "lucide-react";

/**
 * Industry registry (frontend / UI side).
 *
 * The object types, kinds and pipeline stages come from the backend catalog at
 * runtime (GET /crm/industry). This file adds only the presentation layer —
 * icons, accent colors, taglines — and the FIELD SCHEMAS that drive each
 * generic object page's table columns and create/edit form.
 *
 * Adding an industry = one backend registry entry + one UI entry here. The core
 * CRM SOLUTIONS array is never modified.
 */

// ── Per-industry presentation ────────────────────────────────────────────────
export const INDUSTRY_UI = {
  telecom:       { icon: Signal,        color: "sky",     tagline: "Subscribers, tickets & retention", description: "Manage subscribers, SIM/KYC, corporate accounts, field jobs and network complaints alongside your core pipeline." },
  banking:       { icon: Landmark,      color: "emerald", tagline: "Loans, clients & risk",            description: "Run a loan pipeline, corporate portfolios, merchant onboarding, fraud alerts and collections." },
  fmcg:          { icon: Truck,         color: "amber",   tagline: "Distributors, orders & routes",    description: "Track distributors, retail outlets, field sales orders, route visits and trade promotions." },
  hotel:         { icon: Hotel,         color: "violet",  tagline: "Reservations, guests & events",     description: "Handle reservations, guest profiles, conference bookings, complaints and loyalty." },
  realestate:    { icon: Home,          color: "orange",  tagline: "Properties, leases & tenants",      description: "Manage properties, a leasing pipeline, tenant requests and owner relationships." },
  healthcare:    { icon: HeartPulse,    color: "rose",    tagline: "Patients, appointments & claims",   description: "Track patients, appointment flow and insurance claims." },
  education:     { icon: GraduationCap, color: "indigo",  tagline: "Students, admissions & fees",       description: "Manage students, an admissions pipeline, courses and fees." },
  ngo:           { icon: HeartHandshake,color: "teal",    tagline: "Beneficiaries, donors & grants",    description: "Track beneficiaries, programs, donors and a grant pipeline." },
  insurance:     { icon: Umbrella,      color: "blue",    tagline: "Policies, quotes & claims",         description: "Manage policyholders, policies, a quote pipeline and claims." },
  manufacturing: { icon: Factory,       color: "sky",     tagline: "Work orders, suppliers & products", description: "Run work orders, supplier records, products and maintenance." },
  government:    { icon: Building2,     color: "blue",    tagline: "Constituents, requests & permits",  description: "Serve constituents with service requests, permits/licenses and public projects." },
};

// ── Per-object icons (fallback: FileText) ────────────────────────────────────
export const OBJECT_ICONS = {
  subscriber: UserRound, sim_registration: CreditCard, corporate_account: Building2,
  service_ticket: LifeBuoy, field_job: Wrench, churn_watch: TrendingDown,
  loan_application: Banknote, corporate_client: Building2, merchant: Store,
  fraud_alert: ShieldAlert, collection: Coins,
  distributor: Truck, retail_outlet: Store, sales_order: ShoppingCart, route_visit: MapPin, promotion: Tag,
  reservation: CalendarCheck, guest: UserRound, event_booking: PartyPopper, complaint: MessageSquareWarning, loyalty: Star,
  property: Home, lease: FileSignature, tenant_request: Wrench, owner: UserRound,
  patient: UserRound, appointment: CalendarClock, claim: FileText,
  student: GraduationCap, enrollment: ClipboardList, course: BookOpen, fee: Receipt,
  beneficiary: Users, program: FolderKanban, donor: HeartHandshake, grant: FileText,
  policyholder: Users, policy: FileText, quote: FileText,
  work_order: Factory, supplier: Truck, product: Package, maintenance: Wrench,
  constituent: Users, citizen_request: FileText, permit: Stamp, project: FolderKanban,
};

// ── Field schemas (columns + form fields) ────────────────────────────────────
// A schema is { columns: [{key,label}], fields: [{key,label,type,options?,required?,group?}] }.
// `type`: text | textarea | tel | email | number | date | select.
// Keys other than the built-ins (name/status/stage/amount/currency/owner) are
// stored inside the record's `data` JSON automatically.
const F = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });

const SCHEMAS = {
  telecom: {
    subscriber: {
      columns: [{ key: "msisdn", label: "MSISDN" }, { key: "plan", label: "Plan" }, { key: "status", label: "Status" }],
      fields: [
        F("name", "Subscriber name", "text", { required: true }),
        F("msisdn", "Phone (MSISDN)", "tel"),
        F("plan", "Plan", "select", { options: ["Prepaid", "Postpaid", "Data", "Corporate"] }),
        F("segment", "Segment", "select", { options: ["Retail", "SME", "Enterprise"] }),
        F("amount", "Monthly ARPU", "number"),
        F("region", "Region", "text"),
        F("notes", "Notes", "textarea"),
      ],
    },
    sim_registration: {
      columns: [{ key: "msisdn", label: "MSISDN" }, { key: "idType", label: "ID Type" }, { key: "status", label: "KYC" }],
      fields: [
        F("name", "Full name", "text", { required: true }),
        F("msisdn", "Phone (MSISDN)", "tel"),
        F("idType", "ID type", "select", { options: ["National ID", "Passport", "Driver License", "Voter ID"] }),
        F("idNumber", "ID number", "text"),
        F("status", "KYC status", "select", { options: ["pending", "verified", "rejected"] }),
        F("notes", "Notes", "textarea"),
      ],
    },
    service_ticket: {
      columns: [{ key: "category", label: "Category" }, { key: "priority", label: "Priority" }, { key: "stage", label: "Stage" }],
      fields: [
        F("name", "Summary", "text", { required: true }),
        F("category", "Category", "select", { options: ["Network", "Billing", "Device", "Data", "Voice", "Other"] }),
        F("priority", "Priority", "select", { options: ["low", "medium", "high", "critical"] }),
        F("msisdn", "Subscriber phone", "tel"),
        F("description", "Description", "textarea"),
      ],
    },
    field_job: {
      columns: [{ key: "jobType", label: "Type" }, { key: "region", label: "Region" }, { key: "stage", label: "Stage" }],
      fields: [
        F("name", "Job title", "text", { required: true }),
        F("jobType", "Job type", "select", { options: ["Fiber Install", "Tower Maintenance", "Repair", "Survey"] }),
        F("region", "Region", "text"),
        F("scheduledFor", "Scheduled for", "date"),
        F("notes", "Notes", "textarea"),
      ],
    },
    corporate_account: { columns: [{ key: "industry", label: "Sector" }], fields: [F("name", "Company", "text", { required: true }), F("industry", "Sector", "text"), F("amount", "Contract value", "number"), F("notes", "Notes", "textarea")] },
    churn_watch: { columns: [{ key: "risk", label: "Risk" }], fields: [F("name", "Subscriber", "text", { required: true }), F("msisdn", "Phone", "tel"), F("risk", "Risk level", "select", { options: ["low", "medium", "high"] }), F("reason", "Reason", "textarea")] },
  },
  banking: {
    loan_application: {
      columns: [{ key: "product", label: "Product" }, { key: "amount", label: "Amount" }, { key: "stage", label: "Stage" }],
      fields: [
        F("name", "Applicant", "text", { required: true }),
        F("product", "Loan product", "select", { options: ["SME Loan", "Mortgage", "Personal", "Corporate", "Microfinance"] }),
        F("amount", "Amount requested", "number"),
        F("tenureMonths", "Tenure (months)", "number"),
        F("creditScore", "Credit score", "number"),
        F("collateral", "Collateral", "text"),
        F("notes", "Notes", "textarea"),
      ],
    },
    corporate_client: {
      columns: [{ key: "sector", label: "Sector" }, { key: "rm", label: "RM" }, { key: "amount", label: "Portfolio" }],
      fields: [
        F("name", "Company", "text", { required: true }),
        F("sector", "Sector", "text"),
        F("rm", "Relationship manager", "text"),
        F("amount", "Portfolio value", "number"),
        F("notes", "Notes", "textarea"),
      ],
    },
    fraud_alert: {
      columns: [{ key: "channel", label: "Channel" }, { key: "severity", label: "Severity" }, { key: "stage", label: "Stage" }],
      fields: [
        F("name", "Alert summary", "text", { required: true }),
        F("channel", "Channel", "select", { options: ["Card", "Mobile Money", "Online", "ATM", "Branch"] }),
        F("severity", "Severity", "select", { options: ["low", "medium", "high", "critical"] }),
        F("amount", "Amount at risk", "number"),
        F("description", "Description", "textarea"),
      ],
    },
    collection: {
      columns: [{ key: "amount", label: "Outstanding" }, { key: "stage", label: "Stage" }],
      fields: [F("name", "Customer", "text", { required: true }), F("amount", "Outstanding", "number"), F("daysPastDue", "Days past due", "number"), F("notes", "Notes", "textarea")],
    },
    merchant: { columns: [{ key: "type", label: "Type" }], fields: [F("name", "Merchant", "text", { required: true }), F("type", "Business type", "text"), F("amount", "Monthly volume", "number"), F("notes", "Notes", "textarea")] },
  },
};

// Generic fallback schema for object types without a bespoke definition.
function defaultSchema(kind) {
  return {
    columns: [{ key: "phone", label: "Phone" }, kind === "pipeline" ? { key: "stage", label: "Stage" } : { key: "status", label: "Status" }],
    fields: [
      F("name", "Name", "text", { required: true }),
      F("phone", "Phone", "tel"),
      F("email", "Email", "email"),
      F("amount", "Value", "number"),
      F("notes", "Notes", "textarea"),
    ],
  };
}

/** Resolve the field schema for an object, falling back to a sensible default. */
export function schemaFor(industryId, objectType, kind = "list") {
  return SCHEMAS[industryId]?.[objectType] ?? defaultSchema(kind);
}

export const iconForObject = (objectType) => OBJECT_ICONS[objectType] ?? FileText;

/**
 * Build a core-SOLUTIONS-shaped entry for the tenant's industry, from the
 * backend catalog entry ({ id, name, objects }). Consumed by the sidebar,
 * launcher and router.
 */
export function industrySolutionFor(industryId, catalogEntry) {
  const objects = catalogEntry?.objects ?? [];
  if (!industryId || industryId === "general" || !objects.length) return null;
  const ui = INDUSTRY_UI[industryId] ?? { icon: FileText, color: "sky", tagline: "Industry module", description: "" };
  return {
    id: `industry-${industryId}`,
    industryId,
    name: catalogEntry?.name || industryId,
    tagline: ui.tagline,
    description: ui.description,
    icon: ui.icon,
    color: ui.color,
    isIndustry: true,
    pages: objects.map((o) => ({
      id: o.id,
      label: o.name,
      icon: iconForObject(o.id),
      path: `/crm/i/${industryId}/${o.id}`,
      objectType: o.id,
      kind: o.kind,
      stages: o.stages ?? null,
    })),
  };
}
