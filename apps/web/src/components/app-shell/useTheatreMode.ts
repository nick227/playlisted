import { useEffect, useState } from "react";

import theatreController from "@/theatre/controller/lazyController";

export function useTheatreMode() {
  const [canEnterTheatre, setCanEnterTheatre] = useState(theatreController.state.canEnter);
  /** User preference from the top-bar toggle — not the same as runtime `active`. */
  const [theatreFxEnabled, setTheatreFxEnabled] = useState(theatreController.state.fxEnabled);
  /** True when theatre visuals are actually mounted (background or immersive). */
  const [theatreActive, setTheatreActive] = useState(theatreController.state.active);
  const [theatreLoading, setTheatreLoading] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanEnterTheatre(theatreController.state.canEnter);
      setTheatreFxEnabled(theatreController.state.fxEnabled);
      setTheatreActive(theatreController.state.active);
    };
    const onChange = () => {
      sync();
      setTheatreLoading(false);
    };
    const onEnter = () => {
      sync();
      setTheatreLoading(false);
    };
    const onExit = () => {
      sync();
      setTheatreLoading(false);
    };

    theatreController.addEventListener("change", onChange);
    theatreController.addEventListener("enter", onEnter);
    theatreController.addEventListener("exit", onExit);

    return () => {
      theatreController.removeEventListener("change", onChange);
      theatreController.removeEventListener("enter", onEnter);
      theatreController.removeEventListener("exit", onExit);
    };
  }, []);

  async function toggleTheatreMode() {
    const nextEnabled = !theatreFxEnabled;

    if (!nextEnabled) {
      theatreController.setFxEnabled(false);
      return;
    }

    if (!canEnterTheatre) return;

    setTheatreLoading(true);
    try {
      await theatreController.setFxEnabled(true);
    } catch {
      setTheatreLoading(false);
    }
  }

  return {
    canEnterTheatre,
    theatreFxEnabled,
    theatreActive,
    theatreLoading,
    toggleTheatreMode,
  };
}
