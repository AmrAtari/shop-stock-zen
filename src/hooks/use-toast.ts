import * as React from "react";

// ----------------------------
// Types
// ----------------------------
export type ToastType = "success" | "error" | "info";

export type ToastActionElement = React.ReactNode; // Replace with your specific type if needed

export interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: ToastType;
  action?: ToastActionElement;
  duration?: number; // optional custom duration in ms
}

export type ToasterToast = ToastProps & {
  id: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

// ----------------------------
// Constants
// ----------------------------
const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
const DEFAULT_TOAST_LIMIT = 3;

// ----------------------------
// State & Reducer
// ----------------------------
type State = {
  toasts: ToasterToast[];
};

let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// Track active timeouts for auto-remove
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast; limit?: number }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      const limit = action.limit ?? DEFAULT_TOAST_LIMIT;
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, limit),
      };
    }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      const addToRemoveQueue = (id: string, duration: number) => {
        if (toastTimeouts.has(id)) return;

        const timeout = setTimeout(() => {
          toastTimeouts.delete(id);
          dispatch({ type: "REMOVE_TOAST", toastId: id });
        }, duration);

        toastTimeouts.set(id, timeout);
      };

      if (toastId) {
        const toast = state.toasts.find((t) => t.id === toastId);
        if (toast) addToRemoveQueue(toastId, toast.duration ?? DEFAULT_TOAST_DURATION);
      } else {
        state.toasts.forEach((t) => addToRemoveQueue(t.id, t.duration ?? DEFAULT_TOAST_DURATION));
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => (toastId === undefined || t.id === toastId ? { ...t, open: false } : t)),
      };
    }

    case "REMOVE_TOAST":
      if (!action.toastId) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// ----------------------------
// Dispatch
// ----------------------------
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

// ----------------------------
// Toast API
// ----------------------------
export function toast(props: ToastProps, limit?: number) {
  const id = genId();

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  const update = (updateProps: Partial<ToasterToast>) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...updateProps, id } });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
    limit,
  });

  return { id, dismiss, update };
}

// ----------------------------
// useToast Hook
// ----------------------------
export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
