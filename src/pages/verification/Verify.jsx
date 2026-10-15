import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiAdminVerify, apiVerify } from "../../services/api.js";
import {
  FiUploadCloud, FiAlertTriangle, FiCheckCircle, FiXCircle,
  FiShield, FiSearch, FiRefreshCw, FiInfo, FiX, FiLoader,
} from "react-icons/fi";
import styles from "./Verify.module.css";

function Verify({ adminMode = false }) {
  const { isLoggedIn } = useAuth();
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef(null);

  if (!isLoggedIn) {
    return (
      <div className={styles.page} style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ maxWidth:440, width:"100%", textAlign:"center", padding:"60px 40px", background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", backdropFilter:"blur(20px)", animation:"fadeUp 0.5s ease both" }}>
          <div style={{ width:72, height:72, margin:"0 auto 28px", background:"linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.2))", border:"1px solid rgba(37,99,235,0.3)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <FiSearch size={32} color="#60a5fa"/>
          </div>
          <h2 style={{ fontSize:26, fontFamily:"var(--font-display)", fontWeight:800, color:"white", marginBottom:12 }}>Access Restricted</h2>
          <p style={{ fontSize:15, color:"var(--white-60)", marginBottom:32 }}>Log in to run face verification.</p>
          <Link to="/login" className={styles.btnPrimary} style={{ display:"inline-flex", justifyContent:"center", padding:"12px 28px" }}>
            <FiShield size={15}/> Log In
          </Link>
        </div>
      </div>
    );
  }

  const pick = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg","jpeg","png"].includes(ext||"")) { setError("Please upload a JPG or PNG image."); return; }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null); setError("");
  };

  const reset = () => { setImageFile(null); setPreview(null); setResult(null); setError(""); };

  const verify = async () => {
    if (!imageFile) { setError("Please select a face image first."); return; }
    setError(""); setResult(null); setLoading(true);
    try { setResult(await (adminMode ? apiAdminVerify(imageFile) : apiVerify(imageFile))); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const scoreColor = (s) => s >= 85 ? "#10b981" : s >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className={adminMode ? styles.adminPageEmbedded : styles.page}>
      {!adminMode && (
        <>
          <div className={styles.breadcrumb}>
            <Link to="/dashboard" className={styles.breadHome}>Dashboard</Link>
            <span className={styles.breadSep}>›</span>
            <span className={styles.breadCurrent}>Verification</span>
          </div>
          <h1 className={styles.title}>Face Verification</h1>
        </>
      )}
      <p className={styles.sub}>
        {adminMode
          ? "Upload a photo to search across every enrolled face. The closest match and similarity score will be shown."
          : "Upload a photo to compare it with your enrolled face photos. The closest match and similarity score will be shown."}
      </p>

      <div className={styles.grid}>
        {/* Left */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Upload Face Image</div>
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""} ${preview ? styles.dropZoneHasImage : ""} ${loading ? styles.dropZoneSearching : ""}`}
              aria-busy={loading}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
            >
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={e => pick(e.target.files[0])}/>
              {preview
                ? <img src={preview} alt="Query" className={styles.dropImage}/>
                : <>
                    <div className={styles.dropIcon}><FiUploadCloud size={40}/></div>
                    <div className={`${styles.dropTitle} ${dragOver ? styles.dropTitleActive : ""}`}>
                      {dragOver ? "Drop image here" : "Drag & drop or click to upload"}
                    </div>
                    <div className={styles.dropHint}>JPG, PNG supported</div>
                  </>
              }
              {loading && (
                <div className={styles.searchingOverlay} role="status" aria-live="polite">
                  <div className={styles.searchingBeam}/>
                  <div className={styles.searchingMessage}>
                    <FiLoader size={19}/>
                    <strong>{adminMode ? "Searching all enrolled faces..." : "Searching your enrolled faces..."}</strong>
                    {/* <span>Comparing against the face index...</span> */}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.btnRow}>
              <button onClick={() => fileRef.current?.click()} className={styles.btnGhost} style={{ flex:1 }}>
                <FiUploadCloud size={14}/> {preview ? "Change Image" : "Choose File"}
              </button>
              {preview && (
                <button onClick={reset} className={styles.btnDanger}><FiX size={14}/> Clear</button>
              )}
            </div>
          </div>

          {error && <div className={styles.alertError}><FiAlertTriangle size={14}/> {error}</div>}

          <button
            onClick={verify}
            disabled={loading || !imageFile}
            className={`${styles.btnPrimary} ${styles.btnFull}`}
          >
            {loading
              ? <><div className={styles.spinner} style={{ width:16, height:16, marginRight:0 }}/> {adminMode ? "Searching all enrolled faces..." : "Searching your enrolled faces..."}</>
              : <><FiSearch size={16}/> Run Verification</>}
          </button>

          <div className={styles.howBox}>
            <div className={styles.howTitle}><FiInfo size={13}/> How Verification Works</div>
            {[
              ["Upload","Add a clear photo of the person to check"],
              ["Encode","The AI converts the face into a vector fingerprint"],
              ["Search", adminMode ? "FAISS searches all enrolled face vectors" : "Search your enrolled face photos"],
              ["Match","The closest match and similarity score is returned"],
            ].map(([step, desc]) => (
              <div key={step} className={styles.howRow}>
                <span className={styles.howTag}>{step}</span>
                <span className={styles.howText}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Result */}
        <div className={`${styles.card} ${styles.cardFlex}`}>
          <div className={styles.cardTitle}>Verification Result</div>

          {!result && !loading && (
            <div className={styles.emptyState}>
              <FiSearch size={48} strokeWidth={1}/>
              <div>
                <div className={styles.emptyTitle}>No result yet</div>
                <div className={styles.emptyHint}>Upload an image and run verification to see matches</div>
              </div>
            </div>
          )}

          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}/>
              <div>
                <div className={styles.loadingTitle}>{adminMode ? "Searching all enrolled faces..." : "Searching your enrolled faces..."}</div>
                <div className={styles.loadingHint}>Comparing against FAISS index</div>
              </div>
            </div>
          )}

          {result && (
            <div className={styles.resultAnim}>
              <div className={`${styles.matchBanner} ${result.match_found ? styles.matchBannerSuccess : styles.matchBannerFail}`}>
                <div className={`${styles.matchBannerIcon} ${result.match_found ? styles.matchBannerIconSuccess : styles.matchBannerIconFail}`}>
                  {result.match_found ? <FiCheckCircle size={20} color="#6ee7b7"/> : <FiXCircle size={20} color="#f87171"/>}
                </div>
                <div>
                  <div className={`${styles.matchBannerLabel} ${result.match_found ? styles.matchBannerLabelSuccess : styles.matchBannerLabelFail}`}>
                    {result.match_found ? "Match Found" : "No Match Found"}
                  </div>
                  <div className={styles.matchBannerMsg}>{result.message}</div>
                </div>
              </div>

              {result.match_found && result.best_match && (
                <>
                  <div className={styles.matchDetail}>
                    <img
                      src={`data:image/jpeg;base64,${result.best_match.image_base64}`}
                      alt="Enrolled face"
                      className={styles.matchImg}
                    />
                    <div>
                      <div className={styles.matchName}>{result.best_match.full_name}</div>
                      <div className={styles.matchBadges}>
                        {result.best_match.program && <span className={styles.matchBadge}>{result.best_match.program}</span>}
                        {result.best_match.gender && <span className={styles.matchSubtext}>{result.best_match.gender}</span>}
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailTable}>
                    {[
                      { k:"Full Name",  v:result.best_match.full_name },
                      result.best_match.matric_number && { k:"Matric No.", v:result.best_match.matric_number },
                      result.best_match.gender  && { k:"Gender",  v:result.best_match.gender },
                      result.best_match.program && { k:"Program", v:result.best_match.program },
                    ].filter(Boolean).map(r => (
                      <div key={r.k} className={styles.detailRow}>
                        <span className={styles.detailKey}>{r.k}</span>
                        <span className={styles.detailVal}>{r.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.scoreBox} style={{
                    background: scoreColor(result.best_match.similarity_score) + "10",
                    border:`1.5px solid ${scoreColor(result.best_match.similarity_score)}33`,
                  }}>
                    <div className={styles.scoreTop}>
                      <span className={styles.scoreLabel}>Similarity Score</span>
                      <span className={styles.scoreValue} style={{ color:scoreColor(result.best_match.similarity_score) }}>
                        {result.best_match.similarity_score}%
                      </span>
                    </div>
                    <div className={styles.scoreBar}>
                      <div className={styles.scoreBarFill} style={{
                        width:`${result.best_match.similarity_score}%`,
                        background:`linear-gradient(90deg,${scoreColor(result.best_match.similarity_score)}88,${scoreColor(result.best_match.similarity_score)})`,
                      }}/>
                    </div>
                    <div className={styles.scoreHint}>
                      {result.best_match.similarity_score >= 85 ? "High confidence match" :
                       result.best_match.similarity_score >= 70 ? "Moderate confidence — review recommended" :
                       "Low confidence — manual verification advised"}
                    </div>
                  </div>
                </>
              )}

              <button onClick={reset} className={`${styles.btnGhost} ${styles.resetBtn}`}>
                <FiRefreshCw size={14}/> Run Another Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Verify;