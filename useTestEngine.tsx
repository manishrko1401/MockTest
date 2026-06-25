import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// ============================================================================
// TYPE DEFINITIONS FOR THE EXAM ENGINE
// ============================================================================

export interface OptionContent {
  text: string;
  imageUrl?: string;
  mathLatex?: string;
}

export interface QuestionContent {
  questionText: string;
  options: OptionContent[] | string[]; // Can support raw strings or rich option objects
  imageUrl?: string;
  mathLatex?: string;
}

export interface Question {
  id: string;
  sectionId: string;
  questionType: 'mcq' | 'numerical_value' | 'true_false';
  content: {
    en: QuestionContent;
    hi: QuestionContent;
  };
  correctOptionIndex: number; // Used for evaluation
  orderIndex: number;
}

export interface Section {
  id: string;
  name: string;
  orderIndex: number;
  positiveMark: number;
  negativeMark: number;
}

export interface ActiveSession {
  sessionId: string;
  testId: string;
  testTitle: string;
  totalDurationSeconds: number;
  sections: Section[];
  questions: Question[];
}

/**
 * TCS iON 5-State Palette Status:
 * 1: NOT_VISITED - White background, square edges.
 * 2: NOT_ANSWERED - Red background, top corners rounded.
 * 3: ANSWERED - Green background, bottom corners rounded.
 * 4: MARKED_FOR_REVIEW - Purple background, perfect circle.
 * 5: ANSWERED_AND_MARKED_FOR_REVIEW - Purple background, circle with green check badge (counted for evaluation).
 */
export type PaletteState = 1 | 2 | 3 | 4 | 5;

export interface QuestionResponse {
  questionId: string;
  selectedOptionIndex: number | null; // Saved option index
  tempOptionIndex: number | null;     // Unsaved selection (active UI radio button state)
  state: PaletteState;
  elapsedSeconds: number;
}

export interface EngineState {
  session: ActiveSession | null;
  currentSectionIndex: number;
  currentQuestionIndex: number; // Index within the current section
  responses: Record<string, QuestionResponse>; // key: questionId
  timeRemaining: number;
  isTimerRunning: boolean;
  language: 'en' | 'hi';
  violationsCount: number;
  maxViolationsAllowed: number;
  isExamSubmitted: boolean;
  isSyncing: boolean;
  score: {
    totalMarks: number;
    obtainedMarks: number;
    correctCount: number;
    incorrectCount: number;
    unattemptedCount: number;
    accuracyPercentage: number;
  } | null;
}

type EngineAction =
  | { type: 'INIT_SESSION'; payload: { session: ActiveSession; maxViolations?: number } }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'hi' }
  | { type: 'TICK_TIMER' }
  | { type: 'SELECT_OPTION'; payload: { optionIndex: number | null } }
  | { type: 'SAVE_AND_NEXT' }
  | { type: 'CLEAR_RESPONSE' }
  | { type: 'MARK_FOR_REVIEW_AND_NEXT' }
  | { type: 'JUMP_TO_QUESTION'; payload: { sectionIndex: number; questionIndex: number } }
  | { type: 'SWITCH_SECTION'; payload: { sectionIndex: number } }
  | { type: 'ADD_VIOLATION' }
  | { type: 'SUBMIT_EXAM' }
  | { type: 'SET_SYNCING'; payload: boolean };

// ============================================================================
// HELPER UTILITIES FOR THE ENGINE
// ============================================================================

/**
 * Gets the list of questions for a specific section index.
 */
