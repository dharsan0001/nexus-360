import { useCallback, useEffect, useState } from "react";
import {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  getAdminStats,
  updateUserRole,
} from "./lib/api.js";

const styles = {
  page: {
    display: "grid",
    gap: 22,
    color: "var(--text-primary, #f4f2ff)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  eyebrow: {
    color: "#a78bfa",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: 800, margin: "0 0 8px" },
  subtitle: {
    color: "var(--text-secondary, #9995b5)",
    margin: 0,
    lineHeight: 1.6,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
  },
  stat: {
    padding: 20,
    borderRadius: 16,
    border: "1px solid var(--border-color, #302a49)",
    background: "var(--panel-bg, #171326)",
    minWidth: 0,
  },
  statLabel: { color: "#aaa4c4", fontSize: 13, marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: 800 },
  statHint: { color: "#77718f", fontSize: 11, marginTop: 8 },
  panel: {
    border: "1px solid var(--border-color, #302a49)",
    borderRadius: 18,
    background: "var(--panel-bg, #171326)",
    overflow: "hidden",
  },
  toolbar: {
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: "1px solid var(--border-color, #302a49)",
  },
  tabs: { display: "flex", flexWrap: "wrap", gap: 8 },
  tableWrap: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 920,
    textAlign: "left",
  },
  th: {
    padding: "14px 18px",
    color: "#aaa4c4",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1px solid var(--border-color, #302a49)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "16px 18px",
    borderBottom: "1px solid var(--border-color, #252039)",
    fontSize: 13,
    verticalAlign: "middle",
  },
  button: {
    border: "1px solid var(--border-color, #403658)",
    borderRadius: 9,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 9,
    border: "1px solid #403658",
    background: "var(--input-bg, #100d1c)",
    color: "inherit",
    minWidth: 220,
    maxWidth: "100%",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #403658",
    background: "var(--input-bg, #100d1c)",
    color: "inherit",
    cursor: "pointer",
    fontSize: 12,
    maxWidth: 140,
  },
};

const MANAGED_ROLES = ["user", "employee", "manager"];

function getUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.pendingUsers)) return data.pendingUsers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getStatsObject(data) {
  if (data?.stats && typeof data.stats === "object") {
    return data.stats;
  }

  if (data?.data?.stats && typeof data.data.stats === "object") {
    return data.data.stats;
  }

  return data?.data && typeof data.data === "object" ? data.data : data || {};
}

function statusStyle(status) {
  const normalized = String(status || "pending").toLowerCase();

  if (normalized === "approved" || normalized === "admin") {
    return { color: "#65e6b5", background: "#123b30" };
  }

  if (normalized === "rejected") {
    return { color: "#ff929e", background: "#451f30" };
  }

  return { color: "#f5c879", background: "#46351d" };
}

