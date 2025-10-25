import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// === Config ===
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 10000; // adjust duration as needed

// === Types ===
type ToastType = "success" | "error" | "info";

type ToasterToast = Omit<ToastProps, "type"> & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: ToastType;
  action?: ToastActionElement;
};

// Map your custom type to the library type
function mapToastType(type?: ToastType): "background" | "foreground" {
  switch (type) {
    case "error":
      return "background";
    case "success":
    case "info":
      return "foreground";
    default:
      return "foreground";
  }
}

// === Actions ===
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> & { id: string } }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Queue toast for removal
const addToRemoveQueue = (toastId: string, dispatch: (action: Action) => void) => {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId
