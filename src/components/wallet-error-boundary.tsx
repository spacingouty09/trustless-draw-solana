import { Component, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

// The Solana wallet-adapter stack is rendered in the root layout on every
// route. If adapter construction or module init throws (missing browser
// API, extension quirk, etc.), this keeps the failure scoped to "no
// wallet" instead of crashing the whole page via the root error boundary.
export class WalletErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    reportLovableError(error, { boundary: "wallet_provider" });
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
