
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { loginUser, registerUser } from "./lib/api";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingUser, setPendingUser] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "register") {
        const result = await registerUser({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        // Registration does not log the user in.
        // The backend must approve this account first.
        setPendingUser(result.user || {
          name: name.trim(),
          email: email.trim(),
          approvalStatus: "pending",
        });

        setPassword("");
        return;
      }

      const result = await loginUser({
        email: email.trim(),
        password,
      });

      if (!result.token || !result.user) {
        throw new Error("Login response was incomplete. Please try again.");
      }

      if (
        result.user.role !== "admin" &&
        result.user.approvalStatus !== "approved"
      ) {
        throw new Error(
          "Your account is awaiting Admin approval."
        );
      }

      onLogin(result);
    } catch (err) {
      setError(
        err.message || "Unable to continue. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (pendingUser) {
    return (
      <main className="auth-page">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />

        <motion.section
          className="auth-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="auth-brand">
            <div className="auth-logo">
              <Zap size={25} fill="currentColor" />
            </div>
            <div>
              <div className="auth-brand-name">
                NEXUS<span>360</span>
              </div>
              <div className="auth-caption">
                YOUR BUSINESS UNIVERSE
              </div>
            </div>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">
              <Clock3 size={14} /> ACCOUNT REVIEW
            </span>
            <h1>You're on the list.</h1>
            <p>
              Your account has been created and is waiting
              for the administrator to approve it.
            </p>
          </div>

          <div className="auth-pending-panel">
            <ShieldCheck size={32} />
            <h2>Approval pending</h2>
            <p>
              <strong>Name:</strong> {pendingUser.name}
            </p>
            <p>
              <strong>Email:</strong> {pendingUser.email}
            </p>
            {pendingUser.id && (
              <p>
                <strong>User ID:</strong> {pendingUser.id}
              </p>
            )}
            <p>
              You can sign in after the administrator
              approves your account.
            </p>
          </div>

          <button
            className="auth-submit"
            type="button"
            onClick={() => {
              setPendingUser(null);
              setMode("login");
              setError("");
              setPassword("");
            }}
          >
            Back to sign in <ArrowRight size={18} />
          </button>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <motion.section
        className="auth-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="auth-brand">
          <div className="auth-logo">
            <Zap size={25} fill="currentColor" />
          </div>
          <div>
            <div className="auth-brand-name">
              NEXUS<span>360</span>
            </div>
            <div className="auth-caption">
              YOUR BUSINESS UNIVERSE
            </div>
          </div>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            <ShieldCheck size={14} /> SECURE WORKSPACE
          </span>
          <h1>
            {mode === "login"
              ? "Welcome back."
              : "Create your account."}
          </h1>
          <p>
            {mode === "login"
              ? "Sign in to enter your business universe."
              : "Create an account and wait for administrator approval."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                required
                maxLength={80}
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <span className="auth-password">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Your password"
                }
                minLength={mode === "register" ? 8 : undefined}
                maxLength={72}
                required
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() =>
                  setShowPassword((current) => !current)
                }
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in to Nexus 360"
                : "Create my account"}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-footnote">
          Your workspace is protected by account authentication.
        </p>
      </motion.section>
    </main>
  );
}
