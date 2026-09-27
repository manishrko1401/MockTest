'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { 
  ALL_CBAT_BATTERIES, 
  CbatBattery, 
  CbatQuestion, 
  buildCbatBatteriesFromCustomQuestions 
} from './cbatData';
import {
  ClassificationFigure,
  ShortRouteGridMap,
  InfoOrderingTables,
  renderFigureShape
} from './CbatVisualComponents';
import { Trophy } from 'lucide-react';
import './CbatExamEngine.css';

interface CbatExamEngineProps {
  testId: string;
  initialExamLanguage?: 'en' | 'hi';
  onStateSync?: (engineState: any) => void;
}

export default function CbatExamEngine({ testId, initialExamLanguage = 'en' }: CbatExamEngineProps) {
  const router = useRouter();
  const { addAttempt, currentUser } = useAuth();
  const [examLang, setExamLang] = useState<'en' | 'hi'>(initialExamLanguage);

  // Batteries State
  const [batteries, setBatteries] = useState<CbatBattery[]>(ALL_CBAT_BATTERIES);
  const [batteryIdx, setBatteryIdx] = useState<number>(0);
  const [stage, setStage] = useState<'instruction' | 'question' | 'rest'>('instruction');
  const [chunkIdx, setChunkIdx] = useState<number>(0);
  const [paperTitle, setPaperTitle] = useState<string>("SM65194");
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);
  
  // Controls & Options State
  const [isJumbled, setIsJumbled] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(batteries[0].durationSeconds);
  const [customTimeSec, setCustomTimeSec] = useState<number>(batteries[0].durationSeconds);
  const [timeAckChecked, setTimeAckChecked] = useState<boolean>(false);
  const [selectedLayout, setSelectedLayout] = useState<'normal' | 'exam1' | 'view2' | 'view3'>('exam1');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Response storage: { [questionId]: 'A' | '1' | null }
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});

  // Modals
  const [showChangeTimeModal, setShowChangeTimeModal] = useState<boolean>(false);
  const [showLayoutModal, setShowLayoutModal] = useState<boolean>(false);
  const [pendingLayout, setPendingLayout] = useState<string>('');
  const [showSkipTestModal, setShowSkipTestModal] = useState<boolean>(false);
  const [showSkipRestModal, setShowSkipRestModal] = useState<boolean>(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Fetch actual uploaded questions from DB for this testId
  useEffect(() => {
    let isCancelled = false;
    const fetchAdminQuestions = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-custom-questions', data: { testId } })
        });
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          const parsedBatteries = buildCbatBatteriesFromCustomQuestions(
            data.questions, 
            data.sectionalTimings,
            data.title || testId,
            data.durationMinutes
          );
          setBatteries(parsedBatteries);
          setTimeLeft(parsedBatteries[0].durationSeconds);
          setCustomTimeSec(parsedBatteries[0].durationSeconds);
          if (data.title) setPaperTitle(data.title);
        }
      } catch (err) {
        console.error("Error fetching uploaded CBAT questions:", err);
      } finally {
        if (!isCancelled) setLoadingQuestions(false);
      }
    };
    fetchAdminQuestions();
    return () => { isCancelled = true; };
  }, [testId]);

  const activeBattery = batteries[batteryIdx];
  const activeQuestionsChunk = activeBattery.chunks[chunkIdx] || [];

  // Reset timer on stage or battery change
  useEffect(() => {
    if (stage === 'instruction') {
      setTimeLeft(300); // 5 min default instruction timer
      setCustomTimeSec(activeBattery.durationSeconds);
    } else if (stage === 'question') {
      setTimeLeft(activeBattery.durationSeconds);
    } else if (stage === 'rest') {
      setTimeLeft(300); // 5 min rest interval
    }
  }, [stage, batteryIdx]);

  // Live Timer Ticking
  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeExpiry();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, stage]);

  // Disable scrolling via mouse wheel (forces candidate to use the scrollbar, exactly matching official RDSO CBAT)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Prevent mouse wheel scrolling anywhere in CBAT exam
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard navigation keys (ArrowUp, ArrowDown, PageUp, PageDown, Space) from scrolling
      // unless user is currently editing an input field
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Prevent browser back button from leaving the exam or going back
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
      setLockedNotice(
        examLang === 'hi'
          ? 'आरडीएसओ परीक्षा नियमों के अनुसार वापस नहीं जाया जा सकता।'
          : 'Back navigation is restricted under RDSO CBAT examination rules.'
      );
      setTimeout(() => setLockedNotice(null), 3500);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examLang]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleTimeExpiry = () => {
    if (stage === 'instruction') {
      setStage('question');
      setChunkIdx(0);
    } else if (stage === 'question') {
      setStage('rest');
    } else if (stage === 'rest') {
      if (batteryIdx < batteries.length - 1) {
        setBatteryIdx(prev => prev + 1);
        setChunkIdx(0);
        setStage('instruction');
      } else {
        finalizeAndSubmitExam();
      }
    }
  };

  /**
   * CRITICAL CBAT OPTION TOGGLE MECHANISM:
   * 1. Single click on option -> Marks it (stores value).
   * 2. Clicking the EXACT SAME option again -> Unmarks / Deselects it!
   * 3. Clicking a different option -> Switches cleanly.
   */
  const handleOptionClick = (questionId: string, optionValue: string) => {
    setActiveQuestionId(questionId);
    setUserResponses(prev => {
      const currentSelection = prev[questionId];
      if (currentSelection === optionValue) {
        // Toggle OFF (Deselect / Unmark)
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      } else {
        // Toggle ON (Select / Mark)
        return { ...prev, [questionId]: optionValue };
      }
    });
  };

  const handleClearResponse = () => {
    if (activeQuestionId && userResponses[activeQuestionId]) {
      setUserResponses(prev => {
        const updated = { ...prev };
        delete updated[activeQuestionId];
        return updated;
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Final submission and score calculation
  const finalizeAndSubmitExam = () => {
    let totalObtainedMarks = 0;
    let totalMaxMarks = 0;
    let correctCount = 0;
    let totalAttempted = 0;

    const savedResponses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }> = {};

    batteries.forEach(battery => {
      battery.chunks.forEach(chunk => {
        chunk.forEach(q => {
          totalMaxMarks += 1;
          const userAns = userResponses[q.id];
          const isAttempted = userAns !== undefined && userAns !== null;
          if (isAttempted) totalAttempted += 1;

          const isCorrect = isAttempted && userAns === q.correctAnswer;
          if (isCorrect) {
            correctCount += 1;
            totalObtainedMarks += 1;
          }

          // Map letter/number to option index for compatibility
          const optIdx = q.normalOptions.indexOf(userAns || '');
          savedResponses[q.id] = {
            selectedOptionIndex: optIdx >= 0 ? optIdx : null,
            elapsedSeconds: 15
          };
        });
      });
    });

    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    // Save attempt to user profile via AuthContext
    if (currentUser && addAttempt) {
      try {
        addAttempt(
          testId,
          paperTitle ? `Station Master CBAT - ${paperTitle}` : "Station Master CBAT (Psycho Test) Full Mock",
          totalObtainedMarks,
          totalMaxMarks,
          accuracy,
          1800,
          0,
          savedResponses
        );
      } catch (err) {
        console.error("Error saving CBAT attempt:", err);
      }
    }

    // Forward to full RDSO T-Score Analysis page
    router.push(`/exam/${testId}/analysis`);
  };

  if (loadingQuestions) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #0b3b60', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: '#334155', fontWeight: 600 }}>Loading Station Master CBAT Test Questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cbat-root layout-${selectedLayout}`}>
      {/* --------------------------------------------------------------------
          1. TOP HEADER BAR
          -------------------------------------------------------------------- */}
      <header className="cbat-top-header">
        <div className="cbat-brand-box">
          <div className="cbat-logo-icon">
            <Trophy className="cbat-trophy-icon" />
          </div>
          <div className="cbat-brand-text">
            <h1>{examLang === 'hi' ? 'मॉक टेस्ट हब' : 'MOCK TEST HUB'}</h1>
            <p>{examLang === 'hi' ? "भारत का #1 परीक्षा तैयारी मंच" : "India's #1 Govt Exam Prep Terminal"}</p>
          </div>
          <span className="cbat-paper-badge">Paper Id : {paperTitle.toUpperCase().replace(/\s+/g, '_')}</span>
        </div>

        {/* Center: Jumble Option vs Normal Options (Shown in Question Stage) */}
        <div className="cbat-header-center">
          {stage === 'question' && (
            <>
              <button 
                className={`cbat-pill-btn cbat-jumble-btn ${isJumbled ? 'active' : 'inactive'}`}
                onClick={() => setIsJumbled(true)}
              >
                Jumble Option
              </button>
              <button 
                className={`cbat-pill-btn cbat-normal-btn ${!isJumbled ? 'active' : 'inactive'}`}
                onClick={() => setIsJumbled(false)}
              >
                Normal Options
              </button>
            </>
          )}
        </div>

        {/* Right: View Instruction, Countdown Timer & Fullscreen */}
        <div className="cbat-header-right">
          {stage === 'question' && (
            <button 
              className="cbat-view-instr-btn"
              onClick={() => setStage('instruction')}
            >
              View Instruction ℹ️
            </button>
          )}

          <div className="cbat-timer-badge">
            TIME LEFT : {formatTimer(timeLeft)}
          </div>

          <button 
            className="cbat-fullscreen-btn" 
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          2. SUB-TEST BATTERY TAB STRIP
          -------------------------------------------------------------------- */}
      <nav className="cbat-tabs-strip">
        <button className="tab-scroll-arrow">◀</button>
        <div className="cbat-tabs-list">
          {batteries.map((b, idx) => {
            const isActive = idx === batteryIdx;
            const isDone = idx < batteryIdx;
            const isUpcoming = idx > batteryIdx;
            return (
              <div 
                key={b.id} 
                className={`cbat-tab-item ${isActive ? 'active' : ''} ${isDone ? 'completed-locked' : ''} ${isUpcoming ? 'upcoming-locked' : ''}`}
                onClick={() => {
                  if (isDone) {
                    setLockedNotice(
                      examLang === 'hi'
                        ? `"${b.name}" सबमिट हो चुका है। आरडीएसओ नियमों के अनुसार पिछले सेक्शन में वापस नहीं जाया जा सकता।`
                        : `"${b.name}" has already been submitted. You cannot return to previous sections.`
                    );
                    setTimeout(() => setLockedNotice(null), 3500);
                  } else if (isUpcoming) {
                    setLockedNotice(
                      examLang === 'hi'
                        ? `"${b.name}" अभी लॉक है। वर्तमान सेक्शन पूरा करने के बाद यह स्वतः शुरू होगा।`
                        : `"${b.name}" is locked. It will start automatically after completing the current section.`
                    );
                    setTimeout(() => setLockedNotice(null), 3500);
                  }
                }}
                title={
                  isDone 
                    ? `${b.name} (Submitted & Locked)` 
                    : isUpcoming 
                    ? `${b.name} (Locked)` 
                    : `${b.name} (Active)`
                }
              >
                <span>{b.name} {stage === 'instruction' && isActive ? '(Instruction)' : ''}</span>
                {isDone ? (
                  <span className="tab-status-icon tab-locked-icon" title="Submitted & Locked">🔒</span>
                ) : (
                  <span className="tab-info-icon">ℹ️</span>
                )}
              </div>
            );
          })}
        </div>
        <button className="tab-scroll-arrow">▶</button>
      </nav>

      {/* --------------------------------------------------------------------
          3. MAIN WORKSPACE AREA (3 STAGES)
          -------------------------------------------------------------------- */}
      <main className="cbat-workspace">
        {/* ==========================================
            STAGE 1: INSTRUCTION STAGE
            ========================================== */}
        {stage === 'instruction' && (
          <div className="cbat-instruction-stage">
            {/* Left Content Area (70%) */}
            <div className="instruction-left-pane">
              <h2 className="instruction-title">
                {activeBattery.name} : {activeBattery.hindiName}
              </h2>
              <div className="instruction-meta-grid">
                <div>प्रश्नों की संख्या: {activeBattery.totalQuestions}</div>
                <div>समय सीमा: {activeBattery.durationMinutes} मिनट</div>
              </div>
              <div className="instruction-meta-grid">
                <div>Number of Questions: {activeBattery.totalQuestions}</div>
                <div>Time Limit: {activeBattery.durationMinutes} minutes</div>
              </div>

              <h3 className="instruction-heading">परीक्षण निर्देश / Test Instructions:</h3>
              <ul className="instruction-bullets">
                {activeBattery.instructionsHindi.map((text, i) => (
                  <li key={`hi_${i}`} className="instruction-bullet-item">
                    <span className="bullet-chevron">❯</span>
                    <span>{text}</span>
                  </li>
                ))}
                {activeBattery.instructionsEnglish.map((text, i) => (
                  <li key={`en_${i}`} className="instruction-bullet-item">
                    <span className="bullet-chevron">❯</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Sidebar Controls (30%) */}
            <aside className="instruction-right-pane">
              <div className="instruction-note-box">
                <p>
                  <span className="note-prefix">Note:</span> Total in this upcoming test, there are total{' '}
                  <strong>{activeBattery.totalQuestions}</strong> questions divided into{' '}
                  <strong>{activeBattery.chunks.length}</strong> parts. / आगामी आने वाले इस टेस्ट में कुल{' '}
                  <strong>{activeBattery.totalQuestions}</strong> प्रश्न{' '}
                  <strong>{activeBattery.chunks.length}</strong> पार्ट में विभाजित है।
                </p>
              </div>

              <div className="instruction-note-box">
                <p>
                  <span className="note-prefix">Note:</span> Total duration for the upcoming paper is{' '}
                  <strong>{activeBattery.durationMinutes} minutes</strong>. To adjust, click the "Change Time" button. / 
                  आगामी पेपर का कुल समय {activeBattery.durationMinutes} मिनट है। समय बदलने के लिए "Change Time" बटन पर क्लिक करें।
                </p>
                <button 
                  className="cbat-btn-blue"
                  onClick={() => setShowChangeTimeModal(true)}
                >
                  Change Time
                </button>
              </div>

              <div className="layout-picker-box">
                <p>
                  <span className="note-prefix">Note:</span> You can change the layout view of the upcoming paper by clicking
                  on the buttons below, and preview the changes.
                </p>
                <div className="layout-btn-grid">
                  <button 
                    className={`layout-select-btn ${selectedLayout === 'normal' ? 'active' : ''}`}
                    onClick={() => { setPendingLayout('Normal View'); setShowLayoutModal(true); }}
                  >
                    Normal View
                  </button>
                  <button 
                    className={`layout-select-btn ${selectedLayout === 'exam1' ? 'active' : ''}`}
                    onClick={() => { setSelectedLayout('exam1'); }}
                  >
                    Exam View 1
                  </button>
                  <button 
                    className={`layout-select-btn ${selectedLayout === 'view2' ? 'active' : ''}`}
                    onClick={() => { setPendingLayout('View 2'); setShowLayoutModal(true); }}
                  >
                    View 2
                  </button>
                  <button 
                    className={`layout-select-btn ${selectedLayout === 'view3' ? 'active' : ''}`}
                    onClick={() => { setPendingLayout('View 3'); setShowLayoutModal(true); }}
                  >
                    View 3
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ==========================================
            STAGE 2: REST TIME / EXAM SUMMARY
            ========================================== */}
        {stage === 'rest' && (
          <div className="cbat-rest-stage">
            <div className="cbat-rest-container">
              {batteries.slice(0, batteryIdx + 1).map((b, idx) => {
                const allQuestions = b.chunks.flat();
                const totalQ = allQuestions.length > 0 ? allQuestions.length : b.totalQuestions;
                const answeredCount = allQuestions.filter(
                  q => userResponses[q.id] !== undefined && userResponses[q.id] !== null && userResponses[q.id] !== ''
                ).length;
                const notAnsweredCount = Math.max(0, totalQ - answeredCount);

                const groupTitle = (() => {
                  if (b.batteryKey === 'Classification Test') return 'Test 1 - Intelligence Test - Classification Test Test (Previous Attempted Group)';
                  if (b.batteryKey === 'Add of Odd Numbers Test') return 'Test 2 - Selective Attention Test - Add of Odd Numbers Test Test (Previous Attempted Group)';
                  if (b.batteryKey === 'Short Route Test') return 'Test 3 - Spatial Scanning - Short Route Test Test (Previous Attempted Group)';
                  if (b.batteryKey === 'Information Ordering Type -I') return 'Test 4 - Information Ordering - Information Ordering Test (Previous Attempted Group)';
                  if (b.batteryKey === 'Personality Test') return 'Test 5 - Personality Test - Personality Test (Previous Attempted Group)';
                  return `Test ${idx + 1} - ${b.name} (Previous Attempted Group)`;
                })();

                const sectionName = (() => {
                  if (b.batteryKey === 'Information Ordering Type -I') return 'Information Ordering Test';
                  return b.batteryKey;
                })();

                return (
                  <div key={b.id} className="attempted-group-card">
                    <h4 className="attempted-group-title">{groupTitle}</h4>
                    <table className="cbat-summary-table">
                      <thead>
                        <tr>
                          <th>Section Name</th>
                          <th>No. Of Question</th>
                          <th>Answered</th>
                          <th>Not Answered</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="sec-name-cell">{sectionName}</td>
                          <td>{totalQ}</td>
                          <td>{answeredCount}</td>
                          <td>{notAnsweredCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            STAGE 3: LIVE QUESTIONS VIEW
            ========================================== */}
        {stage === 'question' && (
          <div className="cbat-question-stage">
            {/* Split Screen Left Pane (For Test 3 Grid Map or Test 4 Reference Tables) */}
            {activeBattery.isSplitView && (
              <div className="cbat-split-left-pane">
                {activeBattery.batteryKey === 'Short Route Test' && (
                  activeQuestionsChunk[0]?.refImageUrl ? (
                    <div className="short-route-map-wrapper">
                      <div className="grid-header-label">Grid - {chunkIdx + 1}</div>
                      <img 
                        src={activeQuestionsChunk[0].refImageUrl} 
                        alt={`Grid - ${chunkIdx + 1}`} 
                        style={{ width: '100%', maxHeight: '520px', objectFit: 'contain' }} 
                      />
                    </div>
                  ) : (
                    <ShortRouteGridMap gridNumber={chunkIdx} />
                  )
                )}
                {activeBattery.batteryKey === 'Information Ordering Type -I' && (
                  activeQuestionsChunk[0]?.refImageUrl ? (
                    <div className="info-ordering-tables-container">
                      <div className="info-tables-header">
                        तालिका-1 एवं तालिका-2 (Reference Tables)
                      </div>
                      <img 
                        src={activeQuestionsChunk[0].refImageUrl} 
                        alt="Reference Tables" 
                        className="info-ordering-reference-img"
                      />
                    </div>
                  ) : (
                    <InfoOrderingTables />
                  )
                )}
              </div>
            )}

            {/* Questions Pane */}
            <div className={`cbat-questions-pane ${activeBattery.batteryKey === 'Short Route Test' ? 'short-route-pane-scroll' : ''}`}>
              <div className="questions-section-header">
                <h3 className="questions-section-title">
                  {activeBattery.batteryKey === 'Short Route Test'
                    ? `Grid - ${chunkIdx + 1} - Question No. ${activeQuestionsChunk[0]?.orderIndex} - Question No. ${activeQuestionsChunk[activeQuestionsChunk.length - 1]?.orderIndex}`
                    : `${activeBattery.name} : ${activeBattery.chunks.length > 1 ? `Part-${chunkIdx + 1}` : ''} Question No. ${activeQuestionsChunk[0]?.orderIndex} - Question No. ${activeQuestionsChunk[activeQuestionsChunk.length - 1]?.orderIndex}`
                  }
                </h3>
                <div className="questions-sub-instruction">
                  Instruction: / Click an option to mark, click again to unmark.
                </div>
              </div>

              {/* Continuous Questions List */}
              <div className={`cbat-questions-list ${activeBattery.batteryKey === 'Short Route Test' ? 'short-route-questions-table' : ''} ${activeBattery.batteryKey === 'Information Ordering Type -I' ? 'info-ordering-questions-list' : ''}`}>
                {activeQuestionsChunk.map((q) => {
                  const optionsList = isJumbled ? q.jumbledOptions : q.normalOptions;
                  const selectedVal = userResponses[q.id];
                  const isFocused = activeQuestionId === q.id;
                  const isShortRoute = activeBattery.batteryKey === 'Short Route Test' || optionsList.length >= 10;
                  const isInfoOrdering = activeBattery.batteryKey === 'Information Ordering Type -I';

                  if (isInfoOrdering) {
                    return (
                      <div 
                        key={q.id}
                        className={`cbat-question-row info-ordering-card ${isFocused ? 'focused' : ''}`}
                        onClick={() => setActiveQuestionId(q.id)}
                      >
                        {/* Header: Question Number */}
                        <div className="info-ordering-card-header">
                          <div className="q-index-badge">
                            Question No. {q.orderIndex}
                          </div>
                        </div>

                        {/* Question Content / Flowchart Diagram */}
                        <div className="info-ordering-img-wrapper">
                          {q.imageUrl ? (
                            <img 
                              src={q.imageUrl} 
                              alt={`Question ${q.orderIndex}`} 
                              className="info-ordering-flowchart-img"
                            />
                          ) : q.rawHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: q.rawHtml }} />
                          ) : (
                            <div className="flowchart-process-row">
                              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>टेस्ट आकृति:</span>
                              <div style={{ width: '32px', height: '32px' }}>
                                {renderFigureShape(q.initialShapeVal || 1)}
                              </div>
                              <span>➔</span>
                              <div className="flowchart-box-strip">
                                {q.processBoxValues?.map(pb => (
                                  <div key={pb.box} className="process-cell">
                                    {pb.active ? 'X' : ''}
                                  </div>
                                ))}
                              </div>
                              <span>➔</span>
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>परिणाम आकृति कोड चुनें:</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom: Answer Options Row */}
                        <div className="info-ordering-answer-row">
                          <span className="info-ordering-answer-prompt">
                            उत्तर विकल्प चुनें (Choose Option):
                          </span>
                          <div className="cbat-radio-group info-ordering-radio-group">
                            {optionsList.map(opt => {
                              const isChecked = selectedVal === opt;
                              return (
                                <label
                                  key={opt}
                                  className={`cbat-radio-btn-label info-ordering-option-btn ${isChecked ? 'selected' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleOptionClick(q.id, opt);
                                  }}
                                >
                                  <div className={`cbat-radio-circle ${isChecked ? 'selected' : ''}`}>
                                    {isChecked && <div className="cbat-radio-inner-dot" />}
                                  </div>
                                  <span className="cbat-radio-label-text">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={q.id} 
                      className={`cbat-question-row ${isFocused ? 'focused' : ''} ${isShortRoute ? 'short-route-row' : ''}`}
                      onClick={() => setActiveQuestionId(q.id)}
                    >
                      {/* Left: Question Number */}
                      <div className="q-index-col">
                        {isShortRoute ? `Question${q.orderIndex}` : `Q.${q.orderIndex}`}
                      </div>

                      {/* Middle: Question Content (Format depends on test battery) */}
                      <div className="q-content-col">
                        {/* Test 1: Classification Figure Strip */}
                        {activeBattery.batteryKey === 'Classification Test' && (
                          q.imageUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <img 
                                src={q.imageUrl} 
                                alt={`Question ${q.orderIndex}`} 
                                style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain' }} 
                              />
                            </div>
                          ) : q.figures ? (
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              {q.figures.map(fig => (
                                <div key={fig.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <ClassificationFigure type={fig.svgType} rotation={fig.rotation} />
                                  <span style={{ fontWeight: 'bold', marginTop: '4px' }}>{fig.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : q.rawHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: q.rawHtml }} />
                          ) : null
                        )}

                        {/* Test 2: Selective Attention Digit String & Sum Options */}
                        {activeBattery.batteryKey === 'Add of Odd Numbers Test' && (
                          <>
                            <div className="odd-digit-sequence">
                              {q.digitString || q.promptText || (q.rawHtml ? <span dangerouslySetInnerHTML={{ __html: q.rawHtml }} /> : null)}
                            </div>
                            {q.sumOptions && q.sumOptions.length > 0 && (
                              <div className="sum-options-row">
                                {q.sumOptions.map(opt => (
                                  <span key={opt.key} className="sum-option-item">
                                    <strong>{opt.key}.</strong> {opt.val}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Test 3: Spatial Scanning Route Equation */}
                        {activeBattery.batteryKey === 'Short Route Test' && (
                          <div className="route-equation-prompt">
                            {q.routePrompt || q.promptText || (q.rawHtml ? <span dangerouslySetInnerHTML={{ __html: q.rawHtml }} /> : null)}
                          </div>
                        )}

                        {/* Test 5: Personality Test Bilingual Prompts */}
                        {activeBattery.batteryKey === 'Personality Test' && (
                          <>
                            {q.questionHindi && <div className="personality-prompt-hi">{q.questionHindi}</div>}
                            {q.questionEnglish && <div className="personality-prompt-en">{q.questionEnglish}</div>}
                            {!q.questionHindi && !q.questionEnglish && q.rawHtml && (
                              <div dangerouslySetInnerHTML={{ __html: q.rawHtml }} />
                            )}
                            <div className="personality-options-list">
                              {q.optionsHindiEnglish?.map(opt => (
                                <div key={opt.key}>
                                  <strong>{opt.key}.</strong> {opt.textHi} / {opt.textEn}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Fallback for any unmapped test batteries */}
                        {!['Classification Test', 'Add of Odd Numbers Test', 'Short Route Test', 'Information Ordering Type -I', 'Personality Test'].includes(activeBattery.batteryKey) && (
                          <div dangerouslySetInnerHTML={{ __html: q.rawHtml || q.promptText || '' }} />
                        )}
                      </div>

                      {/* Right: Custom Toggleable Radio Buttons */}
                      <div className={`cbat-radio-group ${isShortRoute ? 'short-route-radio-group' : ''}`}>
                        {optionsList.map(opt => {
                          const isChecked = selectedVal === opt;
                          return (
                            <label
                              key={opt}
                              className="cbat-radio-btn-label"
                              onClick={(e) => {
                                e.preventDefault(); // Stop native HTML locking
                                handleOptionClick(q.id, opt);
                              }}
                            >
                              <div className={`cbat-radio-circle ${isChecked ? 'selected' : ''}`}>
                                {isChecked && <div className="cbat-radio-inner-dot" />}
                              </div>
                              <span className="cbat-radio-label-text">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --------------------------------------------------------------------
          4. STICKY BOTTOM ACTION BAR
          -------------------------------------------------------------------- */}
      <footer className="cbat-bottom-footer">
        {stage === 'instruction' && (
          <button 
            className="cbat-action-green push-right"
            onClick={() => {
              setStage('question');
              setTimeLeft(customTimeSec);
              setChunkIdx(0);
            }}
          >
            SAVE & SKIP INSTRUCTION
          </button>
        )}

        {stage === 'question' && (
          <>
            <button className="cbat-action-yellow" onClick={handleClearResponse}>
              CLEAR RESPONSE
            </button>

            <div className="footer-nav-center">
              <button 
                className="cbat-action-gray"
                disabled={chunkIdx === 0}
                onClick={() => setChunkIdx(prev => Math.max(0, prev - 1))}
              >
                Prev. Que.
              </button>
              <button 
                className="cbat-action-navy"
                onClick={() => {
                  if (chunkIdx < activeBattery.chunks.length - 1) {
                    setChunkIdx(prev => prev + 1);
                  } else {
                    // Last chunk of this battery -> move to rest
                    setShowSkipTestModal(true);
                  }
                }}
              >
                Save & Next Que.
              </button>
            </div>

            <button 
              className="cbat-action-green"
              onClick={() => setShowSkipTestModal(true)}
            >
              SAVE & SKIP TEST
            </button>
          </>
        )}

        {stage === 'rest' && (
          <button 
            className="cbat-action-green push-right"
            onClick={() => setShowSkipRestModal(true)}
          >
            SAVE & SKIP RESULT
          </button>
        )}
      </footer>

      {/* --------------------------------------------------------------------
          5. MODALS & POPUPS
          -------------------------------------------------------------------- */}
      {/* A. Change Time Modal */}
      {showChangeTimeModal && (
        <div className="cbat-modal-overlay">
          <div className="cbat-modal-content">
            <div className="cbat-modal-header">
              <h3>Change Time For {activeBattery.name}</h3>
              <button className="cbat-modal-close-btn" onClick={() => setShowChangeTimeModal(false)}>✕</button>
            </div>
            <div className="cbat-modal-body">
              <p>Default Time: <strong>{activeBattery.durationSeconds} Seconds ({activeBattery.durationMinutes} Minutes)</strong></p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                <span>Edit Your Required Time:</span>
                <input 
                  type="number" 
                  value={customTimeSec} 
                  onChange={(e) => setCustomTimeSec(parseInt(e.target.value) || 60)}
                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <span>Sec.</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={timeAckChecked} 
                  onChange={(e) => setTimeAckChecked(e.target.checked)} 
                />
                <span>
                  I acknowledge that the time selected for this section will be fixed and cannot be changed during this test attempt at any time. /
                  मैं समझता/समझती हूं कि इसी सेक्शन के लिए उपरोक्त चयनित समय निश्चित होगा।
                </span>
              </label>
            </div>
            <div className="cbat-modal-footer">
              <button 
                className="cbat-btn-blue"
                disabled={!timeAckChecked}
                onClick={() => {
                  setTimeLeft(customTimeSec);
                  setShowChangeTimeModal(false);
                }}
              >
                Submit Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Confirm Layout Modal */}
      {showLayoutModal && (
        <div className="cbat-modal-overlay">
          <div className="cbat-modal-content">
            <div className="cbat-modal-header">
              <h3 style={{ color: '#0f172a' }}>Confirm Layout Selection</h3>
              <button className="cbat-modal-close-btn" onClick={() => setShowLayoutModal(false)}>✕</button>
            </div>
            <div className="cbat-modal-body">
              You selected layout <strong style={{ color: '#dc2626' }}>{pendingLayout}</strong>. Confirm to submit this layout?
            </div>
            <div className="cbat-modal-footer">
              <button className="cbat-action-gray" onClick={() => setShowLayoutModal(false)}>Cancel</button>
              <button 
                className="cbat-btn-blue"
                onClick={() => {
                  if (pendingLayout === 'Normal View') setSelectedLayout('normal');
                  else if (pendingLayout === 'View 2') setSelectedLayout('view2');
                  else if (pendingLayout === 'View 3') setSelectedLayout('view3');
                  setShowLayoutModal(false);
                }}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Skip Test Confirmation Modal */}
      {showSkipTestModal && (
        <div className="cbat-modal-overlay">
          <div className="cbat-modal-content">
            <div className="cbat-modal-header">
              <h3 style={{ color: '#dc2626' }}>End Test Confirmation</h3>
              <button className="cbat-modal-close-btn" onClick={() => setShowSkipTestModal(false)}>✕</button>
            </div>
            <div className="cbat-modal-body">
              Are you sure you want to end this test battery and proceed to the rest interval? Your answers for this battery will be submitted.
            </div>
            <div className="cbat-modal-footer">
              <button className="cbat-action-gray" onClick={() => setShowSkipTestModal(false)}>Cancel</button>
              <button 
                className="cbat-action-green"
                onClick={() => {
                  setShowSkipTestModal(false);
                  setStage('rest');
                }}
              >
                Yes, Submit Battery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Skip Rest Confirmation Modal */}
      {showSkipRestModal && (
        <div className="cbat-modal-overlay">
          <div className="cbat-modal-content">
            <div className="cbat-modal-header">
              <h3 style={{ color: '#0f172a' }}>Skip Rest Time</h3>
              <button className="cbat-modal-close-btn" onClick={() => setShowSkipRestModal(false)}>✕</button>
            </div>
            <div className="cbat-modal-body">
              Are you sure you want to skip the rest time and start the next test battery immediately?
            </div>
            <div className="cbat-modal-footer">
              <button className="cbat-action-gray" onClick={() => setShowSkipRestModal(false)}>Cancel</button>
              <button 
                className="cbat-action-green"
                onClick={() => {
                  setShowSkipRestModal(false);
                  if (batteryIdx < batteries.length - 1) {
                    setBatteryIdx(prev => prev + 1);
                    setChunkIdx(0);
                    setStage('instruction');
                  } else {
                    finalizeAndSubmitExam();
                  }
                }}
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Floating Warning Toast for Restricted Action */}
      {lockedNotice && (
        <div className="cbat-locked-toast">
          <span className="cbat-toast-icon">⚠️</span>
          <span>{lockedNotice}</span>
          <button className="cbat-toast-close" onClick={() => setLockedNotice(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
