import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiEnroll, apiEnrollmentStatus } from "../../services/api";
import { FiAlertTriangle, FiArrowRight, FiCamera, FiCheckCircle, FiClipboard, FiInfo, FiLoader, FiPlus, FiShield } from "react-icons/fi";
import styles from "./Enroll.module.css";

const MAX_IMAGE_SIZE_BYTES = 100 * 1024;
const MAX_IMAGES = 3;

function Enroll() {
  const { isLoggedIn } = useAuth();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [program, setProgram] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [imageSlots, setImageSlots] = useState(Array(MAX_IMAGES).fill(null));
  const [preview, setPreview] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [enrollmentInProgress, setEnrollmentInProgress] = useState(false);
  const [isReenrolling, setIsReenrolling] = useState(false);
  const [enrolledFaceCount, setEnrolledFaceCount] = useState(0);
  const [enrollmentCheckError, setEnrollmentCheckError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    apiEnrollmentStatus()
      .then(status => {
        if (cancelled) return;
        setAlreadyEnrolled(status.enrolled);
        setEnrollmentInProgress(status.in_progress || false);
        setEnrolledFaceCount(status.face_count || 0);
      })
      .catch(err => { if (!cancelled) setEnrollmentCheckError(err.message); })
      .finally(() => { if (!cancelled) setCheckingEnrollment(false); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="gate-wrap">
        <div className="gate-box">
          <div className="gate-icon"><FiShield size={32} /></div>
          <h2>Access Restricted</h2>
          <p>You need to be logged in to enroll a face into the system.</p>
          <Link to="/login" className="btn btn-primary" style={{ padding: "12px 28px" }}>
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (checkingEnrollment) {
    return <div className={styles.enrollmentStatusPage}><FiLoader className={styles.enrollmentStatusSpinner} size={24}/><span>Checking your enrollment status...</span></div>;
  }

  if (enrollmentCheckError) {
    return (
      <div className={styles.enrollmentStatusPage}>
        <div className={styles.enrollmentStatusCard}>
          <FiAlertTriangle size={24}/><h1>Could not check enrollment</h1><p>{enrollmentCheckError}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }

  if (alreadyEnrolled) {
    const startReenrollment = () => {
      const confirmed = window.confirm(
        "Re-enroll with new photos? Your current enrollment will remain active unless the new enrollment succeeds.",
      );
      if (!confirmed) return;
      setIsReenrolling(true);
      setAlreadyEnrolled(false);
      setFullName("");
      setGender("");
      setProgram("");
      setMatricNumber("");
      setError("");
      setSuccess(null);
    };

    return (
      <div className={styles.enrollmentStatusPage}>
        <div className={styles.enrollmentStatusCard}>
          <span className={styles.enrollmentStatusSuccess}><FiCheckCircle size={24}/></span>
          <div className={styles.enrollmentStatusEyebrow}>{enrollmentInProgress ? "ENROLLMENT IN PROGRESS" : success && isReenrolling ? "RE-ENROLLMENT COMPLETE" : "ENROLLMENT COMPLETE"}</div>
          <h1>{enrollmentInProgress ? "Your enrollment is in progress" : success ? isReenrolling ? "You’ve re-enrolled successfully" : "You’re enrolled successfully" : "You’re already enrolled"}</h1>
          {enrollmentInProgress ? <p>Your images are still being processed. Please wait before trying again.</p> : <p>{"Your account has"} {enrolledFaceCount} face image{enrolledFaceCount === 1 ? "" : "s"} on record.</p>}
          {success && <div className="alert alert-success"><FiCheckCircle size={14}/><span>{success}</span></div>}
          {!enrollmentInProgress && <button type="button" className="btn btn-primary" onClick={startReenrollment}>Re-enroll</button>}
          <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const selectedSlots = imageSlots.filter(Boolean);

  const validateImageQuality = (file, slotIndex) =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Unable to read image preview.")); return; }
        const size = Math.min(img.width, img.height, 240);
        canvas.width = size; canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let variance = 0;
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          variance += gray * gray;
        }
        const average = variance / (data.length / 4);
        if (average < 0.05) {
          reject(new Error(`Image ${slotIndex + 1} looks blurry. Please upload a clearer face photo.`));
          return;
        }
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read the selected image.")); };
      img.src = objectUrl;
    });

  const handleSlotChange = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Max file size is 100KB. Please choose a smaller image.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png"].includes(ext || "")) {
      setError("Please upload a JPG or PNG image."); return;
    }
    try {
      await validateImageQuality(file, index);
      const updatedSlots = [...imageSlots];
      if (updatedSlots[index]) URL.revokeObjectURL(updatedSlots[index].previewUrl);
      const previewUrl = URL.createObjectURL(file);
      updatedSlots[index] = { file, previewUrl };
      setImageSlots(updatedSlots);
      const currentIndex = updatedSlots.filter(Boolean).findIndex(s => s.previewUrl === previewUrl);
      setPreview(previewUrl);
      setPreviewIndex(currentIndex >= 0 ? currentIndex : 0);
      setSuccess(null); setError("");
    } catch (err) {
      setError(err.message || "The image looks blurry. Please upload a clear face photo.");
    }
  };

  const handleRemoveSlot = (index) => {
    const updatedSlots = [...imageSlots];
    if (updatedSlots[index]) URL.revokeObjectURL(updatedSlots[index].previewUrl);
    updatedSlots[index] = null;
    setImageSlots(updatedSlots);
    const remaining = updatedSlots.filter(Boolean);
    setPreview(remaining[0]?.previewUrl || null);
    setPreviewIndex(0);
  };

  const handlePrevImage = () => {
    if (selectedSlots.length <= 1) return;
    const ni = previewIndex === 0 ? selectedSlots.length - 1 : previewIndex - 1;
    setPreviewIndex(ni); setPreview(selectedSlots[ni].previewUrl);
  };

  const handleNextImage = () => {
    if (selectedSlots.length <= 1) return;
    const ni = (previewIndex + 1) % selectedSlots.length;
    setPreviewIndex(ni); setPreview(selectedSlots[ni].previewUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFiles = imageSlots.filter(Boolean).map(s => s.file);
    if (!selectedFiles.length) { setError("Please select at least one face image."); return; }
    setError(""); setSuccess(null); setLoading(true);
    try {
      const result = await apiEnroll(fullName, gender, program, matricNumber, selectedFiles, isReenrolling);
      const count = Array.isArray(result) ? result.length : 1;
      setSuccess(`Successfully ${isReenrolling ? "re-enrolled" : "enrolled"} ${count} image${count > 1 ? "s" : ""} for ${fullName}.`);
      setEnrolledFaceCount(count);
      setAlreadyEnrolled(true);
      setFullName(""); setGender(""); setProgram(""); setMatricNumber("");
      setImageSlots(Array(MAX_IMAGES).fill(null)); setPreview(null); setPreviewIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completedFields = [
    fullName.trim(), gender, program, matricNumber.trim(),
  ].filter(Boolean).length;
  const progress = Math.round(((completedFields / 4) * 0.5 + (selectedSlots.length / MAX_IMAGES) * 0.5) * 100);

  return (
    <div className={styles.pageWrap}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard" className={styles.breadHome}>
            Dashboard
          </Link>
          <span className={styles.breadSep}>›</span>
          <span className={styles.breadCurrent}>Enrollment</span>
        </div>
        <h1 className={styles.title}>Face Enrollment</h1>
        <p className={styles.subtitle}>
          Register a new person by entering their details and uploading up to 3 clear face photos.
          More images improve matching accuracy.
        </p>
      </div>

      {/* Progress bar */}
      <div className={styles.progressCard}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>
            Enrollment progress
          </span>
          <span className={styles.progressValue}>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.progressSteps}>
          {[
            { label: "Personal details", done: completedFields >= 4 },
            { label: "Images uploaded", done: selectedSlots.length > 0 },
            { label: "Ready to enroll", done: completedFields >= 4 && selectedSlots.length >= MAX_IMAGES },
          ].map(s => (
            <span key={s.label} className={`${styles.progressStep} ${s.done ? styles.progressStepDone : ""}`}>
              <span>{s.done ? <FiCheckCircle size={13} /> : <FiInfo size={13} />}</span> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.mainGrid}>
        {/* ── Left: Form ── */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className="alert alert-error"><FiAlertTriangle size={14} /><span>{error}</span></div>}
            {success && <div className="alert alert-success"><FiCheckCircle size={14} /><span>{success}</span></div>}

            {/* Personal info section */}
            <div>
              <div className={styles.sectionLabel}>
                PERSONAL INFORMATION
              </div>
              <div className={styles.personalGrid}>
                <div className={styles.fullWidth}>
                  <label className={styles.label}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Adewale Johnson"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div>
                  <label className={styles.label}>
                    Gender *
                  </label>
                  <select value={gender} onChange={e => setGender(e.target.value)} required className={styles.inputField}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>
                    Program / Role *
                  </label>
                  <select value={program} onChange={e => setProgram(e.target.value)} required className={styles.inputField}>
                    <option value="">Select program</option>
                    <option value="Student">Student</option>
                    <option value="Staff">Staff</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className={styles.fullWidth}>
                  <label className={styles.label}>
                    Matric Number / ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSC/2021/001"
                    required
                    value={matricNumber}
                    onChange={e => setMatricNumber(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>
            </div>

            {/* Image upload section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", color: "var(--cyan)", textTransform: "uppercase", marginBottom: 4 }}>
                    FACE IMAGES *
                  </div>
                  <div style={{ fontSize: 13, color: "var(--white-60)" }}>
                    Upload up to 3 clear, well-lit face photos
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  padding: "4px 10px",
                  background: selectedSlots.length === MAX_IMAGES ? "rgba(16,185,129,0.15)" : "rgba(37,99,235,0.15)",
                  border: `1px solid ${selectedSlots.length === MAX_IMAGES ? "rgba(16,185,129,0.3)" : "rgba(37,99,235,0.3)"}`,
                  borderRadius: 999,
                  color: selectedSlots.length === MAX_IMAGES ? "#6ee7b7" : "var(--blue-2)",
                }}>
                  {selectedSlots.length} / {MAX_IMAGES}
                </span>
              </div>

              {/* Slot grid */}
              <div className={`${styles.slotStage} ${loading ? styles.slotStageLoading : ""}`} aria-busy={loading}>
              <div className={styles.slotGrid} style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}>
                {imageSlots.map((slot, index) => (
                  <label key={index} style={{
                    aspectRatio: "1",
                    background: slot ? "transparent" : "var(--white-5)",
                    border: `1.5px ${slot ? "solid rgba(37,99,235,0.5)" : "dashed var(--border-2)"}`,
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (!slot) e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"; }}
                  onMouseLeave={e => { if (!slot) e.currentTarget.style.borderColor = "var(--border-2)"; }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      disabled={loading}
                      onChange={e => handleSlotChange(index, e)}
                    />
                    {slot ? (
                      <>
                        <img
                          src={slot.previewUrl}
                          alt={`Face ${index + 1}`}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(6,13,26,0.5)",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "flex-end",
                          padding: 8,
                          opacity: 0,
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <button
                            type="button"
                            onClick={ev => { ev.preventDefault(); ev.stopPropagation(); handleRemoveSlot(index); }}
                            style={{
                              padding: "4px 10px",
                              background: "rgba(239,68,68,0.8)",
                              border: "none", borderRadius: 6,
                              color: "white", fontSize: 12, fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          width: 20, height: 20,
                          background: "rgba(16,185,129,0.9)",
                          borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "white",
                        }}><FiCheckCircle size={12} /></div>
                      </>
                    ) : (
                      <>
                        <span style={{
                          fontSize: 22,
                          color: "var(--white-30)",
                          fontWeight: 300,
                        }}><FiPlus size={18} /></span>
                        <span style={{ fontSize: 11, color: "var(--white-30)", textAlign: "center" }}>
                          Image {index + 1}
                        </span>
                      </>
                    )}
                  </label>
                ))}
              </div>
              {loading && <div className={styles.slotProcessingOverlay} role="status" aria-live="polite">
                <div className={styles.slotScanBeam}/>
                <div className={styles.slotProcessingMessage}><FiLoader size={19}/><strong>Analyzing and enrolling faces</strong><span>Reading images and building secure face records...</span></div>
              </div>}
              </div>

              <p style={{ fontSize: 12, color: "var(--white-30)", marginTop: 12 }}>
                <FiInfo size={13} /> Tip: Use photos from different angles and lighting for best accuracy, JPG or PNG only.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 14,
                opacity: loading ? 0.7 : 1,
                marginTop: 8,
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <FiLoader size={18} style={{ animation: "spin-slow 1s linear infinite" }} />
                  Enrolling face...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <FiShield size={18} /> Enroll Face
                </span>
              )}
            </button>
          </form>
        </div>

        {/* ── Right: Preview ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Image preview */}
          <div style={{
            padding: "24px",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            backdropFilter: "blur(16px)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>
              Image Preview
            </div>
            <div style={{
              aspectRatio: "4/3",
              background: "var(--white-5)",
              border: "1px dashed var(--border-2)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {selectedSlots.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        style={{
                          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                          width: 32, height: 32, background: "var(--navy-3)", border: "1px solid var(--border-2)",
                          borderRadius: "50%", color: "var(--white)", fontSize: 16, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >‹</button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        style={{
                          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                          width: 32, height: 32, background: "var(--navy-3)", border: "1px solid var(--border-2)",
                          borderRadius: "50%", color: "var(--white)", fontSize: 16, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >›</button>
                      <div style={{
                        position: "absolute", bottom: 10,
                        background: "var(--navy-3)", color: "var(--white)",
                        fontSize: 12, padding: "4px 10px", borderRadius: 999,
                      }}>
                        {previewIndex + 1} / {selectedSlots.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--white-30)" }}>
                  <FiCamera size={36} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12 }}>Preview appears here</div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{
            padding: "20px",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)",
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue-2)", marginBottom: 14 }}>
              <FiClipboard size={14} /> Enrollment Tips
            </div>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              padding: 10, marginBottom: 12,
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(212, 138, 10, 0.3)",
              borderRadius: 10, fontSize: 12, color: "#c36406", lineHeight: 1.5,
            }}>
              <FiAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Each image must be 100 KB or smaller. Larger files will be rejected.
            </div>
            {[
              "Use clear, front-facing photos",
              "Ensure good lighting on the face",
              "Avoid heavy shadows or sunglasses",
              "Different angles improve accuracy",
              "Minimum 1 image, maximum 6",
            ].map(tip => (
              <div key={tip} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                fontSize: 12, color: "var(--white-60)",
                marginBottom: 8, lineHeight: 1.5,
              }}>
                <FiArrowRight size={13} style={{ color: "var(--blue-2)", flexShrink: 0, marginTop: 1 }} />
                {tip}
              </div>
            ))}
          </div>

          {/* Fields summary */}
          {(fullName || matricNumber) && (
            <div style={{
              padding: "20px",
              background: "rgba(6,182,212,0.06)",
              border: "1px solid rgba(6,182,212,0.15)",
              borderRadius: 16,
              animation: "fadeIn 0.3s ease",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", marginBottom: 12 }}>
                User's Summary
              </div>
              {[
                { label: "Name", value: fullName },
                { label: "Gender", value: gender },
                { label: "Program", value: program },
                { label: "ID", value: matricNumber },
                { label: "Photos", value: selectedSlots.length ? `${selectedSlots.length} uploaded` : "None yet" },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{
                  display: "flex", justifyContent: "space-between", fontSize: 12,
                  color: "var(--white-60)", marginBottom: 6,
                }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--white)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Enroll;
