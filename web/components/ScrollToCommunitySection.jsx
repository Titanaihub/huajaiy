"use client";

import { useEffect } from "react";

const ID = {
  lobby: "community-lobby",
  title: "member-pages"
};

/**
 * @param {{ target?: 'lobby' | 'title' | null }} props
 */
export default function ScrollToCommunitySection({ target }) {
  useEffect(() => {
    const run = () => {
      const hash = window.location.hash?.replace(/^#/, "").trim();
      if (hash === ID.lobby || hash === ID.title) {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        return;
      }
      const id = target ? ID[target] : null;
      if (id) {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    };
    requestAnimationFrame(run);
  }, [target]);

  return null;
}
