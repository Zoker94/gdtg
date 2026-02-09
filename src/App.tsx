import { useEffect, useState, lazy, Suspense, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ColorThemeProvider } from "@/hooks/useColorTheme";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import { useCheckBannedIP } from "@/hooks/useCheckBannedIP";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateTransaction = lazy(() => import("./pages/CreateTransaction"));
const TransactionDetail = lazy(() => import("./pages/TransactionDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const SearchRoom = lazy(() => import("./pages/SearchRoom"));
const Deposit = lazy(() => import("./pages/Deposit"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const SearchProfile = lazy(() => import("./pages/SearchProfile"));
const ModeratorProfile = lazy(() => import("./pages/ModeratorProfile"));
const ModeratorsListPage = lazy(() => import("./pages/ModeratorsList"));
const ModeratorsFullList = lazy(() => import("./pages/ModeratorsFullList"));
const KYCVerification = lazy(() => import("./pages/KYCVerification"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const TransactionWallet = lazy(() => import("./pages/TransactionWallet"));
const WaitingLobby = lazy(() => import("./pages/WaitingLobby"));
const Messages = lazy(() => import("./pages/Messages"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const IPBlocked = lazy(() => import("./pages/IPBlocked"));

// Lazy load heavy components
const PopupAnnouncement = lazy(() => import("./components/PopupAnnouncement"));
const ConnectionStatus = lazy(() => import("./components/ConnectionStatus"));
const WeatherEffects = lazy(() => import("./components/WeatherEffects"));

// Configure QueryClient with optimized settings for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests up to 2 times (reduced from 3)
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Increased stale time to reduce unnecessary refetches
      staleTime: 1000 * 60 * 2, // 2 minutes (increased from 1)
      gcTime: 1000 * 60 * 10, // 10 minutes (increased from 5)
      // Disable auto refetch for better performance
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch on mount if data exists
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Memoized loading fallback
const PageLoadingFallback = memo(() => (
  <LoadingScreen message="Đang tải trang..." />
));
PageLoadingFallback.displayName = "PageLoadingFallback";

const ProtectedRoute = memo(({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setTimedOut(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  if (loading && !timedOut) {
    return <LoadingScreen message="Đang xác thực..." />;
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
});
ProtectedRoute.displayName = "ProtectedRoute";

const IPBanWrapper = memo(({ children }: { children: React.ReactNode }) => {
  const { isBanned, isChecking } = useCheckBannedIP();

  if (isChecking) {
    return <LoadingScreen message="Đang kiểm tra..." />;
  }

  if (isBanned) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <IPBlocked />
      </Suspense>
    );
  }

  return <>{children}</>;
});
IPBanWrapper.displayName = "IPBanWrapper";

const MaintenanceWrapper = memo(({ children }: { children: React.ReactNode }) => {
  const { shouldShowMaintenance, isLoading } = useMaintenanceMode();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setTimedOut(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  if (isLoading && !timedOut) {
    return <LoadingScreen message="Đang kiểm tra trạng thái hệ thống..." />;
  }
  
  if (shouldShowMaintenance) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Maintenance />
      </Suspense>
    );
  }
  
  return <>{children}</>;
});
MaintenanceWrapper.displayName = "MaintenanceWrapper";

const AppRoutes = memo(() => (
  <IPBanWrapper>
    <MaintenanceWrapper>
      <Suspense fallback={null}>
        <PopupAnnouncement />
      </Suspense>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/join/:roomId" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/search-room" element={<SearchRoom />} />
          <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transaction-history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
          <Route path="/wallet-history" element={<ProtectedRoute><TransactionWallet /></ProtectedRoute>} />
          <Route path="/create-transaction" element={<ProtectedRoute><CreateTransaction /></ProtectedRoute>} />
          <Route path="/transaction/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
          <Route path="/waiting/:transactionId" element={<ProtectedRoute><WaitingLobby /></ProtectedRoute>} />
          <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
          <Route path="/search-profile" element={<ProtectedRoute><SearchProfile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/moderator/:moderatorId" element={<ModeratorProfile />} />
          <Route path="/moderators" element={<ModeratorsListPage />} />
          <Route path="/moderators-full" element={<ModeratorsFullList />} />
          <Route path="/kyc" element={<ProtectedRoute><KYCVerification /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </MaintenanceWrapper>
  </IPBanWrapper>
));
AppRoutes.displayName = "AppRoutes";

const App = () => {
  // Global error handler to prevent blank screen crashes
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ColorThemeProvider>
            <AuthProvider>
              <TooltipProvider>
                <Suspense fallback={null}>
                  <ConnectionStatus />
                </Suspense>
                <Suspense fallback={null}>
                  <WeatherEffects />
                </Suspense>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
