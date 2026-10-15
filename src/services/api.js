import CryptoJS from "crypto-js";

const BASE_URL = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:8000`;
const MAX_IMAGE_SIZE_BYTES = 100 * 1024;

// ── Helpers ──────────────────────────────────────────────────────────────

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const HMAC_SECRET_B64 = import.meta.env.VITE_HMAC_SECRET;
const HMAC_SECRET = CryptoJS.enc.Base64.parse(HMAC_SECRET_B64);

function generateSignature(method, path, timestamp, body) {
  const message = `${method.toUpperCase()}${path}${timestamp}${body}`;
  return CryptoJS.HmacSHA256(message, HMAC_SECRET).toString(CryptoJS.enc.Hex);
}

function getHmacHeaders(method, path, body = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(method, path, timestamp, body);
  return { "X-Timestamp": timestamp, "X-Signature": signature };
}

// ── Auth ─────────────────────────────────────────────────────────────────

export async function apiSignup(fullName, email, password) {
  const body = JSON.stringify({ full_name: fullName, email, password });
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getHmacHeaders("POST", "/auth/signup", body) },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || "Signup failed.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function apiLogin(email, password, adminMode = false) {
  const body = JSON.stringify({ email, password, admin_mode: adminMode });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getHmacHeaders("POST", "/auth/login", body) },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The backend did not respond. Please check that the API server is running.", { cause: error });
    }
    throw new Error("Unable to reach the backend. Please check that the API server is running.", { cause: error });
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed.");
  return data; // { message, user_id, full_name } — NO token in body (it's an HttpOnly cookie)
}

export async function apiRefresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",   // sends the refresh_token cookie automatically
  });
  if (!res.ok) return null;   // return null instead of throwing — caller decides what to do
  return res.json();          // { message, user_id, full_name }
}

export async function apiLogout() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
}

// Returns user data if the access token cookie is valid, or null if not.
export async function apiMe() {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    return res.json(); // { message, user_id, full_name }
  } catch {
    return null;
  }
}

// ── Authenticated fetch ───────────────────────────────────────────────────
// Wraps fetch for protected endpoints.
// On 401: silently attempts one token refresh, then retries.
// On second 401: throws so the caller can show an error / redirect to login.

async function authFetch(url, options = {}) {
  let res = await fetch(url, { ...options, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await apiRefresh();
    if (!refreshed) {
      // Refresh also failed — clear local identity hints and throw
      localStorage.removeItem("full_name");
      localStorage.removeItem("user_id");
      throw new Error("Session expired. Please log in again.");
    }
    // Retry the original request — the server has now set a new access cookie
    res = await fetch(url, { ...options, credentials: "include" });
    if (res.status === 401) {
      localStorage.removeItem("full_name");
      localStorage.removeItem("user_id");
      throw new Error("Session expired. Please log in again.");
    }
  }
  return res;
}

// ── Enrollment ────────────────────────────────────────────────────────────

export async function apiEnroll(fullName, gender, program, matricNumber, imageFiles) {
  const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
  if (!files.length) throw new Error("Please select at least one face image.");
  if (files.some(file => file.size > MAX_IMAGE_SIZE_BYTES)) {
    throw new Error("Max file size is 100KB.");
  }

  const base64Images = await Promise.all(files.map(toBase64));
  const body = JSON.stringify({
    full_name: fullName,
    gender,
    program,
    matric_number: matricNumber,
    images: base64Images,
  });

  const res = await authFetch(`${BASE_URL}/enroll/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHmacHeaders("POST", "/enroll/", body) },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Enrollment failed.");
  return data;
}

export async function apiEnrollmentStatus() {
  const res = await authFetch(`${BASE_URL}/enroll/status`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not check enrollment status.");
  return data;
}

// ── Verification ──────────────────────────────────────────────────────────

export async function apiVerify(imageFile) {
  return sendVerification(imageFile, "/verify/");
}

export async function apiAdminVerify(imageFile) {
  return sendVerification(imageFile, "/verify/admin");
}

async function sendVerification(imageFile, path) {
  const base64Image = await toBase64(imageFile);
  const body = JSON.stringify({ image: base64Image });

  const res = await authFetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHmacHeaders("POST", path, body) },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Verification failed.");
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export async function apiDashboardStats() {
  const res = await authFetch(`${BASE_URL}/dashboard/stats`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load stats.");
  return data;
}

export async function apiUserProfile() {
  const res = await authFetch(`${BASE_URL}/auth/me`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load your profile.");
  return data;
}

export async function apiUpdateUserProfile(fullName, email, currentPassword) {
  const body = JSON.stringify({ full_name: fullName, email, current_password: currentPassword });
  const res = await authFetch(`${BASE_URL}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not update your profile.");
  return data;
}

export async function apiUpdateUserPassword(currentPassword, newPassword) {
  const body = JSON.stringify({ current_password: currentPassword, new_password: newPassword });
  const res = await authFetch(`${BASE_URL}/auth/me/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not update your password.");
  return data;
}

export async function apiAdminUsers() {
  const res = await authFetch(`${BASE_URL}/admin/users`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load accounts.");
  return data;
}

export async function apiAdminEnrollments(skip = 0, limit = 20) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  const res = await authFetch(`${BASE_URL}/admin/enrollments?${params}`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load enrollments.");
  return data;
}

export async function apiAdminEnrollmentFaces(userId) {
  const res = await authFetch(`${BASE_URL}/admin/enrollments/${userId}/faces`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load enrollment images.");
  return data;
}

export async function apiAdminDeleteEnrollment(userId) {
  const res = await authFetch(`${BASE_URL}/admin/enrollments/${userId}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not delete enrollment.");
  return data;
}

export async function apiGrantAdminAccess(fullName, email) {
  const body = JSON.stringify({ full_name: fullName, email });
  const res = await authFetch(`${BASE_URL}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not grant admin access.");
  return data;
}

export async function apiAdminOverview() {
  const res = await authFetch(`${BASE_URL}/admin/overview`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load system overview.");
  return data;
}

export async function apiAdminActivity() {
  const res = await authFetch(`${BASE_URL}/admin/activity`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load audit activity.");
  return data;
}

export async function apiAdminProfile() {
  const res = await authFetch(`${BASE_URL}/admin/me`, {});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load your profile.");
  return data;
}

export async function apiUpdateAdminProfile(fullName, email) {
  const body = JSON.stringify({ full_name: fullName, email });
  const res = await authFetch(`${BASE_URL}/admin/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not update your profile.");
  return data;
}

export async function apiUpdateAdminPassword(currentPassword, newPassword) {
  const body = JSON.stringify({ current_password: currentPassword, new_password: newPassword });
  const res = await authFetch(`${BASE_URL}/admin/me/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not update your password.");
  return data;
}

export async function apiDeleteAdminUser(userId) {
  const res = await authFetch(`${BASE_URL}/admin/users/${userId}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not delete account.");
  return data;
}