import { Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import { LoginPage } from "@/pages/LoginPage/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage/RegisterPage";
import { ProtectedRoute } from "@/app/routes/ProtectedRoute";
import { MeetingsPage } from "@/pages/MeetingsPage/MeetingsPage";
import { MainLayout } from "../layouts/MainLayout/MainLayout";
import { MeetingDetailsPage } from "@/pages/MeetingDetailsPage/MeetingsDetailsPage";
import { ChatsPage } from "@/pages/ChatsPage/ChatsPage";
import { ProfilePage } from "@/pages/ProfilePage/ProfilePage";
import { ChatPage } from "@/pages/ChatPage/ChatPage";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/meetings" element={<MeetingsPage />} />

        <Route path="/meetings/:id" element={<MeetingDetailsPage />} />

        <Route path="/chats" element={<ChatsPage />} />

        <Route path="/chats/:id" element={<ChatPage />} />

        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/users/:id" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
};
