const SENSITIVE_CLASSES = new Set(["Porn", "Hentai", "Sexy"]);

const THRESHOLDS: Record<string, number> = {
  Porn: 0.5,
  Hentai: 0.5,
  Sexy: 0.9,
};

export type SensitivityResult = {
  sensitive: boolean;
  reason: string | null;
  checked: boolean;
};

export function verdictFor(
  predictions: { className: string; probability: number }[],
): SensitivityResult {
  const hit = predictions.find(
    (prediction) =>
      SENSITIVE_CLASSES.has(prediction.className) &&
      prediction.probability >= (THRESHOLDS[prediction.className] ?? 1),
  );
  // Explicit probability split between photos and drawings still warrants a veil.
  const explicit = predictions.filter(
    (prediction) =>
      ["Porn", "Hentai"].includes(prediction.className) &&
      Number.isFinite(prediction.probability) &&
      prediction.probability >= 0 &&
      prediction.probability <= 1,
  );
  const combined =
    explicit.reduce((total, prediction) => total + prediction.probability, 0) >=
    0.65;
  // Adult confidence remains adult confidence when the model splits categories.
  const adult = predictions
    .filter(
      ({ className, probability }) =>
        SENSITIVE_CLASSES.has(className) &&
        Number.isFinite(probability) &&
        probability >= 0 &&
        probability <= 1,
    )
    .reduce((total, { probability }) => total + probability, 0);
  const combinedAdult = adult >= 0.9;
  return {
    sensitive: Boolean(hit) || combined || combinedAdult,
    reason:
      hit?.className ??
      (combined ? "Explicit" : combinedAdult ? "Adult" : null),
    checked: true,
  };
}
