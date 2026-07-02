import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiVerify } from "../../services/api.js";
import styles from "./Verify.module.css";


function Verify() {
  const { isLoggedIn } = useAuth();
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  if (!isLoggedIn) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateBox}>
          <h2>Access Restricted</h2>
          <p>You need to be logged in to verify a face.</p>
          <Link to="/login" className={styles.gateBtn}>Go to Login</Link>
        </div>
      </div>
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };

  const handleVerify = async () => {
    if (!imageFile) { setError("Please select an image first."); return; }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await apiVerify(imageFile);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.container}>
        <h1 className={styles.title}>Face Verification</h1>
        <p className={styles.subtitle}>Upload a face image to search against the enrolled database</p>

        <div className={styles.grid}>
          {/* ── Left: Upload ── */}
          <div className={styles.uploadCard}>
            <div className={styles.previewBox}>
              {preview ? (
                <img src={preview} alt="Query face" className={styles.previewImg} />
              ) : (
                <div className={styles.previewPlaceholder}>
                  <span>🔍</span>
                  <p>Upload a face image to verify</p>
                </div>
              )}
            </div>

            <label className={styles.fileLabel}>
              <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} hidden />
              📂 Choose Image
            </label>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <button
              className={styles.verifyBtn}
              onClick={handleVerify}
              disabled={loading || !imageFile}
            >
              {loading ? "Searching..." : "🔎 Verify Face"}
            </button>
          </div>

          {/* ── Right: Result ── */}
          <div className={styles.resultCard}>
            {!result && !loading && (
              <div className={styles.resultPlaceholder}>
                <span>📋</span>
                <p>Verification result will appear here</p>
              </div>
            )}

            {loading && (
              <div className={styles.resultPlaceholder}>
                <span className={styles.spinner}>⏳</span>
                <p>Searching through enrolled faces...</p>
              </div>
            )}

            {result && (
              <>
                {/* Match status banner */}
                <div className={result.match_found ? styles.matchBanner : styles.noMatchBanner}>
                  {result.match_found ? "✅ Match Found" : "❌ No Match Found"}
                </div>

                <p className={styles.resultMessage}>{result.message}</p>

                {result.match_found && result.best_match && (
                  <div className={styles.matchDetails}>
                    {/* Enrolled face image */}
                    <img
                      src={result.best_match.image_url}
                      alt="Enrolled face"
                      className={styles.enrolledImg}
                    />

                    <div className={styles.matchInfo}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Full Name</span>
                        <span className={styles.infoValue}>{result.best_match.full_name}</span>
                      </div>
                      {result.best_match.matric_number && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Matric No.</span>
                          <span className={styles.infoValue}>{result.best_match.matric_number}</span>
                        </div>
                      )}
                      {result.best_match.gender && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Gender</span>
                          <span className={styles.infoValue}>{result.best_match.gender}</span>
                        </div>
                      )}
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Similarity</span>
                        <span className={styles.similarityScore}>
                          {result.best_match.similarity_score}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Verify;