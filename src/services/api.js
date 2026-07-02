const BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token");
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function apiSignup(fullName, email, password) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.detail || "Signup failed.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed.");
  return data; // { access_token, user_id, full_name }
}

// ── Enrollment ─────────────────────────────────────────────────────────────

export async function apiEnroll(fullName, gender, program, matricNumber, imageFiles) {
  const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
  if (!files.length) throw new Error("Please select at least one face image.");
  if (files.length > 6) throw new Error("You can enroll up to 6 images at once.");

  const formData = new FormData();
  formData.append("full_name", fullName);
  if (gender) formData.append("gender", gender);
  if (program) formData.append("program", program);
  if (matricNumber) formData.append("matric_number", matricNumber);
  files.forEach((file) => formData.append("images", file));

  const res = await fetch(`${BASE_URL}/enroll/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Enrollment failed.");
  return data;
}

// ── Verification ───────────────────────────────────────────────────────────

export async function apiVerify(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  const res = await fetch(`${BASE_URL}/verify/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Verification failed.");
  return data;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function apiDashboardStats() {
  const res = await fetch(`${BASE_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Could not load stats.");
  return data;
}
