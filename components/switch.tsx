"use client";

/**
 * A track/thumb switch. The visual is a real thumb element, not an `::before`
 * on the input — pseudo-elements do not render on replaced elements like
 * `<input>`, which is why a bare styled checkbox never showed its knob. The
 * input sits invisibly on top so the control stays a native, focusable,
 * label-clickable checkbox.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="ui-switch" data-checked={checked || undefined}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-switch-thumb" aria-hidden />
    </span>
  );
}
