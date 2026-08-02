// Turns the flow's navigate actions into Figma prototype reactions, so the
// generated frames form a clickable prototype mirroring the routing model.
import type { BuiltScreen } from "./screen";

export async function wireNavigation(built: BuiltScreen[]): Promise<void> {
  const byId = new Map<string, FrameNode>();
  for (const b of built) byId.set(b.id, b.frame);

  for (const b of built) {
    for (const nav of b.navTargets) {
      const dest = byId.get(nav.target);
      if (!dest) continue;
      const reaction: Reaction = {
        trigger: { type: "ON_CLICK" },
        actions: [
          {
            type: "NODE",
            destinationId: dest.id,
            navigation: "NAVIGATE",
            transition: {
              type: "SMART_ANIMATE",
              easing: { type: "EASE_OUT" },
              duration: 0.3,
            },
            preserveScrollPosition: false,
          },
        ],
      };
      await (nav.node as SceneNode & ReactionMixin).setReactionsAsync([reaction]);
    }
  }
}
