/**
 * Industry registry — the single backend source of truth for which industry
 * verticals exist and what object types each one adds on top of the core CRM.
 *
 * This is intentionally DATA, not code: adding an industry (or an object type)
 * is a config edit here + a matching UI entry in the frontend
 * (apps/crm/industries.config.jsx). Nothing in the core CRM changes.
 *
 * Each object type is either:
 *   • kind "list"     — a flat collection (subscribers, guests, properties…)
 *   • kind "pipeline" — a staged Kanban flow (loan applications, reservations…)
 *
 * The generic IndustryRecord store (industry.service.js) persists every one of
 * these without a bespoke table, so no core model is ever touched.
 */

const list = (id, name) => ({ id, name, kind: "list" });
const pipe = (id, name, stages) => ({ id, name, kind: "pipeline", stages });

export const INDUSTRIES = {
  telecom: {
    name: "Telecommunications",
    objects: {
      subscriber:       list("subscriber", "Subscribers"),
      sim_registration: list("sim_registration", "SIM / KYC"),
      corporate_account:list("corporate_account", "Corporate Accounts"),
      service_ticket:   pipe("service_ticket", "Service Tickets", ["new", "in_progress", "pending", "resolved", "closed"]),
      field_job:        pipe("field_job", "Field Jobs", ["scheduled", "dispatched", "onsite", "completed"]),
      churn_watch:      list("churn_watch", "Churn Watch"),
    },
  },
  banking: {
    name: "Banking & Financial Services",
    objects: {
      loan_application: pipe("loan_application", "Loan Pipeline", ["submitted", "review", "approved", "disbursed", "rejected"]),
      corporate_client: list("corporate_client", "Corporate Clients"),
      merchant:         list("merchant", "Merchants"),
      fraud_alert:      pipe("fraud_alert", "Fraud Alerts", ["open", "investigating", "resolved", "dismissed"]),
      collection:       pipe("collection", "Collections", ["current", "overdue", "recovering", "recovered", "written_off"]),
    },
  },
  fmcg: {
    name: "FMCG & Distribution",
    objects: {
      distributor:  list("distributor", "Distributors"),
      retail_outlet:list("retail_outlet", "Retail Outlets"),
      sales_order:  pipe("sales_order", "Sales Orders", ["draft", "confirmed", "dispatched", "delivered", "paid"]),
      route_visit:  list("route_visit", "Route Visits"),
      promotion:    list("promotion", "Promotions"),
    },
  },
  hotel: {
    name: "Hospitality & Hotels",
    objects: {
      reservation:  pipe("reservation", "Reservations", ["inquiry", "booked", "checked_in", "checked_out", "cancelled"]),
      guest:        list("guest", "Guest Profiles"),
      event_booking:pipe("event_booking", "Events & Conferences", ["inquiry", "proposal", "confirmed", "completed"]),
      complaint:    pipe("complaint", "Guest Complaints", ["new", "in_progress", "resolved"]),
      loyalty:      list("loyalty", "Loyalty Members"),
    },
  },
  realestate: {
    name: "Real Estate & Property",
    objects: {
      property:      list("property", "Properties"),
      lease:         pipe("lease", "Leasing Pipeline", ["lead", "viewing", "negotiation", "signed", "lost"]),
      tenant_request:pipe("tenant_request", "Tenant Requests", ["new", "in_progress", "resolved"]),
      owner:         list("owner", "Owners / Landlords"),
    },
  },
  healthcare: {
    name: "Healthcare & Clinics",
    objects: {
      patient:     list("patient", "Patients"),
      appointment: pipe("appointment", "Appointments", ["requested", "scheduled", "completed", "no_show"]),
      claim:       pipe("claim", "Insurance Claims", ["draft", "submitted", "approved", "paid", "denied"]),
    },
  },
  education: {
    name: "Education & Training",
    objects: {
      student:    list("student", "Students"),
      enrollment: pipe("enrollment", "Admissions", ["inquiry", "applied", "offer", "enrolled", "declined"]),
      course:     list("course", "Courses"),
      fee:        list("fee", "Fees & Payments"),
    },
  },
  ngo: {
    name: "NGO & Non-Profit",
    objects: {
      beneficiary: list("beneficiary", "Beneficiaries"),
      program:     list("program", "Programs"),
      donor:       list("donor", "Donors"),
      grant:       pipe("grant", "Grant Pipeline", ["prospect", "proposal", "submitted", "awarded", "declined"]),
    },
  },
  insurance: {
    name: "Insurance",
    objects: {
      policyholder: list("policyholder", "Policyholders"),
      policy:       list("policy", "Policies"),
      quote:        pipe("quote", "Quotes", ["new", "quoted", "bound", "lost"]),
      claim:        pipe("claim", "Claims", ["filed", "assessing", "approved", "paid", "denied"]),
    },
  },
  manufacturing: {
    name: "Manufacturing & Industrial",
    objects: {
      work_order: pipe("work_order", "Work Orders", ["planned", "in_production", "qc", "shipped"]),
      supplier:   list("supplier", "Suppliers"),
      product:    list("product", "Products"),
      maintenance:pipe("maintenance", "Maintenance", ["reported", "scheduled", "in_progress", "done"]),
    },
  },
  government: {
    name: "Government & Public Sector",
    objects: {
      constituent:    list("constituent", "Constituents"),
      citizen_request:pipe("citizen_request", "Service Requests", ["submitted", "processing", "resolved", "rejected"]),
      permit:         pipe("permit", "Permits & Licenses", ["applied", "review", "issued", "denied"]),
      project:        list("project", "Public Projects"),
    },
  },
};

