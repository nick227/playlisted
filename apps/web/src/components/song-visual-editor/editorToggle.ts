export function editorToggleClass(active: boolean, disabled: boolean, sizeClass: string) {
  return [
    `inline-flex items-center rounded-md font-medium transition ${sizeClass}`,
    active
      ? "bg-sky-600 text-white ring-1 ring-inset ring-sky-400/50 hover:bg-sky-500"
      : "text-white/55 hover:bg-white/5 hover:text-white/85",
    disabled ? "cursor-not-allowed opacity-40" : "",
  ].join(" ");
}
