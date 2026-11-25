import { Workflow } from "lucide-react";
import JourneyList from "./journeys/JourneyList";

/** Journey Tab: multi-step journeys started by what contacts do. */
export default function JourneyBuilder() {
  return (
    <JourneyList kind="journey" icon={Workflow} title="Journey Tab"
      subtitle="Multi-step journeys that move each contact along by what they do — saved, versioned and run by the server"
      empty="No journeys yet. Create one, add steps, test it with a real contact, then publish." />
  );
}
