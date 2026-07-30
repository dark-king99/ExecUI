/**
 * My HR — an employee's own record, under Account.
 *
 * This is deliberately not the HR module. The HR console administers *other
 * people*: employment records, compensation history, leave decisions, payroll.
 * An employee has no business opening it, so it isn't in their sidebar and isn't
 * reachable by URL — but they must still be able to read their own payslip, book
 * leave and submit hours. That belongs beside their profile, which is where this
 * lives.
 *
 * `?section=` picks the sub-tab, so a notification about a payslip or a leave
 * decision opens the thing it is about.
 */
import PageHeader from "../../components/ui/PageHeader";
import useRecordParam from "../../hooks/useRecordParam";
import MyHr from "./MyHr";

const SECTIONS = ["profile", "leave", "time", "pay"];

export default function MyHrPage() {
  const [section] = useRecordParam("section");

  return (
    <div>
      <PageHeader
        title="My HR"
        subtitle="Your employment details, leave, timesheet and payslips."
      />
      <MyHr initialTab={SECTIONS.includes(section) ? section : "profile"} />
    </div>
  );
}
