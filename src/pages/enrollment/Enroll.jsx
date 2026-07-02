import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiEnroll } from "../../services/api";
import styles from "./Enroll.module.css";

function Enroll() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [program, setProgram] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [imageSlots, setImageSlots] = useState(Array(6).fill(null));
  const [preview, setPreview] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  if (!isLoggedIn) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateBox}>
          <h2>Access Restricted</h2>
          <p>You need to be logged in to enroll a face.</p>
          <Link to="/login" className={styles.gateBtn}>Go to Login</Link>
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

        if (!ctx) {
          reject(new Error("Unable to read image preview."));
          return;
        }

        const size = Math.min(img.width, img.height, 240);
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const { data } = ctx.getImageData(0, 0, size, size);
        let gray = 0;
        let variance = 0;

        for (let i = 0; i < data.length; i += 4) {
          gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          variance += gray * gray;
        }

        const average = variance / (data.length / 4);
        if (average < 0.05) {
          reject(new Error(`Image ${index + 1} looks blurry. Please upload a clearer face photo for that slot.`));
          return;
        }

        resolve();
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read the selected image."));
      };

      img.src = objectUrl;
    });

  const handleSlotChange = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png"].includes(ext || "")) {
      setError("Please upload a JPG or PNG image.");
      return;
    }

    try {
      await validateImageQuality(file, index);

      const updatedSlots = [...imageSlots];
      if (updatedSlots[index]) {
        URL.revokeObjectURL(updatedSlots[index].previewUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      updatedSlots[index] = { file, previewUrl };
      setImageSlots(updatedSlots);

      const currentIndex = updatedSlots.filter(Boolean).findIndex((slot) => slot.previewUrl === previewUrl);
      setPreview(previewUrl);
      setPreviewIndex(currentIndex >= 0 ? currentIndex : 0);
      setSuccess(null);
      setError("");
    } catch (err) {
      setError(err.message || "The image looks blurry. Please upload a clear face photo.");
    }
  };

  const handleRemoveSlot = (index) => {
    const updatedSlots = [...imageSlots];
    if (updatedSlots[index]) {
      URL.revokeObjectURL(updatedSlots[index].previewUrl);
    }
    updatedSlots[index] = null;
    setImageSlots(updatedSlots);

    const remainingSlots = updatedSlots.filter(Boolean);
    setPreview(remainingSlots[0]?.previewUrl || null);
    setPreviewIndex(0);
  };

  const handlePrevImage = () => {
    if (selectedSlots.length <= 1) return;
    const newIndex = previewIndex === 0 ? selectedSlots.length - 1 : previewIndex - 1;
    setPreviewIndex(newIndex);
    setPreview(selectedSlots[newIndex].previewUrl);
  };

  const handleNextImage = () => {
    if (selectedSlots.length <= 1) return;
    const newIndex = (previewIndex + 1) % selectedSlots.length;
    setPreviewIndex(newIndex);
    setPreview(selectedSlots[newIndex].previewUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFiles = imageSlots.filter(Boolean).map((slot) => slot.file);

    if (!selectedFiles.length) {
      setError("Please select at least one face image.");
      return;
    }

    setError("");
    setSuccess(null);
    setLoading(true);
    try {
      const result = await apiEnroll(fullName, gender, program, matricNumber, selectedFiles);
      const count = Array.isArray(result) ? result.length : 1;
      setSuccess(`Enrolled ${count} image${count > 1 ? "s" : ""} successfully.`);
      setFullName("");
      setGender("");
      setProgram("");
      setMatricNumber("");
      setImageSlots(Array(6).fill(null));
      setPreview(null);
      setPreviewIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.container}>
        <h1 className={styles.title}>Face Enrollment</h1>
        <p className={styles.subtitle}>Register a new face into the system</p>

        <div className={styles.formGrid}>
          {/* ── Left: Form ── */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.errorMsg}>{error}</div>}

            {success && <div className={styles.successMsg}>✅ {success}</div>}

            <div className={styles.field}>
              <label>Full Name *</label>
              <input
                type="text" placeholder="e.g. John Doe" required
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label>Gender *</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.field}>
              <label> Program * </label>
              <select value={program} onChange={(e) => setProgram(e.target.value)} required> 
                <option value=""> Select Program</option>
                <option value="Staff"> Staff</option>
                <option value="Student"> Student</option>
                <option value="Other"> Other</option>
              </select> 
            </div>
            <div className={styles.field}>
              <label>Matric Number / ID *</label>
              <input
                type="text" placeholder="e.g. CSC/2021/001" required
                value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label>Face Images *</label>
              <div className={styles.slotGrid}>
                {imageSlots.map((slot, index) => (
                  <label key={index} className={`${styles.slotBox} ${slot ? styles.slotFilled : ""}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      onChange={(e) => handleSlotChange(index, e)}
                    />
                    {slot ? (
                      <>
                        <img src={slot.previewUrl} alt={`Selected ${index + 1}`} className={styles.slotPreview} />
                        <div className={styles.slotMeta}>
                          <span className={styles.slotLabel}>Image {index + 1}</span>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveSlot(index);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={styles.slotIcon}>＋</span>
                        <span className={styles.slotLabel}>Image {index + 1}</span>
                        <small className={styles.slotHint}>Tap to upload</small>
                      </>
                    )}
                  </label>
                ))}
              </div>
              <small>Upload up to 6 clear face photos. Each box is a separate slot.</small>
              <span className={styles.helperText}>{selectedSlots.length ? `${selectedSlots.length} image${selectedSlots.length > 1 ? "s" : ""} ready` : "Choose up to 6 images"}</span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Enrolling..." : "Enroll Face"}
            </button>
          </form>

          {/* ── Right: Image Preview ── */}
          <div className={styles.previewBox}>
            {preview ? (
              <>
                <img src={preview} alt="Preview" className={styles.previewImg} />
                {selectedSlots.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.navArrowLeft}
                      onClick={handlePrevImage}
                      aria-label="Previous image"
                    >
                      ❮
                    </button>
                    <button
                      type="button"
                      className={styles.navArrowRight}
                      onClick={handleNextImage}
                      aria-label="Next image"
                    >
                      ❯
                    </button>
                    <div className={styles.imageCounter}>
                      {previewIndex + 1} / {imageSlots.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={styles.previewPlaceholder}>
                <span>📷</span>
                <p>Image preview will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Enroll;