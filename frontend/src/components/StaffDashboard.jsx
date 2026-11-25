import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { soundFx } from '../utils/audio';
import {
  LAUNDRY_STAGES,
  TOTAL_ANNUAL_WASHES,
  getBags,
  startStorePolling,
  getBagById,
  getPermanentQrPayload,
  advanceBagStage,
  submitNewBag,
  getStudentWashQuota,
  findStudent,
  STUDENT_REGISTRY
} from '../utils/laundryStore';

export default function StaffDashboard({ activeUser, onSignOut }) {
  const [bags, setBags] = useState([]);
  const [selectedBag, setSelectedBag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL_ACTIVE');
  
  // QR Scanner State (Hardware & Real Live Camera)
  const [scannerInput, setScannerInput] = useState('');
  const [scannerStatusMsg, setScannerStatusMsg] = useState('');
  const [scannerStatusType, setScannerStatusType] = useState('info'); // 'info' | 'success' | 'error'
  const [cameraScanning, setCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [modalQrDataUrl, setModalQrDataUrl] = useState('');

  // Counter Intake Modal
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeCardId, setIntakeCardId] = useState('1077');
  const [intakeUsn, setIntakeUsn] = useState('ENG24CY0189');
  const [intakeName, setIntakeName] = useState('Alex Morgan');
  const [intakeRoom, setIntakeRoom] = useState('Wing 2 - Room 302');
  const [intakeTotalItems, setIntakeTotalItems] = useState(6);
  const [intakeNotes, setIntakeNotes] = useState('');

  // Handle Card ID change with auto-fill
  const handleIntakeCardChange = (val) => {
    setIntakeCardId(val);
    const matched = findStudent(val);
    if (matched && matched.name !== 'Student Resident') {
      setIntakeUsn(matched.usn || '');
      setIntakeName(matched.name || '');
      setIntakeRoom(matched.room || '');
    }
  };

  // Action feedback banner
  const [actionFeedback, setActionFeedback] = useState('');

  // Admin QR Code Print & Generation Modal
  const [qrPrintModalBag, setQrPrintModalBag] = useState(null);

  // Pull live data from the API and keep it fresh; surface background save failures
  useEffect(() => {
    const stop = startStorePolling();
    const onError = (e) => {
      setActionFeedback(`Could not save change: ${e.detail}`);
      setTimeout(() => setActionFeedback(''), 6000);
    };
    window.addEventListener('laundry_store_error', onError);
    return () => {
      stop();
      window.removeEventListener('laundry_store_error', onError);
    };
  }, []);

  // Load latest data from store
  const refreshData = () => {
    const allBags = getBags();
    setBags(allBags);

    // If a bag was actively selected, refresh its reference
    if (selectedBag) {
      const refreshedSelected = allBags.find(b => b.id === selectedBag.id);
      if (refreshedSelected) {
        setSelectedBag(refreshedSelected);
      }
    }
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('laundry_store_updated', handleUpdate);
    return () => window.removeEventListener('laundry_store_updated', handleUpdate);
  }, [selectedBag?.id]);

  // State for Bag Unique ID lookup tab
  const [bagQueryInput, setBagQueryInput] = useState('');
  const [queryError, setQueryError] = useState('');

  // Explicit fetch function for Unique Bag ID inquiry
  const handleFetchBagById = (customId) => {
    const rawId = (customId !== undefined ? customId : bagQueryInput).trim();
    if (!rawId) {
      setQueryError('Please enter a valid Laundry Bag Unique ID (e.g. 1077-2 or BAG-2024-0891).');
      return;
    }
    const found = getBagById(rawId);
    if (found) {
      setSelectedBag(found);
      setQueryError('');
      setBagQueryInput('');
      setActionFeedback(`Fetched details for Bag #${found.washId || found.id} (${found.studentName}).`);
      setTimeout(() => setActionFeedback(''), 4500);
    } else {
      setQueryError(`No laundry bag record found matching Unique ID "${rawId}". Please verify the Wash ID or Barcode.`);
    }
  };

  // KPI Calculations
  const totalBags = bags.length;
  const activeBags = bags.filter(b => b.stage !== 'Collected');
  const countSubmitted = bags.filter(b => b.stage === 'Submitted').length;
  const countReceived = bags.filter(b => b.stage === 'Received').length;
  const countWashing = bags.filter(b => b.stage === 'Washing').length;
  const countDrying = bags.filter(b => b.stage === 'Drying').length;
  const countIroning = bags.filter(b => b.stage === 'Ironing/Folding').length;
  const countReady = bags.filter(b => b.stage === 'Ready for Collection').length;
  const countCollected = bags.filter(b => b.stage === 'Collected').length;

  // Handle QR Code Scanner Detection (Camera & Manual)
  const handleScanLookup = (codeToScan) => {
    const query = (codeToScan || scannerInput).trim();
    if (!query) {
      setScannerStatusMsg('Please enter or scan a valid Bag ID or QR Code.');
      setScannerStatusType('error');
      return;
    }

    const found = getBagById(query);
    if (found) {
      soundFx.playSuccess();
      setSelectedBag(found);
      setScannerStatusMsg(`Scanned: ${found.washId || found.id} (${found.studentName} • ${found.stage})`);
      setScannerStatusType('success');
      setScannerInput('');
      setActionFeedback(`Bag #${found.washId || found.id} successfully detected via QR! Loaded for stage management.`);
      setTimeout(() => setActionFeedback(''), 5000);
    } else {
      soundFx.playBeep();
      setScannerStatusMsg(`No bag found matching QR code "${query}".`);
      setScannerStatusType('error');
    }
  };

  // Live Camera Scanner Lifecycle
  useEffect(() => {
    let timer = null;

    if (cameraScanning) {
      setCameraError('');
      timer = setTimeout(() => {
        try {
          const qrScanner = new Html5Qrcode('interactive-qr-scanner');
          html5QrCodeRef.current = qrScanner;

          // Scan the whole frame (no small qrbox) so a QR shown on a phone screen is found at any
          // distance, prefer the browser's native detector, and ask for an HD camera stream.
          const config = {
            fps: 10,
            useBarCodeDetectorIfSupported: true,
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };

          qrScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleScanLookup(decodedText);
            },
            () => {
              // Frame decode miss
            }
          ).catch((err) => {
            console.error('Camera start failed:', err);
            setCameraError('Camera access unavailable. Please check webcam permissions in your browser or upload an image.');
            setCameraScanning(false);
          });
        } catch (err) {
          console.error('Html5Qrcode init error:', err);
          setCameraError('Unable to initialize QR camera engine.');
          setCameraScanning(false);
        }
      }, 150);

    }

    // Single stop path (runs on Stop click, effect re-run, and unmount). Stopping twice makes
    // html5-qrcode throw "Cannot transition to a new state, already under transition"
    // synchronously, which crashed React. Take the scanner out of the ref first, and guard everything.
    return () => {
      clearTimeout(timer);
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      if (!scanner) return;
      try {
        if (scanner.isScanning) {
          scanner.stop()
            .then(() => { try { scanner.clear(); } catch { /* ignore */ } })
            .catch(() => {});
        }
      } catch {
        /* scanner mid-transition; ignore */
      }
    };
  }, [cameraScanning]);

  // Support ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setQrPrintModalBag(null);
        setShowIntakeModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate authentic scannable QR code data URL whenever QR modal opens
  useEffect(() => {
    if (qrPrintModalBag) {
      // One permanent QR per student (Card ID); it is the same for every wash
      const payload = getPermanentQrPayload(qrPrintModalBag.cardId);
      QRCode.toDataURL(payload, {
        width: 180,
        margin: 2,
        color: {
          dark: '#1C1917',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      }).then(url => {
        setModalQrDataUrl(url);
      }).catch(err => {
        console.error('Error generating QR data URL:', err);
      });
    } else {
      setModalQrDataUrl('');
    }
  }, [qrPrintModalBag]);

  // File upload scan fallback handler
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScannerStatusMsg('Analyzing uploaded QR screenshot...');
      setScannerStatusType('info');
      const tempScanner = new Html5Qrcode('qr-file-temp-staff');
      const decoded = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleScanLookup(decoded);
    } catch (err) {
      console.error('File scan error:', err);
      setScannerStatusMsg('No QR code detected in the uploaded image. Please ensure the QR is clear and well-lit.');
      setScannerStatusType('error');
    }
    e.target.value = '';
  };

  // Handle stage transitions
  const handleAdvanceStage = (bagId, targetStage, customNote = '') => {
    const updated = advanceBagStage(bagId, targetStage, customNote);
    if (updated) {
      setSelectedBag(updated);
      setActionFeedback(`Bag #${updated.id} successfully updated to stage: ${updated.stage}`);
      setTimeout(() => setActionFeedback(''), 5000);
      refreshData();
    }
  };

  // Direct Mark Ready for Collection
  const handleMarkReady = (bagId) => {
    const bayNumber = Math.floor(10 + Math.random() * 30);
    const note = `Dispatched to Wing 2 Counter - Bay ${bayNumber}. Student notified.`;
    handleAdvanceStage(bagId, 'Ready for Collection', note);
  };

  // Direct Mark Collected
  const handleMarkCollected = (bagId) => {
    const note = `Handed over to student at counter. Pickup verified by ${activeUser?.name || 'Staff'}.`;
    handleAdvanceStage(bagId, 'Collected', note);
  };

  // Handle Counter Intake Registration
  const handleCreateIntake = (e) => {
    e.preventDefault();
    if (!intakeCardId.trim() && !intakeUsn.trim()) return;

    const newBag = submitNewBag({
      cardId: intakeCardId.trim(),
      usn: intakeUsn.trim().toUpperCase(),
      studentName: intakeName.trim() || `Resident (${intakeCardId.trim()})`,
      room: intakeRoom.trim() || 'Wing 2 - Desk',
      totalItems: parseInt(intakeTotalItems, 10) || 5,
      notes: intakeNotes || 'Counter physical intake'
    });

    // Advance immediately from Submitted to Received by staff
    advanceBagStage(newBag.id, 'Received', `Physically received at counter by ${activeUser?.name || 'Staff'}`);

    setShowIntakeModal(false);
    
    setActionFeedback(`New wash #${newBag.washId || newBag.id} registered for Card ID ${newBag.cardId} (Wash ${newBag.washNumber} of 30) and marked Received.`);
    setTimeout(() => setActionFeedback(''), 6000);
    refreshData();
    setSelectedBag(getBagById(newBag.id));
    // Immediately open generated QR tag for staff to print / stick on bag
    setQrPrintModalBag(getBagById(newBag.id) || newBag);
  };

  // Filtering bags list
  const filteredBags = bags.filter(bag => {
    // Stage filter
    if (filterStage === 'ALL_ACTIVE' && bag.stage === 'Collected') return false;
    if (filterStage !== 'ALL' && filterStage !== 'ALL_ACTIVE' && bag.stage !== filterStage) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (bag.washId || bag.id).toLowerCase().includes(q);
      const matchCardId = (bag.cardId || '').toLowerCase().includes(q);
      const matchUsn = (bag.usn || '').toLowerCase().includes(q);
      const matchName = (bag.studentName || '').toLowerCase().includes(q);
      const matchQr = (bag.qrCode || '').toLowerCase().includes(q);
      return matchId || matchCardId || matchUsn || matchName || matchQr;
    }
    return true;
  });

  const getStageIndex = (stage) => LAUNDRY_STAGES.indexOf(stage);

  return (
    <div className="swiss-dashboard-layout">
      {/* =========================================================================
          TOP NAVIGATION BAR (Swiss Facility Header)
          ========================================================================= */}
      <header className="swiss-dash-header">
        <div className="swiss-dash-header-inner">
          <div className="swiss-brand-group">
            <h1 className="swiss-brand-title">HOSTEL LAUNDRY OPERATIONS SYSTEM</h1>
          </div>

          <div className="swiss-dash-user-bar">
            <div className="swiss-user-info">
              <span className="swiss-user-name">{activeUser?.name || 'Marcus Vance'}</span>
              <span className="swiss-user-meta mono">
                EMP ID: {activeUser?.identifier || 'EMP-9042'} • {activeUser?.designation || 'Facility Supervisor'}
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
      </header>

      {/* Global Action Feedback Notification */}
      {actionFeedback && (
        <div className="swiss-notification-bar staff-notice" role="status">
          <div className="swiss-notification-indicator staff-indicator"></div>
          <p className="swiss-notification-text">{actionFeedback}</p>
        </div>
      )}

      {/* =========================================================================
          MAIN STAFF DASHBOARD CONTENT
          ========================================================================= */}
      <main className="swiss-dash-main">
        {/* SECTION 1: FACILITY KPI OVERVIEW CARDS */}
        <section className="swiss-section-wrap" aria-label="Facility KPI Metrics">
          <div className="swiss-section-header">
            <div>
              <span className="swiss-overline">FACILITY REAL-TIME TELEMETRY</span>
              <h2 className="swiss-section-title">Active Processing Metrics</h2>
            </div>
            <button
              type="button"
              className="swiss-btn swiss-btn-primary"
              onClick={() => setShowIntakeModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Generate QR & Intake Bag</span>
            </button>
          </div>

          <div className="swiss-kpi-grid">
            <div className="swiss-kpi-card kpi-total">
              <span className="swiss-kpi-label">TOTAL IN PROCESS</span>
              <span className="swiss-kpi-number">{activeBags.length}</span>
            </div>

            <div className="swiss-kpi-card kpi-intake">
              <span className="swiss-kpi-label">SUBMITTED & RECEIVED</span>
              <span className="swiss-kpi-number">{countSubmitted + countReceived}</span>
            </div>

            <div className="swiss-kpi-card kpi-wash">
              <span className="swiss-kpi-label">WASHING & DRYING</span>
              <span className="swiss-kpi-number">{countWashing + countDrying}</span>
            </div>

            <div className="swiss-kpi-card kpi-iron">
              <span className="swiss-kpi-label">IRONING & FOLDING</span>
              <span className="swiss-kpi-number">{countIroning}</span>
            </div>

            <div className="swiss-kpi-card kpi-ready">
              <span className="swiss-kpi-label">READY FOR COLLECTION</span>
              <span className="swiss-kpi-number">{countReady}</span>
            </div>

            <div className="swiss-kpi-card kpi-collected">
              <span className="swiss-kpi-label">COLLECTED TODAY</span>
              <span className="swiss-kpi-number">{countCollected}</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: SPLIT SCREEN WORKFLOW CONTROLS & QR SCANNER */}
        <section className="swiss-section-wrap" aria-label="Workflow & QR Scanner Control">
          <div className="swiss-two-col-grid">
            {/* LEFT COLUMN: QR CODE SCANNER MODULE */}
            <div className="swiss-card swiss-qr-panel">
              <div className="swiss-card-header">
                <div>
                  <span className="swiss-overline">LIVE CAMERA & HARDWARE SCANNER</span>
                  <h3 className="swiss-card-title">Bag QR Code Scanner</h3>
                </div>
                <div className={`swiss-status-pill ${cameraScanning ? 'online' : ''}`}>
                  <span className="swiss-dot"></span>
                  <span>{cameraScanning ? 'Camera Active' : 'Camera Ready'}</span>
                </div>
              </div>

              {/* Viewfinder Window (Live Camera or Standby Visual) */}
              <div className="swiss-viewfinder-box">
                {/* The scanner container stays mounted (only hidden): html5-qrcode injects its own
                    DOM nodes into it, so React must never unmount/remove it while the library owns it. */}
                <div
                  className="swiss-camera-stream-wrapper"
                  style={{ display: cameraScanning ? undefined : 'none' }}
                >
                  <div id="interactive-qr-scanner" className="swiss-qr-video-container"></div>
                  <div className="swiss-scanner-crosshair top-left"></div>
                  <div className="swiss-scanner-crosshair top-right"></div>
                  <div className="swiss-scanner-crosshair bottom-left"></div>
                  <div className="swiss-scanner-crosshair bottom-right"></div>
                  <div className="swiss-scanner-laser"></div>
                </div>
                {!cameraScanning && (
                  <div className="swiss-viewfinder-lens">
                    <div className="swiss-scanner-crosshair top-left"></div>
                    <div className="swiss-scanner-crosshair top-right"></div>
                    <div className="swiss-scanner-crosshair bottom-left"></div>
                    <div className="swiss-scanner-crosshair bottom-right"></div>
                    
                    <div className="swiss-viewfinder-center">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span className="swiss-viewfinder-prompt">Live Camera Scanner Standby</span>
                      <span className="swiss-table-subtext" style={{ color: 'rgba(255,255,255,0.5)' }}>Click below to start webcam</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Activation Controls */}
              <div className="swiss-scanner-action-bar">
                {cameraScanning ? (
                  <button
                    type="button"
                    className="swiss-btn swiss-btn-secondary full-width"
                    onClick={() => setCameraScanning(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    <span>Stop Camera Scanner</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="swiss-btn swiss-btn-primary full-width"
                    onClick={() => setCameraScanning(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>Start Live Camera Scanner</span>
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="swiss-scanner-feedback error" role="alert">
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Secondary Option: File Upload Scan fallback */}
              <div className="swiss-file-scan-bar">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileScan}
                />
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary full-width swiss-btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload a screenshot or photo of the QR code from phone or computer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Or Upload QR Screenshot / Photo</span>
                </button>
              </div>
              <div id="qr-file-temp-staff" style={{ display: 'none' }}></div>

              {/* Feedback readout */}
              {scannerStatusMsg && (
                <div className={`swiss-scanner-feedback ${scannerStatusType}`}>
                  <span>{scannerStatusMsg}</span>
                </div>
              )}

              {/* Manual code input & test barcodes */}
              <form
                className="swiss-scanner-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScanLookup();
                }}
              >
                <div className="swiss-field">
                  <label htmlFor="manual-scan-input" className="swiss-label">
                    Manual Barcode / QR ID Entry
                  </label>
                  <div className="swiss-input-action-wrap">
                    <input
                      id="manual-scan-input"
                      type="text"
                      className="swiss-input mono"
                      placeholder="Enter Bag ID or Scan QR Code (BAG-2024-0891)"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                    />
                    <button type="submit" className="swiss-btn swiss-btn-primary">
                      Scan / Lookup
                    </button>
                  </div>
                </div>
              </form>

              {/* Rapid Scan Simulation Shortcuts */}
              <div className="swiss-quick-scan-tray">
                <span className="swiss-quick-scan-label">Quick Scan Test Bags:</span>
                <div className="swiss-quick-scan-chips">
                  {bags.slice(0, 5).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      className={`swiss-chip-btn ${selectedBag?.id === b.id ? 'active' : ''}`}
                      onClick={() => handleScanLookup(b.id)}
                    >
                      <span className="mono">{b.id}</span>
                      <span className="swiss-chip-stage">({b.stage})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: BAG UNIQUE ID LOOKUP TAB & LAUNDRY STATUS CONTROLLER */}
            <div className="swiss-card swiss-stage-controller-panel">
              <div className="swiss-card-header">
                <div>
                  <span className="swiss-overline">
                    {selectedBag ? 'ACTIVE INSPECTION & PROGRESSION' : 'BAG LOOKUP & INSPECTION'}
                  </span>
                  <h3 className="swiss-card-title">
                    {selectedBag ? 'Laundry Status Controller' : 'Laundry Bag Unique ID Inquiry'}
                  </h3>
                </div>
                {selectedBag && (
                  <div className="swiss-header-actions">
                    <button
                      type="button"
                      className="swiss-btn swiss-btn-secondary swiss-btn-xs"
                      onClick={() => {
                        setSelectedBag(null);
                        setBagQueryInput('');
                        setQueryError('');
                      }}
                      title="Clear and lookup another bag"
                    >
                      Lookup Another Bag
                    </button>
                    <span className={`swiss-stage-badge stage-${selectedBag.stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {selectedBag.stage}
                    </span>
                  </div>
                )}
              </div>

              {selectedBag ? (
                <div className="swiss-controller-body">
                  {/* Bag Metadata Summary */}
                  <div className="swiss-selected-meta-grid">
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Wash ID</span>
                      <span className="swiss-meta-content mono strong highlight-wash-id">{selectedBag.washId || selectedBag.id}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Card ID</span>
                      <span className="swiss-meta-content mono strong">{selectedBag.cardId || '1077'}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Annual Cycle</span>
                      <span className="swiss-meta-content mono">Wash #{selectedBag.washNumber || 1} of {TOTAL_ANNUAL_WASHES}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Student USN</span>
                      <span className="swiss-meta-content mono">{selectedBag.usn}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Resident</span>
                      <span className="swiss-meta-content">{selectedBag.studentName}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Room / Block</span>
                      <span className="swiss-meta-content">{selectedBag.room}</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Total Items</span>
                      <span className="swiss-meta-content">{selectedBag.totalItems} pieces ({selectedBag.weightKg || '3.5'} kg)</span>
                    </div>
                    <div className="swiss-meta-cell">
                      <span className="swiss-meta-title">Drop-Off Time</span>
                      <span className="swiss-meta-content">{selectedBag.submittedAt}</span>
                    </div>
                  </div>

                  {/* 7-Stage Workflow Progress Indicator */}
                  <div className="swiss-workflow-controller-track">
                    <span className="swiss-control-header-label">Workflow Stage Progression (7 Stages):</span>
                    <div className="swiss-mini-stepper">
                      {LAUNDRY_STAGES.map((stg, idx) => {
                        const currentIdx = getStageIndex(selectedBag.stage);
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <div
                            key={stg}
                            className={`swiss-mini-step ${isCurrent ? 'current' : ''} ${isDone ? 'completed' : ''}`}
                            title={`Stage ${idx + 1}: ${stg}`}
                          >
                            <div className="swiss-mini-dot">{idx + 1}</div>
                            <span className="swiss-mini-label">{stg}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="swiss-stage-action-box">
                    <span className="swiss-control-header-label">Staff Actions for Bag #{selectedBag.id}:</span>
                    
                    <div className="swiss-action-btn-row">
                      {/* Generate / Print QR Label for selected bag */}
                      <button
                        type="button"
                        className="swiss-btn swiss-btn-secondary"
                        onClick={() => setQrPrintModalBag(selectedBag)}
                        title="Generate and print physical barcode QR label for bag attachment"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Print Bag QR Tag</span>
                      </button>

                      {/* Advance to Next Stage Button */}
                      {getStageIndex(selectedBag.stage) < LAUNDRY_STAGES.length - 1 && selectedBag.stage !== 'Ironing/Folding' && (
                        <button
                          type="button"
                          className="swiss-btn swiss-btn-primary"
                          onClick={() => handleAdvanceStage(selectedBag.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                          <span>
                            Advance to Next Stage: &quot;{LAUNDRY_STAGES[getStageIndex(selectedBag.stage) + 1]}&quot;
                          </span>
                        </button>
                      )}

                      {/* Explicit Mark as Ready for Collection */}
                      {selectedBag.stage !== 'Ready for Collection' && selectedBag.stage !== 'Collected' && (
                        <button
                          type="button"
                          className="swiss-btn swiss-btn-ready"
                          onClick={() => handleMarkReady(selectedBag.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          <span>Mark as Ready for Collection</span>
                        </button>
                      )}

                      {/* Explicit Mark as Collected (Handover to Student) */}
                      {selectedBag.stage === 'Ready for Collection' && (
                        <button
                          type="button"
                          className="swiss-btn swiss-btn-collected"
                          onClick={() => handleMarkCollected(selectedBag.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span>Mark Laundry as Collected (Handover)</span>
                        </button>
                      )}

                      {/* Stage Selector Jump */}
                      <div className="swiss-stage-dropdown-wrap">
                        <label htmlFor="stage-select-jump" className="swiss-label-inline">Set Stage Manually:</label>
                        <select
                          id="stage-select-jump"
                          className="swiss-select"
                          value={selectedBag.stage}
                          onChange={(e) => handleAdvanceStage(selectedBag.id, e.target.value)}
                        >
                          {LAUNDRY_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stage History Log */}
                  <div className="swiss-timeline-compact">
                    <span className="swiss-control-header-label">Audit Trail:</span>
                    <ul className="swiss-audit-list">
                      {(selectedBag.stageHistory || []).map((h, i) => (
                        <li key={i} className="swiss-audit-item">
                          <span className="swiss-audit-time mono">{h.timestamp}</span>
                          <span className="swiss-audit-stage">{h.stage}</span>
                          <span className="swiss-audit-note">— {h.note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action button to return to lookup tab */}
                  <div className="swiss-controller-footer-action">
                    <button
                      type="button"
                      className="swiss-btn swiss-btn-secondary full-width"
                      onClick={() => {
                        setSelectedBag(null);
                        setBagQueryInput('');
                        setQueryError('');
                      }}
                    >
                      Query Different Laundry Bag Unique ID
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab asking for Laundry Bag Unique ID */
                <div className="swiss-bag-lookup-tab">
                  <div className="swiss-lookup-card-content">
                    <form
                      className="swiss-lookup-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleFetchBagById();
                      }}
                    >
                      <div className="swiss-field">
                        <label htmlFor="bag-unique-id-input" className="swiss-label">
                          LAUNDRY BAG UNIQUE ID <span className="req">*</span>
                        </label>
                        <div className="swiss-input-action-wrap">
                          <input
                            id="bag-unique-id-input"
                            type="text"
                            className="swiss-input mono"
                            placeholder="Enter Bag Unique ID (e.g. 1077-2 or BAG-2024-0891)"
                            value={bagQueryInput}
                            onChange={(e) => {
                              setBagQueryInput(e.target.value);
                              if (queryError) setQueryError('');
                            }}
                            autoFocus
                          />
                          <button type="submit" className="swiss-btn swiss-btn-primary">
                            Fetch Bag Details
                          </button>
                        </div>
                        {queryError && (
                          <div className="swiss-field-error-msg" role="alert">
                            {queryError}
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3: FACILITY INVENTORY ROSTER TABLE */}
        <section className="swiss-section-wrap" aria-label="Facility Bag Roster">
          <div className="swiss-section-header">
            <div>
              <span className="swiss-overline">FACILITY ROSTER INVENTORY</span>
              <h2 className="swiss-section-title">All Laundry Bags Management</h2>
            </div>
            
            {/* Filter Tabs */}
            <div className="swiss-filter-tabs">
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'ALL_ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilterStage('ALL_ACTIVE')}
              >
                All Active ({activeBags.length})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Submitted' ? 'active' : ''}`}
                onClick={() => setFilterStage('Submitted')}
              >
                Submitted ({countSubmitted})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Received' ? 'active' : ''}`}
                onClick={() => setFilterStage('Received')}
              >
                Received ({countReceived})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Washing' ? 'active' : ''}`}
                onClick={() => setFilterStage('Washing')}
              >
                Washing ({countWashing})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Drying' ? 'active' : ''}`}
                onClick={() => setFilterStage('Drying')}
              >
                Drying ({countDrying})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Ironing/Folding' ? 'active' : ''}`}
                onClick={() => setFilterStage('Ironing/Folding')}
              >
                Ironing ({countIroning})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'Ready for Collection' ? 'active' : ''}`}
                onClick={() => setFilterStage('Ready for Collection')}
              >
                Ready ({countReady})
              </button>
              <button
                type="button"
                className={`swiss-filter-tab ${filterStage === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterStage('ALL')}
              >
                All Records ({totalBags})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="swiss-roster-search-bar">
            <input
              type="text"
              className="swiss-input"
              placeholder="Search by Bag ID, Student USN, or Resident Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Roster Table */}
          <div className="swiss-table-responsive">
            <table className="swiss-data-table">
              <thead>
                <tr>
                  <th scope="col">Wash ID / QR</th>
                  <th scope="col">Card ID</th>
                  <th scope="col">Cycle</th>
                  <th scope="col">Student Details</th>
                  <th scope="col">Room</th>
                  <th scope="col">Items / Weight</th>
                  <th scope="col">Current Stage</th>
                  <th scope="col">Intake Time</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBags.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="swiss-table-empty">
                      No laundry bags found matching the active filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBags.map((bag) => {
                    const isSelected = selectedBag?.id === bag.id;
                    const stageIdx = getStageIndex(bag.stage);
                    const canAdvance = stageIdx < LAUNDRY_STAGES.length - 1;

                    return (
                      <tr
                        key={bag.id}
                        className={isSelected ? 'swiss-row-selected' : ''}
                        onClick={() => setSelectedBag(bag)}
                      >
                        <td className="mono strong">
                          {bag.washId || bag.id}
                          <span className="swiss-table-subtext mono">{bag.qrCode}</span>
                        </td>
                        <td className="mono strong">{bag.cardId || '1077'}</td>
                        <td className="mono">Wash #{bag.washNumber || 1} of {TOTAL_ANNUAL_WASHES}</td>
                        <td>
                          <span className="strong">{bag.studentName}</span>
                          <span className="swiss-table-subtext mono">{bag.usn}</span>
                        </td>
                        <td>{bag.room}</td>
                        <td>
                          <span>{bag.totalItems} pcs</span>
                          <span className="swiss-table-subtext">{bag.weightKg} kg</span>
                        </td>
                        <td>
                          <span className={`swiss-stage-pill stage-${bag.stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                            {bag.stage}
                          </span>
                        </td>
                        <td>{bag.submittedAt}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="swiss-row-actions">
                            <button
                              type="button"
                              className="swiss-btn swiss-btn-secondary swiss-btn-xs"
                              onClick={() => setSelectedBag(bag)}
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              className="swiss-btn swiss-btn-secondary swiss-btn-xs"
                              onClick={() => setQrPrintModalBag(bag)}
                              title="Print attachable QR tag"
                            >
                              QR Tag
                            </button>
                            {canAdvance && bag.stage !== 'Ironing/Folding' && bag.stage !== 'Ready for Collection' && (
                              <button
                                type="button"
                                className="swiss-btn swiss-btn-primary swiss-btn-xs"
                                onClick={() => handleAdvanceStage(bag.id)}
                              >
                                Advance
                              </button>
                            )}
                            {bag.stage === 'Ironing/Folding' && (
                              <button
                                type="button"
                                className="swiss-btn swiss-btn-ready swiss-btn-xs"
                                onClick={() => handleMarkReady(bag.id)}
                              >
                                Ready
                              </button>
                            )}
                            {bag.stage === 'Ready for Collection' && (
                              <button
                                type="button"
                                className="swiss-btn swiss-btn-collected swiss-btn-xs"
                                onClick={() => handleMarkCollected(bag.id)}
                              >
                                Handover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* =========================================================================
          COUNTER INTAKE REGISTRATION MODAL
          ========================================================================= */}
      {showIntakeModal && (
        <div
          className="swiss-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intake-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIntakeModal(false);
          }}
        >
          <div className="swiss-modal-card">
            <div className="swiss-modal-header">
              <div className="swiss-modal-header-left">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary swiss-btn-sm swiss-modal-back-btn"
                  onClick={() => setShowIntakeModal(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <div>
                  <span className="swiss-overline">PHYSICAL DROP-OFF REGISTRATION</span>
                  <h3 id="intake-modal-title" className="swiss-modal-title">Intake New Laundry Bag</h3>
                </div>
              </div>
              <button
                type="button"
                className="swiss-modal-close"
                onClick={() => setShowIntakeModal(false)}
                aria-label="Close modal"
                title="Close (Esc)"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateIntake} className="swiss-form">
              <div className="swiss-field">
                <label htmlFor="intake-card-id" className="swiss-label">
                  Student Permanent Card ID <span className="req">*</span>
                </label>
                <input
                  id="intake-card-id"
                  type="text"
                  className="swiss-input mono"
                  placeholder="1077"
                  value={intakeCardId}
                  onChange={(e) => handleIntakeCardChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Dynamic Live Quota Preview Pill */}
              {intakeCardId.trim() && (() => {
                const q = getStudentWashQuota(intakeCardId);
                return (
                  <div className="swiss-intake-quota-preview">
                    <div className="swiss-preview-item">
                      <span className="lbl">NEXT WASH ID:</span>
                      <strong className="mono">{intakeCardId.trim()}-{q.used + 1}</strong>
                    </div>
                    <div className="swiss-preview-item">
                      <span className="lbl">ANNUAL USAGE:</span>
                      <span>{q.used} / {TOTAL_ANNUAL_WASHES} Washes Used</span>
                    </div>
                    <div className="swiss-preview-item">
                      <span className="lbl">REMAINING:</span>
                      <strong className="mono text-green">{q.remaining} Washes Left</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="swiss-field">
                <label htmlFor="intake-usn" className="swiss-label">
                  Student USN <span className="req">*</span>
                </label>
                <input
                  id="intake-usn"
                  type="text"
                  className="swiss-input mono"
                  placeholder="ENG24CY0189"
                  value={intakeUsn}
                  onChange={(e) => setIntakeUsn(e.target.value)}
                  required
                />
              </div>

              <div className="swiss-two-col-inputs">
                <div className="swiss-field">
                  <label htmlFor="intake-name" className="swiss-label">Student Full Name</label>
                  <input
                    id="intake-name"
                    type="text"
                    className="swiss-input"
                    placeholder="Alex Morgan"
                    value={intakeName}
                    onChange={(e) => setIntakeName(e.target.value)}
                  />
                </div>

                <div className="swiss-field">
                  <label htmlFor="intake-room" className="swiss-label">Room / Block</label>
                  <input
                    id="intake-room"
                    type="text"
                    className="swiss-input"
                    placeholder="Wing 2 - Room 302"
                    value={intakeRoom}
                    onChange={(e) => setIntakeRoom(e.target.value)}
                  />
                </div>
              </div>

              <div className="swiss-field">
                <label htmlFor="intake-count" className="swiss-label">Total Cloth Items</label>
                <input
                  id="intake-count"
                  type="number"
                  min="1"
                  max="30"
                  className="swiss-input"
                  value={intakeTotalItems}
                  onChange={(e) => setIntakeTotalItems(e.target.value)}
                />
              </div>

              <div className="swiss-field">
                <label htmlFor="intake-notes" className="swiss-label">Intake Notes / Instructions</label>
                <textarea
                  id="intake-notes"
                  className="swiss-input swiss-textarea"
                  rows="2"
                  placeholder="Whites separated, delicate wash"
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="swiss-modal-footer">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary"
                  onClick={() => setShowIntakeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="swiss-btn swiss-btn-primary"
                >
                  Register & Assign Wash ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADMIN ONLY: OFFICIAL QR BARCODE TAG GENERATOR & PRINTER MODAL
          ========================================================================= */}
      {qrPrintModalBag && (
        <div
          className="swiss-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQrPrintModalBag(null);
          }}
        >
          <div className="swiss-modal-card">
            <div className="swiss-modal-header">
              <div className="swiss-modal-header-left">
                <button
                  type="button"
                  className="swiss-btn swiss-btn-secondary swiss-btn-sm swiss-modal-back-btn"
                  onClick={() => setQrPrintModalBag(null)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <div>
                  <span className="swiss-overline">ADMINISTRATIVE QR TAG GENERATOR</span>
                  <h3 id="qr-modal-title" className="swiss-modal-title">Student Permanent QR Tag</h3>
                </div>
              </div>
              <button
                type="button"
                className="swiss-modal-close"
                onClick={() => setQrPrintModalBag(null)}
                aria-label="Close modal"
                title="Close (Esc)"
              >
                &times;
              </button>
            </div>

            {/* Printable Bag Tag Card */}
            <div className="swiss-qr-tag-card">
              <div className="swiss-qr-tag-header">
                <div>
                  <div className="swiss-qr-tag-brand">HOSTEL LAUNDRY FACILITY</div>
                  <div className="swiss-meta-sub">Permanent Card & Wash Tracking Tag</div>
                </div>
                <span className="swiss-qr-tag-type">OFFICIAL TAG</span>
              </div>

              <div className="swiss-qr-visual-box">
                {modalQrDataUrl ? (
                  <img
                    src={modalQrDataUrl}
                    alt={`Permanent scannable QR code for Card ID ${qrPrintModalBag.cardId}`}
                    className="swiss-real-qr-code"
                    width="180"
                    height="180"
                  />
                ) : (
                  <div className="swiss-qr-generating">Generating scannable QR code...</div>
                )}

                <span className="swiss-qr-tag-id mono strong">{qrPrintModalBag.cardId}</span>
                <span className="swiss-table-subtext mono">{getPermanentQrPayload(qrPrintModalBag.cardId)}</span>
                <span className="swiss-table-subtext">Same QR for every wash of this student</span>
              </div>

              <div className="swiss-qr-tag-meta-list">
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Permanent Card ID</span>
                  <span className="val mono strong">{qrPrintModalBag.cardId || '1077'}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Wash ID</span>
                  <span className="val mono strong highlight-wash-id">{qrPrintModalBag.washId || qrPrintModalBag.id}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Annual Allocation</span>
                  <span className="val mono">Wash #{qrPrintModalBag.washNumber || 1} of {TOTAL_ANNUAL_WASHES}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Student USN</span>
                  <span className="val mono">{qrPrintModalBag.usn}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Resident Name</span>
                  <span className="val">{qrPrintModalBag.studentName}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Hostel Room</span>
                  <span className="val">{qrPrintModalBag.room}</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Items / Weight</span>
                  <span className="val">{qrPrintModalBag.totalItems} pieces ({qrPrintModalBag.weightKg || '3.2'} kg)</span>
                </div>
                <div className="swiss-qr-tag-meta-row">
                  <span className="label">Intake Time</span>
                  <span className="val">{qrPrintModalBag.submittedAt}</span>
                </div>
              </div>
            </div>

            <div className="swiss-modal-footer">
              <button
                type="button"
                className="swiss-btn swiss-btn-secondary"
                onClick={() => setQrPrintModalBag(null)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Dashboard</span>
              </button>
              {modalQrDataUrl && (
                <a
                  href={modalQrDataUrl}
                  download={`student-qr-${qrPrintModalBag.cardId}.png`}
                  className="swiss-btn swiss-btn-secondary"
                  title="Download scannable QR code image for phone transfer or testing"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download QR Image</span>
                </a>
              )}
              <button
                type="button"
                className="swiss-btn swiss-btn-primary"
                onClick={() => {
                  alert(`Tag for ${qrPrintModalBag.id} sent to label printer.`);
                  setQrPrintModalBag(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Physical Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