function formatRole(role) {
  const normalized = String(role || "user").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function StatCard({ label, value, color, hint }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      {hint ? <div style={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

export default function UserApprovals({ token }) {
  const [view, setView] = useState("pending");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminStats, setAdminStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    if (!token) {
      setError("Your session token is missing. Sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        getPendingUsers(token),
        getAllUsers(token),
        getAdminStats(token),
      ]);

      const [pendingResult, allResult, statsResult] = results;

      if (pendingResult.status === "fulfilled") {
        setPendingUsers(getUsers(pendingResult.value));
      } else {
        throw pendingResult.reason;
      }

      if (allResult.status === "fulfilled") {
        setAllUsers(getUsers(allResult.value));
      } else {
        throw allResult.reason;
      }

      if (statsResult.status === "fulfilled") {
        setAdminStats(getStatsObject(statsResult.value));
      } else {
        // User lists can still work if the statistics endpoint fails.
        setAdminStats({});
        console.error("Unable to load admin statistics:", statsResult.reason);
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load users. Check that you are signed in as an administrator."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDecision(user, decision) {
    const userId = user._id || user.id;

    if (!userId) {
      setError("This user record has no ID. Cannot update it.");
      return;
    }

    if (user.role === "admin") {
      setError("Admin accounts are protected from approval changes.");
      return;
    }

    const label = user.name || user.email || userId;

    if (
      !window.confirm(
        `Are you sure you want to ${decision} access for ${label}?`
      )
    ) {
      return;
    }

    setBusyId(userId);
    setError("");
    setNotice("");

    try {
      if (decision === "approve") {
        await approveUser(token, userId);
        setNotice(`${label} has been approved successfully.`);
      } else {
        await rejectUser(token, userId);
        setNotice(`${label} has been rejected.`);
      }

      await loadUsers();
    } catch (err) {
      setError(err?.message || `Unable to ${decision} this account.`);
    } finally {
      setBusyId("");
    }
  }

  async function handleRoleChange(user, nextRole) {
    const userId = user._id || user.id;
    const currentRole = String(user.role || "user").toLowerCase();

    if (!userId) {
      setError("This user record has no ID. Cannot update the role.");
      return;
    }

    if (currentRole === "admin") {
      setError("Admin roles cannot be changed from this page.");
      return;
    }

    if (!MANAGED_ROLES.includes(nextRole)) {
      setError("That role is not allowed.");
      return;
    }

    if (nextRole === currentRole) {
      return;
    }

    const label = user.name || user.email || userId;

    if (
      !window.confirm(
        `Change ${label}'s role from ${formatRole(currentRole)} to ${formatRole(nextRole)}?`
      )
    ) {
      return;
    }

    setBusyId(userId);
    setError("");
    setNotice("");

    try {
      await updateUserRole(token, userId, nextRole);
      setNotice(`${label}'s role has been changed to ${formatRole(nextRole)}.`);
      await loadUsers();
    } catch (err) {
      setError(err?.message || "Unable to update this user's role.");
    } finally {
      setBusyId("");
    }
  }

  const displayedUsers = (
    view === "pending" ? pendingUsers : allUsers
  ).filter((user) => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return true;

    return [
      user.name,
      user.email,
      user._id,
      user.id,
      user.role,
      user.approvalStatus,
    ].some((value) =>
      String(value || "").toLowerCase().includes(searchText)
    );
  });

  const pendingCount =
    Number.isFinite(Number(adminStats.pendingUsers))
      ? Number(adminStats.pendingUsers)
      : pendingUsers.length;

  const totalUsers =
    Number.isFinite(Number(adminStats.totalUsers))
      ? Number(adminStats.totalUsers)
      : allUsers.length;

  const totalAdmins = Number.isFinite(Number(adminStats.totalAdmins))
    ? Number(adminStats.totalAdmins)
    : allUsers.filter((user) => user.role === "admin").length;

  const approvedCount =
    Number.isFinite(Number(adminStats.approvedUsers))
      ? Number(adminStats.approvedUsers)
      : allUsers.filter(
          (user) =>
            user.approvalStatus === "approved" || user.role === "admin"
        ).length;

  const rejectedCount =
    Number.isFinite(Number(adminStats.rejectedUsers))
      ? Number(adminStats.rejectedUsers)
      : allUsers.filter((user) => user.approvalStatus === "rejected").length;

  const managerCount =
    Number.isFinite(Number(adminStats.managers))
      ? Number(adminStats.managers)
      : allUsers.filter((user) => user.role === "manager").length;

  const employeeCount =
    Number.isFinite(Number(adminStats.employees))
      ? Number(adminStats.employees)
      : allUsers.filter((user) => user.role === "employee").length;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>NEXUS360 / ADMINISTRATION</div>
          <h1 style={styles.title}>Admin Control Center</h1>
          <p style={styles.subtitle}>
            Review registrations, manage user roles, and monitor workspace
            access.
          </p>
        </div>

        <button
          type="button"
          style={{
            ...styles.button,
            background: "#7c5cff",
            color: "#fff",
            borderColor: "#7c5cff",
            opacity: loading ? 0.65 : 1,
          }}
          onClick={loadUsers}
          disabled={loading || Boolean(busyId)}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      <section style={styles.stats}>
        <StatCard
          label="Total users"
          value={totalUsers}
          color="#c4b5fd"
          hint="Registered accounts"
        />

        <StatCard
          label="Pending review"
          value={pendingCount}
          color="#f5c879"
          hint="Awaiting approval"
        />

        <StatCard
          label="Approved accounts"
          value={approvedCount}
          color="#65e6b5"
          hint="Approved access and admins"
        />

        <StatCard
          label="Rejected accounts"
          value={rejectedCount}
          color="#ff929e"
          hint="Access not approved"
        />

        <StatCard
          label="Administrators"
          value={totalAdmins}
          color="#a78bfa"
          hint="Protected admin accounts"
        />

        <StatCard
          label="Managers"
          value={managerCount}
          color="#7dd3fc"
          hint="Manager role"
        />

        <StatCard
          label="Employees"
          value={employeeCount}
          color="#f0abfc"
          hint="Employee role"
        />
      </section>

      {error && (
        <div
          role="alert"
          style={{
            padding: 14,
            borderRadius: 12,
            color: "#ffabb3",
            background: "#3d1d2b",
            border: "1px solid #713247",
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: 14,
            borderRadius: 12,
            color: "#83efc1",
            background: "#12372e",
            border: "1px solid #21664f",
          }}
        >
          {notice}
        </div>
      )}

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setView("pending")}
              style={{
                ...styles.button,
                color: view === "pending" ? "#fff" : "#aaa4c4",
                background: view === "pending" ? "#6548cf" : "transparent",
                borderColor: view === "pending" ? "#6548cf" : "#403658",
              }}
            >
              Pending Users ({pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setView("all")}
              style={{
                ...styles.button,
                color: view === "all" ? "#fff" : "#aaa4c4",
                background: view === "all" ? "#6548cf" : "transparent",
                borderColor: view === "all" ? "#6548cf" : "#403658",
              }}
            >
              All Users ({allUsers.length})
            </button>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, role, or ID..."
            aria-label="Search users"
            style={styles.input}
          />
        </div>

        {loading ? (
          <div style={{ padding: 36, textAlign: "center", color: "#aaa4c4" }}>
            Loading user accounts and admin statistics...
          </div>
        ) : displayedUsers.length === 0 ? (
          <div style={{ padding: 42, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>◎</div>
            <h3 style={{ margin: "0 0 8px" }}>
              {view === "pending"
                ? "No pending registrations"
                : "No matching users"}
            </h3>
            <p style={{ color: "#aaa4c4", margin: 0 }}>
              {view === "pending"
                ? "New registrations waiting for approval will appear here."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>User ID</th>
                  <th style={styles.th}>Role management</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Registered</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedUsers.map((user) => {
                  const userId = user._id || user.id;
                  const role = String(user.role || "user").toLowerCase();
                  const status =
                    role === "admin"
                      ? "admin"
                      : String(user.approvalStatus || "pending").toLowerCase();
                  const isBusy = busyId === userId;

                  return (
                    <tr key={userId || user.email}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 750, marginBottom: 5 }}>
                          {user.name || "Unnamed user"}
                        </div>
                        <div
                          style={{
                            color: "#aaa4c4",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {user.email || "No email"}
                        </div>
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color: "#aaa4c4",
                          fontFamily: "monospace",
                        }}
                      >
                        {userId || "Unavailable"}
                      </td>

                      <td style={styles.td}>
                        {role === "admin" ? (
                          <span
                            style={{
                              ...styles.button,
                              display: "inline-block",
                              color: "#c4b5fd",
                              background: "#292044",
                              cursor: "default",
                            }}
                          >
                            Admin protected
                          </span>
                        ) : (
                          <select
                            aria-label={`Change role for ${user.name || user.email || userId}`}
                            value={MANAGED_ROLES.includes(role) ? role : "user"}
                            disabled={isBusy || !userId}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value)
                            }
                            style={{
                              ...styles.select,
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            {MANAGED_ROLES.map((managedRole) => (
                              <option key={managedRole} value={managedRole}>
                                {formatRole(managedRole)}
                              </option>
                            ))}
                          </select>
                        )}
                        {isBusy && (
                          <div
                            style={{
                              marginTop: 6,
                              color: "#aaa4c4",
                              fontSize: 11,
                            }}
                          >
                            Updating...
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...statusStyle(status),
                            display: "inline-block",
                            borderRadius: 20,
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {status === "admin"
                            ? "ADMIN"
                            : status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ ...styles.td, color: "#aaa4c4" }}>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td style={styles.td}>
                        {role === "admin" ? (
                          <span style={{ color: "#aaa4c4" }}>Protected</span>
                        ) : status === "pending" ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDecision(user, "approve")}
                              style={{
                                ...styles.button,
                                color: "#65e6b5",
                                background: "#123b30",
                                borderColor: "#21664f",
                                opacity: isBusy ? 0.6 : 1,
                              }}
                            >
                              {isBusy ? "Working..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDecision(user, "reject")}
                              style={{
                                ...styles.button,
                                color: "#ff929e",
                                background: "#451f30",
                                borderColor: "#713247",
                                opacity: isBusy ? 0.6 : 1,
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#aaa4c4" }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p
        style={{
          color: "#77718f",
          fontSize: 12,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Security note: this page hides role editing for administrators. The
        server must also enforce admin-only permissions and reject attempts to
        promote ordinary users to admin.
      </p>
    </main>
  );
}
