
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || "Request failed."
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// =========================
// AUTHENTICATION
// =========================

export async function registerUser(userData) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function loginUser(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(token) {
  return request("/auth/me", {
    headers: authHeaders(token),
  });
}

// =========================
// ADMIN: DASHBOARD STATISTICS
// =========================

export async function getAdminStats(token) {
  return request("/admin/stats", {
    headers: authHeaders(token),
  });
}

// =========================
// ADMIN: USER APPROVALS
// =========================

export async function getPendingUsers(token) {
  return request("/admin/users/pending", {
    headers: authHeaders(token),
  });
}

export async function getAllUsers(token) {
  return request("/admin/users", {
    headers: authHeaders(token),
  });
}

export async function approveUser(token, userId) {
  return request(`/admin/users/${userId}/approve`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function rejectUser(token, userId) {
  return request(`/admin/users/${userId}/reject`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

// =========================
// ADMIN: USER ROLE MANAGEMENT
// =========================

export async function updateUserRole(token, userId, role) {
  return request(`/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
}

// =========================
// ANALYTICS
// =========================

export async function getAnalytics(token) {
  return request("/analytics", {
    headers: authHeaders(token),
  });
}

// =========================
// CUSTOMERS
// =========================

export async function getCustomers(token) {
  return request("/customers", {
    headers: authHeaders(token),
  });
}

export async function createCustomer(token, customerData) {
  return request("/customers", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(customerData),
  });
}

export async function updateCustomer(token, id, updates) {
  return request(`/customers/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

export async function deleteCustomer(token, id) {
  return request(`/customers/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// =========================
// LEADS
// =========================

export async function getLeads(token) {
  return request("/leads", {
    headers: authHeaders(token),
  });
}

export async function createLead(token, lead) {
  return request("/leads", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(lead),
  });
}

export async function updateLead(token, id, updates) {
  return request(`/leads/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

export async function deleteLead(token, id) {
  return request(`/leads/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// =========================
// DEALS
// =========================

export async function getDeals(token) {
  return request("/deals", {
    headers: authHeaders(token),
  });
}

export async function createDeal(token, deal) {
  return request("/deals", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(deal),
  });
}

export async function updateDeal(token, id, updates) {
  return request(`/deals/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

export async function deleteDeal(token, id) {
  return request(`/deals/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// =========================
// TASKS
// =========================

export async function getTasks(token) {
  return request("/tasks", {
    headers: authHeaders(token),
  });
}

export async function createTask(token, task) {
  return request("/tasks", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(task),
  });
}

export async function updateTask(token, id, updates) {
  return request(`/tasks/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

export async function deleteTask(token, id) {
  return request(`/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
