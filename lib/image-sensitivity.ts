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
  return {
    sensitive: Boolean(hit),
    reason: hit?.className ?? null,
    checked: true,
  };
}