// ── Marketing-surface objects (shown in the Marketing section, per industry) ──
// The core CRM objects above stay on the "crm" surface; these are additive
// marketing modules tailored to each vertical.
export const MARKETING_OBJECTS = {
  telecom: {
    promo_campaign:     pipe("promo_campaign", "Promo Campaigns", ["draft", "live", "paused", "ended"]),
    subscriber_segment: list("subscriber_segment", "Subscriber Segments"),
  },
  banking: {
    product_offer: list("product_offer", "Product Offers"),
    cross_sell:    pipe("cross_sell", "Cross-sell Pipeline", ["identified", "contacted", "interested", "converted", "lost"]),
  },
  fmcg: {
    trade_promo:       pipe("trade_promo", "Trade Promotions", ["planned", "active", "completed"]),
    retail_activation: list("retail_activation", "Retail Activations"),
  },
  hotel: {
    package_campaign: pipe("package_campaign", "Package Campaigns", ["draft", "live", "ended"]),
    seasonal_offer:   list("seasonal_offer", "Seasonal Offers"),
  },
  realestate: {
    listing_campaign: pipe("listing_campaign", "Listing Campaigns", ["draft", "live", "closed"]),
    open_house:       list("open_house", "Open Houses"),
  },
  healthcare: { health_campaign: list("health_campaign", "Health Campaigns") },
  education: {
    enrollment_campaign: pipe("enrollment_campaign", "Enrollment Campaigns", ["draft", "live", "ended"]),
    open_day:            list("open_day", "Open Days"),
  },
  ngo: {
    fundraiser:         pipe("fundraiser", "Fundraisers", ["planned", "live", "closed"]),
    awareness_campaign: list("awareness_campaign", "Awareness Campaigns"),
  },
  insurance: {
    product_campaign: list("product_campaign", "Product Campaigns"),
    renewal_drive:    pipe("renewal_drive", "Renewal Drives", ["planned", "active", "completed"]),
  },
  manufacturing: { distributor_promo: list("distributor_promo", "Distributor Promotions") },
  government: {
    public_notice:   list("public_notice", "Public Notices"),
    awareness_drive: pipe("awareness_drive", "Awareness Drives", ["planned", "live", "ended"]),
  },
};

export const GENERAL = "general";
export const INDUSTRY_IDS = Object.keys(INDUSTRIES);

export const isValidIndustry = (id) => id === GENERAL || INDUSTRY_IDS.includes(id);

/** Metadata for one object type within an industry (either surface), or null. */
export function objectMeta(industry, objectType) {
  return INDUSTRIES[industry]?.objects?.[objectType] ?? MARKETING_OBJECTS[industry]?.[objectType] ?? null;
}

/** All valid object type ids for an industry (both surfaces). */
export function objectTypesFor(industry) {
  return [...Object.keys(INDUSTRIES[industry]?.objects ?? {}), ...Object.keys(MARKETING_OBJECTS[industry] ?? {})];
}

/** Merged object list with a `surface` tag ("crm" | "marketing") for the UI. */
export function industryObjects(industry) {
  const crm = Object.values(INDUSTRIES[industry]?.objects ?? {}).map((o) => ({ ...o, surface: "crm" }));
  const mkt = Object.values(MARKETING_OBJECTS[industry] ?? {}).map((o) => ({ ...o, surface: "marketing" }));
  return [...crm, ...mkt];
}
