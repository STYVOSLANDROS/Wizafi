"use client";

export default function TransactionsError({ error }: { error: Error }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {error.message || "Une erreur est survenue."}
    </div>
  );
}
