/**
 * What the Android back button does before it navigates: the newest open layer (a sheet, the streak screen,
 * a running break) handles it first. Register while the layer is open and call the returned function to remove.
 */
const layers: (() => void)[] = [];

export function onBack(handler: () => void): () => void {
  layers.push(handler);
  return () => {
    const i = layers.lastIndexOf(handler);
    if (i >= 0) layers.splice(i, 1);
  };
}

/** Runs the newest layer's handler. False when nothing is open. */
export function handleBack(): boolean {
  const top = layers[layers.length - 1];
  if (!top) return false;
  top();
  return true;
}
