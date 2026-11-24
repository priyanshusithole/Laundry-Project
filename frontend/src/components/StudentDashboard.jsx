import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { soundFx } from '../utils/audio';
import {
  LAUNDRY_STAGES,
  TOTAL_ANNUAL_WASHES,
  getStudentActiveBag,
  startStorePolling,
  getStudentHistory,
  getFacilityTraffic,
  getStudentWashQuota,
  findStudent,
  submitNewBag
} from '../utils/laundryStore';

export default function StudentDashboard({ activeUser, onSignOut }) {
  // Navigation Bar State: 'status' | 'history'
  const [currentPage, setCurrentPage] = useState('status');

  const [activeBag, setActiveBag] = useState(null);
  const [historyBags, setHistoryBags] = useState([]);
  const [trafficInfo, setTrafficInfo] = useState(getFacilityTraffic());
  const [washQuota, setWashQuota] = useState(() => 
    getStudentWashQuota(activeUser?.cardId || activeUser?.identifier || '1077')
  );
  const [selectedBagDetail, setSelectedBagDetail] = useState(null);
  const [showStudentQrModal, setShowStudentQrModal] = useState(false);
  const [studentQrDataUrl, setStudentQrDataUrl] = useState('');

  // Student Laundry Bag Submission Modal State
  const [showSubmitBagModal, setShowSubmitBagModal] = useState(false);
  const [submitTotalItems, setSubmitTotalItems] = useState(6);
  const [submitNotes, setSubmitNotes] = useState('');

  // Pull live data from the API and keep it fresh
  useEffect(() => startStorePolling(), []);

  // Load student data, facility traffic & academic year wash quota
  const refreshData = () => {
    const studentIdent = activeUser?.cardId || activeUser?.identifier || '1077';
    const currentActive = getStudentActiveBag(studentIdent);
    const history = getStudentHistory(studentIdent);
    const traffic = getFacilityTraffic();
    const quota = getStudentWashQuota(studentIdent);
    
    setActiveBag(currentActive);
    setHistoryBags(history);
    setTrafficInfo(traffic);
    setWashQuota(quota);
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('laundry_store_updated', handleUpdate);
    return () => window.removeEventListener('laundry_store_updated', handleUpdate);
  }, [activeUser]);

  // Generate authentic scannable QR code data URL for active bag
  useEffect(() => {
    if (activeBag) {
      const codePayload = activeBag.washId || activeBag.id;
      QRCode.toDataURL(codePayload, {
        width: 180,
        margin: 2,
        color: {
          dark: '#1C1917',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      }).then(url => {
        setStudentQrDataUrl(url);
      }).catch(err => {
        console.error('Error generating student QR pass:', err);
      });
    } else {
      setStudentQrDataUrl('');
    }
  }, [activeBag?.id, activeBag?.washId]);

  // Support ESC key to close any open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowStudentQrModal(false);
        setSelectedBagDetail(null);
        setShowSubmitBagModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle student bag submission
  const handleStudentSubmitBag = (e) => {
    e.preventDefault();
    const count = parseInt(submitTotalItems, 10);
    if (!count || count < 1) return;

    const studentIdent = activeUser?.cardId || activeUser?.identifier || '1077';
    submitNewBag({
      cardId: washQuota.cardId || studentIdent,
      usn: washQuota.usn || activeUser?.identifier || 'ENG24CY0189',
      studentName: washQuota.studentName || activeUser?.name || 'Resident',
      room: washQuota.room || activeUser?.room || 'Wing 2 - Room 302',
      totalItems: count,
      notes: submitNotes.trim() || 'Standard residential wash'
    });

    soundFx.playSuccess();
    setShowSubmitBagModal(false);
    setSubmitNotes('');
    setSubmitTotalItems(6);
    refreshData();
    setShowStudentQrModal(true);
  };

  const getStageIndex = (stage) => LAUNDRY_STAGES.indexOf(stage);

  return (
    <div className="swiss-dashboard-layout">
      {/* =========================================================================
          TOP HEADER
          ========================================================================= */}
      <header className="swiss-dash-header">
        <div className="swiss-dash-header-inner">
          <div className="swiss-brand-group">
            <h1 className="swiss-brand-title">HOSTEL LAUNDRY OPERATIONS SYSTEM</h1>
          </div>

          <div className="swiss-dash-user-bar">
            <div className="swiss-user-info">
              <span className="swiss-user-name">{washQuota.studentName || activeUser?.name || 'Alex Morgan'}</span>
              <span className="swiss-user-meta mono">
                CARD ID: <strong>{washQuota.cardId}</strong> • USN: {washQuota.usn} • {washQuota.room || activeUser?.room || 'Wing 2 - Room 302'}
              </span>
            </div>
            <button
              type="button"
              className="swiss-btn swiss-btn-secondary swiss-btn-sm"
              onClick={onSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* =========================================================================
            STUDENT NAVIGATION BAR (Multi-page routing between Status & History)
            ========================================================================= */}
        <nav className="swiss-dash-subnav" aria-label="Student portal navigation">
          <div className="swiss-subnav-inner">
            <div className="swiss-nav-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={currentPage === 'status'}
                className={`swiss-nav-tab ${currentPage === 'status' ? 'active' : ''}`}
                onClick={() => setCurrentPage('status')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>Live Status & Laundry Traffic</span>
                {activeBag && (
                  <span className="swiss-nav-badge-pill">{activeBag.stage}</span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentPage === 'history'}
                className={`swiss-nav-tab ${currentPage === 'history' ? 'active' : ''}`}
                onClick={() => setCurrentPage('history')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Previous Records</span>
                <span className="swiss-nav-counter-pill">{historyBags.length}</span>
              </button>
            </div>

            {/* Separate small tab on the right-most top side: Bags Count, Estimated Completion & Traffic Load State */}
            <div className="swiss-top-traffic-tab" role="region" aria-label="Laundry traffic and estimated completion">
              <div className="swiss-top-traffic-stat">
                <span className="swiss-top-traffic-label">BAGS IN LAUNDRY</span>
                <span className="swiss-top-traffic-val mono">{trafficInfo.activeCount}</span>
              </div>
              <div className="swiss-top-traffic-divider" aria-hidden="true" />
              <div className="swiss-top-traffic-stat">
                <span className="swiss-top-traffic-label">ESTIMATED COMPLETION</span>
                <div className="swiss-top-traffic-days-row">
                  <span className={`swiss-top-traffic-days mono color-${trafficInfo.trafficColor}`}>
                    {trafficInfo.estimatedDays}
                  </span>
                  <span className="swiss-top-traffic-date">
                    ({trafficInfo.targetDateFormatted})
                  </span>
                </div>
              </div>
              <div
                className={`swiss-load-state-pill load-${trafficInfo.trafficClass} compact`}
                title={`Traffic Level: ${trafficInfo.trafficLevel}`}
              >
                <svg className="swiss-load-bars-icon" width="14" height="12" viewBox="0 0 16 14" fill="none" aria-hidden="true">
                  <rect x="1" y="8" width="3.5" height="5" rx="1" className={trafficInfo.loadBars >= 1 ? 'bar-filled' : 'bar-empty'} />
                  <rect x="6" y="5" width="3.5" height="8" rx="1" className={trafficInfo.loadBars >= 2 ? 'bar-filled' : 'bar-empty'} />
                  <rect x="11" y="1" width="3.5" height="12" rx="1" className={trafficInfo.loadBars >= 3 ? 'bar-filled' : 'bar-empty'} />
                </svg>
                <span className="swiss-load-state-label">{trafficInfo.trafficLevel}</span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* =========================================================================
          PAGE 1: LIVE STATUS & LAUNDRY TRACKING
          ========================================================================= */}
      {currentPage === 'status' && (
        <main className="swiss-dash-container">
          {/* COLLECTION READY ALERT (Only when active bag is ready for collection) */}
          {activeBag && activeBag.stage === 'Ready for Collection' && (
            <section className="swiss-collection-alert" aria-label="Laundry Ready Notice">
              <div className="swiss-collection-alert-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="swiss-collection-alert-content">
                <span className="swiss-collection-alert-tag">READY FOR COLLECTION</span>
                <h2 className="swiss-collection-alert-title">
                  Your laundry (Wash ID #{activeBag.washId || activeBag.id}) is washed, dried, folded, and ready for pickup!
                </h2>
                <p className="swiss-collection-alert-desc">
                  Pickup Location: <strong>{activeBag.pickupBin || 'Wing 2 Service Counter (Bin 14)'}</strong>.
                  Please show your Card ID ({activeBag.cardId || washQuota.cardId}) or Wash ID ({activeBag.washId || activeBag.id}) to collect.
                </p>
              </div>
              <div className="swiss-collection-alert-action">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-primary swiss-btn-sm"
                  onClick={() => setShowStudentQrModal(true)}
                  style={{ marginBottom: '8px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Show QR Pass</span>
                </button>
                <span className="swiss-qr-pass-label">WASH BARCODE</span>
                <span className="swiss-qr-pass-code mono">{activeBag.qrCode}</span>
              </div>
            </section>
          )}

          {/* SINGLE-LEVEL ROW: TRACKING STATUS (BIG) & WASH TRACKER (SMALL) IN THE SAME LINE */}
          <div className="swiss-tracking-split-row">
            {/* 1. TRACKING STATUS (BIG - MAIN SECTION) */}
            <section className="swiss-tracking-status-main" aria-label="Current laundry bag tracking">
              <div className="swiss-section-header">
                <div>
                  <span className="swiss-section-subtitle">ACTIVE TRACKING</span>
                  <h2 className="swiss-section-title">Current Laundry Bag Status</h2>
                </div>
                {!activeBag && washQuota.remaining > 0 && (
                  <button
                    type="button"
                    className="swiss-btn swiss-btn-primary swiss-btn-sm"
                    onClick={() => setShowSubmitBagModal(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Submit Laundry Bag</span>
                  </button>
                )}
                {activeBag && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="swiss-btn swiss-btn-secondary swiss-btn-sm"
                      onClick={() => setShowStudentQrModal(true)}
                      title="Open scannable QR Pass for smartphone screenshot and counter pickup"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <span>View Bag QR Pass</span>
                    </button>
                    <span className={`swiss-stage-pill stage-${activeBag.stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      Current Stage: {activeBag.stage}
                    </span>
                  </div>
                )}
              </div>

              {activeBag ? (
                <div className="swiss-card swiss-tracking-card">
                  {/* Meta bar */}
                  <div className="swiss-tracking-meta-grid">
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">WASH IDENTIFIER</span>
                      <span className="swiss-meta-value mono strong highlight-wash-id">
                        {activeBag.washId || activeBag.id}
                      </span>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">CARD IDENTIFIER</span>
                      <span className="swiss-meta-value mono">{activeBag.cardId || washQuota.cardId}</span>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">CYCLE NUMBER</span>
                      <span className="swiss-meta-value mono">
                        Wash #{activeBag.washNumber || washQuota.used} of {TOTAL_ANNUAL_WASHES}
                      </span>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">CURRENT STATUS</span>
                      <span className="swiss-meta-value strong">{activeBag.stage}</span>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">SUBMITTED AT</span>
                      <span className="swiss-meta-value">{activeBag.submittedAt}</span>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">EXPECTED COMPLETION</span>
                      <div className="swiss-meta-date-row">
                        <span className="swiss-meta-value highlight">{activeBag.expectedAt}</span>
                        {/* Small laundry load state near the estimated date with appropriate visual */}
                        <div
                          className={`swiss-load-state-pill mini load-${trafficInfo.trafficClass}`}
                          title={`Estimated completion: ${trafficInfo.estimatedDays} (${trafficInfo.trafficLevel})`}
                        >
                          <svg className="swiss-load-bars-icon" width="13" height="11" viewBox="0 0 16 14" fill="none" aria-hidden="true">
                            <rect x="1" y="8" width="3.5" height="5" rx="1" className={trafficInfo.loadBars >= 1 ? 'bar-filled' : 'bar-empty'} />
                            <rect x="6" y="5" width="3.5" height="8" rx="1" className={trafficInfo.loadBars >= 2 ? 'bar-filled' : 'bar-empty'} />
                            <rect x="11" y="1" width="3.5" height="12" rx="1" className={trafficInfo.loadBars >= 3 ? 'bar-filled' : 'bar-empty'} />
                          </svg>
                          <span>{trafficInfo.estimatedDays} • {trafficInfo.trafficLevel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="swiss-tracking-meta-item">
                      <span className="swiss-meta-label">LOAD DETAILS</span>
                      <span className="swiss-meta-value">{activeBag.totalItems} items ({activeBag.weightKg} kg)</span>
                    </div>
                  </div>

                  {/* The 7-Stage Workflow Stepper */}
                  <div className="swiss-workflow-container" aria-label="Laundry Stage Stepper">
                    <span className="swiss-overline">WORKFLOW PROGRESSION (7 STAGES)</span>
                    <div className="swiss-workflow-track">
                      {LAUNDRY_STAGES.map((stageName, idx) => {
                        const currentIdx = getStageIndex(activeBag.stage);
                        const isCompleted = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        const isPending = idx > currentIdx;

                        return (
                          <div
                            key={stageName}
                            className={`swiss-workflow-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
                          >
                            <div className="swiss-step-indicator">
                              {isCompleted ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                            <div className="swiss-step-content">
                              <span className="swiss-step-title">{stageName}</span>
                              {isCurrent && (
                                <span className="swiss-step-status-tag">In Progress</span>
                              )}
                              {isCompleted && (
                                <span className="swiss-step-status-tag done">Completed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage History & Care Instructions */}
                  <div className="swiss-activity-row">
                    <div className="swiss-activity-details">
                      {activeBag.notes ? (
                        <p className="swiss-activity-sub">Special instructions: {activeBag.notes}</p>
                      ) : (
                        <p className="swiss-activity-sub">Standard residential fabric care applied.</p>
                      )}
                    </div>

                    <div className="swiss-activity-actions">
                      <button
                        type="button"
                        className="swiss-btn swiss-btn-secondary swiss-btn-sm"
                        onClick={() => setSelectedBagDetail(activeBag)}
                      >
                        View Full Stage History
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Active Bag State */
                <div className="swiss-card swiss-empty-state">
                  <div className="swiss-empty-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <h3 className="swiss-empty-title">No Active Laundry Bag In Process</h3>
                  <p className="swiss-empty-desc">
                    You currently do not have a laundry bag in the facility cycle. Submit your clothes bag details below to register your wash and generate an official scannable Wash QR Pass for counter drop-off.
                  </p>
                  {washQuota.remaining > 0 ? (
                    <button
                      type="button"
                      className="swiss-btn swiss-btn-primary"
                      onClick={() => setShowSubmitBagModal(true)}
                      style={{ marginTop: 'var(--space-3)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>Submit Laundry Bag</span>
                    </button>
                  ) : (
                    <p className="swiss-empty-sub mono" style={{ marginTop: 'var(--space-2)', color: 'var(--color-error)' }}>
                      Annual wash quota exhausted (30 of 30 washes used).
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 2. WASH TRACKER (SMALL - SAME LINE ON THE RIGHT) */}
            <aside className="swiss-wash-tracker-side" aria-label="Academic year wash quota tracker">
              <div className="swiss-section-header">
                <div>
                  <span className="swiss-section-subtitle">ANNUAL QUOTA</span>
                  <h2 className="swiss-section-title">Wash Tracker</h2>
                </div>
              </div>

              <div className="swiss-card swiss-wash-tracker-card">
                <span className="swiss-overline">ACADEMIC YEAR ALLOWANCE (2 SEMESTERS)</span>
                <div className="swiss-wash-tracker-hero">
                  <span className="swiss-wash-huge-num mono text-green">{washQuota.remaining}</span>
                  <div className="swiss-wash-hero-labels">
                    <span className="swiss-wash-left-text">Washes Left</span>
                    <span className="swiss-wash-cap-text">of {TOTAL_ANNUAL_WASHES} Annual Total</span>
                  </div>
                </div>

                <div className="swiss-wash-meter-inline">
                  <div className="swiss-quota-progress-track">
                    <div
                      className="swiss-quota-progress-fill"
                      style={{ width: `${(washQuota.used / TOTAL_ANNUAL_WASHES) * 100}%` }}
                    />
                  </div>
                  <div className="swiss-wash-meter-row">
                    <span className="swiss-wash-meter-used mono">{washQuota.used} Used</span>
                    <span className="swiss-wash-meter-left mono">{washQuota.remaining} Left</span>
                  </div>
                </div>

                <div className="swiss-wash-card-footer">
                  <span className="swiss-wash-card-label">PERMANENT CARD ID</span>
                  <span className="swiss-wash-card-id mono strong">{washQuota.cardId}</span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}

      {/* =========================================================================
          PAGE 2: PREVIOUS RECORDS (DEDICATED FULL HISTORY ARCHIVE PAGE)
          ========================================================================= */}
      {currentPage === 'history' && (
        <main className="swiss-dash-container">
          <section className="swiss-dash-section" aria-label="Previous laundry history records">
            <div className="swiss-section-header">
              <div>
                <span className="swiss-section-subtitle">CYCLE ARCHIVE</span>
                <h2 className="swiss-section-title">Previous Laundry Records</h2>
              </div>
              <div className="swiss-history-summary-pills">
                <span className="swiss-count-badge">Card ID: {washQuota.cardId}</span>
                <span className="swiss-count-badge">Annual Used: {washQuota.used} / {TOTAL_ANNUAL_WASHES}</span>
                <span className="swiss-count-badge green-badge">Washes Left: {washQuota.remaining}</span>
              </div>
            </div>

            {historyBags.length > 0 ? (
              <div className="swiss-card swiss-history-card">
                <div className="swiss-table-responsive">
                  <table className="swiss-data-table" aria-label="Previous laundry records table">
                    <thead>
                      <tr>
                        <th scope="col">Wash ID</th>
                        <th scope="col">Card ID</th>
                        <th scope="col">Cycle Number</th>
                        <th scope="col">Submitted Date</th>
                        <th scope="col">Collection Date</th>
                        <th scope="col">Items & Weight</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyBags.map((bag) => (
                        <tr key={bag.id}>
                          <td>
                            <span className="mono strong">{bag.washId || bag.id}</span>
                            <span className="swiss-table-subtext mono">{bag.qrCode}</span>
                          </td>
                          <td>
                            <span className="mono">{bag.cardId || washQuota.cardId}</span>
                          </td>
                          <td>
                            <span className="mono">Wash #{bag.washNumber || 1} of {TOTAL_ANNUAL_WASHES}</span>
                          </td>
                          <td>{bag.submittedAt}</td>
                          <td>{bag.collectedAt || bag.readyAt || 'Collected'}</td>
                          <td>
                            <span>{bag.totalItems} pieces</span>
                            <span className="swiss-table-subtext">{bag.weightKg} kg</span>
                          </td>
                          <td>
                            <span className="swiss-stage-pill stage-collected">Collected</span>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="swiss-btn swiss-btn-secondary swiss-btn-xs"
                              onClick={() => setSelectedBagDetail(bag)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="swiss-card swiss-empty-state">
                <div className="swiss-empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h3 className="swiss-empty-title">No Previous Records Found</h3>
                <p className="swiss-empty-desc">
                  There are no archived laundry records on file for Card ID {washQuota.cardId} ({washQuota.usn}). You have {washQuota.remaining} of {TOTAL_ANNUAL_WASHES} washes remaining for this academic year (spanning 2 semesters).
                </p>
              </div>
            )}
          </section>
        </main>
      )}

      {/* =========================================================================
          BAG DETAILS AUDIT TIMELINE MODAL (For Active or Historical Bags)
          ========================================================================= */}
      {selectedBagDetail && (
        <div
          className="swiss-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBagDetail(null);
          }}
        >
          <div className="swiss-modal-box">
            <div className="swiss-modal-header">
              <div className="swiss-modal-header-left">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary swiss-btn-sm"
                  onClick={() => setSelectedBagDetail(null)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <div>
                  <span className="swiss-overline">LAUNDRY CYCLE AUDIT LOG</span>
                  <h3 id="detail-modal-title" className="swiss-modal-title">
                    Wash Record #{selectedBagDetail.washId || selectedBagDetail.id}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="swiss-modal-close"
                onClick={() => setSelectedBagDetail(null)}
                aria-label="Close dialog"
                title="Close (Esc)"
              >
                &times;
              </button>
            </div>

            <div className="swiss-modal-content">
              {/* Metadata summary */}
              <div className="swiss-tracking-meta-grid">
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">WASH ID</span>
                  <span className="swiss-meta-value mono strong">{selectedBagDetail.washId || selectedBagDetail.id}</span>
                </div>
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">PERMANENT CARD ID</span>
                  <span className="swiss-meta-value mono">{selectedBagDetail.cardId || washQuota.cardId}</span>
                </div>
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">ANNUAL ALLOCATION</span>
                  <span className="swiss-meta-value mono">Wash #{selectedBagDetail.washNumber || 1} of {TOTAL_ANNUAL_WASHES}</span>
                </div>
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">BARCODE / QR</span>
                  <span className="swiss-meta-value mono">{selectedBagDetail.qrCode}</span>
                </div>
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">STAGE</span>
                  <span className="swiss-meta-value strong">{selectedBagDetail.stage}</span>
                </div>
                <div className="swiss-tracking-meta-item">
                  <span className="swiss-meta-label">ITEMS</span>
                  <span className="swiss-meta-value">{selectedBagDetail.totalItems} pcs ({selectedBagDetail.weightKg} kg)</span>
                </div>
              </div>

              {/* Stage History Timeline */}
              <div className="swiss-timeline-wrap">
                <span className="swiss-overline">PROGRESSION TIMELINE</span>
                <div className="swiss-timeline-full">
                  {(selectedBagDetail.stageHistory || []).map((step, idx) => (
                    <div key={idx} className="swiss-timeline-node">
                      <div className="swiss-timeline-bullet"></div>
                      <div className="swiss-timeline-heading">
                        <span className="swiss-timeline-stage">{step.stage}</span>
                        <span className="swiss-timeline-date mono">{step.timestamp}</span>
                      </div>
                      <p className="swiss-timeline-desc">{step.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="swiss-modal-footer">
              <button
                type="button"
                className="swiss-btn swiss-btn-secondary"
                onClick={() => setSelectedBagDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STUDENT DIGITAL WASH QR PASS MODAL
          ========================================================================= */}
      {showStudentQrModal && activeBag && (
        <div
          className="swiss-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-qr-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStudentQrModal(false);
          }}
        >
          <div className="swiss-modal-card">
            <div className="swiss-modal-header">
              <div className="swiss-modal-header-left">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary swiss-btn-sm swiss-modal-back-btn"
                  onClick={() => setShowStudentQrModal(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <div>
                  <span className="swiss-overline">STUDENT DIGITAL PASS</span>
                  <h3 id="student-qr-title" className="swiss-modal-title">Official Wash QR Pass</h3>
                </div>
              </div>
              <button
                type="button"
                className="swiss-modal-close"
                onClick={() => setShowStudentQrModal(false)}
                aria-label="Close modal"
                title="Close (Esc)"
              >
                &times;
              </button>
            </div>

            <div className="swiss-qr-tag-card">
              <div className="swiss-qr-tag-header">
                <div>
                  <div className="swiss-qr-tag-brand">HOSTEL LAUNDRY FACILITY</div>
                  <div className="swiss-meta-sub">Official Student Identification Pass</div>
                </div>
                <span className="swiss-qr-tag-type">DIGITAL PASS</span>
              </div>

              <div className="swiss-qr-visual-box">
                {studentQrDataUrl ? (
                  <img
                    src={studentQrDataUrl}
                    alt={`Scannable QR Pass for Wash #${activeBag.washId || activeBag.id}`}
                    className="swiss-real-qr-code"
                    width="180"
                    height="180"
                  />
                ) : (
                  <div className="swiss-qr-generating">Generating scannable QR code...</div>
                )}
                <span className="swiss-qr-tag-id mono strong">{activeBag.washId || activeBag.id}</span>
                <span className="swiss-table-subtext mono">{activeBag.qrCode}</span>
              </div>

              <div className="swiss-qr-tag-meta-list">
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Wash ID</span>
                  <span className="val mono strong highlight-wash-id">{activeBag.washId || activeBag.id}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Permanent Card ID</span>
                  <span className="val mono">{activeBag.cardId || washQuota.cardId}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Annual Allocation</span>
                  <span className="val mono">Wash #{activeBag.washNumber || washQuota.used} of {TOTAL_ANNUAL_WASHES}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Student USN</span>
                  <span className="val mono">{activeBag.usn || washQuota.usn}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Resident Name</span>
                  <span className="val">{activeBag.studentName || washQuota.studentName}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Hostel Room</span>
                  <span className="val">{activeBag.room || washQuota.room}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Current Stage</span>
                  <span className="val strong">{activeBag.stage}</span>
                </div>
              </div>
            </div>

            <div className="swiss-modal-footer">
              <button
                type="button"
                className="swiss-btn swiss-btn-secondary"
                onClick={() => setShowStudentQrModal(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Dashboard</span>
              </button>
              {studentQrDataUrl && (
                <a
                  href={studentQrDataUrl}
                  download={`student-wash-qr-${activeBag.washId || activeBag.id}.png`}
                  className="swiss-btn swiss-btn-primary"
                  title="Download scannable QR code image for phone transfer or testing"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download Pass Image</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STUDENT SUBMIT LAUNDRY BAG MODAL (Proposed Solution Requirement)
          ========================================================================= */}
      {showSubmitBagModal && (
        <div
          className="swiss-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubmitBagModal(false);
          }}
        >
          <div className="swiss-modal-card">
            <div className="swiss-modal-header">
              <div className="swiss-modal-header-left">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary swiss-btn-sm swiss-modal-back-btn"
                  onClick={() => setShowSubmitBagModal(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <div>
                  <span className="swiss-overline">LAUNDRY INTAKE SUBMISSION</span>
                  <h3 id="submit-modal-title" className="swiss-modal-title">Submit Laundry Bag</h3>
                </div>
              </div>
              <button
                type="button"
                className="swiss-modal-close"
                onClick={() => setShowSubmitBagModal(false)}
                aria-label="Close modal"
                title="Close (Esc)"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleStudentSubmitBag} className="swiss-form">
              {/* Resident Verification Summary Box */}
              <div className="swiss-field" style={{ backgroundColor: '#FAFAFA', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <span className="swiss-overline" style={{ marginBottom: '6px' }}>STUDENT ACCOUNT DETAILS</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>CARD ID</span>
                    <strong className="mono">{washQuota.cardId}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>STUDENT NAME</span>
                    <strong>{washQuota.studentName || activeUser?.name || 'Alex Morgan'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>HOSTEL ROOM</span>
                    <span className="mono">{washQuota.room || activeUser?.room || 'Wing 2 - Room 302'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>ANNUAL QUOTA</span>
                    <strong className="mono text-green">{washQuota.remaining} of {TOTAL_ANNUAL_WASHES} Left</strong>
                  </div>
                </div>
              </div>

              <div className="swiss-field">
                <label htmlFor="submit-total-items" className="swiss-label">
                  Total Cloth Items <span className="req">*</span>
                </label>
                <input
                  id="submit-total-items"
                  type="number"
                  min="1"
                  max="30"
                  className="swiss-input mono"
                  value={submitTotalItems}
                  onChange={(e) => setSubmitTotalItems(e.target.value)}
                  placeholder="e.g. 6"
                  required
                />
                <span className="swiss-table-subtext">Hostel policy limit: up to 30 items per laundry cycle.</span>
              </div>

              <div className="swiss-field">
                <label htmlFor="submit-notes" className="swiss-label">
                  Fabric Care & Special Instructions (Optional)
                </label>
                <input
                  id="submit-notes"
                  type="text"
                  className="swiss-input"
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g. Mild detergent, gentle eco wash"
                />
              </div>

              <div className="swiss-modal-footer">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary"
                  onClick={() => setShowSubmitBagModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="swiss-btn swiss-btn-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Submit Bag & Generate Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
