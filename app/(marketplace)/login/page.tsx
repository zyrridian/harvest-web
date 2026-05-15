"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../client/api/client";
import { useAuthStore } from "../../client/store/auth.store";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      setUser(data.user);

      if (data.user.user_type === "PRODUCER") {
        router.push("/farmer/dashboard");
      } else if (data.user.user_type === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
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
            Fresh produce directly from local farms
          </p>
        </div>

        {/* Login Card */}
        <div className="border border-border p-8 bg-white rounded">
          <h1 className="text-xl font-bold mb-6 text-heading">
            Welcome back
          </h1>

          {loginMutation.isError && (
            <div className="flex items-start gap-3 p-4 mb-6 border border-error bg-success-bg rounded bg-error-bg">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-error" />
              <p className="text-sm text-error">
                {loginMutation.error?.message}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-4 py-3 pr-12 text-sm border border-border rounded outline-none transition-colors focus:border-accent text-heading"
                  placeholder="Enter your password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-body">
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3 text-sm font-medium transition-colors bg-accent text-white rounded disabled:opacity-50 hover:bg-accent-hover"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-body">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Create account
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
