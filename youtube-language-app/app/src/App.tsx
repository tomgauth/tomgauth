import { useState } from "react";
import { Home } from "./components/Home";
import { Study } from "./components/Study";
import type { DeckRow } from "./db";

type Screen = { name: "home" } | { name: "study"; deck: DeckRow };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  if (screen.name === "study") {
    return <Study deck={screen.deck} onExit={() => setScreen({ name: "home" })} />;
  }
  return <Home onStudy={(deck) => setScreen({ name: "study", deck })} />;
}
