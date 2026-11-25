import { CalendarClock } from "lucide-react";
import JourneyList from "./journeys/JourneyList";

/** Automation Studio: scheduled automations over an audience, on the journey engine. */
export default function AutomationStudio() {
  return (
    <JourneyList kind="automation" icon={CalendarClock} title="Automation Studio"
      subtitle="Scheduled automations: every hour, day or week, enroll an audience and run the steps — versioned, testable and audited"
      empty="No automations yet. Create one, choose the audience and schedule, add steps, then publish." />
  );
}
