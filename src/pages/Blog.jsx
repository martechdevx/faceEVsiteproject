import { useState } from "react";
import { Link } from "react-router-dom";
import { FaCode, FaLock, FaBook, FaChartLine, FaShieldAlt, FaImage, FaBell } from "react-icons/fa";

const posts = [
  {
    id: 1,
    tag: "Technology",
    tagColor: "var(--blue-2)",
    title: "How FAISS Powers Our Sub-Second Face Search",
    excerpt:
      "Facebook AI Similarity Search (FAISS) allows us to search millions of face embeddings in milliseconds. Here's how we use it under the hood to make verification instant, even as your enrolled database grows.",
    date: "Aug 2025",
    readTime: "5 min read",
    icon: FaCode,
  },
  {
    id: 2,
    tag: "Security",
    tagColor: "var(--cyan)",
    title: "Why We Use HMAC Signatures on Every Request",
    excerpt:
      "Every API call in FaceIO is signed with an HMAC-SHA256 signature and a timestamp. This prevents replay attacks and ensures that even if a token is intercepted, it cannot be reused.",
    date: "Jul 2025",
    readTime: "4 min read",
    icon: FaLock,
  },
  {
    id: 3,
    tag: "Education",
    tagColor: "#a78bfa",
    title: "Face Enrollment in Schools: A Practical Guide",
    excerpt:
      "Attendance fraud and access control are real challenges for campuses. This guide walks through best practices for deploying face enrollment at scale — from photo quality requirements to managing staff vs student roles.",
    date: "Jun 2025",
    readTime: "7 min read",
    icon: FaBook,
  },
  {
    id: 4,
    tag: "Product",
    tagColor: "var(--green)",
    title: "Understanding Similarity Scores in Face Matching",
    excerpt:
      "When a verification runs, we return a similarity score between 0–100%. Learn what these numbers mean, how we calculate them from cosine distance, and how to interpret low vs high confidence results.",
    date: "Jun 2025",
    readTime: "4 min read",
    icon: FaChartLine,
  },
  {
    id: 5,
    tag: "Privacy",
    tagColor: "#f59e0b",
    title: "We Store Vectors, Not Photos — Here's Why That Matters",
    excerpt:
      "FaceIO doesn't store raw face images in a relational database. Instead, we store mathematical embeddings. Even if the vector index were compromised, it cannot be reversed into a recognizable face.",
    date: "May 2025",
    readTime: "6 min read",
    icon: FaShieldAlt,
  },
  {
    id: 6,
    tag: "Guide",
    tagColor: "#fb923c",
    title: "Image Quality Tips for Best Enrollment Results",
    excerpt:
      "Poor image quality is the top reason for false negatives at verification time. This post covers lighting, angle, resolution, and background recommendations to get the most accurate embeddings from your enrollment photos.",
    date: "Apr 2025",
    readTime: "3 min read",
    icon: FaImage,
  },
];

function PostCard({ post, featured = false }) {
  const [hovered, setHovered] = useState(false);
  const IconComponent = post.icon;

  if (featured) {
    return (
      <div
        style={{
          padding: "36px",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          backdropFilter: "blur(16px)",
          display: "flex",
          gap: 36,
          alignItems: "center",
          flexWrap: "wrap",
          cursor: "pointer",
          transition: "all 0.3s ease",
          borderColor: hovered ? "rgba(37,99,235,0.4)" : "var(--border)",
          boxShadow: hovered ? "0 20px 60px rgba(37,99,235,0.12)" : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div style={{
          width: 120, height: 120, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(6,182,212,0.2))",
          border: "1px solid rgba(37,99,235,0.3)",
          borderRadius: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 54,
          animation: "float 6s ease-in-out infinite",
          color: "var(--blue-2)",
        }}>
          <IconComponent size={48} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: "3px 10px",
              background: post.tagColor + "18",
              border: `1px solid ${post.tagColor}35`,
              borderRadius: 999,
              color: post.tagColor,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}>
              {post.tag}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: "3px 8px",
              background: "var(--surface-soft)",
              borderRadius: 999,
              color: "var(--white-60)",
            }}>
              Featured
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(20px, 2.5vw, 26px)",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--white)",
            lineHeight: 1.25,
            marginBottom: 12,
          }}>
            {post.title}
          </h2>
          <p style={{
            fontSize: 15, color: "var(--white-60)",
            lineHeight: 1.7, marginBottom: 20,
          }}>
            {post.excerpt}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "var(--white-30)" }}>{post.date}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--white-30)" }} />
            <span style={{ fontSize: 12, color: "var(--white-30)" }}>{post.readTime}</span>
            <span style={{
              marginLeft: "auto",
              fontSize: 13, fontWeight: 600,
              color: "var(--blue-2)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              Read article
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        backdropFilter: "blur(16px)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        borderColor: hovered ? `${post.tagColor}44` : "var(--border)",
        boxShadow: hovered ? `0 16px 40px ${post.tagColor}12` : "none",
        transform: hovered ? "translateY(-3px)" : "none",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: "3px 10px",
          background: post.tagColor + "15",
          border: `1px solid ${post.tagColor}30`,
          borderRadius: 999,
          color: post.tagColor,
          textTransform: "uppercase",
          letterSpacing: "0.8px",
        }}>
          {post.tag}
        </span>
        <div style={{
          width: 40, height: 40,
          background: "var(--surface-soft)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          color: post.tagColor,
        }}>
          <IconComponent size={20} />
        </div>
      </div>

      <h3 style={{
        fontSize: 16, fontWeight: 700,
        fontFamily: "var(--font-display)",
        color: "var(--white)", lineHeight: 1.35,
        marginBottom: 10, flex: 1,
      }}>
        {post.title}
      </h3>
      <p style={{
        fontSize: 13, color: "var(--white-60)",
        lineHeight: 1.65, marginBottom: 18,
      }}>
        {post.excerpt.slice(0, 120)}…
      </p>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 14,
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--white-30)" }}>{post.date}</span>
          <span style={{ fontSize: 11, color: "var(--white-30)" }}>· {post.readTime}</span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: post.tagColor,
          display: "flex", alignItems: "center", gap: 3,
        }}>
          Read
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
    </div>
  );
}

