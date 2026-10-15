import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Verify from "../verification/Verify.jsx";
import {
  apiAdminActivity, apiAdminOverview, apiAdminUsers, apiAdminEnrollments,
  apiAdminEnrollmentFaces, apiAdminDeleteEnrollment, apiGrantAdminAccess,
  apiAdminProfile, apiDashboardStats, apiDeleteAdminUser,
  apiUpdateAdminPassword, apiUpdateAdminProfile,
  apiUserProfile, apiUpdateUserPassword, apiUpdateUserProfile,
} from "../../services/api";
import {
  FiUserPlus, FiSearch, FiFileText,
  FiShield, FiCheckCircle, FiActivity, FiChevronRight,
  FiAlertCircle, FiRefreshCw, FiTrash2, FiUsers, FiUserCheck,
  FiGrid, FiDatabase, FiCpu, FiKey, FiList, FiLogOut, FiPlus, FiX, FiMoon, FiSun,
  FiChevronDown, FiSettings, FiSave, FiLock, FiUser, FiArrowLeft, FiCamera,
} from "react-icons/fi";
import styles from "./Dashboard.module.css";
import logo from "../../assets/logo-white.png";

const BAR_DATA     = [40,65,45,80,60,90,55,75,85,70,95,78];
const BAR_MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const VERIFY_BARS  = [30,55,40,70,50,80,45,65,75,60,88,72];

