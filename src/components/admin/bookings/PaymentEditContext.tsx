"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Lets the payment list tell the "Record Payment" form that a payment is being
// edited, so only one of the two forms is open at a time.
const EditingContext = createContext<{ editing: boolean; setEditing: (v: boolean) => void }>({
  editing: false,
  setEditing: () => {},
});

export function PaymentEditProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <EditingContext.Provider value={{ editing, setEditing }}>{children}</EditingContext.Provider>;
}

export const usePaymentEditing = () => useContext(EditingContext);

/** Hides its children (the add-payment form) while a payment is being edited. */
export function HideWhileEditing({ children }: { children: ReactNode }) {
  const { editing } = usePaymentEditing();
  return editing ? null : <>{children}</>;
}
