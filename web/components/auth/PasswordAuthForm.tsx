"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full px-4 py-2.5 border border-border rounded-button focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm";

interface Props {
  redirect?: string;
  mode?: "login" | "register";
}

export function PasswordAuthForm({ redirect = "", mode = "login" }: Props) {
  const [formMode, setFormMode] = useState<"login" | "register">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finishAuth() {
    const token = localStorage.getItem("rf_access_token") || "";
    const refresh = localStorage.getItem("rf_refresh_token") || "";

    if (redirect) {
      const separator = redirect.includes("?") ? "&" : "?";
      window.location.replace(
        redirect +
          separator +
          "token=" +
          encodeURIComponent(token) +
          "&refresh=" +
          encodeURIComponent(refresh)
      );
      return;
    }

    window.location.replace("/dashboard");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.login(email, password);
      await finishAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.register(email, password, name);
      await finishAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const otherUrl =
    formMode === "login"
      ? redirect
        ? `/register?redirect=${encodeURIComponent(redirect)}`
        : "/register"
      : redirect
        ? `/login?redirect=${encodeURIComponent(redirect)}`
        : "/login";

  if (formMode === "register") {
    return (
      <Card padding="md">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href={otherUrl} className="text-primary hover:text-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-danger px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Enter your password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href={otherUrl} className="text-primary hover:text-primary-hover font-medium">
            Create one
          </Link>
        </p>
      </form>
    </Card>
  );
}
