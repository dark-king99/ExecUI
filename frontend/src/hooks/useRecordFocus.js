/**
 * useRecordFocus — land a deep link on a row in a plain list.
 *
 * Most of the module views are flat tables with no detail panel to open, so
 * `?open=<id>` has nothing to expand. Highlighting and scrolling to the row is
 * the honest equivalent: "here is the record you followed a link to", instead of
 * "here is the list it is somewhere in" — which is what those links used to do
 * on the rare occasions they resolved at all.
 *
 * Usage:
 *   const focus = useRecordFocus();
 *   <tr {...focus.props(c.id)}>…</tr>
 *
 * `props` supplies the id, the highlight class and a scroll target, so a view
 * opts in with one spread rather than three pieces of bookkeeping it could get
 * half-right.
 */
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const RING =
  "ring-2 ring-indigo-400/70 dark:ring-indigo-400/50 bg-indigo-50/60 dark:bg-indigo-500/10";

export default function useRecordFocus(param = "open") {
  const [params] = useSearchParams();
  const focusedId = params.get(param);

  // Scroll once the row exists. The list is usually still loading when the link
  // is followed, so this re-runs until the element appears.
  useEffect(() => {
    if (!focusedId) return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.querySelector(`[data-record-id="${CSS.escape(focusedId)}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        clearInterval(timer);
      } else if (++tries > 20) {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [focusedId]);

  return useMemo(() => ({
    focusedId,
    isFocused: (id) => !!focusedId && id === focusedId,
    /** Spread onto the row element. */
    props: (id) => ({
      "data-record-id": id,
      className: focusedId && id === focusedId ? RING : undefined,
    }),
    /** When the row already has classes of its own. */
    className: (id, base = "") =>
      [base, focusedId && id === focusedId ? RING : ""].filter(Boolean).join(" "),
  }), [focusedId]);
}
