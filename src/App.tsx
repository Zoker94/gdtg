import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateTransaction from "./pages/CreateTransaction";
import TransactionDetail from "./pages/TransactionDetail";
import AdminDashboard from "./pages/AdminDashboard";
import JoinRoom from "./pages/JoinRoom";
import SearchRoom from "./pages/SearchRoom";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import UserProfile from "./pages/UserProfile";
import MyProfile from "./pages/MyProfile";
import SearchProfile from "./pages/SearchProfile";
import ModeratorProfile from "./pages/ModeratorProfile";
import ModeratorsListPage from "./pages/ModeratorsList";
import ModeratorsFullList from "./pages/ModeratorsFullList";
import KYCVerification from "./pages/KYCVerification";
import TransactionHistory from "./pages/TransactionHistory";
import WaitingLobby from "./pages/WaitingLobby";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
            <Route path="/create-transaction" element={<ProtectedRoute><CreateTransaction /></ProtectedRoute>} />
            <Route path="/transaction/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
            <Route path="/waiting/:transactionId" element={<ProtectedRoute><WaitingLobby /></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/search-profile" element={<ProtectedRoute><SearchProfile /></ProtectedRoute>} />
            <Route path="/moderator/:moderatorId" element={<ModeratorProfile />} />
            <Route path="/moderators" element={<ModeratorsListPage />} />
            <Route path="/moderators-full" element={<ModeratorsFullList />} />
            <Route path="/kyc" element={<ProtectedRoute><KYCVerification /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
