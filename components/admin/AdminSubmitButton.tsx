"use client";

import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  value: "approve" | "publish" | "reject" | "revoke" | "review" | "feature" | "archive" | "pin" | "unpin";
  label: string;
  confirmMessage?: string;
};

export function AdminSubmitButton({ value, label, confirmMessage }: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!confirmMessage) {
      return;
    }

    const accepted = window.confirm(confirmMessage);
    if (!accepted) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      name="action"
      value={value}
      className="action-secondary"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Przetwarzanie..." : label}
    </button>
  );
}
