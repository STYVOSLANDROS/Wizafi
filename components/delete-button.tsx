"use client";

export function DeleteButton({ confirmLabel }: { confirmLabel: string }) {
  return (
    <button
      type="submit"
      className="text-red-600 underline"
      onClick={(event) => {
        if (!confirm(confirmLabel)) {
          event.preventDefault();
        }
      }}
    >
      Supprimer
    </button>
  );
}
