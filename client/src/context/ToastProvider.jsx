import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";

let nextToastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(() => {
    const pending = sessionStorage.getItem("pendingToast");
    if (!pending) return [];
    sessionStorage.removeItem("pendingToast");
    try {
      const { message, type } = JSON.parse(pending);
      return [{ id: ++nextToastId, message, type: type || "success" }];
    } catch {
      return [{ id: ++nextToastId, message: pending, type: "success" }];
    }
  });
  const initialToasts = useRef(toasts);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message, type = "info", duration = 5000) => {
    if (!message) return null;
    const id = ++nextToastId;
    setToasts((current) => [...current.slice(-3), { id, message, type }]);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
    return id;
  }, [dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    initialToasts.current.forEach(({ id }) => activeTimers.set(id, setTimeout(() => {
      activeTimers.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000)));
    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({
    show,
    success: (message, duration) => show(message, "success", duration),
    error: (message, duration) => show(message, "error", duration),
    warning: (message, duration) => show(message, "warning", duration),
    info: (message, duration) => show(message, "info", duration),
    dismiss,
  }), [dismiss, show]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} key={toast.id}>
        <span className="toast-icon" aria-hidden="true">{toast.type === "success" ? "✓" : toast.type === "error" ? "!" : toast.type === "warning" ? "!" : "i"}</span>
        <p>{toast.message}</p>
        <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">×</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}
