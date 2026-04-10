import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { initClubTheme } from "./theme/initClubTheme.js";
import AdminGuard from "./pages/admin/AdminGuard.jsx";

/** Lazy-load everything so one page can't crash the whole app at startup */
const LazyShop = React.lazy(() => import("./pages/Shop.jsx"));
const LazyCheckout = React.lazy(() => import("./pages/Checkout.jsx"));

const LazyLogin = React.lazy(() => import("./pages/Login.jsx"));
const LazyAccountHome = React.lazy(() => import("./pages/account/AccountHome.jsx"));
const LazyMyAthletes = React.lazy(() => import("./pages/account/MyAthletes.jsx"));
const LazyMessages = React.lazy(() => import("./pages/account/Messages.jsx"));
const LazyPayments = React.lazy(() => import("./pages/account/Payments.jsx"));
const LazyOrders = React.lazy(() => import("./pages/account/Orders.jsx"));

const LazyAdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const LazyAdminTheme = React.lazy(() => import("./pages/admin/AdminTheme.jsx"));
const LazyAdminOrders = React.lazy(() => import("./pages/admin/AdminOrders.jsx"));
const LazyAdminRegistrations = React.lazy(() =>
  import("./pages/admin/AdminRegistrations.jsx")
);

const LazyRegistrationSuccessPage = React.lazy(() =>
  import("./pages/RegistrationSuccessPage.jsx")
);

const DEFAULT_CLUB_SLUG = "dojo";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-3xl p-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-xl font-bold text-zinc-900">UI villa</div>
              <div className="mt-2 text-sm text-gray-700">
                Límdu villuna hingað ef þetta kemur aftur.
              </div>
              <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-red-50 p-4 text-sm text-red-800">
                {String(this.state.error?.message || this.state.error)}
              </div>
              <button
                className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function SuspenseWrap({ children, label }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">
            Hleð {label}…
          </div>
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

function ThemeBoot() {
  const { clubSlug } = useParams();

  useEffect(() => {
    initClubTheme(clubSlug || DEFAULT_CLUB_SLUG);
  }, [clubSlug]);

  return null;
}

function RouteShell({ children }) {
  return (
    <>
      <ThemeBoot />
      {children}
    </>
  );
}

function RequireSession({ children }) {
  const { clubSlug } = useParams();
  const loc = useLocation();
  const [ok, setOk] = React.useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!alive) return;
        setOk(res.ok);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  if (ok === null) return null;

  if (!ok) {
    const next = loc.pathname + (loc.search || "");
    return (
      <Navigate
        to={`/c/${clubSlug}/account/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return children;
}

function LegacyRegistrationCheckoutRedirect() {
  const { clubSlug } = useParams();
  return <Navigate to={`/c/${clubSlug}/checkout`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/c/${DEFAULT_CLUB_SLUG}`} replace />} />

        <Route
          path="/c/:clubSlug"
          element={
            <RouteShell>
              <ErrorBoundary>
                <SuspenseWrap label="Shop">
                  <LazyShop />
                </SuspenseWrap>
              </ErrorBoundary>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/checkout"
          element={
            <RouteShell>
              <ErrorBoundary>
                <SuspenseWrap label="Checkout">
                  <LazyCheckout />
                </SuspenseWrap>
              </ErrorBoundary>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/registration/checkout"
          element={
            <RouteShell>
              <LegacyRegistrationCheckoutRedirect />
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/registration/success"
          element={
            <RouteShell>
              <ErrorBoundary>
                <SuspenseWrap label="Registration Success">
                  <LazyRegistrationSuccessPage />
                </SuspenseWrap>
              </ErrorBoundary>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/admin"
          element={
            <RouteShell>
              <AdminGuard>
                <ErrorBoundary>
                  <SuspenseWrap label="Admin">
                    <LazyAdminDashboard />
                  </SuspenseWrap>
                </ErrorBoundary>
              </AdminGuard>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/admin/orders"
          element={
            <RouteShell>
              <AdminGuard>
                <ErrorBoundary>
                  <SuspenseWrap label="Admin Orders">
                    <LazyAdminOrders />
                  </SuspenseWrap>
                </ErrorBoundary>
              </AdminGuard>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/admin/registrations"
          element={
            <RouteShell>
              <AdminGuard>
                <ErrorBoundary>
                  <SuspenseWrap label="Admin Registrations">
                    <LazyAdminRegistrations />
                  </SuspenseWrap>
                </ErrorBoundary>
              </AdminGuard>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/admin/theme"
          element={
            <RouteShell>
              <AdminGuard>
                <ErrorBoundary>
                  <SuspenseWrap label="Admin Theme">
                    <LazyAdminTheme />
                  </SuspenseWrap>
                </ErrorBoundary>
              </AdminGuard>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account/login"
          element={
            <RouteShell>
              <ErrorBoundary>
                <SuspenseWrap label="Login">
                  <LazyLogin />
                </SuspenseWrap>
              </ErrorBoundary>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account"
          element={
            <RouteShell>
              <RequireSession>
                <ErrorBoundary>
                  <SuspenseWrap label="Account">
                    <LazyAccountHome />
                  </SuspenseWrap>
                </ErrorBoundary>
              </RequireSession>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account/athletes"
          element={
            <RouteShell>
              <RequireSession>
                <ErrorBoundary>
                  <SuspenseWrap label="MyAthletes">
                    <LazyMyAthletes />
                  </SuspenseWrap>
                </ErrorBoundary>
              </RequireSession>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account/messages"
          element={
            <RouteShell>
              <RequireSession>
                <ErrorBoundary>
                  <SuspenseWrap label="Messages">
                    <LazyMessages />
                  </SuspenseWrap>
                </ErrorBoundary>
              </RequireSession>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account/payments"
          element={
            <RouteShell>
              <RequireSession>
                <ErrorBoundary>
                  <SuspenseWrap label="Payments">
                    <LazyPayments />
                  </SuspenseWrap>
                </ErrorBoundary>
              </RequireSession>
            </RouteShell>
          }
        />

        <Route
          path="/c/:clubSlug/account/orders"
          element={
            <RouteShell>
              <RequireSession>
                <ErrorBoundary>
                  <SuspenseWrap label="Orders">
                    <LazyOrders />
                  </SuspenseWrap>
                </ErrorBoundary>
              </RequireSession>
            </RouteShell>
          }
        />

        <Route path="*" element={<Navigate to={`/c/${DEFAULT_CLUB_SLUG}`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
