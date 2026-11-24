import React, { useState, useEffect } from 'react';
import './App.css';
import hostelLaundryImg from './assets/hostel-laundry-bg.jpg';
import cartoonWasherImg from './assets/cartoon-washing-machine.png';
import StudentDashboard from './components/StudentDashboard';
import StaffDashboard from './components/StaffDashboard';
import { apiRequest, setSessionToken, clearSession, getToken } from './utils/laundryStore';

const USER_KEY = 'hostel_laundry_user';

function readSavedUser() {
  try {
    if (!getToken()) return null;
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

// Map the API's user object to the shape the dashboards expect
function toActiveUser(apiUser, mode, extra = {}) {
  if (apiUser.role === 'staff') {
    return {
      role: 'admin',
      identifier: apiUser.identifier,
      name: apiUser.name,
      designation: extra.designation || 'Facility Supervisor',
      mode
    };
  }
  return {
    role: 'student',
    cardId: apiUser.cardId || apiUser.identifier,
    identifier: apiUser.usn || apiUser.identifier,
    name: apiUser.name,
    room: apiUser.room,
    mode
  };
}

export default function App() {
  // Roles and Navigation State
  const [activeRole, setActiveRole] = useState('student'); // 'student' | 'admin'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [activeUser, setActiveUser] = useState(readSavedUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCycleActive, setIsCycleActive] = useState(false);

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Fields - Student (Pre-configured for demo Card ID: 1077)
  const [studentId, setStudentId] = useState('1077');
  const [studentPassword, setStudentPassword] = useState('password123');
  const [studentRegisterUsn, setStudentRegisterUsn] = useState('');
  const [studentRegisterPassword, setStudentRegisterPassword] = useState('');
  const [studentRegisterConfirmPassword, setStudentRegisterConfirmPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRoom, setStudentRoom] = useState('');

  // Form Fields - Admin
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRegisterEmpId, setAdminRegisterEmpId] = useState('');
  const [adminRegisterPassword, setAdminRegisterPassword] = useState('');
  const [adminRegisterConfirmPassword, setAdminRegisterConfirmPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRoleTitle, setAdminRoleTitle] = useState('Hostel Laundry Supervisor');

  // Form Status Feedback
  const [formError, setFormError] = useState('');

  const finishLogin = (data, mode, extra) => {
    const user = toActiveUser(data.user, mode, extra);
    setSessionToken(data.token);
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* storage unavailable */ }
    setActiveUser(user);
  };

  // Handle Form Submission (talks to the Express API)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    try {
      if (activeRole === 'student') {
        if (authMode === 'login') {
          if (!studentId.trim()) {
            setFormError('Please enter your Permanent Card ID or USN.');
            return;
          }
          if (!studentPassword) {
            setFormError('Please enter your password.');
            return;
          }
          setIsSubmitting(true);
          const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: { role: 'student', identifier: studentId.trim(), password: studentPassword }
          });
          finishLogin(data, 'Logged In');
        } else {
          if (!studentRegisterUsn.trim()) {
            setFormError('Please enter your Permanent Card ID or University Seat Number (USN).');
            return;
          }
          if (!studentRegisterPassword) {
            setFormError('Please create a password.');
            return;
          }
          if (studentRegisterPassword.length < 6) {
            setFormError('Password must contain at least 6 characters.');
            return;
          }
          if (studentRegisterPassword !== studentRegisterConfirmPassword) {
            setFormError('Passwords do not match. Please verify.');
            return;
          }
          setIsSubmitting(true);
          const id = studentRegisterUsn.trim();
          const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: {
              cardId: /^\d+$/.test(id) ? id : undefined,
              usn: /^\d+$/.test(id) ? undefined : id,
              name: studentName.trim(),
              room: studentRoom.trim(),
              password: studentRegisterPassword
            }
          });
          finishLogin(data, 'Account Created');
        }
      } else if (authMode === 'login') {
        if (!adminEmployeeId.trim()) {
          setFormError('Please enter your Employee ID.');
          return;
        }
        if (!adminPassword) {
          setFormError('Please enter your admin password.');
          return;
        }
        setIsSubmitting(true);
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: { role: 'staff', identifier: adminEmployeeId.trim(), password: adminPassword }
        });
        finishLogin(data, 'Logged In', { designation: adminRoleTitle });
      } else {
        // Staff accounts are provisioned by the facility, not self-registered
        setFormError('Staff accounts are created by the facility administrator. Please sign in with your Employee ID.');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    clearSession();
    try { localStorage.removeItem(USER_KEY); } catch { /* storage unavailable */ }
    setActiveUser(null);
    setIsCycleActive(false);
  };

  // If the server says the session expired, drop back to the sign-in screen
  useEffect(() => {
    const onExpired = () => {
      handleSignOut();
      setFormError('Your session expired. Please sign in again.');
    };
    window.addEventListener('laundry_session_expired', onExpired);
    return () => window.removeEventListener('laundry_session_expired', onExpired);
  }, []);

  const handleStartCycle = () => {
    setIsCycleActive(true);
  };

  // If user is authenticated, route directly to the designated role dashboard
  if (activeUser) {
    if (activeUser.role === 'student') {
      return <StudentDashboard activeUser={activeUser} onSignOut={handleSignOut} />;
    }
    return <StaffDashboard activeUser={activeUser} onSignOut={handleSignOut} />;
  }

  return (
    <div className="swiss-viewport">
      <main className="swiss-split-layout">
        {/* Full-width background image layer so the photograph extends seamlessly behind the translucent right panel */}
        <div className="swiss-bg-image-layer" aria-hidden="true">
          <img
            src={hostelLaundryImg}
            alt=""
            className="swiss-full-bg-image"
          />
        </div>

        {/* =========================================================================
            LEFT 70%: CLEAN HOSTEL LAUNDRY PHOTOGRAPH
            Anchored so "HOSTEL LAUNDRY" sign is completely visible
            ========================================================================= */}
        <section className="swiss-left-panel" aria-label="Hostel Laundry Facility">
          <div className="swiss-image-container">
            <img
              src={hostelLaundryImg}
              alt="Campus hostel laundry facility entrance and residents"
              className="swiss-featured-image"
            />
          </div>
        </section>

        {/* =========================================================================
            RIGHT 30%: TRANSLUCENT SWISS TYPOGRAPHIC AUTHENTICATION PORTAL
            Sampled colors: Terracotta brick, sandstone cream & architectural charcoal
            ========================================================================= */}
        <section className="swiss-right-panel" aria-label="Authentication Portal">
          {/* Top Header: Shifted to top, ALL CAPS, covering complete width of the white part */}
          <header className="swiss-header-top">
            <h1 className="swiss-page-heading">HOSTEL LAUNDRY OPERATIONS SYSTEM</h1>
          </header>

          <div className="swiss-auth-container">
            {/* ACTIVE SESSION DASHBOARD VIEW */}
            {activeUser ? (
              <div className="swiss-dashboard">
                <div className="swiss-status-banner">
                  <div className="swiss-status-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="swiss-status-title">
                      {activeUser.mode === 'Account Created' ? 'Account Created' : 'Session Active'}
                    </h2>
                    <p className="swiss-status-meta">
                      {activeUser.role === 'student' ? 'Student Resident' : 'Hostel Administrator'}
                    </p>
                  </div>
                </div>

                <div className="swiss-table-card">
                  <div className="swiss-table-row">
                    <span className="swiss-table-label">
                      {activeUser.role === 'student' ? 'USN' : 'Employee ID'}
                    </span>
                    <span className="swiss-table-value mono">{activeUser.identifier}</span>
                  </div>

                  {activeUser.name && (
                    <div className="swiss-table-row">
                      <span className="swiss-table-label">Name</span>
                      <span className="swiss-table-value">{activeUser.name}</span>
                    </div>
                  )}

                  {activeUser.room && (
                    <div className="swiss-table-row">
                      <span className="swiss-table-label">Room / Block</span>
                      <span className="swiss-table-value">{activeUser.room}</span>
                    </div>
                  )}

                  {activeUser.designation && (
                    <div className="swiss-table-row">
                      <span className="swiss-table-label">Designation</span>
                      <span className="swiss-table-value">{activeUser.designation}</span>
                    </div>
                  )}

                  <div className="swiss-table-row">
                    <span className="swiss-table-label">Facility Access</span>
                    <span className="swiss-status-tag">Active • Verified</span>
                  </div>
                </div>

                <div className="swiss-action-stack">
                  {isCycleActive ? (
                    <div className="swiss-active-cycle-card">
                      <div className="swiss-cycle-header">
                        <span className="swiss-cycle-pulse"></span>
                        <span className="swiss-cycle-title">Wash Cycle in Progress</span>
                      </div>
                      <p className="swiss-cycle-desc">Wash cycle active. Estimated time remaining: 35 minutes.</p>
                      <div className="swiss-progress-track">
                        <div className="swiss-progress-bar"></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="swiss-btn swiss-btn-primary full-width"
                      onClick={handleStartCycle}
                    >
                      Start Wash Cycle (35 Mins)
                    </button>
                  )}

                  <button
                    type="button"
                    className="swiss-btn swiss-btn-secondary full-width"
                    onClick={handleSignOut}
                  >
                    Sign Out / Switch User
                  </button>
                </div>
              </div>
            ) : (
              /* AUTHENTICATION PORTAL VIEW */
              <div className="swiss-auth-body">
                {/* 1. Role Selection Segmented Control */}
                <div className="swiss-segmented-control" role="tablist" aria-label="Select User Role">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeRole === 'student'}
                    className={`swiss-segment-btn ${activeRole === 'student' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveRole('student');
                      setFormError('');
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>
                    </svg>
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeRole === 'admin'}
                    className={`swiss-segment-btn ${activeRole === 'admin' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveRole('admin');
                      setFormError('');
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Admin / Staff</span>
                  </button>
                </div>

                {/* 2. Mode Selector: Sign In vs Create Account */}
                <div className="swiss-tabs-row" role="tablist" aria-label="Select Action">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'login'}
                    className={`swiss-tab-link ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMode('login');
                      setFormError('');
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'register'}
                    className={`swiss-tab-link ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMode('register');
                      setFormError('');
                    }}
                  >
                    Create Account
                  </button>
                </div>

                {/* Error Banner */}
                {formError && (
                  <div className="swiss-alert-error" role="alert">
                    <span className="swiss-alert-indicator"></span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* Form Controls */}
                <form className="swiss-form" onSubmit={handleSubmit}>
                  {/* ================= STUDENT FORMS ================= */}
                  {activeRole === 'student' && (
                    <>
                      {authMode === 'login' ? (
                        /* Student Login */
                        <div className="swiss-form-group-stack">
                          <div className="swiss-field">
                            <label htmlFor="student-id-input" className="swiss-label">
                              Permanent Card ID / USN <span className="req">*</span>
                            </label>
                            <input
                              id="student-id-input"
                              type="text"
                              className="swiss-input mono"
                              placeholder="1077"
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="student-pass-input" className="swiss-label">
                              Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="student-pass-input"
                                type={showPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Enter password"
                                value={studentPassword}
                                onChange={(e) => setStudentPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password view"
                              >
                                {showPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <div className="swiss-field-meta-action">
                            <button
                              type="button"
                              className="swiss-text-link"
                              onClick={() => alert('Password reset link sent to your student email.')}
                            >
                              Forgot Password?
                            </button>
                          </div>

                          <button
                            type="submit"
                            className="swiss-btn swiss-btn-primary full-width"
                          >
                            Sign In to Portal
                          </button>
                        </div>
                      ) : (
                        /* Student Registration */
                        <div className="swiss-form-group-stack">
                          <div className="swiss-field">
                            <label htmlFor="student-reg-usn" className="swiss-label">
                              University Seat Number (USN) <span className="req">*</span>
                            </label>
                            <input
                              id="student-reg-usn"
                              type="text"
                              className="swiss-input"
                              value={studentRegisterUsn}
                              onChange={(e) => setStudentRegisterUsn(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>

                          <div className="swiss-grid-two-col">
                            <div className="swiss-field">
                              <label htmlFor="student-reg-name" className="swiss-label">
                                Full Name
                              </label>
                              <input
                                id="student-reg-name"
                                type="text"
                                className="swiss-input"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                              />
                            </div>

                            <div className="swiss-field">
                              <label htmlFor="student-reg-room" className="swiss-label">
                                Room / Block
                              </label>
                              <input
                                id="student-reg-room"
                                type="text"
                                className="swiss-input"
                                placeholder="Wing 2 - Room 302"
                                value={studentRoom}
                                onChange={(e) => setStudentRoom(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="student-reg-pass" className="swiss-label">
                              Create Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="student-reg-pass"
                                type={showPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Minimum 6 characters"
                                value={studentRegisterPassword}
                                onChange={(e) => setStudentRegisterPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="student-reg-confirm" className="swiss-label">
                              Confirm Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="student-reg-confirm"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Re-type password"
                                value={studentRegisterConfirmPassword}
                                onChange={(e) => setStudentRegisterConfirmPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="swiss-btn swiss-btn-primary full-width"
                          >
                            Create Student Account
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ================= ADMIN FORMS ================= */}
                  {activeRole === 'admin' && (
                    <>
                      {authMode === 'login' ? (
                        /* Admin Login */
                        <div className="swiss-form-group-stack">
                          <div className="swiss-field">
                            <label htmlFor="admin-id-input" className="swiss-label">
                              Employee ID <span className="req">*</span>
                            </label>
                            <input
                              id="admin-id-input"
                              type="text"
                              className="swiss-input"
                              value={adminEmployeeId}
                              onChange={(e) => setAdminEmployeeId(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="admin-pass-input" className="swiss-label">
                              Admin Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="admin-pass-input"
                                type={showPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Enter admin password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <div className="swiss-field-meta-action">
                            <button
                              type="button"
                              className="swiss-text-link"
                              onClick={() => alert('Contact Hostel Warden / Campus IT for password reset.')}
                            >
                              Need Support?
                            </button>
                          </div>

                          <button
                            type="submit"
                            className="swiss-btn swiss-btn-primary full-width"
                          >
                            Sign In as Administrator
                          </button>
                        </div>
                      ) : (
                        /* Admin Registration */
                        <div className="swiss-form-group-stack">
                          <div className="swiss-field">
                            <label htmlFor="admin-reg-empid" className="swiss-label">
                              Employee ID <span className="req">*</span>
                            </label>
                            <input
                              id="admin-reg-empid"
                              type="text"
                              className="swiss-input"
                              value={adminRegisterEmpId}
                              onChange={(e) => setAdminRegisterEmpId(e.target.value)}
                              autoFocus
                              required
                            />
                          </div>

                          <div className="swiss-grid-two-col">
                            <div className="swiss-field">
                              <label htmlFor="admin-reg-name" className="swiss-label">
                                Staff Name
                              </label>
                              <input
                                id="admin-reg-name"
                                type="text"
                                className="swiss-input"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                              />
                            </div>

                            <div className="swiss-field">
                              <label htmlFor="admin-reg-role" className="swiss-label">
                                Designation / Role
                              </label>
                              <input
                                id="admin-reg-role"
                                type="text"
                                className="swiss-input"
                                value={adminRoleTitle}
                                onChange={(e) => setAdminRoleTitle(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="admin-reg-pass" className="swiss-label">
                              Create Admin Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="admin-reg-pass"
                                type={showPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Minimum 6 characters"
                                value={adminRegisterPassword}
                                onChange={(e) => setAdminRegisterPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <div className="swiss-field">
                            <label htmlFor="admin-reg-confirm" className="swiss-label">
                              Confirm Admin Password <span className="req">*</span>
                            </label>
                            <div className="swiss-password-wrap">
                              <input
                                id="admin-reg-confirm"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="swiss-input"
                                placeholder="Re-type password"
                                value={adminRegisterConfirmPassword}
                                onChange={(e) => setAdminRegisterConfirmPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="swiss-visibility-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? 'HIDE' : 'SHOW'}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="swiss-btn swiss-btn-primary full-width"
                          >
                            Register Admin Account
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </form>

                {/* Footer Switch Prompt */}
                <footer className="swiss-footer-switch">
                  {authMode === 'login' ? (
                    <p className="swiss-footer-text">
                      New resident or staff member?{' '}
                      <button
                        type="button"
                        className="swiss-switch-link"
                        onClick={() => {
                          setAuthMode('register');
                        }}
                      >
                        Create an account
                      </button>
                    </p>
                  ) : (
                    <p className="swiss-footer-text">
                      Already registered?{' '}
                      <button
                        type="button"
                        className="swiss-switch-link"
                        onClick={() => {
                          setAuthMode('login');
                        }}
                      >
                        Sign in to existing account
                      </button>
                    </p>
                  )}
                </footer>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
