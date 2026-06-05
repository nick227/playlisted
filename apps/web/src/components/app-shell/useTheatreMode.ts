import { useEffect, useState } from "react";

import theatreController from "@/theatre/controller/lazyController";

export function useTheatreMode() {
  const [canEnterTheatre, setCanEnterTheatre] = useState(theatreController.state.canEnter);
  const [theatreActive, setTheatreActive] = useState(theatreController.state.active);
  const [theatreLoading, setTheatreLoading] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanEnterTheatre(theatreController.state.canEnter);
      setTheatreActive(theatreController.state.active);
    };
    const onEnter = () => {
      sync();
      setTheatreLoading(false);
    };
    const onExit = () => {
      sync();
      setTheatreLoading(false);
    };

    theatreController.addEventListener("change", sync);
    theatreController.addEventListener("enter", onEnter);
    theatreController.addEventListener("exit", onExit);

    return () => {
      theatreController.removeEventListener("change", sync);
      theatreController.removeEventListener("enter", onEnter);
      theatreController.removeEventListener("exit", onExit);
    };
  }, []);

  async function toggleTheatreMode() {
    if (theatreActive) {
      void theatreController.exit();
      return;
    }

    setTheatreLoading(true);
    try {
      await theatreController.toggle();
    } catch {
      setTheatreLoading(false);
    }
  }

  return {
    canEnterTheatre,
    theatreActive,
    theatreLoading,
    toggleTheatreMode,
  };
}
