
import { useEffect, useMemo, useState } from "react";
import Auth from "./Auth.jsx";
import UserApprovals from "./UserApprovals.jsx";

import {
  getCurrentUser,
  getAnalytics,
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./lib/api.js";

import { motion } from "framer-motion";

import {
  LayoutDashboard,
  Users,
  Target,
  BriefcaseBusiness,
  CheckSquare,
  Settings,
  Search,
  Bell,
  Plus,
  DollarSign,
  Menu,
  Zap,
  LogOut,
  RefreshCw,
  Download,
  Trash2,
  X,
  TrendingUp,
  CircleHelp,
  ShieldCheck,
} from "lucide-react";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./index.css";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Customers", icon: Users },
  { label: "Leads", icon: Target },
  { label: "Deals", icon: BriefcaseBusiness },
  { label: "Tasks", icon: CheckSquare },
];

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const idOf = (item) => item?._id || item?.id;

const leadName = (x) =>
  x.name || x.fullName || x.title || "Unnamed lead";

const leadStatus = (x) => x.status || x.stage || "New";

const leadCompany = (x) => x.company || x.companyName || "—";

const leadEmail = (x) => x.email || "—";

const dateLabel = (v) => {
  if (!v) return "Not set";

  const d = new Date(v);

  return Number.isNaN(d.getTime())
    ? "Not set"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

function App() {
  const [session, setSession] = useState(() => {
    try {
      const token = localStorage.getItem("nexus360_token");
      const user = JSON.parse(
        localStorage.getItem("nexus360_user") || "null"
      );

      return token && user ? { token, user } : null;
    } catch {
      return null;
    }
  });

  const [active, setActive] = useState("Overview");

  const [theme, setTheme] = useState(
    () => localStorage.getItem("nexus360_theme") || "cosmic"
  );

  const [query, setQuery] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Keep each page's status filter in App state so CSV export uses it too.
  const [statusFilters, setStatusFilters] = useState({
    Customers: "All statuses",
    Leads: "All statuses",
    Deals: "All statuses",
    Tasks: "All statuses",
  });

  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsVersion, setAnalyticsVersion] = useState(0);
  const [chartType, setChartType] = useState("area");

  // Lead form
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  // Deal form
  const [dealTitle, setDealTitle] = useState("");
  const [dealCompany, setDealCompany] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("Qualification");
  const [dealDate, setDealDate] = useState("");
  const [dealNotes, setDealNotes] = useState("");
  const [editingDealId, setEditingDealId] = useState(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDate, setTaskDate] = useState("");

  // Save theme preference
  useEffect(() => {
    localStorage.setItem("nexus360_theme", theme);
  }, [theme]);

  // Validate the current session
  useEffect(() => {
    if (!session?.token) return;

    let cancelled = false;

    getCurrentUser(session.token)
      .then((r) => {
        if (cancelled || !r.user) return;

        localStorage.setItem(
          "nexus360_user",
          JSON.stringify(r.user)
        );

        setSession((s) =>
          s ? { ...s, user: r.user } : s
        );
      })
      .catch(() => {
        if (cancelled) return;

        localStorage.removeItem("nexus360_token");
        localStorage.removeItem("nexus360_user");
        setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load CRM records
  useEffect(() => {
    if (!session?.token) {
      setCustomers([]);
      setLeads([]);
      setDeals([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError("");

    Promise.all([
      getCustomers(session.token),
      getLeads(session.token),
      getDeals(session.token),
      getTasks(session.token),
    ])
      .then(([c, l, d, t]) => {
        if (cancelled) return;

        setCustomers(c.customers || []);
        setLeads(l.leads || []);
        setDeals(d.deals || []);
        setTasks(t.tasks || []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e.message ||
              "Unable to load CRM records. Check your backend."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  // Load real analytics from the authenticated backend
  useEffect(() => {
    if (!session?.token) {
      setAnalytics(null);
      setAnalyticsError("");
      setAnalyticsLoading(false);
      return;
    }

    let cancelled = false;

    setAnalyticsLoading(true);
    setAnalyticsError("");

    getAnalytics(session.token)
      .then((data) => {
        if (cancelled) return;

        // Supports either a direct analytics response or
        // an analytics object wrapped in a response property.
        const result = data?.analytics || data;

        // Support analytics APIs that return metrics either at the
        // top level or inside a nested `metrics` object.
        setAnalytics({
          ...result,
          ...(result.metrics || {}),
        });
      })
      .catch((e) => {
        if (cancelled) return;

        setAnalyticsError(
          e.message || "Unable to load analytics."
        );
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.token, analyticsVersion]);

  function handleLogin(result) {
    localStorage.setItem("nexus360_token", result.token);

    localStorage.setItem(
      "nexus360_user",
      JSON.stringify(result.user)
    );

    setSession({
      token: result.token,
      user: result.user,
    });

    setActive("Overview");
    setError("");
  }

  function handleLogout() {
    localStorage.removeItem("nexus360_token");
    localStorage.removeItem("nexus360_user");

    setSession(null);

    setCustomers([]);
    setLeads([]);
    setDeals([]);
    setTasks([]);
    setAnalytics(null);

    setActive("Overview");
    setQuery("");
    setError("");
    setAnalyticsError("");
  }

  async function submitForm(e) {
    e.preventDefault();

    if (!session?.token) return;

    setSaving(true);
    setError("");

    try {
      if (active === "Customers") {
        if (!name.trim()) {
          throw new Error("Customer name is required.");
        }

        const r = await createCustomer(session.token, {
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          status: "Active",
        });

        if (!r.customer) {
          throw new Error("The server did not return the new customer.");
        }

        setCustomers((old) => [r.customer, ...old]);
        setName("");
        setCompany("");
        setEmail("");
      } else if (active === "Leads") {
        if (!name.trim() || !company.trim() || !email.trim()) {
          throw new Error("Name, company and email are required.");
        }

        const r = await createLead(session.token, {
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
        });

        if (!r.lead) {
          throw new Error("The server did not return the new lead.");
        }

        setLeads((old) => [r.lead, ...old]);
        setName("");
        setCompany("");
        setEmail("");
      } else if (active === "Deals") {
        if (!dealTitle.trim() || !dealCompany.trim()) {
          throw new Error("Deal title and company are required.");
        }

        const dealPayload = {
          title: dealTitle.trim(),
          company: dealCompany.trim(),
          value: Number(dealValue) || 0,
          stage: dealStage,
          expectedCloseDate: dealDate || null,
          notes: dealNotes.trim(),
        };

        if (editingDealId) {
          const r = await updateDeal(session.token, editingDealId, dealPayload);
          if (!r.deal) {
            throw new Error("The server did not return the updated deal.");
          }
          setDeals((old) => old.map((item) => idOf(item) === editingDealId ? r.deal : item));
        } else {
          const r = await createDeal(session.token, dealPayload);
          if (!r.deal) {
            throw new Error("The server did not return the new deal.");
          }
          setDeals((old) => [r.deal, ...old]);
        }

        resetDealForm();
      } else if (active === "Tasks") {
        if (!taskTitle.trim()) {
          throw new Error("Task title is required.");
        }

        const r = await createTask(session.token, {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          dueDate: taskDate || null,
        });

        if (!r.task) {
          throw new Error(
            "The server did not return the new task."
          );
        }

        setTasks((old) => [r.task, ...old]);

        setTaskTitle("");
        setTaskDescription("");
        setTaskPriority("Medium");
        setTaskDate("");
      }

      setShowForm(false);

      // Refresh backend analytics after creating a record
      setAnalyticsVersion((v) => v + 1);
    } catch (e2) {
      setError(e2.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  function startEditDeal(item) {
    setError("");
    setEditingDealId(idOf(item));
    setDealTitle(item.title || "");
    setDealCompany(item.company || "");
    setDealValue(String(item.value ?? ""));
    setDealStage(item.stage || "Qualification");
    setDealDate(item.expectedCloseDate ? new Date(item.expectedCloseDate).toISOString().slice(0, 10) : "");
    setDealNotes(item.notes || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDealForm() {
    setEditingDealId(null);
    setDealTitle("");
    setDealCompany("");
    setDealValue("");
    setDealStage("Qualification");
    setDealDate("");
    setDealNotes("");
  }

  async function changeStatus(kind, item, value) {
    if (!session?.token) return;

    setError("");

    try {
      const id = idOf(item);

      if (kind === "customer") {
        const r = await updateCustomer(session.token, id, { status: value });
        setCustomers((old) => old.map((x) => idOf(x) === id ? (r.customer || { ...x, status: value }) : x));
      } else if (kind === "lead") {
        const r = await updateLead(
          session.token,
          id,
          { status: value }
        );

        setLeads((old) =>
          old.map((x) =>
            idOf(x) === id
              ? r.lead || { ...x, status: value }
              : x
          )
        );
      } else if (kind === "deal") {
        const r = await updateDeal(
          session.token,
          id,
          { stage: value }
        );

        setDeals((old) =>
          old.map((x) =>
            idOf(x) === id
              ? r.deal || { ...x, stage: value }
              : x
          )
        );
      } else {
        const r = await updateTask(
          session.token,
          id,
          { status: value }
        );

        setTasks((old) =>
          old.map((x) =>
            idOf(x) === id
              ? r.task || { ...x, status: value }
              : x
          )
        );
      }

      setAnalyticsVersion((v) => v + 1);
    } catch (e) {
      setError(e.message || "Unable to update status.");
    }
  }

  async function removeRecord(kind, item) {
    if (!session?.token) return;

    if (!window.confirm("Delete this record permanently?")) {
      return;
    }

    setError("");

    try {
      const id = idOf(item);

      if (kind === "customer") {
        await deleteCustomer(session.token, id);
        setCustomers((old) => old.filter((x) => idOf(x) !== id));
      } else if (kind === "lead") {
        await deleteLead(session.token, id);

        setLeads((old) =>
          old.filter((x) => idOf(x) !== id)
        );
      } else if (kind === "deal") {
        await deleteDeal(session.token, id);

        setDeals((old) =>
          old.filter((x) => idOf(x) !== id)
        );
      } else {
        await deleteTask(session.token, id);

        setTasks((old) =>
          old.filter((x) => idOf(x) !== id)
        );
      }

      setAnalyticsVersion((v) => v + 1);
    } catch (e) {
      setError(e.message || "Unable to delete record.");
    }
  }

  const search = query.trim().toLowerCase();

  // Export the currently selected record type, respecting the active search.
  function exportRecordsToCsv() {
    const type = recordType;
    const customersForExport = filteredCustomers.filter(
      (item) => statusFilters.Customers === "All statuses" || (item.status || "Active") === statusFilters.Customers
    );
    const leadsForExport = filteredLeads.filter(
      (item) =>
        statusFilters.Leads === "All statuses" ||
        leadStatus(item) === statusFilters.Leads
    );
    const dealsForExport = filteredDeals.filter(
      (item) =>
        statusFilters.Deals === "All statuses" ||
        (item.stage || "Qualification") === statusFilters.Deals
    );
    const tasksForExport = filteredTasks.filter(
      (item) =>
        statusFilters.Tasks === "All statuses" ||
        (item.status || "Pending") === statusFilters.Tasks
    );

    const rows =
      type === "Customers"
        ? customersForExport.map((item) => ({
            Name: item.name || "",
            Company: item.company || "",
            Email: item.email || "",
            Phone: item.phone || "",
            Address: item.address || "",
            Status: item.status || "Active",
            Notes: item.notes || "",
            CreatedAt: item.createdAt || "",
          }))
        : type === "Leads"
        ? leadsForExport.map((item) => ({
            Name: leadName(item),
            Company: leadCompany(item),
            Email: leadEmail(item),
            Status: leadStatus(item),
            CreatedAt: item.createdAt || "",
          }))
        : type === "Deals"
        ? dealsForExport.map((item) => ({
            Title: item.title || "",
            Company: item.company || "",
            Value: Number(item.value) || 0,
            Stage: item.stage || "Qualification",
            ExpectedCloseDate: item.expectedCloseDate || "",
            CreatedAt: item.createdAt || "",
          }))
        : tasksForExport.map((item) => ({
            Title: item.title || "",
            Description: item.description || "",
            Priority: item.priority || "Medium",
            Status: item.status || "Pending",
            DueDate: item.dueDate || "",
            CreatedAt: item.createdAt || "",
          }));

    if (!rows.length) {
      setError(`There are no ${type.toLowerCase()} records to export.`);
      return;
    }

    const headers = Object.keys(rows[0]);
    const escapeCsv = (value) => {
      const text = value == null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nexus360-${type.toLowerCase()}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setError("");
  }

  // Export a single combined CSV containing the CRM records used by the analytics dashboard.
  function exportAnalyticsCsv() {
    const rows = [
      ...customers.map((item) => ({
        Type: "Customer",
        Name: item.name || "",
        Company: item.company || "",
        Email: item.email || "",
        Value: "",
        StageOrStatus: item.status || "Active",
        Priority: "",
        Date: "",
        CreatedAt: item.createdAt || "",
      })),
      ...leads.map((item) => ({
        Type: "Lead",
        Name: leadName(item),
        Company: leadCompany(item),
        Email: leadEmail(item) === "—" ? "" : leadEmail(item),
        Value: "",
        StageOrStatus: leadStatus(item),
        Priority: "",
        Date: "",
        CreatedAt: item.createdAt || "",
      })),
      ...deals.map((item) => ({
        Type: "Deal",
        Name: item.title || "",
        Company: item.company || "",
        Email: "",
        Value: Number(item.value) || 0,
        StageOrStatus: item.stage || "Qualification",
        Priority: "",
        Date: item.expectedCloseDate || "",
        CreatedAt: item.createdAt || "",
      })),
      ...tasks.map((item) => ({
        Type: "Task",
        Name: item.title || "",
        Company: "",
        Email: "",
        Value: "",
        StageOrStatus: item.status || "Pending",
        Priority: item.priority || "Medium",
        Date: item.dueDate || "",
        CreatedAt: item.createdAt || "",
      })),
    ];

    if (!rows.length) {
      setError("There are no CRM records to export yet.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const escapeCsv = (value) => {
      const text = value == null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nexus360-analytics-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setError("");
  }

  // Reload the records behind the charts as well as the backend analytics summary.
  async function refreshAnalytics() {
    if (!session?.token || analyticsLoading) return;

    setAnalyticsLoading(true);
    setAnalyticsError("");
    setError("");

    try {
      const [customerResult, leadResult, dealResult, taskResult] = await Promise.all([
        getCustomers(session.token),
        getLeads(session.token),
        getDeals(session.token),
        getTasks(session.token),
      ]);

      setCustomers(customerResult.customers || []);
      setLeads(leadResult.leads || []);
      setDeals(dealResult.deals || []);
      setTasks(taskResult.tasks || []);
      setAnalyticsVersion((version) => version + 1);
    } catch (e) {
      setAnalyticsError(e.message || "Unable to refresh analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => [customer.name, customer.company, customer.email, customer.phone, customer.address, customer.status, customer.notes].join(" ").toLowerCase().includes(search)),
    [customers, search]
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter((x) =>
        [
          leadName(x),
          leadCompany(x),
          leadEmail(x),
          leadStatus(x),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ),
    [leads, search]
  );

  const filteredDeals = useMemo(
    () =>
      deals.filter((x) =>
        [x.title, x.company, x.stage]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ),
    [deals, search]
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((x) =>
        [
          x.title,
          x.description,
          x.priority,
          x.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ),
    [tasks, search]
  );

  const pipeline = deals
    .filter((d) => !["Won", "Lost"].includes(d.stage))
    .reduce(
      (sum, d) => sum + (Number(d.value) || 0),
      0
    );

  const won = deals
    .filter((d) => d.stage === "Won")
    .reduce(
      (sum, d) => sum + (Number(d.value) || 0),
      0
    );

  const convertedLeadsCount = leads.filter((lead) =>
    ["converted", "won", "customer"].includes(
      String(leadStatus(lead)).toLowerCase()
    )
  ).length;

  const leadConversionRate =
    Number.isFinite(Number(analytics?.leadConversionRate))
      ? Number(analytics.leadConversionRate)
      : leads.length
      ? (convertedLeadsCount / leads.length) * 100
      : 0;

  const wonDealsCount = deals.filter(
    (deal) => String(deal.stage).toLowerCase() === "won"
  ).length;
  const lostDealsCount = deals.filter(
    (deal) => String(deal.stage).toLowerCase() === "lost"
  ).length;
  const dealWinRate =
    Number.isFinite(Number(analytics?.dealWinRate)) &&
    analytics?.dealWinRate !== undefined &&
    analytics?.dealWinRate !== null
      ? Number(analytics.dealWinRate)
      : wonDealsCount + lostDealsCount > 0
      ? (wonDealsCount / (wonDealsCount + lostDealsCount)) * 100
      : 0;

  const averageDealValue =
    Number.isFinite(Number(analytics?.averageDealValue)) &&
    analytics?.averageDealValue !== undefined &&
    analytics?.averageDealValue !== null
      ? Number(analytics.averageDealValue)
      : deals.length
      ? deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0) /
        deals.length
      : 0;

  const completedTasksCount = tasks.filter(
    (task) => String(task.status).toLowerCase() === "completed"
  ).length;
  const openTasksCount = tasks.filter(
    (task) => String(task.status).toLowerCase() !== "completed"
  ).length;

  if (!session) {
    return <Auth onLogin={handleLogin} />;
  }

  const firstName =
    session.user?.name?.split(" ")[0] || "there";

  const recordType = active;

  const formVisible = [
    "Leads",
    "Customers",
    "Deals",
    "Tasks",
  ].includes(active);

  const monthlyActivity = Array.isArray(
    analytics?.monthlyActivity
  )
    ? analytics.monthlyActivity
    : [];

  // Dashboard visualisations are calculated from the user's saved CRM records.
  const chartColors = ["#a48aff", "#42d6b5", "#f5b95f", "#ff7b9c", "#67b7ff"];
  const leadStatusData = Object.entries(
    leads.reduce((acc, lead) => {
      const status = String(leadStatus(lead) || "New");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const dealStageData = ["Qualification", "Proposal", "Negotiation", "Won", "Lost"].map((stage) => ({
    stage,
    count: deals.filter((deal) => String(deal.stage || "Qualification").toLowerCase() === stage.toLowerCase()).length,
    value: deals.filter((deal) => String(deal.stage || "Qualification").toLowerCase() === stage.toLowerCase()).reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
  }));

  const dealScatterData = deals.map((deal, index) => ({
    name: deal.title || `Deal ${index + 1}`,
    index: index + 1,
    value: Number(deal.value) || 0,
    size: Math.max(40, Math.min(220, (Number(deal.value) || 0) / 1000)),
  }));

  const taskStatusData = ["Pending", "In Progress", "Completed"].map((status) => ({
    name: status,
    value: tasks.filter((task) => String(task.status || "Pending").toLowerCase() === status.toLowerCase()).length,
  }));

  const leadSourceData = Object.entries(
    leads.reduce((acc, lead) => {
      const source = String(lead.source || lead.leadSource || lead.channel || "Unknown");
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const taskPriorityData = ["High", "Medium", "Low"].map((priority) => ({
    name: priority,
    value: tasks.filter(
      (task) => String(task.priority || "Medium").toLowerCase() === priority.toLowerCase()
    ).length,
  }));

  const dashboardPanelStyle = {
    background: "var(--panel-bg, rgba(17, 20, 42, 0.92))",
    border: "1px solid var(--border-color, #292d4d)",
    borderRadius: 16,
    padding: 18,
    minWidth: 0,
    overflow: "hidden",
  };
  const chartHeadingStyle = { margin: 0, fontSize: 16, fontWeight: 700 };
  const chartSubheadingStyle = { margin: "6px 0 14px", fontSize: 12, color: "var(--muted-color, #a5a0c5)" };

  return (
    <div className={`app-shell theme-${theme}`}>
      <style>{`
        .app-shell.theme-cosmic {
          --text-color: #edf7ff;
          --muted-color: #9bb2ca;
          --panel-bg: rgba(10, 25, 48, 0.94);
          --border-color: #244765;
          --grid-color: #244765;
          --search-bg: #0b1c33;
          --accent-color: #22d3ee;
          --accent-secondary: #818cf8;
        }
        .app-shell.theme-cosmic .primary-button,
        .app-shell.theme-cosmic button.primary-button {
          background: linear-gradient(135deg, #0891b2, #4f46e5) !important;
          border: 1px solid rgba(103, 232, 249, .42) !important;
          color: #fff !important;
          box-shadow: 0 8px 24px rgba(8, 145, 178, .22);
        }
        .app-shell.theme-cosmic .primary-button:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .app-shell.theme-cosmic .panel,
        .app-shell.theme-cosmic .stat-card,
        .app-shell.theme-cosmic .quick-panel,
        .app-shell.theme-cosmic .chart-panel {
          border-color: #244765;
        }
        .app-shell.theme-cosmic input:focus,
        .app-shell.theme-cosmic select:focus,
        .app-shell.theme-cosmic textarea:focus {
          outline: 2px solid rgba(34, 211, 238, .45);
          outline-offset: 1px;
          border-color: #22d3ee !important;
        }
        .app-shell.theme-cosmic a,
        .app-shell.theme-cosmic .eyebrow {
          color: #67e8f9;
        }
        .app-shell.theme-cosmic .cosmic-stars {
          opacity: .65;
        }
      `}</style>
      <div className="cosmic-stars" aria-hidden="true" />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside
        className={`sidebar ${
          mobileMenu ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <Zap size={22} />
          </div>

          <div>
            <div className="brand-name">NEXUS 360</div>
            <div className="brand-caption">
              CUSTOMER PLATFORM
            </div>
          </div>

          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {(session.user?.role === "admin"
            ? [...navigation, { label: "User Approvals", icon: ShieldCheck }]
            : navigation
          ).map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                active === label ? "active" : ""
              }`}
              onClick={() => {
                setActive(label);
                setQuery("");
                setShowForm(false);
                setMobileMenu(false);
                setError("");
              }}
            >
              <Icon size={18} />
              <span>{label}</span>

              {label === "Tasks" && tasks.length > 0 && (
                <span className="nav-count">
                  {tasks.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-label">PREFERENCES</div>

        <button
          className={`nav-item ${
            active === "Settings" ? "active" : ""
          }`}
          onClick={() => {
            setActive("Settings");
            setMobileMenu(false);
          }}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button
          className={`nav-item ${
            active === "Help" ? "active" : ""
          }`}
          onClick={() => {
            setActive("Help");
            setMobileMenu(false);
          }}
        >
          <CircleHelp size={18} />
          <span>Help &amp; Support</span>
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-plan">
            <div className="plan-icon">
              <Zap size={18} />
            </div>

            <div>
              <strong>Nexus Workspace</strong>
              <p>Your CRM workspace</p>
            </div>
          </div>

          <button
            className="profile-row"
            onClick={handleLogout}
            title="Sign out"
          >
            <div className="avatar">
              {(session.user?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>
                {session.user?.name || "User"}
              </strong>
              <span>
                {session.user?.email || "Signed in"}
              </span>
            </div>

            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>{active}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <label
              className="global-search"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: 260,
                maxWidth: "32vw",
                minWidth: 0,
                height: 40,
                padding: "0 12px",
                color: "#b9a6ff",
                background: "var(--search-bg, #151129)",
                border: "1px solid var(--border-color, #6e579e)",
                borderRadius: 11,
                boxSizing: "border-box",
              }}
            >
              <Search size={17} />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${active.toLowerCase()}...`}
                style={{
                  flex: 1,
                  width: "100%",
                  minWidth: 0,
                  color: "var(--text-color, #f0edff)",
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  boxShadow: "none",
                  fontSize: 12,
                }}
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  style={{
                    color: "#b9a6ff",
                    background: "transparent",
                    border: 0,
                    padding: 0,
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="topbar-avatar">
              {(session.user?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="data-note" role="alert">
              {error}
            </div>
          )}

          {active === "Overview" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="dashboard-page"
            >
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-dot" />
                    YOUR WORKSPACE
                  </div>

                  <h1>
                    Good to see you, {firstName}.
                  </h1>

                  <p className="subtitle">
                    Here is what's happening in your CRM today.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    setActive("Leads");
                    setShowForm(true);
                  }}
                >
                  <Plus size={17} />
                  Add lead
                </button>
              </div>

              <div className="stats-grid">
                <StatCard
                  icon={Users}
                  label="Total Leads"
                  value={leads.length}
                  note="Saved in your workspace"
                />

                <StatCard
                  icon={BriefcaseBusiness}
                  label="Active Deals"
                  value={
                    deals.filter(
                      (d) => !["Won", "Lost"].includes(d.stage)
                    ).length
                  }
                  note={`${money(pipeline)} pipeline`}
                />

                <StatCard
                  icon={DollarSign}
                  label="Won Deal Value"
                  value={money(won)}
                  note={`${
                    deals.filter((d) => d.stage === "Won").length
                  } deals won`}
                />

                <StatCard
                  icon={CheckSquare}
                  label="Open Tasks"
                  value={openTasksCount}
                  note={`${completedTasksCount} completed`}
                />
              </div>

              <div className="stats-grid" style={{ marginTop: 14 }}>
                <StatCard
                  icon={TrendingUp}
                  label="Lead Conversion"
                  value={`${leadConversionRate.toFixed(1)}%`}
                  note={`${convertedLeadsCount} converted leads`}
                />
                <StatCard
                  icon={Target}
                  label="Deal Win Rate"
                  value={`${dealWinRate.toFixed(1)}%`}
                  note={`${wonDealsCount} won · ${lostDealsCount} lost`}
                />
                <StatCard
                  icon={DollarSign}
                  label="Average Deal Value"
                  value={money(averageDealValue)}
                  note={`${deals.length} total deals`}
                />
                <StatCard
                  icon={CheckSquare}
                  label="Task Completion"
                  value={`${
                    Number.isFinite(Number(analytics?.taskCompletionRate)) &&
                    analytics?.taskCompletionRate !== undefined &&
                    analytics?.taskCompletionRate !== null
                      ? Number(analytics.taskCompletionRate).toFixed(1)
                      : tasks.length
                      ? ((completedTasksCount / tasks.length) * 100).toFixed(1)
                      : "0.0"
                  }%`}
                  note={`${completedTasksCount} of ${tasks.length} completed`}
                />
              </div>

              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Monthly Activity</h2>
                      <p className="subtitle">
                        Real leads, deals, and tasks created
                        in the last six months
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <label
                        htmlFor="monthly-chart-type"
                        style={{ fontSize: 12, color: "var(--muted-color, #a5a0c5)" }}
                      >
                        Chart type
                      </label>
                      <select
                        id="monthly-chart-type"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        aria-label="Choose monthly activity chart type"
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border: "1px solid var(--border-color, #393956)",
                          background: "var(--panel-bg, #191a2e)",
                          color: "var(--text-color, #fff)",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <option value="area">Area chart</option>
                        <option value="line">Line chart</option>
                        <option value="bar">Bar chart</option>
                      </select>
                      <span className="chart-badge">
                        <TrendingUp size={15} />
                        Live analytics
                      </span>
                    </div>
                  </div>

                  {analyticsLoading && !analytics ? (
                    <div className="empty-state">
                      Loading analytics...
                    </div>
                  ) : analyticsError ? (
                    <div className="empty-state">
                      <p>
                        Unable to load analytics:{" "}
                        {analyticsError}
                      </p>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          setAnalyticsVersion((v) => v + 1)
                        }
                      >
                        <RefreshCw size={15} />
                        Retry analytics
                      </button>
                    </div>
                  ) : monthlyActivity.length === 0 ? (
                    <div className="empty-state">
                      No monthly activity data is available yet.
                      Create a lead, deal, or task and check again.
                    </div>
                  ) : (
                    <div className="chart-area">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <>
                          {chartType === "area" && (
                            <AreaChart data={monthlyActivity}>
                              <defs>
                                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#a48aff" stopOpacity={0.35} />
                                  <stop offset="100%" stopColor="#a48aff" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="dealsGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#42d6b5" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#42d6b5" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#f5b95f" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#f5b95f" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                              <XAxis dataKey="month" stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--panel-bg, #191a2e)",
                                  border: "1px solid var(--border-color, #393956)",
                                  borderRadius: 12,
                                  color: "var(--text-color, #fff)",
                                }}
                              />
                              <Legend />
                              <Area type="monotone" dataKey="leads" name="Leads created" stroke="#a48aff" strokeWidth={3} fill="url(#leadsGradient)" />
                              <Area type="monotone" dataKey="deals" name="Deals created" stroke="#42d6b5" strokeWidth={3} fill="url(#dealsGradient)" />
                              <Area type="monotone" dataKey="tasks" name="Tasks created" stroke="#f5b95f" strokeWidth={3} fill="url(#tasksGradient)" />
                            </AreaChart>
                          )}

                          {chartType === "line" && (
                            <LineChart data={monthlyActivity}>
                              <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                              <XAxis dataKey="month" stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--panel-bg, #191a2e)",
                                  border: "1px solid var(--border-color, #393956)",
                                  borderRadius: 12,
                                  color: "var(--text-color, #fff)",
                                }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="leads" name="Leads created" stroke="#a48aff" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey="deals" name="Deals created" stroke="#42d6b5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey="tasks" name="Tasks created" stroke="#f5b95f" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          )}

                          {chartType === "bar" && (
                            <BarChart data={monthlyActivity}>
                              <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                              <XAxis dataKey="month" stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--panel-bg, #191a2e)",
                                  border: "1px solid var(--border-color, #393956)",
                                  borderRadius: 12,
                                  color: "var(--text-color, #fff)",
                                }}
                              />
                              <Legend />
                              <Bar dataKey="leads" name="Leads created" fill="#a48aff" radius={[5, 5, 0, 0]} />
                              <Bar dataKey="deals" name="Deals created" fill="#42d6b5" radius={[5, 5, 0, 0]} />
                              <Bar dataKey="tasks" name="Tasks created" fill="#f5b95f" radius={[5, 5, 0, 0]} />
                            </BarChart>
                          )}
                        </>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {analytics && !analyticsError && (
                    <p className="subtitle">
                      {analyticsLoading
                        ? "Refreshing analytics..."
                        : "Analytics are based on your saved CRM records."}
                    </p>
                  )}
                </section>

                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Quick actions</h2>
                      <p className="subtitle">
                        Get work done faster
                      </p>
                    </div>
                  </div>

                  <QuickAction
                    icon={Target}
                    title="Create a lead"
                    description="Add a potential customer"
                    onClick={() => {
                      setActive("Leads");
                      setShowForm(true);
                    }}
                  />

                  <QuickAction
                    icon={BriefcaseBusiness}
                    title="Create a deal"
                    description="Track a sales opportunity"
                    onClick={() => {
                      setActive("Deals");
                      setShowForm(true);
                    }}
                  />

                  <QuickAction
                    icon={CheckSquare}
                    title="Create a task"
                    description="Plan your next action"
                    onClick={() => {
                      setActive("Tasks");
                      setShowForm(true);
                    }}
                  />
                </section>
              </div>

              {/* Expanded analytics dashboard: every chart updates from CRM records. */}
              <section style={{ marginTop: 18 }}>
                <div
                  style={{
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>Analytics dashboard</h2>
                    <p className="subtitle" style={{ marginTop: 6 }}>
                      A clear view of your leads, sales pipeline, deal values, and tasks. Charts refresh when records change.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={exportAnalyticsCsv}
                      title="Export customers, leads, deals and tasks to CSV"
                    >
                      <Download size={15} />
                      Export CSV
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={refreshAnalytics}
                      disabled={analyticsLoading}
                      title="Reload CRM records and analytics"
                    >
                      <RefreshCw size={15} className={analyticsLoading ? "spin" : ""} />
                      {analyticsLoading ? "Refreshing..." : "Refresh Analytics"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Lead status breakdown</h3>
                    <p style={chartSubheadingStyle}>How many leads are in each status</p>
                    {leadStatusData.length === 0 ? <div className="empty-state">Add leads to see this chart.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={leadStatusData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={48} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                              {leadStatusData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Deals by stage</h3>
                    <p style={chartSubheadingStyle}>Compare deal count across your sales pipeline</p>
                    {deals.length === 0 ? <div className="empty-state">Create deals to see stage performance.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dealStageData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="stage" tick={{ fontSize: 11 }} angle={-12} textAnchor="end" height={48} stroke="var(--muted-color, #888aa8)" />
                            <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" />
                            <Tooltip contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Bar dataKey="count" name="Deals" fill="#a48aff" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Deal value scatter plot</h3>
                    <p style={chartSubheadingStyle}>Each dot represents one deal; higher dots mean higher deal value</p>
                    {dealScatterData.length === 0 ? <div className="empty-state">Create deals with values to see the scatter plot.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                            <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" />
                            <XAxis type="number" dataKey="index" name="Deal number" allowDecimals={false} stroke="var(--muted-color, #888aa8)" label={{ value: "Deal number", position: "insideBottom", offset: -5, fill: "var(--muted-color, #888aa8)", fontSize: 11 }} />
                            <YAxis type="number" dataKey="value" name="Deal value" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} stroke="var(--muted-color, #888aa8)" />
                            <ZAxis type="number" dataKey="size" range={[60, 220]} />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "Deal value" ? money(value) : value} labelFormatter={(label) => `Deal ${label}`} contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Scatter data={dealScatterData} name="Deals" fill="#42d6b5" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Task status</h3>
                    <p style={chartSubheadingStyle}>See what is pending and what is finished</p>
                    {tasks.length === 0 ? <div className="empty-state">Create tasks to see task progress.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={taskStatusData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--muted-color, #888aa8)" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" />
                            <Tooltip contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Bar dataKey="value" name="Tasks" fill="#f5b95f" radius={[5, 5, 0, 0]}>
                              {taskStatusData.map((entry, index) => <Cell key={entry.name} fill={chartColors[(index + 1) % chartColors.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Lead sources</h3>
                    <p style={chartSubheadingStyle}>Understand where your potential customers come from</p>
                    {leads.length === 0 ? <div className="empty-state">Add leads to compare lead sources.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={leadSourceData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid stroke="var(--grid-color, #2c2e45)" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--muted-color, #888aa8)" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
                            <YAxis allowDecimals={false} stroke="var(--muted-color, #888aa8)" />
                            <Tooltip contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Bar dataKey="value" name="Leads" fill="#67b7ff" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section style={dashboardPanelStyle}>
                    <h3 style={chartHeadingStyle}>Tasks by priority</h3>
                    <p style={chartSubheadingStyle}>See which tasks need attention first</p>
                    {tasks.length === 0 ? <div className="empty-state">Create tasks and assign priorities to view this chart.</div> : (
                      <div style={{ width: "100%", height: 270 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={taskPriorityData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={86} innerRadius={48} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                              {taskPriorityData.map((entry, index) => <Cell key={entry.name} fill={chartColors[(index + 2) % chartColors.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "var(--panel-bg, #191a2e)", border: "1px solid var(--border-color, #393956)", borderRadius: 10, color: "var(--text-color, #fff)" }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>
                </div>

                <section style={{ ...dashboardPanelStyle, marginTop: 16 }}>
                  <div className="panel-heading">
                    <div>
                      <h3 style={chartHeadingStyle}>Pipeline value by stage</h3>
                      <p style={chartSubheadingStyle}>Total rupee value of deals in each stage</p>
                    </div>
                    <strong style={{ fontSize: 18 }}>{money(deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0))}</strong>
                  </div>
                  {deals.length === 0 ? <div className="empty-state">Your deal value table will appear when you create deals.</div> : (
                    <div className="table-scroll">
                      <table className="leads-table">
                        <thead><tr><th>DEAL STAGE</th><th>DEAL COUNT</th><th>TOTAL VALUE</th><th>SHARE OF VALUE</th></tr></thead>
                        <tbody>
                          {dealStageData.map((row) => {
                            const allValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
                            return <tr key={row.stage}><td><strong>{row.stage}</strong></td><td>{row.count}</td><td>{money(row.value)}</td><td>{allValue > 0 ? `${((row.value / allValue) * 100).toFixed(1)}%` : "0.0%"}</td></tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </section>

              <section className="panel recent-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent leads</h2>
                    <p className="subtitle">
                      The latest leads saved in your workspace
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => setActive("Leads")}
                  >
                    View all
                  </button>
                </div>

                {loading ? (
                  <div className="empty-state">
                    Loading CRM records...
                  </div>
                ) : leads.length === 0 ? (
                  <div className="empty-state">
                    No leads yet. Create your first lead to get
                    started.
                  </div>
                ) : (
                  <RecordTable
                    kind="lead"
                    records={leads.slice(0, 5)}
                    onStatus={changeStatus}
                    onDelete={removeRecord}
                  />
                )}
              </section>
            </motion.div>
          )}

          {formVisible && (
            <section className="panel leads-page">
              <div className="leads-page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-dot" />
                    WORKSPACE MANAGEMENT
                  </div>

                  <h1>{active}</h1>

                  <p className="subtitle">
                    {active === "Deals"
                      ? "Track opportunities, values, and closing stages."
                      : active === "Tasks"
                      ? "Manage follow-ups, priorities, and deadlines."
                      : "Manage contacts and customer relationships."}
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    setError("");
                    if (showForm) {
                      resetDealForm();
                      setShowForm(false);
                    } else {
                      setShowForm(true);
                    }
                  }}
                >
                  {showForm ? (
                    <X size={17} />
                  ) : (
                    <Plus size={17} />
                  )}

                  {showForm
                    ? "Close form"
                    : active === "Deals"
                    ? (editingDealId ? "Editing deal" : "Create deal")
                    : active === "Tasks"
                    ? "Create task"
                    : active === "Customers"
                    ? "Add customer"
                    : "Add lead"}
                </button>
              </div>

              {showForm && (
                <form
                  className="deal-task-form"
                  onSubmit={submitForm}
                >
                  {(active === "Leads" || active === "Customers") && (
                    <>
                      <label>
                        Contact name
                        <input
                          required
                          value={name}
                          onChange={(e) =>
                            setName(e.target.value)
                          }
                          placeholder="Enter full name"
                        />
                      </label>

                      <label>
                        Company
                        <input
                          required
                          value={company}
                          onChange={(e) =>
                            setCompany(e.target.value)
                          }
                          placeholder="Enter company"
                        />
                      </label>

                      <label>
                        Email
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) =>
                            setEmail(e.target.value)
                          }
                          placeholder="name@example.com"
                        />
                      </label>
                    </>
                  )}

                  {active === "Deals" && (
                    <>
                      <label>
                        Deal title
                        <input
                          required
                          value={dealTitle}
                          onChange={(e) =>
                            setDealTitle(e.target.value)
                          }
                          placeholder="Website development project"
                        />
                      </label>

                      <label>
                        Company
                        <input
                          required
                          value={dealCompany}
                          onChange={(e) =>
                            setDealCompany(e.target.value)
                          }
                          placeholder="Company name"
                        />
                      </label>

                      <label>
                        Deal value (₹)
                        <input
                          type="number"
                          min="0"
                          value={dealValue}
                          onChange={(e) =>
                            setDealValue(e.target.value)
                          }
                          placeholder="50000"
                        />
                      </label>

                      <label>
                        Stage
                        <select
                          value={dealStage}
                          onChange={(e) =>
                            setDealStage(e.target.value)
                          }
                        >
                          <option>Qualification</option>
                          <option>Proposal</option>
                          <option>Negotiation</option>
                          <option>Won</option>
                          <option>Lost</option>
                        </select>
                      </label>

                      <label>
                        Expected close date
                        <input
                          type="date"
                          value={dealDate}
                          onChange={(e) =>
                            setDealDate(e.target.value)
                          }
                        />
                      </label>

                      <label className="form-wide-field">
                        Notes
                        <textarea
                          value={dealNotes}
                          onChange={(e) => setDealNotes(e.target.value)}
                          placeholder="Add deal details, next steps, or context"
                          rows={3}
                        />
                      </label>
                    </>
                  )}

                  {active === "Tasks" && (
                    <>
                      <label>
                        Task title
                        <input
                          required
                          value={taskTitle}
                          onChange={(e) =>
                            setTaskTitle(e.target.value)
                          }
                          placeholder="Follow up with customer"
                        />
                      </label>

                      <label>
                        Description
                        <input
                          value={taskDescription}
                          onChange={(e) =>
                            setTaskDescription(e.target.value)
                          }
                          placeholder="Optional task details"
                        />
                      </label>

                      <label>
                        Priority
                        <select
                          value={taskPriority}
                          onChange={(e) =>
                            setTaskPriority(e.target.value)
                          }
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </label>

                      <label>
                        Due date
                        <input
                          type="date"
                          value={taskDate}
                          onChange={(e) =>
                            setTaskDate(e.target.value)
                          }
                        />
                      </label>
                    </>
                  )}

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving}
                  >
                    <Plus size={16} />
                    {saving ? "Saving..." : editingDealId ? "Save deal changes" : "Save record"}
                  </button>

                  {active === "Deals" && editingDealId && (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        resetDealForm();
                        setShowForm(false);
                        setError("");
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </form>
              )}

              <div className="list-toolbar">
                <div>
                  <strong>
                    {recordType === "Customers"
                      ? filteredCustomers.length
                      : recordType === "Leads"
                      ? filteredLeads.length
                      : recordType === "Deals"
                      ? filteredDeals.length
                      : filteredTasks.length}
                  </strong>{" "}
                  records
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="secondary-button"
                    onClick={exportRecordsToCsv}
                    disabled={loading}
                    title={`Export ${recordType.toLowerCase()} matching the current search`}
                  >
                    <Download size={15} />
                    Export CSV
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setQuery("");
                      setStatusFilters((prev) => ({
                        ...prev,
                        [recordType]: "All statuses",
                      }));
                      setError("");
                    }}
                  >
                    <RefreshCw size={15} />
                    Reset search
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="empty-state">
                  Loading records...
                </div>
              ) : recordType === "Customers" ? (
                filteredCustomers.length === 0 ? (
                  <div className="empty-state">
                    {search ? "No matching customers found." : "No customers yet. Add your first customer."}
                  </div>
                ) : (
                  <RecordTable
                    kind="customer"
                    records={filteredCustomers}
                    onStatus={changeStatus}
                    onDelete={removeRecord}
                    statusFilter={statusFilters.Customers}
                    onStatusFilter={(value) => setStatusFilters((prev) => ({ ...prev, Customers: value }))}
                  />
                )
              ) : recordType === "Leads" ? (
                filteredLeads.length === 0 ? (
                  <div className="empty-state">
                    {search
                      ? "No matching leads found."
                      : "No leads yet. Add your first lead."}
                  </div>
                ) : (
                  <RecordTable
                    kind="lead"
                    records={filteredLeads}
                    onStatus={changeStatus}
                    onDelete={removeRecord}
                    statusFilter={statusFilters.Leads}
                    onStatusFilter={(value) =>
                      setStatusFilters((prev) => ({ ...prev, Leads: value }))
                    }
                  />
                )
              ) : active === "Deals" ? (
                filteredDeals.length === 0 ? (
                  <div className="empty-state">
                    {search
                      ? "No matching deals found."
                      : "No deals yet. Create your first deal."}
                  </div>
                ) : (
                  <RecordTable
                    kind="deal"
                    records={filteredDeals}
                    onStatus={changeStatus}
                    onDelete={removeRecord}
                    onEdit={startEditDeal}
                    statusFilter={statusFilters.Deals}
                    onStatusFilter={(value) =>
                      setStatusFilters((prev) => ({ ...prev, Deals: value }))
                    }
                  />
                )
              ) : filteredTasks.length === 0 ? (
                <div className="empty-state">
                  {search
                    ? "No matching tasks found."
                    : "No tasks yet. Create your first task."}
                </div>
              ) : (
                <RecordTable
                  kind="task"
                  records={filteredTasks}
                  onStatus={changeStatus}
                  onDelete={removeRecord}
                  statusFilter={statusFilters.Tasks}
                  onStatusFilter={(value) =>
                    setStatusFilters((prev) => ({ ...prev, Tasks: value }))
                  }
                />
              )}
            </section>
          )}

          {active === "User Approvals" && session.user?.role === "admin" && (
            <UserApprovals token={session.token} />
          )}

          {active === "Settings" && (
            <section className="settings-page">
              <div className="settings-heading">
                <div className="placeholder-icon">
                  <Settings size={25} />
                </div>

                <div>
                  <div className="eyebrow">
                    WORKSPACE PREFERENCES
                  </div>
                  <h1>Settings</h1>
                  <p className="subtitle">
                    Make your workspace feel like yours.
                  </p>
                </div>
              </div>

              <div className="panel theme-panel">
                <div className="eyebrow">APPEARANCE</div>
                <h2>Choose your universe</h2>
                <p className="subtitle">
                  Your theme is saved on this device.
                </p>

                <div className="theme-options">
                  <ThemeOption
                    value="cosmic"
                    current={theme}
                    setTheme={setTheme}
                    title="Cosmic Dark"
                    description="Deep space · Cyan glow"
                  />

                  <ThemeOption
                    value="nebula"
                    current={theme}
                    setTheme={setTheme}
                    title="Nebula Purple"
                    description="Violet galaxy · Soft glow"
                  />

                  <ThemeOption
                    value="light"
                    current={theme}
                    setTheme={setTheme}
                    title="Light"
                    description="Clean · Bright · Minimal"
                  />
                </div>
              </div>

              <div className="panel account-panel">
                <div className="eyebrow">ACCOUNT</div>
                <h2>Your profile</h2>

                <div className="account-grid">
                  <p>
                    <span>Name</span>
                    <strong>
                      {session.user?.name || "Not available"}
                    </strong>
                  </p>

                  <p>
                    <span>Email</span>
                    <strong>
                      {session.user?.email || "Not available"}
                    </strong>
                  </p>

                  <p>
                    <span>Role</span>
                    <strong>
                      {session.user?.role || "User"}
                    </strong>
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </section>
          )}

          {active === "Help" && (
            <section className="panel placeholder-page">
              <div className="placeholder-icon">
                <CircleHelp size={28} />
              </div>

              <div className="eyebrow">SUPPORT CENTRE</div>
              <h1>Help &amp; Support</h1>

              <p className="subtitle">
                Manage leads, deals, and tasks from the workspace
                menu.
              </p>

              <p>
                If records fail to load, check that your backend
                server is running and MongoDB is connected.
              </p>

              <button
                className="secondary-button"
                onClick={() => setActive("Overview")}
              >
                Back to overview
              </button>
            </section>
          )}
        </div>

        <footer className="app-footer">
          <span>NEXUS 360</span>
          <span>Customer relationship management</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <motion.article
      className="stat-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </motion.article>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-action-icon">
        <Icon size={19} />
      </span>

      <span className="quick-action-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ThemeOption({
  value,
  current,
  setTheme,
  title,
  description,
}) {
  return (
    <button
      className={`theme-option ${value}-preview ${
        current === value ? "selected" : ""
      }`}
      onClick={() => setTheme(value)}
      aria-pressed={current === value}
    >
      <span className="theme-swatch">
        <i />
      </span>

      <strong>{title}</strong>
      <small>{description}</small>

      {current === value && (
        <span className="theme-check">✓</span>
      )}
    </button>
  );
}

function RecordTable({
  kind,
  records,
  onStatus,
  onDelete,
  onEdit,
  statusFilter = "All statuses",
  onStatusFilter = () => {},
}) {
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  const isCustomer = kind === "customer";
  const isLead = kind === "lead";
  const isDeal = kind === "deal";
  const statusOf = (item) => isCustomer ? (item.status || "Active") : isLead ? leadStatus(item) : isDeal ? (item.stage || "Qualification") : (item.status || "Pending");

  const availableStatuses = isCustomer
    ? ["Active", "Inactive"]
    : isLead
    ? ["New", "Contacted", "Qualified", "Converted", "Lost"]
    : isDeal
    ? ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
    : ["Pending", "In Progress", "Completed"];

  const processedRecords = useMemo(() => {
    let result = [...records];
    if (statusFilter !== "All statuses") {
      result = result.filter((item) => statusOf(item).toLowerCase() === statusFilter.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = String((isCustomer || isLead) ? leadName(a) : (a.title || "")).toLowerCase();
        const nameB = String((isCustomer || isLead) ? leadName(b) : (b.title || "")).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "value" && isDeal) return (Number(b.value) || 0) - (Number(a.value) || 0);
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "status") return statusOf(a).localeCompare(statusOf(b));
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return result;
  }, [records, statusFilter, sortBy, isLead, isDeal, isCustomer]);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(processedRecords.length / numericPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRecords = processedRecords.slice((safePage - 1) * numericPageSize, safePage * numericPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, pageSize, records.length]);

  return (
    <div className="record-table-wrapper">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ color: "var(--muted-color, #9a9bb8)", fontSize: 13 }}>
          Showing <strong style={{ color: "var(--text-color, #f5f5ff)" }}>{processedRecords.length === 0 ? 0 : (safePage - 1) * numericPageSize + 1}–{Math.min(safePage * numericPageSize, processedRecords.length)}</strong> of <strong style={{ color: "var(--text-color, #f5f5ff)" }}>{processedRecords.length}</strong> records
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-color, #9a9bb8)" }}>
            Status
            <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)} aria-label="Filter records by status">
              <option>All statuses</option>
              {availableStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-color, #9a9bb8)" }}>
            Sort
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort records">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="status">Status</option>
              {isDeal && <option value="value">Highest value</option>}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-color, #9a9bb8)" }}>
            Rows
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} aria-label="Rows per page">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      </div>

      {processedRecords.length === 0 ? (
        <div className="empty-state">No records match this status filter.</div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  {isCustomer ? (
                    <><th>CUSTOMER</th><th>COMPANY</th><th>EMAIL</th><th>PHONE</th><th>STATUS</th></>
                  ) : isLead ? (
                    <><th>CONTACT</th><th>COMPANY</th><th>EMAIL</th><th>STATUS</th></>
                  ) : isDeal ? (
                    <><th>DEAL</th><th>COMPANY</th><th>VALUE</th><th>STAGE</th><th>CLOSE DATE</th></>
                  ) : (
                    <><th>TASK</th><th>PRIORITY</th><th>DUE DATE</th><th>STATUS</th></>
                  )}
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((item) => {
                  const id = idOf(item);
                  return (
                    <tr key={id}>
                      {isCustomer ? (
                        <>
                          <td><div className="contact-cell"><div className="avatar small-avatar">{(item.name || "C").charAt(0).toUpperCase()}</div><strong>{item.name || "Unnamed customer"}</strong>{item.notes && <div className="data-note">{item.notes}</div>}</div></td>
                          <td>{item.company || "—"}</td>
                          <td>{item.email || "—"}</td>
                          <td>{item.phone || "—"}</td>
                          <td><select value={item.status || "Active"} onChange={(e) => onStatus("customer", item, e.target.value)}><option>Active</option><option>Inactive</option></select></td>
                        </>
                      ) : isLead ? (
                        <>
                          <td><div className="contact-cell"><div className="avatar small-avatar">{leadName(item).charAt(0).toUpperCase()}</div><strong>{leadName(item)}</strong></div></td>
                          <td>{leadCompany(item)}</td>
                          <td>{leadEmail(item)}</td>
                          <td><select value={leadStatus(item)} onChange={(e) => onStatus("lead", item, e.target.value)}><option>New</option><option>Contacted</option><option>Qualified</option><option>Converted</option><option>Won</option><option>Lost</option></select></td>
                        </>
                      ) : isDeal ? (
                        <>
                          <td><strong>{item.title || "Untitled deal"}</strong></td>
                          <td>{item.company || "—"}</td>
                          <td>{money(item.value)}</td>
                          <td><select value={item.stage || "Qualification"} onChange={(e) => onStatus("deal", item, e.target.value)}><option>Qualification</option><option>Proposal</option><option>Negotiation</option><option>Won</option><option>Lost</option></select></td>
                          <td>{dateLabel(item.expectedCloseDate)}</td>
                        </>
                      ) : (
                        <>
                          <td><strong>{item.title || "Untitled task"}</strong>{item.description && <div className="data-note">{item.description}</div>}</td>
                          <td>{item.priority || "Medium"}</td>
                          <td>{dateLabel(item.dueDate)}</td>
                          <td><select value={item.status || "Pending"} onChange={(e) => onStatus("task", item, e.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></td>
                        </>
                      )}
                      <td>
                        {isDeal && onEdit && (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => onEdit(item)}
                            aria-label={`Edit deal ${item.title || "deal"}`}
                            title="Edit deal"
                            style={{ marginRight: 6, padding: "7px 10px" }}
                          >
                            Edit
                          </button>
                        )}
                        <button className="danger-button" onClick={() => onDelete(kind, item)} aria-label="Delete record"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <span style={{ fontSize: 12, color: "var(--muted-color, #9a9bb8)" }}>Page {safePage} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="secondary-button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button className="secondary-button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
