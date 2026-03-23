export default function CustomerTimeline() {
    // ---- STATIC, SAFE DATA ----
    const timeline = [
      {
        id: 1,
        customer: "Alice Johnson",
        events: [
          { id: "e1", type: "email", text: "Welcome email sent", daysAgo: 1 },
          { id: "e2", type: "note", text: "Requested product demo", daysAgo: 3 },
        ],
      },
      {
        id: 2,
        customer: "Bob Smith",
        events: [
          { id: "e3", type: "ticket", text: "Reported login issue", daysAgo: 5 },
          { id: "e4", type: "call", text: "Support follow-up call", daysAgo: 6 },
        ],
      },
      {
        id: 3,
        customer: "Charlie Davis",
        events: [
          { id: "e5", type: "email", text: "Pricing inquiry", daysAgo: 2 },
        ],
      },
    ];
  
    const badgeFor = (type) => {
      switch (type) {
        case "email":
          return "bg-blue-100 text-blue-700";
        case "call":
          return "bg-green-100 text-green-700";
        case "ticket":
          return "bg-amber-100 text-amber-700";
        case "note":
          return "bg-slate-100 text-slate-700";
        default:
          return "bg-slate-100 text-slate-700";
      }
    };
  
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Customer Timeline
          </h3>
          <p className="text-sm text-slate-500">
            Recent interactions across email, calls, tickets, and notes
          </p>
        </div>
  
        {timeline.map((block) => (
          <div key={block.id} className=" dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <p className="font-medium text-slate-900 dark:text-white mb-3">
              {block.customer}
            </p>
  
            <ul className="space-y-2">
              {block.events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${badgeFor(
                        event.type
                      )}`}
                    >
                      {event.type}
                    </span>
                    <span className="text-slate-700">{event.text}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {event.daysAgo}d ago
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  