const getSectionQuestions = (session: ActiveSession, sectionIndex: number): Question[] => {
  const section = session.sections[sectionIndex];
  if (!section) return [];
  return session.questions
    .filter((q) => q.sectionId === section.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
};

// ============================================================================
// ENGINE REDUCER LOGIC
// ============================================================================

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  if (!state.session && action.type !== 'INIT_SESSION') {
    return state;
  }

  const session = state.session!;

  switch (action.type) {
    case 'INIT_SESSION': {
      const { session, maxViolations = 3 } = action.payload;
      const initialResponses: Record<string, QuestionResponse> = {};

      // Initialize all questions to state 1 (NOT_VISITED)
      session.questions.forEach((q) => {
        initialResponses[q.id] = {
          questionId: q.id,
          selectedOptionIndex: null,
          tempOptionIndex: null,
          state: 1, // NOT_VISITED
          elapsedSeconds: 0,
        };
      });

      // Mark the very first question of the first section as state 2 (NOT_ANSWERED)
      const firstSectionQuestions = getSectionQuestions(session, 0);
      if (firstSectionQuestions.length > 0) {
        const firstQuestionId = firstSectionQuestions[0].id;
        initialResponses[firstQuestionId] = {
          ...initialResponses[firstQuestionId],
          state: 2, // NOT_ANSWERED
        };
      }

      return {
        session,
        currentSectionIndex: 0,
        currentQuestionIndex: 0,
        responses: initialResponses,
        timeRemaining: session.totalDurationSeconds,
        isTimerRunning: true,
        language: 'en',
        violationsCount: 0,
        maxViolationsAllowed: maxViolations,
        isExamSubmitted: false,
        isSyncing: false,
        score: null,
      };
    }

    case 'SET_LANGUAGE': {
      return {
        ...state,
        language: action.payload,
      };
    }

    case 'TICK_TIMER': {
      if (state.isExamSubmitted || !state.isTimerRunning) return state;

      const nextTimeRemaining = Math.max(0, state.timeRemaining - 1);
      const activeSectionQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const activeQuestion = activeSectionQuestions[state.currentQuestionIndex];

      // Update elapsed time for current question
      const updatedResponses = { ...state.responses };
      if (activeQuestion && updatedResponses[activeQuestion.id]) {
        updatedResponses[activeQuestion.id] = {
          ...updatedResponses[activeQuestion.id],
          elapsedSeconds: updatedResponses[activeQuestion.id].elapsedSeconds + 1,
        };
      }

      // Automatically submit when timer hits zero
      if (nextTimeRemaining === 0) {
        return engineReducer(
          {
            ...state,
            timeRemaining: 0,
            responses: updatedResponses,
          },
          { type: 'SUBMIT_EXAM' }
        );
      }

      return {
        ...state,
        timeRemaining: nextTimeRemaining,
        responses: updatedResponses,
      };
    }

    case 'SELECT_OPTION': {
      const activeSectionQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const activeQuestion = activeSectionQuestions[state.currentQuestionIndex];
      if (!activeQuestion) return state;

      const updatedResponses = { ...state.responses };
      updatedResponses[activeQuestion.id] = {
        ...updatedResponses[activeQuestion.id],
        tempOptionIndex: action.payload.optionIndex,
      };

      return {
        ...state,
        responses: updatedResponses,
      };
    }

    case 'SAVE_AND_NEXT': {
      const activeSectionQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const activeQuestion = activeSectionQuestions[state.currentQuestionIndex];
      if (!activeQuestion) return state;

      const updatedResponses = { ...state.responses };
      const currentResp = updatedResponses[activeQuestion.id];
      const hasSelection = currentResp.tempOptionIndex !== null;

      // Update state: ANSWERED (3) if selected, else NOT_ANSWERED (2)
      updatedResponses[activeQuestion.id] = {
        ...currentResp,
        selectedOptionIndex: currentResp.tempOptionIndex,
        state: hasSelection ? 3 : 2,
      };

      // Navigate forward
      let nextQuestionIndex = state.currentQuestionIndex + 1;
      let nextSectionIndex = state.currentSectionIndex;

      if (nextQuestionIndex >= activeSectionQuestions.length) {
        // Move to next section if available
        if (nextSectionIndex + 1 < session.sections.length) {
          nextSectionIndex += 1;
          nextQuestionIndex = 0;
        } else {
          // Wrap around or stay on last question (user must submit manually)
          nextQuestionIndex = state.currentQuestionIndex;
        }
      }

      const nextSectionQuestions = getSectionQuestions(session, nextSectionIndex);
      const nextQuestion = nextSectionQuestions[nextQuestionIndex];

      if (nextQuestion) {
        const nextResp = updatedResponses[nextQuestion.id];
        // If next question was NOT_VISITED (1), set to NOT_ANSWERED (2)
        if (nextResp.state === 1) {
          updatedResponses[nextQuestion.id] = {
            ...nextResp,
            state: 2,
          };
        }
        // Initialize temp option from saved option
        updatedResponses[nextQuestion.id].tempOptionIndex = updatedResponses[nextQuestion.id].selectedOptionIndex;
      }

      return {
        ...state,
        currentSectionIndex: nextSectionIndex,
        currentQuestionIndex: nextQuestionIndex,
        responses: updatedResponses,
      };
    }

    case 'CLEAR_RESPONSE': {
      const activeSectionQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const activeQuestion = activeSectionQuestions[state.currentQuestionIndex];
      if (!activeQuestion) return state;

      const updatedResponses = { ...state.responses };
      // Flush selections and set state to NOT_ANSWERED (2)
      updatedResponses[activeQuestion.id] = {
        ...updatedResponses[activeQuestion.id],
        selectedOptionIndex: null,
        tempOptionIndex: null,
        state: 2,
      };

      return {
        ...state,
        responses: updatedResponses,
      };
    }

    case 'MARK_FOR_REVIEW_AND_NEXT': {
      const activeSectionQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const activeQuestion = activeSectionQuestions[state.currentQuestionIndex];
      if (!activeQuestion) return state;

      const updatedResponses = { ...state.responses };
      const currentResp = updatedResponses[activeQuestion.id];
      const hasSelection = currentResp.tempOptionIndex !== null;

      // 5-State Rule:
      // Option chosen: ANSWERED_AND_MARKED_FOR_REVIEW (5)
      // No option chosen: MARKED_FOR_REVIEW (4)
      updatedResponses[activeQuestion.id] = {
        ...currentResp,
        selectedOptionIndex: currentResp.tempOptionIndex,
        state: hasSelection ? 5 : 4,
      };

      // Navigate forward
      let nextQuestionIndex = state.currentQuestionIndex + 1;
      let nextSectionIndex = state.currentSectionIndex;

      if (nextQuestionIndex >= activeSectionQuestions.length) {
        if (nextSectionIndex + 1 < session.sections.length) {
          nextSectionIndex += 1;
          nextQuestionIndex = 0;
        } else {
          nextQuestionIndex = state.currentQuestionIndex;
        }
      }

      const nextSectionQuestions = getSectionQuestions(session, nextSectionIndex);
      const nextQuestion = nextSectionQuestions[nextQuestionIndex];

      if (nextQuestion) {
        const nextResp = updatedResponses[nextQuestion.id];
        if (nextResp.state === 1) {
          updatedResponses[nextQuestion.id] = {
            ...nextResp,
            state: 2,
          };
        }
        updatedResponses[nextQuestion.id].tempOptionIndex = updatedResponses[nextQuestion.id].selectedOptionIndex;
      }

      return {
        ...state,
        currentSectionIndex: nextSectionIndex,
        currentQuestionIndex: nextQuestionIndex,
        responses: updatedResponses,
      };
    }

    case 'JUMP_TO_QUESTION': {
      const { sectionIndex, questionIndex } = action.payload;
      const targetQuestions = getSectionQuestions(session, sectionIndex);
      const targetQuestion = targetQuestions[questionIndex];
      if (!targetQuestion) return state;

      const updatedResponses = { ...state.responses };

      // Update current active question's state (discarding unsaved changes)
      const currentQuestions = getSectionQuestions(session, state.currentSectionIndex);
      const currentActiveQuestion = currentQuestions[state.currentQuestionIndex];
      if (currentActiveQuestion) {
        const activeResp = updatedResponses[currentActiveQuestion.id];
        // Revert temporary changes to saved value
        activeResp.tempOptionIndex = activeResp.selectedOptionIndex;

        // If the question was left active without selection/saving, it becomes NOT_ANSWERED (2)
        if (activeResp.state === 1) {
          activeResp.state = 2;
        }
      }

      // Prepare target question
      const targetResp = updatedResponses[targetQuestion.id];
      if (targetResp.state === 1) {
        targetResp.state = 2; // Transition target question from NOT_VISITED to NOT_ANSWERED
      }
      // Populate tempOptionIndex with saved selection
      targetResp.tempOptionIndex = targetResp.selectedOptionIndex;

      return {
        ...state,
        currentSectionIndex: sectionIndex,
        currentQuestionIndex: questionIndex,
        responses: updatedResponses,
      };
    }

    case 'SWITCH_SECTION': {
      const { sectionIndex } = action.payload;
      return engineReducer(state, {
        type: 'JUMP_TO_QUESTION',
        payload: { sectionIndex, questionIndex: 0 },
      });
    }

    case 'ADD_VIOLATION': {
      if (state.isExamSubmitted) return state;

      const nextViolations = state.violationsCount + 1;
      const triggerAutoSubmit = nextViolations >= state.maxViolationsAllowed;

      const nextState = {
        ...state,
        violationsCount: nextViolations,
      };

      if (triggerAutoSubmit) {
        return engineReducer(nextState, { type: 'SUBMIT_EXAM' });
      }

      return nextState;
    }

    case 'SUBMIT_EXAM': {
      if (state.isExamSubmitted) return state;

      // Evaluation Logic
      let totalMarks = 0;
      let obtainedMarks = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;

      session.sections.forEach((section) => {
        const questions = getSectionQuestions(session, session.sections.indexOf(section));

        questions.forEach((q) => {
          const resp = state.responses[q.id];
          const positive = Number(section.positiveMark);
          const negative = Number(section.negativeMark);

          totalMarks += positive;

          // TCS iON scoring validation rule:
          // Count only ANSWERED (3) or ANSWERED_AND_MARKED_FOR_REVIEW (5)
          if (resp && (resp.state === 3 || resp.state === 5)) {
            if (resp.selectedOptionIndex === q.correctOptionIndex) {
              obtainedMarks += positive;
              correctCount += 1;
            } else {
              obtainedMarks -= negative;
              incorrectCount += 1;
            }
          } else {
            unattemptedCount += 1;
          }
        });
      });

      const accuracyPercentage =
        correctCount + incorrectCount > 0
          ? (correctCount / (correctCount + incorrectCount)) * 100
          : 0;

      return {
        ...state,
        isTimerRunning: false,
        isExamSubmitted: true,
        score: {
          totalMarks,
          obtainedMarks: parseFloat(obtainedMarks.toFixed(2)),
          correctCount,
          incorrectCount,
          unattemptedCount,
          accuracyPercentage: parseFloat(accuracyPercentage.toFixed(2)),
        },
      };
    }

    case 'SET_SYNCING': {
      return {
        ...state,
        isSyncing: action.payload,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT PROVIDER SETUP
// ============================================================================

interface TestEngineContextType {
  state: EngineState;
  initSession: (session: ActiveSession, maxViolations?: number) => void;
  selectOption: (optionIndex: number | null) => void;
  saveAndNext: () => void;
  clearResponse: () => void;
  markForReviewAndNext: () => void;
  jumpToQuestion: (sectionIndex: number, questionIndex: number) => void;
  switchSection: (sectionIndex: number) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  addViolation: () => void;
  submitExam: () => void;
}

const TestEngineContext = createContext<TestEngineContextType | undefined>(undefined);

export const useTestEngine = () => {
  const context = useContext(TestEngineContext);
  if (!context) {
    throw new Error('useTestEngine must be used within a TestEngineProvider');
  }
  return context;
};

interface TestEngineProviderProps {
  children: React.ReactNode;
  onStateSync?: (state: EngineState) => Promise<void>; // Optional callback to sync state to database
  syncIntervalSeconds?: number;
}

export const TestEngineProvider: React.FC<TestEngineProviderProps> = ({
  children,
  onStateSync,
  syncIntervalSeconds = 15,
}) => {
  const [state, dispatch] = useReducer(engineReducer, {
    session: null,
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    responses: {},
    timeRemaining: 0,
    isTimerRunning: false,
    language: 'en',
    violationsCount: 0,
    maxViolationsAllowed: 3,
    isExamSubmitted: false,
    isSyncing: false,
    score: null,
  });

  // Action Dispatch wrappers
  const initSession = useCallback((session: ActiveSession, maxViolations?: number) => {
    dispatch({ type: 'INIT_SESSION', payload: { session, maxViolations } });
  }, []);

  const selectOption = useCallback((optionIndex: number | null) => {
    dispatch({ type: 'SELECT_OPTION', payload: { optionIndex } });
  }, []);

  const saveAndNext = useCallback(() => {
    dispatch({ type: 'SAVE_AND_NEXT' });
  }, []);

  const clearResponse = useCallback(() => {
    dispatch({ type: 'CLEAR_RESPONSE' });
  }, []);

  const markForReviewAndNext = useCallback(() => {
    dispatch({ type: 'MARK_FOR_REVIEW_AND_NEXT' });
  }, []);

  const jumpToQuestion = useCallback((sectionIndex: number, questionIndex: number) => {
    dispatch({ type: 'JUMP_TO_QUESTION', payload: { sectionIndex, questionIndex } });
  }, []);

  const switchSection = useCallback((sectionIndex: number) => {
    dispatch({ type: 'SWITCH_SECTION', payload: { sectionIndex } });
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'hi') => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
  }, []);

  const addViolation = useCallback(() => {
    dispatch({ type: 'ADD_VIOLATION' });
  }, []);

  const submitExam = useCallback(() => {
    dispatch({ type: 'SUBMIT_EXAM' });
  }, []);

  // 1. Timer ticking effect
  useEffect(() => {
    if (!state.isTimerRunning || state.isExamSubmitted) return;

    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isTimerRunning, state.isExamSubmitted]);

  // 2. Anti-Cheat: Tab/Window Blur tracker
  useEffect(() => {
    if (!state.isTimerRunning || state.isExamSubmitted) return;

    const handleBlur = () => {
      // Triggered when focus transitions off browser tab/window
      addViolation();
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [state.isTimerRunning, state.isExamSubmitted, addViolation]);

  // 3. Anti-Cheat: Disables right click context menu & blocks text selection / copy / cut / paste
  useEffect(() => {
    if (!state.isTimerRunning || state.isExamSubmitted) return;

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const preventKeyboardSteal = (e: KeyboardEvent) => {
      // Blocks Copy (Ctrl+C), Paste (Ctrl+V), Cut (Ctrl+X), Print (Ctrl+P), and Developer tools shortcut (F12)
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (
        (ctrlOrMeta && ['c', 'v', 'x', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardSteal);
    document.addEventListener('copy', preventSelection);
    document.addEventListener('cut', preventSelection);
    document.addEventListener('paste', preventSelection);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardSteal);
      document.removeEventListener('copy', preventSelection);
      document.removeEventListener('cut', preventSelection);
      document.removeEventListener('paste', preventSelection);
    };
  }, [state.isTimerRunning, state.isExamSubmitted]);

  // 4. Periodic background database synchronization
  useEffect(() => {
    if (!state.isTimerRunning || state.isExamSubmitted || !onStateSync) return;

    const syncTimer = setInterval(async () => {
      dispatch({ type: 'SET_SYNCING', payload: true });
      try {
        await onStateSync(state);
      } catch (err) {
        console.error('Failed to sync mock test state with remote database:', err);
      } finally {
        dispatch({ type: 'SET_SYNCING', payload: false });
      }
    }, syncIntervalSeconds * 1000);

    return () => clearInterval(syncTimer);
  }, [state.isTimerRunning, state.isExamSubmitted, state, onStateSync, syncIntervalSeconds]);

  // Sync on manual/auto-submission
  useEffect(() => {
    if (state.isExamSubmitted && onStateSync) {
      const syncOnComplete = async () => {
        dispatch({ type: 'SET_SYNCING', payload: true });
        try {
          await onStateSync(state);
        } catch (err) {
          console.error('Failed final exam state synchronization:', err);
        } finally {
          dispatch({ type: 'SET_SYNCING', payload: false });
        }
      };
      syncOnComplete();
    }
  }, [state.isExamSubmitted, onStateSync]);

  return (
    <TestEngineContext.Provider
      value={{
        state,
        initSession,
        selectOption,
        saveAndNext,
        clearResponse,
        markForReviewAndNext,
        jumpToQuestion,
        switchSection,
        setLanguage,
        addViolation,
        submitExam,
      }}
    >
      {children}
    </TestEngineContext.Provider>
  );
};