function Blog() {
  const [activeTag, setActiveTag] = useState("All");
  const tags = ["All", "Technology", "Security", "Education", "Product", "Privacy", "Guide"];

  const filtered = activeTag === "All"
    ? posts
    : posts.filter(p => p.tag === activeTag);

  return (
    <div style={{
      minHeight: "calc(100vh - var(--nav-h))",
      padding: "60px clamp(20px, 6vw, 80px)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64, animation: "fadeUp 0.5s ease both" }}>
        <div style={{
          display: "inline-block",
          fontSize: 12, fontWeight: 700, letterSpacing: "2px",
          color: "var(--cyan)", textTransform: "uppercase",
          marginBottom: 16,
        }}>
          FACEIO BLOG
        </div>
        <h1 style={{
          fontSize: "clamp(30px, 5vw, 54px)",
          fontWeight: 900,
          fontFamily: "var(--font-display)",
          lineHeight: 1.1,
          marginBottom: 16,
        }}>
          Insights on{" "}
          <span style={{
            background: "linear-gradient(135deg, var(--blue-2), var(--cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Face Recognition
          </span>
        </h1>
        <p style={{
          fontSize: 17, color: "var(--white-60)",
          maxWidth: 480, margin: "0 auto",
          lineHeight: 1.7,
        }}>
          Deep dives into the technology, security practices, and real-world applications
          powering the FaceIO platform.
        </p>
      </div>

      {/* Tag filter */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 48,
        animation: "fadeUp 0.5s ease 0.08s both",
      }}>
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 13, fontWeight: 600,
              border: "1.5px solid",
              borderColor: activeTag === tag ? "var(--blue-2)" : "var(--border)",
              background: activeTag === tag ? "rgba(37,99,235,0.15)" : "transparent",
              color: activeTag === tag ? "var(--blue-2)" : "var(--white-60)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Featured post */}
      {activeTag === "All" && (
        <div style={{ marginBottom: 32, animation: "fadeUp 0.5s ease 0.12s both" }}>
          <PostCard post={posts[0]} featured />
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 20,
        animation: "fadeUp 0.5s ease 0.18s both",
      }}>
        {(activeTag === "All" ? filtered.slice(1) : filtered).map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Newsletter CTA */}
      <div style={{
        marginTop: 80,
        padding: "48px",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        backdropFilter: "blur(16px)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        animation: "fadeUp 0.5s ease 0.25s both",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "60%", height: "200%",
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 32, marginBottom: 16, color: "var(--blue-2)" }}>
            <FaBell size={32} />
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--white)", marginBottom: 10,
          }}>
            More posts coming soon
          </h2>
          <p style={{ fontSize: 15, color: "var(--white-60)", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
            We publish new articles on face recognition, security, and campus technology
            regularly. Check back for the latest post.
          </p>
          {/* <Link to="/signup" className="btn btn-primary" style={{ padding: "12px 28px" }}>
            Get Started with FaceIO
          </Link> */}  
        </div>
      </div>
    </div>
  );
}

export default Blog;