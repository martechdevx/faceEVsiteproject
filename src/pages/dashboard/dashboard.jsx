import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Dashboard.module.css";

const Dashboard = () => {
	const [stats, setStats] = useState({ faces: 0, verified: 0 });

	useEffect(() => {
		// Replace with real data fetches when available
		const fetchStats = () => {
			setTimeout(() => {
				setStats({ faces: 128, verified: 542 });
			}, 300);
		};
		fetchStats();
	}, []);

	return (
		<div className={styles.pageWrap}>
			<header className={styles.header}>
				<h1 className={styles.title}>Dashboard</h1>
				<p className={styles.subtitle}>Overview of face enrollments and verification activity</p>
			</header>

			<section className={styles.grid}>
				<div className={styles.card}>
					<div className={styles.cardHeader}>Total Enrolled Faces</div>
					<div className={styles.cardBody}>
						<span className={styles.large}>{stats.faces.toLocaleString()}</span>
						<span className={styles.muted}>Registered across all galleries</span>
					</div>
				</div>

				<div className={styles.card}>
					<div className={styles.cardHeader}>Total Face Verified Performed</div>
					<div className={styles.cardBody}>
						<span className={styles.large}>{stats.verified.toLocaleString()}</span>
						<span className={styles.muted}>Verification done by users</span>
					</div>
				</div>

				<div className={styles.quickAccess}>
					<div className={styles.qaHeader}>Quick Access</div>
					<div className={styles.qaButtons}>
						<Link to="/enrollment" className={styles.buttonPrimary}>
							Enroll Face
						</Link>
						<Link to="/verification" className={styles.buttonOutline}>
							Verify Face
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Dashboard;

