import { useState } from "react";

/** Controla o alternar entre modo leitura e edição de um `EditableSection`. */
export function useEditToggle() {
  const [editing, setEditing] = useState(false);
  return { editing, open: () => setEditing(true), close: () => setEditing(false) };
}