function MiniBar({ data, color }) {
  return (
    <div className={styles.barChart}>
      {data.map((h,i) => (
        <div key={i} className={styles.bar}
          style={{ height:`${h}%`, background: i===data.length-1 ? `linear-gradient(180deg,${color},${color}88)` : `${color}30` }}/>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, loading, color, sub }) {
  return (
    <div className={styles.statCard}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color+"40"; e.currentTarget.style.boxShadow=`0 16px 40px ${color}18`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,246,255,0.09)"; e.currentTarget.style.boxShadow="none"; }}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <div className={styles.statIcon} style={{ background:color+"18", border:`1px solid ${color}30` }}>
          {icon}
        </div>
      </div>
      <div className={styles.statValue}>
        {loading ? <span className={styles.skeleton}/> : (value?.toLocaleString?.() ?? value ?? "—")}
      </div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function ActivityRow({ icon, text, time, color }) {
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityIcon} style={{ background:color+"15", border:`1px solid ${color}28` }}>
        {icon}
      </div>
      <div className={styles.activityText}>{text}</div>
      <div className={styles.activityTime}>{time}</div>
    </div>
  );
}

function formatActivity(activity) {
  const event = activity.event_type === "enroll" ? "Face enrollment" : activity.event_type === "verify" ? "Face verification" : activity.event_type;
  const detail = activity.detail?.replace(/^enrolled_id=\d+\s*/, "") || (activity.success ? "Completed successfully" : "Failed");
  const elapsed = Math.max(0, Date.now() - new Date(activity.created_at).getTime());
  const minutes = Math.floor(elapsed / 60000);
  const time = minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
  return { event, detail, time };
}

const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview", icon: <FiGrid size={16}/> },
  { id: "accounts", label: "Accounts", icon: <FiUsers size={16}/> },
  { id: "enrollments", label: "Enrollments", icon: <FiCamera size={16}/> },
  { id: "verification", label: "Verification", icon: <FiSearch size={16}/> },
  { id: "activity", label: "Audit log", icon: <FiList size={16}/> },
  { id: "system", label: "System health", icon: <FiCpu size={16}/> },
  { id: "settings", label: "Account settings", icon: <FiSettings size={16}/> },
];

function AdminMetric({ icon, label, value, detail }) {
  return (
    <div className={styles.adminMetric}>
      <div className={styles.adminMetricIcon}>{icon}</div>
      <div className={styles.adminMetricLabel}>{label}</div>
      <strong>{value ?? "—"}</strong>
      <small>{detail}</small>
    </div>
  );
}

function UserAccountSettings({ user, updateProfile, onBack }) {
  const [profile, setProfile] = useState({ full_name: user.fullName || "", email: user.email || "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiUserProfile()
      .then(data => { if (!cancelled) setProfile({ full_name: data.full_name, email: data.email || "" }); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSavingProfile(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiUpdateUserProfile(
        profile.full_name.trim(),
        profile.email.trim(),
        formData.get("current_password"),
      );
      setProfile({ full_name: updated.full_name, email: updated.email || "" });
      updateProfile(updated);
      setCurrentPassword("");
      setNotice("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setError("");
    setNotice("");
    try {
      const result = await apiUpdateUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <div><div className={styles.pageTag}>Your account</div><h1 className={styles.pageTitle}>Account settings</h1><p className={styles.pageSub}>Update your profile and sign-in password.</p></div>
        <button type="button" className={styles.btnGhost} onClick={onBack}><FiArrowLeft size={14}/> Back to dashboard</button>
      </div>
      {error && <div className={styles.userSettingsError}><FiAlertCircle size={15}/>{error}</div>}
      {notice && <div className={styles.userSettingsNotice}><FiCheckCircle size={15}/>{notice}</div>}
      <div className={styles.userSettingsGrid}>
        <section className={styles.userSettingsPanel}>
          <header><span className={styles.userSettingsIcon}><FiUser size={17}/></span><div><h2>Profile</h2><p>Your registered account details</p></div></header>
          <form className={styles.userSettingsForm} onSubmit={saveProfile}>
            <label>Full name<input name="full_name" required maxLength="150" autoComplete="name" value={profile.full_name} onChange={event => setProfile(current => ({ ...current, full_name: event.target.value }))} /></label>
            <label>Email address<input name="email" type="email" required maxLength="255" autoComplete="email" value={profile.email} onChange={event => setProfile(current => ({ ...current, email: event.target.value }))} /></label>
            <label>Current password<input name="current_password" type="password" required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
            <p>Confirm your password to save profile changes.</p>
            <button type="submit" className={styles.btnPrimary} disabled={loading || savingProfile}>{savingProfile ? "Saving..." : <><FiSave size={14}/> Save profile</>}</button>
          </form>
        </section>
        <section className={styles.userSettingsPanel}>
          <header><span className={styles.userSettingsIcon}><FiLock size={17}/></span><div><h2>Password</h2><p>Choose a new password for your account</p></div></header>
          <form className={styles.userSettingsForm} onSubmit={changePassword}>
            <label>Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
            <label>New password<input type="password" required minLength="8" maxLength="128" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
            <label>Confirm new password<input type="password" required minLength="8" maxLength="128" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
            <p>Changing your password signs out other sessions.</p>
            <button type="submit" className={styles.btnPrimary} disabled={savingPassword}>{savingPassword ? "Updating..." : <><FiLock size={14}/> Update password</>}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function AdminDashboard({ user, logout, updateProfile }) {
  const { theme, toggleTheme } = useTheme();
  const [section, setSection] = useState("overview");
  const [accounts, setAccounts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsTotal, setEnrollmentsTotal] = useState(0);
  const [enrollmentsPage, setEnrollmentsPage] = useState(0);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [expandedEnrollment, setExpandedEnrollment] = useState(null);
  const [enrollmentFaces, setEnrollmentFaces] = useState({});
  const [facesLoadingId, setFacesLoadingId] = useState(null);
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [profile, setProfile] = useState(null);
  const [query, setQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [granting, setGranting] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiAdminOverview(), apiAdminUsers(), apiAdminActivity(), apiAdminProfile()])
      .then(([summary, users, events, adminProfile]) => {
        if (cancelled) return;
        setOverview(summary);
        setAccounts(users);
        setActivity(events);
        setProfile(adminProfile);
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function refreshConsole() {
    setRefreshing(true);
    setError("");
    try {
      const [summary, users, events, adminProfile] = await Promise.all([
        apiAdminOverview(), apiAdminUsers(), apiAdminActivity(), apiAdminProfile(),
      ]);
      setOverview(summary);
      setAccounts(users);
      setActivity(events);
      setProfile(adminProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadEnrollments(page = 0) {
    setEnrollmentsLoading(true);
    setError("");
    setEnrollmentFaces({});
    try {
      const result = await apiAdminEnrollments(page * 20, 20);
      setEnrollments(result.items);
      setEnrollmentsTotal(result.total);
      setEnrollmentsPage(page);
      setExpandedEnrollment(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrollmentsLoading(false);
    }
  }

  async function toggleEnrollmentFaces(enrollment) {
    if (expandedEnrollment === enrollment.user_id) {
      setExpandedEnrollment(null);
      return;
    }
    setExpandedEnrollment(enrollment.user_id);
    if (enrollmentFaces[enrollment.user_id]) return;
    setFacesLoadingId(enrollment.user_id);
    setError("");
    try {
      const faces = await apiAdminEnrollmentFaces(enrollment.user_id);
      setEnrollmentFaces(current => ({ ...current, [enrollment.user_id]: faces }));
    } catch (err) {
      setError(err.message);
      setExpandedEnrollment(null);
    } finally {
      setFacesLoadingId(null);
    }
  }

  async function deleteEnrollment(enrollment) {
    if (!window.confirm(`Delete all ${enrollment.face_count} enrolled face images for ${enrollment.full_name}? They will be able to enroll again.`)) return;
    setDeletingEnrollmentId(enrollment.user_id);
    setError("");
    try {
      await apiAdminDeleteEnrollment(enrollment.user_id);
      setEnrollments(current => current.filter(item => item.user_id !== enrollment.user_id));
      setEnrollmentsTotal(current => Math.max(0, current - 1));
      setEnrollmentFaces(current => {
        const updated = { ...current };
        delete updated[enrollment.user_id];
        return updated;
      });
      setExpandedEnrollment(null);
      setOverview(current => current ? {
        ...current,
        total_enrolled: Math.max(0, current.total_enrolled - enrollment.face_count),
      } : current);
      setNotice(`Enrollment for ${enrollment.full_name} was deleted. They can enroll again.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingEnrollmentId(null);
    }
  }

  async function grantAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setGranting(true);
    setGrantError("");
    try {
      const existingAccount = accounts.find(account => account.email.toLowerCase() === formData.get("email").trim().toLowerCase());
      const granted = await apiGrantAdminAccess(
        formData.get("full_name").trim(),
        formData.get("email").trim(),
      );
      setAccounts(current => current.map(account => account.id === granted.id ? { ...account, ...granted, is_admin: true } : account));
      if (!existingAccount?.is_admin) {
        setOverview(current => current ? {
          ...current,
          total_admins: current.total_admins + 1,
        } : current);
      }
      setGrantOpen(false);
      setNotice(`Admin access granted to ${granted.full_name} (${granted.email}).`);
      form.reset();
    } catch (err) {
      setGrantError(err.message);
    } finally {
      setGranting(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setProfileSaving(true);
    setSettingsError("");
    try {
      const updated = await apiUpdateAdminProfile(
        formData.get("full_name").trim(),
        formData.get("email").trim(),
      );
      setProfile(updated);
      updateProfile(updated);
      setAccounts(current => current.map(account => account.id === updated.id ? { ...account, ...updated } : account));
      setNotice("Profile settings saved.");
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = formData.get("new_password");
    if (newPassword !== formData.get("confirm_password")) {
      setSettingsError("The new passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    setSettingsError("");
    try {
      const result = await apiUpdateAdminPassword(formData.get("current_password"), newPassword);
      form.reset();
      setNotice(result.message);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount(account) {
    if (!window.confirm(`Delete the account for ${account.email}? This cannot be undone.`)) return;
    setDeletingId(account.id);
    setError("");
    try {
      await apiDeleteAdminUser(account.id);
      setAccounts(current => current.filter(item => item.id !== account.id));
      setOverview(current => current ? {
        ...current,
        total_users: Math.max(0, current.total_users - 1),
        total_admins: Math.max(0, current.total_admins - (account.is_admin ? 1 : 0)),
      } : current);
      setNotice(`Account ${account.email} was deleted.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAccounts = accounts.filter(account =>
    `${account.full_name} ${account.email}`.toLowerCase().includes(normalizedQuery),
  );
  const normalizedActivityQuery = activityQuery.trim().toLowerCase();
  const filteredActivity = activity.filter(entry =>
    `${entry.event_type} ${entry.actor_id ?? ""} ${entry.actor_name || ""} ${entry.actor_email || ""} ${entry.detail || ""}`.toLowerCase().includes(normalizedActivityQuery),
  );
  const currentSection = ADMIN_SECTIONS.find(item => item.id === section) || ADMIN_SECTIONS[0];
  const formattedDate = value => value ? new Date(value).toLocaleString() : "—";

  function renderActivityRows(rows) {
    if (loading) return <tr><td colSpan="4" className={styles.tableMessage}>Loading audit events...</td></tr>;
    if (!rows.length) return <tr><td colSpan="4" className={styles.tableMessage}>No matching audit events.</td></tr>;
    return rows.map(entry => {
      const isExpanded = expandedActivity === entry.id;
      return (
        <Fragment key={entry.id}>
          <tr>
            <td><button type="button" className={styles.auditDisclosure} aria-expanded={isExpanded} aria-controls={`audit-details-${entry.id}`} onClick={() => setExpandedActivity(isExpanded ? null : entry.id)}><span className={styles.eventType}>{entry.event_type.replaceAll("_", " ")}</span><FiChevronDown className={isExpanded ? styles.auditChevronOpen : ""} size={14}/></button></td>
            <td className={styles.accountEmail}>{entry.actor_name || (entry.actor_id ? `Account #${entry.actor_id}` : "Unregistered account")}</td>
            <td><span className={`${styles.eventStatus} ${entry.success ? styles.eventSuccess : styles.eventFailure}`}>{entry.success ? "Success" : "Failed"}</span></td>
            <td className={styles.auditDetail}>{formattedDate(entry.created_at)}</td>
          </tr>
          {isExpanded && <tr id={`audit-details-${entry.id}`} className={styles.auditExpandedRow}><td colSpan="4"><div className={styles.auditExpanded}>
            <div><span>User</span><strong>{entry.actor_name || (entry.actor_id ? `Account #${entry.actor_id}` : "Unregistered account")}</strong></div>
            {entry.actor_email && <div><span>Email</span><strong>{entry.actor_email}</strong></div>}
            {entry.detail && <div className={styles.auditEventDetail}><span>Event details</span><strong>{entry.detail}</strong></div>}
          </div></td></tr>}
        </Fragment>
      );
    });
  }

  const sectionTitle = {
    overview: "Overview",
    accounts: "Account management",
    enrollments: "Enrollment records",
    verification: "Face verification",
    activity: "Audit log",
    system: "System health",
    settings: "Account settings",
  }[section];

  return (
    <div className={styles.adminFrame} data-theme={theme}>
      <aside className={styles.adminSidebar}>
        <div className={styles.adminBrand}><img src={logo} alt="FACEIO"/><small>ADMINISTRATION</small></div>
        <button type="button" className={styles.adminThemeToggle} onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
          {theme === "light" ? <FiMoon size={15}/> : <FiSun size={15}/>}<span>{theme === "light" ? "Dark theme" : "Light theme"}</span>
        </button>
        <div className={styles.adminNavLabel}>WORKSPACE</div>
        <nav className={styles.adminNav} aria-label="Admin sections">
          {ADMIN_SECTIONS.map(item => (
            <button key={item.id} type="button" className={`${styles.adminNavItem} ${section === item.id ? styles.adminNavActive : ""}`} onClick={() => { setSection(item.id); setNotice(""); if (item.id === "enrollments") loadEnrollments(0); }}>
              {item.icon}<span>{item.label}</span>{section === item.id && <i/>}
            </button>
          ))}
        </nav>
        <div className={styles.adminSidebarFoot}>
          <div className={styles.adminSidebarUser}>
            <div className={styles.adminAvatar}>{user.fullName.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</div>
            <div><strong>{user.fullName}</strong><small>Administrator</small></div>
          </div>
          <button type="button" className={styles.adminLogout} onClick={logout}><FiLogOut size={15}/>Sign out</button>
        </div>
      </aside>

      <main className={styles.adminMain}>
        <header className={styles.adminTopbar}>
          <div><div className={styles.adminBreadcrumb}>CONTROL PANEL <span>/</span> {currentSection.label.toUpperCase()}</div><h1>{sectionTitle}</h1></div>
          <button type="button" className={styles.adminRefresh} onClick={refreshConsole} disabled={refreshing} title="Refresh dashboard data" aria-label="Refresh dashboard data"><FiRefreshCw className={refreshing ? styles.refreshing : ""} size={16}/></button>
        </header>

        {notice && <div className={styles.adminNotice}><FiCheckCircle size={15}/>{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><FiX size={15}/></button></div>}
        {error && <div className={styles.adminError}><FiAlertCircle size={15}/>{error}</div>}
        {settingsError && <div className={styles.adminError}><FiAlertCircle size={15}/>{settingsError}</div>}

        {section === "overview" && (
          <div className={styles.adminPageContent}>
            <div className={styles.adminWelcome}><div><span>LIVE SYSTEM SNAPSHOT</span><h2>Good to see you, {user.fullName.split(" ")[0]}.</h2><p>Account access and face verification operations at a glance.</p></div><span className={styles.liveIndicator}><i/> API CONNECTED</span></div>
            <section className={styles.adminMetrics} aria-label="Platform metrics">
              <AdminMetric icon={<FiUsers size={17}/>} label="Registered users" value={loading ? "..." : overview?.total_users?.toLocaleString()} detail="Accounts in database"/>
              <AdminMetric icon={<FiShield size={17}/>} label="Admin accounts" value={loading ? "..." : overview?.total_admins?.toLocaleString()} detail="Privileged accounts"/>
              <AdminMetric icon={<FiUserCheck size={17}/>} label="Enrolled identities" value={loading ? "..." : overview?.total_enrolled?.toLocaleString()} detail="Face records stored"/>
              <AdminMetric icon={<FiActivity size={17}/>} label="Successful matches" value={loading ? "..." : overview?.successful_verifications?.toLocaleString()} detail="Verified operations"/>
            </section>

            <div className={styles.adminOverviewGrid}>
              <section className={styles.adminPanel}>
                <div className={styles.adminPanelHeading}><div><h2>Service status</h2><p>Live health from the backend</p></div><button type="button" onClick={() => setSection("system")}>Details <FiChevronRight size={14}/></button></div>
                <div className={styles.serviceRows}>
                  <div><span className={styles.serviceIcon}><FiActivity size={15}/></span><span><strong>API service</strong><small>Admin endpoint responding</small></span><b className={styles.statusOnline}>Online</b></div>
                  <div><span className={styles.serviceIcon}><FiDatabase size={15}/></span><span><strong>Database</strong><small>Account and event queries</small></span><b className={overview?.database_status === "online" ? styles.statusOnline : styles.statusOffline}>{overview?.database_status || (loading ? "Checking" : "Unavailable")}</b></div>
                  <div><span className={styles.serviceIcon}><FiCpu size={15}/></span><span><strong>FAISS index</strong><small>{overview?.faiss_total ?? 0} vectors loaded</small></span><b className={overview?.faiss_ready ? styles.statusOnline : styles.statusOffline}>{overview?.faiss_ready ? "Ready" : "Unavailable"}</b></div>
                </div>
              </section>
              <section className={styles.adminPanel}>
                <div className={styles.adminPanelHeading}><div><h2>Security signals</h2><p>Configuration indicators only</p></div><FiKey size={17}/></div>
                <div className={styles.securityRows}>
                  <div><span>Admin allowlist</span><b className={overview?.admin_allowlist_configured ? styles.statusOnline : styles.statusNeutral}>{overview?.admin_allowlist_configured ? "Configured" : "Not configured"}</b></div>
                  <div><span>Request signing</span><b className={overview?.request_signing_configured ? styles.statusOnline : styles.statusOffline}>{overview?.request_signing_configured ? "Configured" : "Review configuration"}</b></div>
                  {/* <div><span>Failed login attempts</span><strong>{loading ? "..." : overview?.failed_logins?.toLocaleString()}</strong></div> */}
                </div>
              </section>
            </div>

            <section className={styles.adminPanel}>
              <div className={styles.adminPanelHeading}><div><h2>Latest audit events</h2><p>Recent platform events; login events are excluded</p></div><button type="button" onClick={() => setSection("activity")}>View audit log <FiChevronRight size={14}/></button></div>
              <div className={styles.tableWrap}><table className={styles.accountsTable}><thead><tr><th>Event</th><th>Actor</th><th>Result</th><th>Date &amp; time</th></tr></thead><tbody>{renderActivityRows(activity.slice(0, 6))}</tbody></table></div>
            </section>
          </div>
        )}

        {section === "accounts" && (
          <div className={styles.adminPageContent}>
            <div className={styles.sectionIntro}><div><h2>Accounts</h2><p>Review registered users and grant admin access to existing accounts.</p></div><button type="button" className={styles.adminPrimaryButton} onClick={() => { setGrantError(""); setGrantOpen(true); }}><FiPlus size={16}/> Add admin</button></div>
            <section className={styles.adminPanel}>
              <div className={styles.accountToolbar}><div className={styles.accountCounts}><strong>{accounts.length.toLocaleString()}</strong> total <span>{accounts.filter(account => account.is_admin).length.toLocaleString()} admins</span></div><label className={styles.accountSearch}><FiSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" /></label></div>
              <div className={styles.tableWrap}><table className={styles.accountsTable}><thead><tr><th>User</th><th>Access</th><th>Joined</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead><tbody>
                {loading ? <tr><td colSpan="4" className={styles.tableMessage}>Loading accounts...</td></tr> : filteredAccounts.length ? filteredAccounts.map(account => (
                  <tr key={account.id}><td><div className={styles.accountName}>{account.full_name}</div><div className={styles.accountEmail}>{account.email}</div></td><td><span className={`${styles.roleBadge} ${account.is_admin ? styles.roleAdmin : ""}`}>{account.is_admin ? "Admin" : "User"}</span></td><td className={styles.joinDate}>{new Date(account.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td><td className={styles.accountActions}><button type="button" onClick={() => deleteAccount(account)} disabled={deletingId === account.id || String(account.id) === user.userId} aria-label={`Delete ${account.full_name}`} title={String(account.id) === user.userId ? "You cannot delete your own account" : "Delete account"}><FiTrash2 size={15}/></button></td></tr>
                )) : <tr><td colSpan="4" className={styles.tableMessage}>{accounts.length ? "No accounts match your search." : "No registered accounts yet."}</td></tr>}
              </tbody></table></div>
              <div className={styles.tableFooter}>Showing {filteredAccounts.length} of {accounts.length} accounts</div>
            </section>
          </div>
        )}

        {section === "enrollments" && (
          <div className={styles.adminPageContent}>
            <div className={styles.sectionIntro}><div><h2>Enrolled faces</h2><p>Review enrollment details and photos. Deleting removes all face images for that user and allows them to enroll again.</p></div></div>
            <section className={styles.adminPanel}>
              <div className={styles.accountToolbar}><div className={styles.accountCounts}><strong>{enrollmentsTotal.toLocaleString()}</strong> users with enrollment</div><button type="button" className={styles.refreshButton} onClick={() => loadEnrollments(enrollmentsPage)} disabled={enrollmentsLoading} aria-label="Refresh enrollments" title="Refresh enrollments"><FiRefreshCw size={15} className={enrollmentsLoading ? styles.refreshing : ""}/></button></div>
              <div className={styles.tableWrap}><table className={styles.enrollmentTable}><thead><tr><th>Enrolled person</th><th>Account owner</th><th>Program</th><th>Photos</th><th>Enrolled</th><th>Actions</th></tr></thead><tbody>
                {enrollmentsLoading ? <tr><td colSpan="6" className={styles.tableMessage}>Loading enrollments...</td></tr> : enrollments.length ? enrollments.map(enrollment => (
                  <Fragment key={enrollment.user_id}>
                    <tr>
                      <td><div className={styles.accountName}>{enrollment.full_name}</div><div className={styles.accountEmail}>{enrollment.matric_number}</div></td>
                      <td><div className={styles.accountName}>{enrollment.account_name}</div><div className={styles.accountEmail}>{enrollment.account_email}</div></td>
                      <td className={styles.joinDate}>{enrollment.program} · {enrollment.gender}</td>
                      <td><span className={styles.roleBadge}>{enrollment.face_count}</span></td>
                      <td className={styles.joinDate}>{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                      <td className={styles.enrollmentActions}>
                        <button type="button" className={styles.viewFacesButton} onClick={() => toggleEnrollmentFaces(enrollment)} aria-expanded={expandedEnrollment === enrollment.user_id}>
                          <FiCamera size={14}/>{expandedEnrollment === enrollment.user_id ? "Hide photos" : "View photos"}
                        </button>
                        <button type="button" className={styles.deleteEnrollmentButton} onClick={() => deleteEnrollment(enrollment)} disabled={deletingEnrollmentId === enrollment.user_id} aria-label={`Delete enrollment for ${enrollment.full_name}`} title="Delete all enrollment photos"><FiTrash2 size={14}/></button>
                      </td>
                    </tr>
                    {expandedEnrollment === enrollment.user_id && <tr className={styles.enrollmentExpandedRow}><td colSpan="6">
                      {facesLoadingId === enrollment.user_id ? <div className={styles.enrollmentImagesLoading}><FiRefreshCw className={styles.refreshing} size={15}/> Loading face photos...</div> : (
                        <div className={styles.enrollmentImages}>
                          {(enrollmentFaces[enrollment.user_id] || []).map((face, index) => (
                            <figure key={face.id}><img src={`data:${face.content_type};base64,${face.image_base64}`} alt={`Enrolled face ${index + 1} for ${enrollment.full_name}`} loading="lazy"/><figcaption>Photo {index + 1}</figcaption></figure>
                          ))}
                        </div>
                      )}
                    </td></tr>}
                  </Fragment>
                )) : <tr><td colSpan="6" className={styles.tableMessage}>No face enrollments found.</td></tr>}
              </tbody></table></div>
              <div className={styles.enrollmentPagination}><span>Showing {enrollmentsTotal ? enrollmentsPage * 20 + 1 : 0}–{Math.min((enrollmentsPage + 1) * 20, enrollmentsTotal)} of {enrollmentsTotal}</span><div><button type="button" onClick={() => loadEnrollments(enrollmentsPage - 1)} disabled={enrollmentsPage === 0 || enrollmentsLoading}>Previous</button><button type="button" onClick={() => loadEnrollments(enrollmentsPage + 1)} disabled={(enrollmentsPage + 1) * 20 >= enrollmentsTotal || enrollmentsLoading}>Next</button></div></div>
            </section>
          </div>
        )}

        {section === "verification" && (
          <div className={styles.adminPageContent}>
            <Verify adminMode />
          </div>
        )}

        {section === "activity" && (
          <div className={styles.adminPageContent}>
            <div className={styles.sectionIntro}><div><h2>Audit log</h2><p>Account and system events.</p></div><label className={styles.accountSearch}><FiSearch size={16}/><input value={activityQuery} onChange={event => setActivityQuery(event.target.value)} placeholder="Filter event, account, or email" /></label></div>
            <section className={styles.adminPanel}><div className={styles.tableWrap}><table className={styles.accountsTable}><thead><tr><th>Event</th><th>Account</th><th>Result</th><th>Date &amp; time</th></tr></thead><tbody>{renderActivityRows(filteredActivity)}</tbody></table></div><div className={styles.tableFooter}>{filteredActivity.length} events</div></section>
          </div>
        )}

        {section === "system" && (
          <div className={styles.adminPageContent}>
            <div className={styles.sectionIntro}><div><h2>System health</h2><p>Operational checks and safe configuration indicators.</p></div></div>
            <section className={styles.systemGrid}>
              <div className={styles.systemCard}><span className={styles.systemIcon}><FiActivity size={18}/></span><div><small>API SERVICE</small><h3>Online</h3><p>This page loaded live admin data from the API.</p></div><b className={styles.statusOnline}>HEALTHY</b></div>
              <div className={styles.systemCard}><span className={styles.systemIcon}><FiDatabase size={18}/></span><div><small>DATABASE</small><h3>{overview?.database_status === "online" ? "Connected" : loading ? "Checking" : "Unavailable"}</h3><p>User records and audit data are queryable.</p></div><b className={overview?.database_status === "online" ? styles.statusOnline : styles.statusOffline}>{overview?.database_status === "online" ? "HEALTHY" : "CHECK"}</b></div>
              <div className={styles.systemCard}><span className={styles.systemIcon}><FiCpu size={18}/></span><div><small>FAISS FACE INDEX</small><h3>{overview?.faiss_ready ? "Loaded" : loading ? "Checking" : "Unavailable"}</h3><p>{overview?.faiss_total ?? 0} embeddings currently in memory.</p></div><b className={overview?.faiss_ready ? styles.statusOnline : styles.statusOffline}>{overview?.faiss_ready ? "HEALTHY" : "CHECK"}</b></div>
            </section>
            <section className={styles.adminPanel}>
              <div className={styles.adminPanelHeading}><div><h2>Security configuration</h2><p>Read-only status checks. Secret values are never returned.</p></div><FiShield size={18}/></div>
              <div className={styles.configRows}>
                <div><span><FiKey size={15}/> Admin email allowlist</span><b>{overview?.admin_allowlist_configured ? "Configured" : "Not configured"}</b></div>
                <div><span><FiShield size={15}/> Request signature validation</span><b>{overview?.request_signing_configured ? "Configured" : "Review backend configuration"}</b></div>
                <div><span><FiUserCheck size={15}/> Active administrator accounts</span><b>{loading ? "..." : overview?.total_admins?.toLocaleString()}</b></div>
              </div>
            </section>
          </div>
        )}

        {section === "settings" && (
          <div className={styles.adminPageContent}>
            <div className={styles.sectionIntro}><div><h2>Account settings</h2><p>Manage your admin profile and sign-in password.</p></div></div>
            <div className={styles.settingsGrid}>
              <section className={styles.adminPanel}>
                <div className={styles.adminPanelHeading}><div><h2>Profile</h2><p>Your registered account details</p></div><FiUser size={17}/></div>
                <form className={styles.settingsForm} onSubmit={saveProfile}>
                  <label>Full name<input name="full_name" required maxLength="150" autoComplete="name" defaultValue={profile?.full_name || user.fullName} /></label>
                  <label>Email address<input name="email" type="email" required maxLength="255" autoComplete="email" defaultValue={profile?.email || ""} /></label>
                  {/* <p>Your name and email are visible in admin audit records.</p> */}
                  <button type="submit" className={styles.adminPrimaryButton} disabled={profileSaving || loading}>{profileSaving ? "Saving..." : <><FiSave size={14}/> Save profile</>}</button>
                </form>
              </section>
              <section className={styles.adminPanel}>
                <div className={styles.adminPanelHeading}><div><h2>Password</h2><p>Confirm your current password to change it</p></div><FiLock size={17}/></div>
                <form className={styles.settingsForm} onSubmit={changePassword}>
                  <label>Current password<input name="current_password" type="password" required autoComplete="current-password" /></label>
                  <label>New password<input name="new_password" type="password" required minLength="8" maxLength="128" autoComplete="new-password" /></label>
                  <label>Confirm new password<input name="confirm_password" type="password" required minLength="8" maxLength="128" autoComplete="new-password" /></label>
                  <p>Changing your password signs out other sessions.</p>
                  <button type="submit" className={styles.adminPrimaryButton} disabled={passwordSaving}>{passwordSaving ? "Updating..." : <><FiLock size={14}/> Update password</>}</button>
                </form>
              </section>
            </div>
          </div>
        )}
      </main>

      {grantOpen && <div className={styles.adminModalBackdrop} onMouseDown={event => { if (event.target === event.currentTarget && !granting) setGrantOpen(false); }}>
        <section className={styles.adminModal} role="dialog" aria-modal="true" aria-labelledby="create-admin-title">
          <header><div><span className={styles.modalIcon}><FiUserPlus size={17}/></span><div><h2 id="create-admin-title">Grant admin access</h2><p>User must already have a registered account.</p></div></div><button type="button" onClick={() => setGrantOpen(false)} disabled={granting} aria-label="Close dialog"><FiX size={18}/></button></header>
          <form onSubmit={grantAdmin}>
            <label>Registered full name<input name="full_name" required maxLength="150" autoComplete="name" placeholder="Administrator name"/></label>
            <label>Registered email<input name="email" type="email" required maxLength="255" autoComplete="email" placeholder="admin@example.com"/></label>
            <p className={styles.grantHelp}>Both fields must match the existing account.</p>
            {grantError && <div className={styles.adminError}><FiAlertCircle size={15}/>{grantError}</div>}
            <div className={styles.modalActions}><button type="button" className={styles.adminCancelButton} onClick={() => setGrantOpen(false)} disabled={granting}>Cancel</button><button type="submit" className={styles.adminPrimaryButton} disabled={granting}><FiPlus size={15}/>{granting ? "Granting..." : "Grant access"}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, updateProfile, isLoggedIn, checking } = useAuth();
  const [stats, setStats]   = useState({ total_enrolled:0, total_verified:0, recent_activity:[] });
  const [loading, setLoading] = useState(true);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || user?.isAdmin) return;

    let cancelled = false;
    const loadStats = () => {
      apiDashboardStats()
        .then(d => { if (!cancelled) setStats(d); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    loadStats();
    const interval = window.setInterval(loadStats, 30000);
    window.addEventListener("focus", loadStats);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadStats);
    };
  }, [isLoggedIn, user?.isAdmin]);

  if (checking) return null;

  if (!isLoggedIn) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateBox}>
          <div className={styles.gateIcon}><FiShield size={32} color="#60a5fa"/></div>
          <h2 className={styles.gateTitle}>Access Restricted</h2>
          <p className={styles.gateText}>You need to be logged in to view the dashboard.</p>
          <Link to="/login" className={styles.gateBtn}><FiShield size={16}/> Log In</Link>
        </div>
      </div>
    );
  }

  if (user?.isAdmin) return <AdminDashboard user={user} logout={logout} updateProfile={updateProfile} />;
  if (showAccountSettings) {
    return <UserAccountSettings user={user} updateProfile={updateProfile} onBack={() => setShowAccountSettings(false)} />;
  }

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      {/* <aside className={styles.sidebar}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <div className={styles.userName}>{user?.fullName}</div>
            <div className={styles.userRole}>Administrator</div>
          </div>
        </div>

        <div className={styles.navLabel}>Main Menu</div>
        {NAV.map(item => (
          <Link key={item.to} to={item.to}
            className={`${styles.navItem} ${location.pathname===item.to ? styles.navItemActive : ""}`}>
            <span className={styles.navItemIcon}>{item.icon}</span>
            {item.label}
            {location.pathname===item.to && <span className={styles.activeDot}/>}
          </Link>
        ))}

        <div className={styles.navSpacer}/>
        <button className={styles.logoutBtn} onClick={logout}>
          <FiLogOut size={15}/> Log Out
        </button>
      </aside> */}

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTag}>Overview</div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSub}>Face enrollment and verification activity</p>
          </div>
          <div className={styles.headerActions}>
            <Link to="/enrollment"   className={styles.btnPrimary}><FiUserPlus size={14}/> Enroll Face</Link>
            <Link to="/verification" className={styles.btnGhost}><FiSearch size={14}/> Verify Face</Link>
            <button type="button" className={styles.btnGhost} onClick={() => setShowAccountSettings(true)}><FiSettings size={14}/> Account settings</button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <StatCard icon={<FiUserPlus size={17} color="#60a5fa"/>}  label="Total Enrolled"    value={loading ? null : stats.total_enrolled}  loading={loading} color="#2563eb"  sub="Face records in system"/>
          <StatCard icon={<FiSearch size={17} color="#22d3ee"/>}    label="Successful Verifications"  value={loading ? null : stats.total_verified}  loading={loading} color="#06b6d4"  sub="Successful face matches"/>
          <StatCard icon={<FiCheckCircle size={17} color="#34d399"/>} label="System Status"   value={loading ? null : "Active"}              loading={loading} color="#10b981"  sub="All services operational"/>
        </div>

        {/* Charts row */}
        <div className={styles.chartsRow}>
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Enrollment Activity</div>
                <div className={styles.cardSub}>Last 12 operations</div>
              </div>
              <span className={styles.tag}>Enrollments</span>
            </div>
            <MiniBar data={BAR_DATA} color="#2563eb"/>
            <div className={styles.chartLabels}>
              {BAR_MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Verification Runs</div>
            <div className={styles.cardSub}>Monthly breakdown</div>
            <MiniBar data={VERIFY_BARS} color="#06b6d4"/>
            <div className={styles.infoBox} style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.2)" }}>
              <div className={styles.infoBoxLabel} style={{ color:"rgba(6,182,212,0.7)", fontSize:12 }}>Avg. similarity score</div>
              <div className={styles.infoBoxValue}>{loading ? "—" : "94.2%"}</div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className={styles.bottomRow}>
          {/* Activity */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Recent Activity</div>
            <div className={styles.cardSub} style={{ marginBottom:16 }}>System events and operations</div>
            {stats.recent_activity?.length ? stats.recent_activity.map((activity, index) => {
              const item = formatActivity(activity);
              const isEnrollment = activity.event_type === "enroll";
              const color = activity.success ? (isEnrollment ? "#2563eb" : "#06b6d4") : "#f59e0b";
              return (
                <ActivityRow
                  key={`${activity.created_at}-${index}`}
                  icon={activity.success ? (isEnrollment ? <FiUserPlus size={15} color="#60a5fa"/> : <FiSearch size={15} color="#22d3ee"/>) : <FiAlertCircle size={15} color="#fbbf24"/>}
                  text={`${item.event} — ${item.detail}`}
                  time={item.time}
                  color={color}
                />
              );
            }) : <div className={styles.activityEmpty}>No recent activity yet</div>}
          </div>

          {/* Quick actions + health */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ marginBottom:16 }}>Quick Actions</div>
            <div className={styles.quickActions}>
              {[
                { to:"/enrollment",   icon:<FiUserPlus size={18} color="#60a5fa"/>, title:"Enroll a face",    sub:"Register new person" },
                { to:"/verification", icon:<FiSearch size={18} color="#22d3ee"/>,   title:"Verify a face",    sub:"Match against records" },
                { to:"/ourblog",      icon:<FiFileText size={18} color="#34d399"/>, title:"Read the blog",    sub:"News and updates" },
              ].map(a => (
                <Link key={a.to} to={a.to} className={styles.quickLink}>
                  <span className={styles.quickLinkIcon}>{a.icon}</span>
                  <div>
                    <div className={styles.quickLinkTitle}>{a.title}</div>
                    <div className={styles.quickLinkSub}>{a.sub}</div>
                  </div>
                  <span className={styles.quickLinkArrow}><FiChevronRight size={14}/></span>
                </Link>
              ))}
            </div>

            <div className={styles.healthBox}>
              <div className={styles.healthTitle}><FiActivity size={12}/> System Health</div>
              {[["FAISS Index","OK"],["Auth Service","OK"],["API Gateway","OK"]].map(([l,s]) => (
                <div key={l} className={styles.healthRow}>
                  <span>{l}</span>
                  <span className={styles.healthOk}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}