"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, AlertCircle, Eye, EyeOff, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../client/api/client";
import { useAuthStore } from "../../client/store/auth.store";

type UserType = "CONSUMER" | "PRODUCER";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [userType, setUserType] = useState<UserType>("CONSUMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [validationError, setValidationError] = useState("");

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          phone_number: phoneNumber || undefined,
          user_type: userType,
        }),
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      setUser(data.user);

      if (userType === "PRODUCER") {
        router.push("/farmer/onboarding");
      } else {
        router.push("/home");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (!agreedToTerms) {
      setValidationError("Please agree to the terms and conditions");
      return;
    }

    registerMutation.mutate();
  };

  const errorMessage = validationError || registerMutation.error?.message;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Leaf size={32} className="text-accent" />
            <span className="text-2xl font-bold tracking-tight text-heading">
              Harvest
            </span>
          </Link>
          <p className="mt-2 text-sm text-body">
            Join our community of local food enthusiasts
          </p>
        </div>

        {/* Register Card */}
        <div className="border border-border p-8 bg-white rounded">
          <h1 className="text-xl font-bold mb-6 text-heading">
            Create your account
          </h1>

          {/* Account Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-heading">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType("CONSUMER")}
                className={`p-4 border text-left transition-colors rounded ${
                  userType === "CONSUMER" 
                    ? "border-accent bg-success-bg" 
                    : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">🛒</span>
                  {userType === "CONSUMER" && (
                    <Check size={16} className="text-accent" />
                  )}
                </div>
                <p className="text-sm font-medium text-heading">
                  Buy Products
                </p>
                <p className="text-xs mt-1 text-body">
                  Shop fresh produce from local farmers
                </p>
              </button>
              <button
                type="button"
                onClick={() => setUserType("PRODUCER")}
                className={`p-4 border text-left transition-colors rounded ${
                  userType === "PRODUCER" 
                    ? "border-accent bg-success-bg" 
                    : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">🌾</span>
                  {userType === "PRODUCER" && (
                    <Check size={16} className="text-accent" />
                  )}
                </div>
                <p className="text-sm font-medium text-heading">
                  Sell Products
                </p>
                <p className="text-xs mt-1 text-body">
                  List and sell your farm produce
                </p>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-3 p-4 mb-6 border border-error bg-success-bg rounded bg-error-bg">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-error" />
              <p className="text-sm text-error">
                {errorMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-2 text-heading"
              >
                Full name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2 text-heading"
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium mb-2 text-heading"
              >
                Phone number <span className="text-body">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                placeholder="+62 812 3456 7890"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2 text-heading"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-body"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2 text-heading"
              >
                Confirm password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                placeholder="Re-enter your password"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-accent"
              />
              <span className="text-sm text-body">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium underline text-accent"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium underline text-accent"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-3 text-sm font-medium transition-colors bg-accent text-white rounded disabled:opacity-50 hover:bg-accent-hover"
            >
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-body">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-sm text-body">
          <Link href="/" className="hover:underline">
            ← Back to Harvest
          </Link>
        </p>
      </div>
    </div>
  );
}
