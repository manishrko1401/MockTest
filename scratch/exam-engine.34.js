/**
 * Exam Engine - Main JavaScript
 * 
 * Handles exam interface logic including:
 * - Question rendering (OBO and ALL modes)
 * - Timer management
 * - Answer selection and storage
 * - Navigation and bookmarking
 * - Exam submission and review mode
 * 
 * @package ExamEngine
 * @version 2.0.0
 * going to recheck
 */

(function ($) {
    'use strict';

    // ========================================================================
    // EXAM ENGINE CLASS
    // ========================================================================

    class ExamEngine {
        constructor(config, questions) {
            // Configuration
            this.config = config || {};
            this.questions = questions || [];

            // State
            this.currentIndex = 0;
            this.userAnswers = {};
            this.bookmarks = new Set();
            this.mode = config.mode || 'writing';           // 'writing' | 'review'
            this.isReviewMode = (this.mode === 'review');   // backward-compat flag
            this.examResult = null;
            this.correctAnswers = {};
            this.explanations = {};
            this.reportedQuestionIds = new Set((config.reportedQuestionIds || []).map(qid => String(qid)));

            // Timer
            this.timeRemaining = config.examTimeSeconds || 0;
            this.timerInterval = null;
            this.attemptCreatedAt = parseInt(config.attemptCreatedAt, 10) || 0;
            this.startTime = this.attemptCreatedAt > 0
                ? new Date(this.attemptCreatedAt * 1000).toISOString()
                : new Date().toISOString();
            this.storage = this.getSessionStorage();
            this.storageKey = this.getStorageKey();

            // DOM Elements
            this.$questionArea = $('#questionArea');
            this.$examContent = $('#examContent');
            this.$examLoading = $('#examLoading');

            // Templates
            this.questionTemplate = document.getElementById('questionTemplate');
            this.answerTemplate = document.getElementById('answerTemplate');

            // Initialize
            this.init();
        }

        // ====================================================================
        // INITIALIZATION
        // ====================================================================

        init() {
            if (this.questions.length === 0) {
                this.showError('No questions available');
                return;
            }

            // Add view-all-mode class to HTML for smooth scrolling behavior
            if (this.config.viewMode === 'all') {
                $('html').addClass('view-all-mode');
            }

            this.restoreState();

            // Bind events
            this.bindEvents();
            this.updateReportSummaryDisplay();

            // Render questions
            this.renderQuestions();

            // Review mode: pre-populate data and enter review immediately
            if (this.mode !== 'writing') {
                this.userAnswers = this.config.userAnswers || this.config.reviewUserAnswers || {};
                this.correctAnswers = this.config.correctAnswers || this.config.reviewCorrectAnswers || {};
                this.explanations = this.config.explanations || this.config.reviewExplanations || {};
                this.examResult = this.config.examResult || this.config.reviewExamResult || null;

                // Pre-check the radios that the user originally selected
                for (const [qid, aid] of Object.entries(this.userAnswers)) {
                    const $option = $(`.question-card[data-qid="${qid}"] .answer-option[data-aid="${aid}"] .answer-radio`);
                    if ($option.length) {
                        $option.prop('checked', true);
                        $option.closest('.answer-option').addClass('selected');
                    }
                }

                // Enter review mode (hides timer, shows review status, applies answer states)
                this.enterReviewMode();

                // Show content
                this.$examLoading.hide();
                this.$examContent.show();

                // Preload images in the background
                this.preloadImages();

                console.log('ExamEngine initialized in REVIEW mode with', this.questions.length, 'questions');
                return;
            }

            // Start timer
            this.startTimer();

            // Show content
            this.$examLoading.hide();
            this.$examContent.show();

            // Update navigation
            this.updateNavigation();
            this.updateStatusCounts();
            this.buildNavigatorGrid();
            this.saveState();

            // Preload images in the background after everything is set up
            this.preloadImages();

            console.log('ExamEngine initialized with', this.questions.length, 'questions');
        }

        getSessionStorage() {
            try {
                const storage = window.sessionStorage;
                const testKey = '__exam_engine_storage_test__';
                storage.setItem(testKey, '1');
                storage.removeItem(testKey);
                return storage;
            } catch (error) {
                return null;
            }
        }

        getStorageKey() {
            if (!this.config.attemptId) {
                return '';
            }

            return 'exam_state_' + this.config.attemptId;
        }

        hasTrustedAttemptStart() {
            return this.attemptCreatedAt > 0;
        }

        getAuthoritativeTimeRemaining() {
            const examTimeSeconds = parseInt(this.config.examTimeSeconds, 10) || 0;
            if (examTimeSeconds <= 0) {
                return 0;
            }

            if (!this.hasTrustedAttemptStart()) {
                return Math.max(0, this.timeRemaining);
            }

            const nowSeconds = Math.floor(Date.now() / 1000);
            const elapsedSeconds = Math.max(0, nowSeconds - this.attemptCreatedAt);
            return Math.max(0, examTimeSeconds - elapsedSeconds);
        }

        saveState() {
            if (this.mode !== 'writing' || !this.storage || !this.storageKey) {
                return;
            }

            const state = {
                answers: this.userAnswers,
                bookmarks: Array.from(this.bookmarks),
                currentIndex: this.currentIndex,
                savedAt: Date.now()
            };

            try {
                this.storage.setItem(this.storageKey, JSON.stringify(state));
            } catch (error) {
                console.warn('Could not persist exam state', error);
            }
        }

        restoreState() {
            if (this.mode !== 'writing') {
                return;
            }

            this.timeRemaining = this.getAuthoritativeTimeRemaining();

            if (!this.storage || !this.storageKey) {
                return;
            }

            try {
                const saved = this.storage.getItem(this.storageKey);
                if (!saved) {
                    return;
                }

                const state = JSON.parse(saved);
                if (!state || typeof state !== 'object') {
                    return;
                }

                const validQids = new Set(this.questions.map((question) => String(question.qid)));
                const restoredAnswers = {};
                const rawAnswers = state.answers && typeof state.answers === 'object' ? state.answers : {};

                Object.entries(rawAnswers).forEach(([qid, aid]) => {
                    if (validQids.has(String(qid)) && aid !== null && aid !== '') {
                        restoredAnswers[qid] = aid;
                    }
                });

                this.userAnswers = restoredAnswers;

                const restoredBookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
                this.bookmarks = new Set(
                    restoredBookmarks.filter((index) => Number.isInteger(index) && index >= 0 && index < this.questions.length)
                );

                const restoredIndex = parseInt(state.currentIndex, 10);
                if (!Number.isNaN(restoredIndex) && restoredIndex >= 0 && restoredIndex < this.questions.length) {
                    this.currentIndex = restoredIndex;
                }
            } catch (error) {
                this.clearPersistedState();
            }
        }

        clearPersistedState() {
            if (!this.storage || !this.storageKey) {
                return;
            }

            try {
                this.storage.removeItem(this.storageKey);
            } catch (error) {
                console.warn('Could not clear persisted exam state', error);
            }
        }

        isReportFeatureEnabled() {
            return this.config.showReportButton === true;
        }

        isReportLimitReached() {
            return this.config.reportLimitReached === true;
        }

        hasQuestionBeenReported(qid) {
            return this.reportedQuestionIds.has(String(qid));
        }

        updateReportSummary(summary) {
            if (!summary || typeof summary !== 'object') {
                return;
            }

            this.config.reportLimit = parseInt(summary.limit, 10) || 0;
            this.config.reportUsed = parseInt(summary.used, 10) || 0;
            this.config.reportRemaining = parseInt(summary.remaining, 10) || 0;
            this.config.reportLimitReached = !!summary.limitReached;

            this.updateReportSummaryDisplay();
            this.refreshReportButtons();
        }

        updateReportSummaryDisplay() {
            const $remaining = $('#reportRemainingCount');
            const $limit = $('#reportLimitCount');

            if ($remaining.length) {
                $remaining.text(this.config.reportRemaining ?? 0);
            }

            if ($limit.length) {
                $limit.text(this.config.reportLimit ?? 0);
            }
        }

        refreshReportButtons() {
            const self = this;

            this.$questionArea.find('.question-card').each(function () {
                self.applyQuestionActionVisibility($(this));
            });
        }

        applyQuestionActionVisibility($card) {
            if (this.config.showEraseButton === false) {
                $card.find('.btn-erase').remove();
            }

            if (this.config.showBookmark === false) {
                $card.find('.btn-bookmark').remove();
            }

            const $reportButton = $card.find('.btn-report');
            if (!$reportButton.length) {
                return;
            }

            if (!this.isReportFeatureEnabled()) {
                $reportButton.remove();
                return;
            }

            const qid = String($card.data('qid') ?? '');
            const isAlreadyReported = qid !== '' && this.hasQuestionBeenReported(qid);
            const limitReached = this.isReportLimitReached();

            if (isAlreadyReported || limitReached) {
                const titleText = isAlreadyReported
                    ? 'Already reported in this session'
                    : 'Report limit reached for this session';

                $reportButton
                    .prop('disabled', true)
                    .attr('aria-disabled', 'true')
                    .attr('title', titleText)
                    .addClass('disabled');
            } else {
                $reportButton
                    .prop('disabled', false)
                    .removeAttr('aria-disabled')
                    .attr('title', 'Report')
                    .removeClass('disabled');
            }
        }

        showReportLimitReachedMessage() {
            const limit = parseInt(this.config.reportLimit, 10) || 0;

            Swal.fire({
                icon: 'warning',
                title: 'Report Limit Reached',
                text: `You can submit up to ${limit} reports in one session.`
            });
        }

        bindEvents() {
            const self = this;

            // Navigation buttons
            $('#btnPrev').on('click', () => this.navigatePrev());
            $('#btnNext').on('click', () => this.navigateNext());
            $('#btnNavigator').on('click', () => this.showNavigator());

            // End exam button
            $('#btnEndExam').on('click', () => this.confirmEndExam());

            // Review mode buttons
            $('#btnViewResult').on('click', () => this.showResultModal());
            $('#btnReviewAnswers').on('click', () => this.closeResultModal());
            $('#btnRetake').on('click', () => this.retakeExam());

            // Next Set button (premium exams)
            $('#btnNextSet, #btnNextSetModal').on('click', () => this.goToNextSet());

            // Another Full Exam button (full exams)
            $('#btnAnotherFullExam, #btnAnotherFullExamModal').on('click', () => this.goToAnotherFullExam());

            // Report submission
            $('#btnSubmitReport').on('click', () => this.submitReport());

            // Report details character counter
            $('#reportDetails').on('input', function () {
                $('#reportDetailsCount').text($(this).val().length);
            });

            // Answer selection (delegated)
            this.$questionArea.on('change', '.answer-radio', function () {
                const $option = $(this).closest('.answer-option');
                const qid = $option.closest('.question-card').data('qid');
                const aid = $option.data('aid');
                self.selectAnswer(qid, aid);
            });

            // Bookmark button (delegated)
            this.$questionArea.on('click', '.btn-bookmark', function () {
                const $card = $(this).closest('.question-card');
                const index = $card.data('question-index');
                self.toggleBookmark(index);
            });

            // Erase button (delegated)
            this.$questionArea.on('click', '.btn-erase', function () {
                const $card = $(this).closest('.question-card');
                const qid = $card.data('qid');
                self.clearAnswer(qid);
            });

            // Report button (delegated)
            this.$questionArea.on('click', '.btn-report', function () {
                const $card = $(this).closest('.question-card');
                const qid = $card.data('qid');
                const qno = $card.data('qno') || ($card.data('question-index') + 1);
                const sno = 'Q' + qno + ')';
                self.openReportModal(qid, sno);
            });

            // Navigator item click (delegated)
            $('#navigatorGrid').on('click', '.nav-item', function () {
                const index = parseInt($(this).data('index'));
                self.navigateTo(index);
                bootstrap.Modal.getInstance(document.getElementById('navigatorModal')).hide();
            });

            // Review mode navigation buttons
            $('#btnReviewPrev').on('click', function () {
                self.navigatePrev();
            });

            $('#btnReviewNext').on('click', function () {
                self.navigateNext();
            });

            $('#btnReviewNavigator').on('click', function () {
                self.showNavigator();
            });

            // Prevent accidental page leave
            $(window).on('beforeunload', function (e) {
                if (!self.isReviewMode) {
                    self.saveState();
                    e.preventDefault();
                    return 'You have an exam in progress. Are you sure you want to leave?';
                }
            });

            $(window).on('pagehide', function () {
                self.saveState();
            });

            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') {
                    self.saveState();
                }
            });
        }

        // ====================================================================
        // QUESTION RENDERING
        // ====================================================================

        renderQuestions() {
            this.$questionArea.empty();
            console.log('Rendering questions in', this.config.viewMode, 'mode');
            if (this.config.viewMode === 'all') {
                // Render all questions at once
                this.$questionArea.addClass('view-all');
                this.questions.forEach((q, index) => {
                    this.renderQuestion(q, index);
                });
            } else {
                // OBO mode - render current question only
                this.renderCurrentQuestion();
            }
        }

        renderCurrentQuestion() {
            if (this.config.viewMode !== 'all') {
                this.$questionArea.empty();
                const question = this.questions[this.currentIndex];
                if (question) {
                    this.renderQuestion(question, this.currentIndex);
                }
            }
        }

        renderQuestion(question, index) {
            const template = this.questionTemplate.content.cloneNode(true);
            const $card = $(template).find('.question-card');

            // Set data attributes
            $card.attr('data-question-index', index);
            $card.attr('data-qid', question.qid);
            $card.attr('id', 'question-anchor-' + question.qid); // Anchor for smooth scrolling in 'all' mode

            // Question number, QID and mark (inline with question text)
            const qNumber = index + 1;
            const mark = this.getQuestionMark(question.qid);
            const markText = mark + (mark === 1 ? ' Mark' : ' Marks');
            $card.attr('data-qno', qNumber);
            $card.find('.question-qid').text('QID: ' + question.qid);

            // Essay/Case Study
            if (question.essay && question.essayId > 0) {
                $card.find('.essay-block').show();
                $card.find('.essay-content').html(question.essay);
            }

            // Question image
            if (question.hasImage && question.questionImage) {
                this.loadImageGracefully($card.find('.question-image'), $card.find('.question-image img'), question.questionImage, 'ee-image-loading-md');
            }

            // Question text
            $card.find('.question-text')
                .attr('data-qprefix', 'Q' + qNumber)
                .attr('data-qmark', markText)
                .html(question.question);

            // Render answers
            const $answersContainer = $card.find('.answer-options');
            this.renderAnswers(question, $answersContainer);

            // Restore answer state
            const savedAnswer = this.userAnswers[question.qid];
            if (savedAnswer) {
                $card.find(`.answer-option[data-aid="${savedAnswer}"]`).addClass('selected');
                $card.find(`.answer-option[data-aid="${savedAnswer}"] .answer-radio`).prop('checked', true);
            }

            // Bookmark state
            if (this.bookmarks.has(index)) {
                $card.find('.btn-bookmark').addClass('active');
                $card.find('.btn-bookmark i').removeClass('bi-bookmark').addClass('bi-bookmark-fill');
            }

            this.applyQuestionActionVisibility($card);

            // Review mode state
            if (this.isReviewMode) {
                this.applyReviewState($card, question);
            }

            this.$questionArea.append($card);
        }

        renderAnswers(question, $container) {
            if (!question.answers || question.answers.length === 0) return;

            const radioName = 'q_' + question.qid;

            question.answers.forEach(answer => {
                // Skip empty/invalid answers
                if (!answer.answer || answer.answer === 'nnn' || answer.answer === '-' || answer.answer.trim() === '') {
                    return;
                }

                const template = this.answerTemplate.content.cloneNode(true);
                const $option = $(template).find('.answer-option');

                $option.attr('data-aid', answer.aid);
                $option.find('.answer-radio').attr('name', radioName);
                $option.find('.answer-letter').text(answer.letter);

                // Answer image
                if (answer.hasImage && answer.answerImage) {
                    this.loadImageGracefully($option.find('.answer-image'), $option.find('.answer-image img'), answer.answerImage, 'ee-image-loading-sm');
                }

                // Answer text
                if (answer.answer && answer.answer !== 'nnn') {
                    $option.find('.answer-text').html(answer.answer);
                }

                $container.append($option);
            });
        }

        getQuestionMark(qid) {
            // Find original question data to get mark
            const originalQ = this.questions.find(q => q.qid === qid);
            return originalQ?.mark || 1;
        }

        // ====================================================================
        // ANSWER HANDLING
        // ====================================================================

        selectAnswer(qid, aid) {
            this.userAnswers[qid] = aid;

            // Update UI
            const $card = $(`.question-card[data-qid="${qid}"]`);
            $card.find('.answer-option').removeClass('selected');
            $card.find(`.answer-option[data-aid="${aid}"]`).addClass('selected');

            // Update counts and navigator
            this.updateStatusCounts();
            this.updateNavigatorItem(this.currentIndex);
            this.saveState();
        }

        clearAnswer(qid) {
            delete this.userAnswers[qid];

            // Update UI
            const $card = $(`.question-card[data-qid="${qid}"]`);
            $card.find('.answer-option').removeClass('selected');
            $card.find('.answer-radio').prop('checked', false);

            // Update counts and navigator
            this.updateStatusCounts();
            this.updateNavigatorItem(this.currentIndex);
            this.saveState();
        }

        // ====================================================================
        // NAVIGATION
        // ====================================================================

        navigateTo(index) {
            if (index < 0 || index >= this.questions.length) return;

            this.currentIndex = index;

            if (this.config.viewMode === 'all') {
                // Scroll to question using anchor ID with native scrollIntoView
                const question = this.questions[index];
                const target = document.getElementById('question-anchor-' + question.qid);
                if (target) {
                    // Use native scrollIntoView - CSS scroll-padding-top handles the offset
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } else {
                // Re-render current question
                this.renderCurrentQuestion();
            }

            this.updateNavigation();

            // Update navigator grid current indicator
            $('#navigatorGrid .nav-item').removeClass('current');
            $(`#navigatorGrid .nav-item[data-index="${index}"]`).addClass('current');
            this.saveState();
        }

        navigatePrev() {
            if (this.currentIndex > 0) {
                this.navigateTo(this.currentIndex - 1);
            }
        }

        navigateNext() {
            if (this.currentIndex < this.questions.length - 1) {
                this.navigateTo(this.currentIndex + 1);
            }
        }

        updateNavigation() {
            // Update current question number
            $('#currentQuestionNum').text(this.currentIndex + 1);
            $('#totalQuestionNum').text(this.questions.length);
            $('#reviewCurrentQuestionNum').text(this.currentIndex + 1);
            $('#reviewTotalQuestionNum').text(this.questions.length);

            // Update prev/next buttons (both normal and review mode)
            $('#btnPrev, #btnReviewPrev').prop('disabled', this.currentIndex === 0);
            $('#btnNext, #btnReviewNext').prop('disabled', this.currentIndex === this.questions.length - 1);
        }

        // ====================================================================
        // BOOKMARKS
        // ====================================================================

        toggleBookmark(index) {
            const $card = $(`.question-card[data-question-index="${index}"]`);
            const $btn = $card.find('.btn-bookmark');

            if (this.bookmarks.has(index)) {
                this.bookmarks.delete(index);
                $btn.removeClass('active');
                $btn.find('i').removeClass('bi-bookmark-fill').addClass('bi-bookmark');
            } else {
                this.bookmarks.add(index);
                $btn.addClass('active');
                $btn.find('i').removeClass('bi-bookmark').addClass('bi-bookmark-fill');
            }

            this.updateStatusCounts();
            this.updateNavigatorItem(index);
            this.saveState();
        }

        // ====================================================================
        // NAVIGATOR
        // ====================================================================

        showNavigator() {
            this.buildNavigatorGrid();
            const modal = new bootstrap.Modal(document.getElementById('navigatorModal'));
            modal.show();
        }

        buildNavigatorGrid() {
            const $grid = $('#navigatorGrid');
            $grid.empty();

            this.questions.forEach((q, index) => {
                const $item = $('<div>')
                    .addClass('nav-item')
                    .attr('data-index', index)
                    .text(index + 1);

                const isBookmarked = this.bookmarks.has(index);
                const $bookmark = $('<span>')
                    .addClass('ee-nav-bookmark')
                    .html('<i class="bi bi-bookmark-fill"></i>');

                if (isBookmarked) {
                    $bookmark.addClass('visible');
                    $item.addClass('bookmarked');
                }

                $item.append($bookmark);

                // Apply states
                if (index === this.currentIndex) {
                    $item.addClass('current');
                }

                if (this.userAnswers[q.qid]) {
                    $item.addClass('answered');
                }

                // Review mode states
                if (this.isReviewMode) {
                    $item.removeClass('answered bookmarked');
                    const userAns = this.userAnswers[q.qid];
                    const correctAns = this.correctAnswers[q.qid];

                    if (!userAns) {
                        $item.addClass('review-unattempted');
                    } else if (userAns == correctAns) {
                        $item.addClass('review-correct');
                    } else {
                        $item.addClass('review-wrong');
                    }
                }

                $grid.append($item);
            });
        }

        updateNavigatorItem(index) {
            const q = this.questions[index];
            if (!q) return;

            const $item = $(`#navigatorGrid .nav-item[data-index="${index}"]`);
            if (!$item.length) return;

            $item.removeClass('answered bookmarked');

            if (this.userAnswers[q.qid]) {
                $item.addClass('answered');
            }

            if (this.bookmarks.has(index)) {
                $item.addClass('bookmarked');
            }

            const $bookmark = $item.find('.ee-nav-bookmark');
            if ($bookmark.length) {
                $bookmark.toggleClass('visible', this.bookmarks.has(index));
            } else if (this.bookmarks.has(index)) {
                $item.append('<span class="ee-nav-bookmark visible"><i class="bi bi-bookmark-fill"></i></span>');
            }
        }

        // ====================================================================
        // STATUS COUNTS
        // ====================================================================

        updateStatusCounts() {
            const total = this.questions.length;
            const attempted = Object.keys(this.userAnswers).length;
            const unattempted = total - attempted;
            const bookmarked = this.bookmarks.size;

            $('#attemptedCount').text(attempted);
            $('#unattemptedCount').text(unattempted);
            $('#bookmarkedCount').text(bookmarked);
        }

        // ====================================================================
        // TIMER
        // ====================================================================

        startTimer() {
            this.timeRemaining = this.getAuthoritativeTimeRemaining();
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.handleTimeUp();
                return;
            }

            this.timerInterval = setInterval(() => {
                if (this.hasTrustedAttemptStart()) {
                    this.timeRemaining = this.getAuthoritativeTimeRemaining();
                } else {
                    this.timeRemaining--;
                }

                if (this.timeRemaining < 0) {
                    this.timeRemaining = 0;
                }

                this.updateTimerDisplay();

                if (this.timeRemaining <= 0) {
                    this.handleTimeUp();
                }
            }, 1000);
        }

        updateTimerDisplay() {
            const hours = Math.floor(this.timeRemaining / 3600);
            const minutes = Math.floor((this.timeRemaining % 3600) / 60);
            const seconds = this.timeRemaining % 60;

            let display = '';
            if (hours > 0) {
                display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
                display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            $('#timerDisplay').text(display);

            // Timer warning/danger states
            const $timer = $('#examTimer');
            if (this.timeRemaining <= 60) {
                $timer.removeClass('timer-warning').addClass('timer-danger');
            } else if (this.timeRemaining <= 300) {
                $timer.addClass('timer-warning');
            }
        }

        handleTimeUp() {
            clearInterval(this.timerInterval);

            const behavior = this.config.timerBehavior;

            if (behavior === 'STRICT') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Time\'s Up!',
                    text: 'Your exam is being submitted automatically.',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    this.submitExam();
                });
            } else if (behavior === 'ALERT') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Time\'s Up!',
                    text: 'Your time has ended. You can still continue and submit when ready.',
                    confirmButtonText: 'OK'
                });
            }
            // 'NONE' - just stop the timer, do nothing
        }

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        // ====================================================================
        // EXAM SUBMISSION
        // ====================================================================

        confirmEndExam() {
            const attempted = Object.keys(this.userAnswers).length;
            const total = this.questions.length;
            const unattempted = total - attempted;

            let message = `You have attempted ${attempted} out of ${total} questions.`;
            if (unattempted > 0) {
                message += ` ${unattempted} questions are unattempted.`;
            }

            Swal.fire({
                title: 'End Exam?',
                html: message + '<br><br>Are you sure you want to submit?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Continue Exam'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.submitExam();
                }
            });
        }

        async submitExam() {
            this.saveState();
            this.stopTimer();

            // Show loading
            Swal.fire({
                title: 'Submitting...',
                text: 'Please wait while we process your answers.',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const questionIds = this.questions.map(q => q.qid);

            const payload = {
                attemptId: this.config.attemptId || '',
                csrf_token: this.config.csrfToken,
                examId: this.config.examId,
                examType: this.config.examType,
                questionType: this.config.questionType,
                setNumber: this.config.setNumber,
                userId: this.config.userId,
                userAnswers: this.userAnswers,
                questionIds: questionIds,
                attemptId: this.config.attemptId, // Security: session validation
                startTime: this.startTime,
                isFull: this.config.isFull,
                sc: this.config.sc || ''
            };

            try {
                const response = await fetch(this.config.apiBaseUrl + "submit-exam-api.php", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    this.examResult = data.data;
                    this.correctAnswers = data.data.correctAnswers || {};
                    this.explanations = data.data.explanations || {};
                    this.clearPersistedState();

                    Swal.close();
                    this.enterReviewMode();
                    this.showResultModal();
                } else if (data.code === 'RATE_LIMITED') {
                    const waitSeconds = data.data && typeof data.data.reset_in !== 'undefined'
                        ? parseInt(data.data.reset_in, 10)
                        : 60;
                    this.showRateLimitCountdownModal(data.message, waitSeconds);
                } else if (data.code === 'RATE_LIMITED_ABUSE') {
                    const waitSeconds = data.data && typeof data.data.reset_in !== 'undefined'
                        ? parseInt(data.data.reset_in, 10)
                        : 1800;
                    this.showRateLimitCountdownModal(data.message, waitSeconds, true);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Submission Failed',
                        text: data.message || 'An error occurred while submitting your exam.'
                    });
                }
            } catch (error) {
                console.error('Submit error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Could not connect to the server. Please check your internet connection.'
                });
            }
        }

        showRateLimitCountdownModal(message, waitSeconds, isAbuse = false) {
            let timeLeft = waitSeconds;
            const totalTime = waitSeconds;
            let timerInterval = null;

            const formatTime = (secs) => {
                if (secs >= 60) {
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${m}:${s.toString().padStart(2, '0')}`;
                }
                return secs.toString();
            };

            Swal.fire({
                title: isAbuse ? 'Access Suspended' : 'Submission Rate Limited',
                html: `
                    <div class="ee-rate-limit-container">
                        <p class="ee-rate-limit-message">${message}</p>
                        <div class="ee-rate-limit-countdown">
                            <svg class="ee-rate-limit-svg">
                                <circle class="ee-rate-limit-bg-circle" cx="70" cy="70" r="60"></circle>
                                <circle id="rateLimitProgress" class="ee-rate-limit-progress-circle" cx="70" cy="70" r="60"></circle>
                            </svg>
                            <div class="ee-rate-limit-text">
                                <span id="rateLimitSeconds">${formatTime(timeLeft)}</span>
                                <span class="ee-rate-limit-unit">sec</span>
                            </div>
                        </div>
                    </div>
                `,
                customClass: {
                    popup: 'ee-rate-limit-swal-popup',
                    confirmButton: 'ee-rate-limit-swal-confirm btn btn-primary'
                },
                confirmButtonText: isAbuse 
                    ? '<i class="bi bi-house-door-fill"></i> Go to Home' 
                    : '<i class="bi bi-hourglass-split"></i> Please Wait...',
                showConfirmButton: true,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    const confirmButton = Swal.getConfirmButton();
                    confirmButton.disabled = !isAbuse;

                    const secondsEl = document.getElementById('rateLimitSeconds');
                    const progressEl = document.getElementById('rateLimitProgress');
                    const unitEl = document.querySelector('.ee-rate-limit-unit');
                    const strokeDashOffsetVal = 377;

                    const updateProgress = () => {
                        const progress = timeLeft / totalTime;
                        const offset = strokeDashOffsetVal - (progress * strokeDashOffsetVal);
                        if (progressEl) {
                            progressEl.style.strokeDashoffset = offset;
                        }
                    };

                    const updateDisplay = () => {
                        const formatted = formatTime(timeLeft);
                        if (secondsEl) {
                            secondsEl.textContent = formatted;
                            // Dynamically adjust font size to prevent overflow for longer text
                            if (formatted.length > 4) {
                                secondsEl.parentElement.style.fontSize = '1.6rem';
                            } else if (formatted.length > 3) {
                                secondsEl.parentElement.style.fontSize = '1.9rem';
                            } else {
                                secondsEl.parentElement.style.fontSize = '2.2rem';
                            }
                        }

                        if (timeLeft >= 60) {
                            if (unitEl) unitEl.style.display = 'none';
                        } else {
                            if (unitEl) {
                                unitEl.style.display = 'block';
                                unitEl.textContent = 'sec';
                            }
                        }
                    };

                    updateProgress();
                    updateDisplay();

                    timerInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft <= 0) {
                            timeLeft = 0;
                            clearInterval(timerInterval);
                            timerInterval = null;

                            updateDisplay();
                            if (progressEl) progressEl.style.strokeDashoffset = strokeDashOffsetVal;

                            confirmButton.disabled = false;
                            confirmButton.innerHTML = isAbuse 
                                ? '<i class="bi bi-house-door-fill"></i> Go to Home' 
                                : '<i class="bi bi-play-fill"></i> Submit Exam';
                        } else {
                            updateDisplay();
                            updateProgress();
                        }
                    }, 1000);
                },
                willClose: () => {
                    if (timerInterval) {
                        clearInterval(timerInterval);
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (isAbuse) {
                        window.location.href = this.config.homeUrl || '/';
                    } else {
                        this.submitExam();
                    }
                }
            });
        }

        // ====================================================================
        // REVIEW MODE
        // ====================================================================

        enterReviewMode() {
            this.isReviewMode = true;
            this.currentIndex = 0; // Reset to first question
            this.clearPersistedState();

            // Update UI
            $('body').addClass('review-mode');
            $('#btnEndExam').hide();
            $('#examStatusRow').hide();
            $('#examReviewStatusRow').show();
            $('#examNavRow').hide();
            $('#examReviewNavRow').show();

            // Update review status counts
            const result = this.examResult;
            $('#correctCount').text(result.correct);
            $('#wrongCount').text(result.wrong);
            $('#reviewUnattemptedCount').text(result.unattempted);

            // Re-render questions with review state
            if (this.config.viewMode === 'all') {
                this.questions.forEach((q, index) => {
                    const $card = $(`.question-card[data-question-index="${index}"]`);
                    this.applyReviewState($card, q);
                });
            } else {
                this.renderCurrentQuestion();
            }

            // Switch navigator legend
            $('#navigatorLegendWriting').hide();
            $('#navigatorLegendReview').show();

            // Update navigator
            this.buildNavigatorGrid();
            this.updateNavigation();

            // Remove beforeunload warning
            $(window).off('beforeunload');
        }

        applyReviewState($card, question) {
            const qid = question.qid;
            const userAnswer = this.userAnswers[qid];
            const correctAnswer = this.correctAnswers[qid];
            const explanation = this.explanations[qid];
            const questionIndex = parseInt($card.attr('data-question-index'), 10);
            const isBookmarked = this.bookmarks.has(questionIndex);

            // Disable answer selection
            $card.find('.answer-radio').prop('disabled', true);

            // Mark correct answer (bold text is handled via CSS .answer-option.correct .answer-text)
            if (correctAnswer) {
                const $correctOption = $card.find(`.answer-option[data-aid="${correctAnswer}"]`);
                $correctOption.addClass('correct');

                if (userAnswer && userAnswer == correctAnswer) {
                    // User answered correctly — tick icon, correct colour
                    $correctOption.find('.answer-feedback')
                        .html('<i class="bi bi-check-circle-fill"></i> ' + this.config.text.correctAnswer)
                        .show();
                } else {
                    // Show correct answer indicator (info icon) — for both wrong & unattempted
                    $correctOption.find('.answer-feedback')
                        .html('<i class="bi bi-info-circle"></i> ' + this.config.text.correctIndicator)
                        .show();
                }
            }

            // Mark user's wrong answer
            if (userAnswer && userAnswer != correctAnswer) {
                const $userOption = $card.find(`.answer-option[data-aid="${userAnswer}"]`);
                $userOption.addClass('wrong');
                $userOption.find('.answer-feedback')
                    .html('<i class="bi bi-x-circle-fill"></i> ' + this.config.text.wrongAnswer)
                    .show();
            }

            // Review inline meta (right side): Not Attempted / Bookmark
            const reviewMetaItems = [];
            if (!userAnswer) {
                reviewMetaItems.push(`<span class="review-meta-item review-meta-unattempted"><i class="bi bi-info-circle"></i> ${this.config.text.notAttempted}</span>`);
            }
            if (isBookmarked) {
                reviewMetaItems.push('<span class="review-meta-item review-meta-bookmark text-warning" title="Bookmarked"><i class="bi bi-bookmark-fill"></i></span>');
            }
            if (reviewMetaItems.length > 0) {
                const reviewMetaHtml = reviewMetaItems.join('<span class="review-meta-sep">|</span>');
                $card.find('.question-footer-left').prepend(`<span class="question-review-meta text-muted small">${reviewMetaHtml}</span>`);
            }

            // Show explanation
            if (explanation) {
                // Validate explanation text
                const trimmedText = explanation.text ? explanation.text.trim() : '';
                const isTextValid = trimmedText &&
                    trimmedText !== '-' &&
                    trimmedText.toLowerCase() !== 'none';

                // Validate explanation image
                const trimmedImage = explanation.image ? explanation.image.trim() : '';
                const isImageValid = trimmedImage &&
                    trimmedImage !== '-' &&
                    trimmedImage !== 'nnn' &&
                    trimmedImage.toLowerCase() !== 'none';

                // Show explanation block only if at least one is valid
                if (isTextValid || isImageValid) {
                    const $expBlock = $card.find('.explanation-block');

                    // Show image if valid
                    if (isImageValid) {
                        this.loadImageGracefully($expBlock.find('.explanation-image'), $expBlock.find('.explanation-image img'), explanation.image, 'ee-image-loading-md');
                    } else {
                        $expBlock.find('.explanation-image').hide();
                    }

                    // Show text if valid
                    if (isTextValid) {
                        $expBlock.find('.explanation-content').html(explanation.text).show();
                    } else {
                        $expBlock.find('.explanation-content').hide();
                    }

                    $expBlock.show();
                }
            }

            // Hide erase button
            $card.find('.btn-erase').hide();
        }

        // ====================================================================
        // RESULT MODAL
        // ====================================================================

        showResultModal() {
            if (!this.examResult) return;

            const result = this.examResult;
            const isPassed = result.result === 'PASS';

            // Update modal content
            const $icon = $('#resultIcon');
            const $text = $('#resultText');
            const $circle = $('#scoreCircle');

            if (isPassed) {
                $icon.removeClass('fail').addClass('pass');
                $icon.find('i').removeClass('bi-x-circle-fill').addClass('bi-check-circle-fill');
                $text.removeClass('fail').addClass('pass').text(this.config.text.resultPass);
                $circle.removeClass('fail').addClass('pass');
            } else {
                $icon.removeClass('pass').addClass('fail');
                $icon.find('i').removeClass('bi-check-circle-fill').addClass('bi-x-circle-fill');
                $text.removeClass('pass').addClass('fail').text(this.config.text.resultFail);
                $circle.removeClass('pass').addClass('fail');
            }

            // Score
            $('#scorePercentage').text(Math.round(result.percentage) + '%');

            // Stats
            $('#statTotal').text(result.total_questions);
            $('#statCorrect').text(result.correct);
            $('#statWrong').text(result.wrong);
            $('#statUnattempted').text(result.unattempted);
            
            const rawScore = parseFloat(result.score);
            const formattedScore = isNaN(rawScore) ? result.score : (Math.round((rawScore + Number.EPSILON) * 100) / 100);
            $('#yourScore').text(formattedScore);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('resultModal'));
            modal.show();
        }

        closeResultModal() {
            // Modal closes automatically via data-bs-dismiss
            // Just scroll to top
            $('html, body').animate({ scrollTop: 0 }, 300);
        }

        // ====================================================================
        // RETAKE EXAM
        // ====================================================================

        retakeExam() {
            const dqc = parseInt(this.config.dqc || 0, 10);
            const threshold = parseInt(this.config.freshDemoThreshold || 50, 10);
            const havePremium = parseInt(this.config.havePremium || 0, 10);
            const isNextExam = (this.config.examType === 'demo' && dqc > threshold && havePremium === 0);

            Swal.fire({
                title: isNextExam ? 'Start Next Set?' : 'Retake Exam?',
                text: isNextExam ? 'This will start a new exam session with a fresh set of questions.' : 'This will start a new exam session. Your current review will be lost.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: isNextExam ? 'Yes, Start Next Set' : 'Yes, Retake',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.clearPersistedState();

                    if (isNextExam) {
                        // Fresh start: redirect to index.php with parameters to generate a new session
                        const url = 'index.php?exam-type=demo&user=' + encodeURIComponent(this.config.userId || 'guest') +
                            '&sc=' + encodeURIComponent(this.config.sc || '') +
                            '&examid=' + encodeURIComponent(this.config.examId || '') +
                            '&view=' + encodeURIComponent(this.config.viewMode || 'obo') +
                            '&mode=retake';
                        window.location.href = url;
                    } else {
                        if (this.mode !== 'writing') {
                            // In review mode, redirect to home/member page
                            window.location.href = this.config.homeUrl || '/';
                        } else {
                            // Normal mode: reload to restart
                            window.location.reload();
                        }
                    }
                }
            });
        }

        // ====================================================================
        // NEXT SET (Premium Exams)
        // ====================================================================

        goToNextSet() {
            if (!this.config.nextSetUrl) return;
            Swal.fire({
                title: 'Next Set?',
                text: 'This will take you to the next question set. Your current review will be lost.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Next Set',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.clearPersistedState();
                    window.location.href = this.config.nextSetUrl;
                }
            });
        }

        // ====================================================================
        // ANOTHER FULL EXAM (Full Exams)
        // ====================================================================

        goToAnotherFullExam() {
            if (!this.config.anotherFullExamUrl) return;
            Swal.fire({
                title: 'Another Full Exam?',
                text: 'This will start a new full exam session. Your current review will be lost.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Start',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.clearPersistedState();
                    window.location.href = this.config.anotherFullExamUrl;
                }
            });
        }

        // ====================================================================
        // REPORT QUESTION
        // ====================================================================

        openReportModal(qid, sno) {
            if (!this.isReportFeatureEnabled()) {
                return;
            }

            if (this.hasQuestionBeenReported(qid)) {
                Swal.fire({
                    icon: 'info',
                    title: 'Already Reported',
                    text: 'You already reported this question in this session.'
                });
                return;
            }

            if (this.isReportLimitReached()) {
                this.showReportLimitReachedMessage();
                return;
            }

            const modalElement = document.getElementById('reportModal');
            if (!modalElement) {
                return;
            }

            $('#reportQuestionId').val(qid);
            $('#reportQuestionNum').text(sno);
            $('#reportReason').val('');
            $('#reportDetails').val('');
            $('#reportDetailsCount').text('0');
            this.updateReportSummaryDisplay();

            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }

        async submitReport() {
            if (!this.isReportFeatureEnabled()) {
                return;
            }

            const qid = $('#reportQuestionId').val();
            const reason = $('#reportReason').val();
            const details = ($('#reportDetails').val() || '').trim();

            if (!qid) {
                return;
            }

            if (this.hasQuestionBeenReported(qid)) {
                Swal.fire({
                    icon: 'info',
                    title: 'Already Reported',
                    text: 'You already reported this question in this session.'
                });
                return;
            }

            if (this.isReportLimitReached()) {
                this.showReportLimitReachedMessage();
                return;
            }

            if (!reason) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Issue Type',
                    text: 'Please select an issue type before submitting.'
                });
                return;
            }

            const $submitButton = $('#btnSubmitReport');
            $submitButton.prop('disabled', true);

            const payload = {
                csrf_token: this.config.csrfToken,
                exam_session_token: this.config.examSessionToken,
                qid: qid,
                reason: reason,
                details: details
            };

            try {
                const response = await fetch(this.config.apiBaseUrl + 'submit-report-api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data && data.data && data.data.reportSummary) {
                    this.updateReportSummary(data.data.reportSummary);
                }

                if (data.success) {
                    this.reportedQuestionIds.add(String(qid));
                    this.refreshReportButtons();

                    const reportModal = document.getElementById('reportModal');
                    const modalInstance = reportModal ? bootstrap.Modal.getInstance(reportModal) : null;
                    if (modalInstance) {
                        modalInstance.hide();
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Report Submitted',
                        text: 'Thank you for your feedback. We will review it shortly.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    if (data.code === 'ALREADY_REPORTED') {
                        this.reportedQuestionIds.add(String(qid));
                        this.refreshReportButtons();
                    }

                    Swal.fire({
                        icon: (data.code === 'ALREADY_REPORTED' || data.code === 'REPORT_LIMIT_REACHED') ? 'warning' : 'error',
                        title: (data.code === 'ALREADY_REPORTED') ? 'Already Reported' : 'Submission Failed',
                        text: data.message || 'Could not submit the report.'
                    });
                }
            } catch (error) {
                console.error('Report error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Could not connect to the server.'
                });
            } finally {
                $submitButton.prop('disabled', false);
            }
        }

        // ======================================================================
        // UTILITIES
        // ======================================================================

        preloadImages() {
            if (this.questions.length === 0) return;

            const self = this;
            if (this.mode === 'writing') {
                setTimeout(() => {
                    self.questions.forEach(q => {
                        if (q.hasImage && q.questionImage) {
                            const img = new Image();
                            img.src = q.questionImage;
                        }
                        if (q.answers) {
                            q.answers.forEach(a => {
                                if (a.hasImage && a.answerImage) {
                                    const img = new Image();
                                    img.src = a.answerImage;
                                }
                            });
                        }
                    });
                }, 300);
            } else if (this.isReviewMode) {
                setTimeout(() => {
                    Object.values(self.explanations).forEach(exp => {
                        if (exp && exp.image && exp.image !== '-' && exp.image !== 'nnn' && exp.image.toLowerCase() !== 'none') {
                            const img = new Image();
                            img.src = exp.image;
                        }
                    });
                }, 500);
            }
        }

        loadImageGracefully($container, $imgElement, url, sizeClass) {
            const trimmedUrl = url ? url.trim() : '';
            if (!trimmedUrl || trimmedUrl === '-' || trimmedUrl === 'nnn' || trimmedUrl.toLowerCase() === 'none') {
                $container.hide();
                return;
            }

            const preloader = new Image();

            // Setup handlers
            preloader.onload = function () {
                $imgElement.attr('src', trimmedUrl).css('opacity', '1');
                $container.removeClass('ee-image-loading ' + sizeClass);
            };

            preloader.onerror = function () {
                // Graceful degradation: remove empty space
                $container.hide().removeClass('ee-image-loading ' + sizeClass);
            };

            // Set src to start fetching
            preloader.src = trimmedUrl;

            // If already loaded (e.g. from cache), complete synchronously to prevent flicker
            if (preloader.complete && preloader.naturalWidth !== 0) {
                $imgElement.attr('src', trimmedUrl).css('opacity', '1');
                $container.show().removeClass('ee-image-loading ' + sizeClass);
            } else {
                // Not cached or still loading, show skeleton
                $imgElement.css('opacity', '0').removeAttr('src');
                $container.show().addClass('ee-image-loading ' + sizeClass);
            }
        }

        showError(message) {
            this.$examLoading.html(`
                <div class="text-center text-danger">
                    <i class="bi bi-exclamation-circle" style="font-size: 3rem;"></i>
                    <p class="mt-3">${message}</p>
                </div>
            `);
        }
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    $(document).ready(function () {
        // Check if exam data is available
        if (typeof window.ExamConfig !== 'undefined' && typeof window.ExamQuestions !== 'undefined') {
            new ExamEngine(window.ExamConfig, window.ExamQuestions);

            // Clear global variables to prevent extraction via browser developer console
            window.ExamQuestions = null;
            window.ExamConfig = null;
            try {
                delete window.ExamQuestions;
                delete window.ExamConfig;
            } catch (e) {
                // Fail-safe for environments where delete on window properties throws
            }
        }

        // Check if Exam History page
        if (typeof window.ExamHistoryConfig !== 'undefined') {
            window.examHistory = new ExamHistoryManager(window.ExamHistoryConfig);
        }
    });

    // ========================================================================
    // EXAM HISTORY MANAGER CLASS
    // ========================================================================

    class ExamHistoryManager {
        constructor(config) {
            this.apiUrl = config.apiUrl;
            this.user = config.user;
            this.recent = config.recent;
            this.dateFrom = config.dateFrom;
            this.dateTo = config.dateTo;
            this.bofficeUser = config.bofficeUser || false;
            this.summary = config.summary || false;

            this.$table = $('#ehTable');
            this.$tbody = $('#ehTableBody');
            this.$loading = $('#ehLoading');
            this.$noData = $('#ehNoData');
            this.$count = $('#ehResultCount');
            this.$filterForm = $('#ehFilterForm');

            this.init();
        }

        init() {
            this.bindEvents();
            this.loadHistory();
        }

        bindEvents() {
            const self = this;

            // Filter form submit
            this.$filterForm.on('submit', function (e) {
                e.preventDefault();
                self.dateFrom = $('#ehDateFrom').val();
                self.dateTo = $('#ehDateTo').val();
                self.summary = $('#ehSummary').is(':checked');
                // Show loading state on the filter button
                const $btn = $('#ehBtnFilter');
                $btn.prop('disabled', true).html('<i class="bi bi-arrow-repeat bi-spin me-1"></i> Loading...');
                self.loadHistory().always(function () {
                    $btn.prop('disabled', false).html('<i class="bi bi-funnel"></i> Filter');
                });
            });

            // Export button
            $('#ehBtnExport').on('click', () => this.exportToExcel());

            // Review button (delegated)
            this.$tbody.on('click', '.eh-btn-review', function () {
                const sno = $(this).data('sno');
                self.loadReview(sno);
            });

            // Retake button (delegated)
            this.$tbody.on('click', '.eh-btn-retake', function () {
                const $btn = $(this);
                self.retakeFromHistory(
                    $btn.data('examid'),
                    $btn.data('sc'),
                    $btn.data('setnumber'),
                    $btn.data('questiontype')
                );
            });

            // Delete single exam (delegated) — no confirmation
            this.$tbody.on('click', '.eh-btn-delete', function () {
                const $tr = $(this).closest('tr');
                const sno = $(this).data('sno');
                self.deleteSingleExam(sno, $tr);
            });

            // Delete all exams button
            $(document).on('click', '#ehBtnDeleteAll', function () {
                self.deleteAllExams();
            });
        }

        // ====================================================================
        // FETCH EXAM HISTORY
        // ====================================================================

        loadHistory() {
            const self = this;
            this.$tbody.empty();
            this.$table.removeClass('d-none');
            this.$noData.addClass('d-none');
            this.$loading.removeClass('d-none');
            this.$count.text('');
            $('#ehBtnDeleteAll').addClass('d-none');
            $('#ehDeleteAllWrap').addClass('d-none');

            const payload = {
                action: 'exam-history',
                user: this.user,
                recent: this.recent,
            };

            if (!this.recent) {
                payload.date_from = this.dateFrom;
                payload.date_to = this.dateTo;
                payload.summary = this.summary;
            }

            return $.ajax({
                url: this.apiUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                dataType: 'json'
            })
                .done(function (resp) {
                    self.$loading.addClass('d-none');

                    if (!resp.success) {
                        self.$noData.removeClass('d-none').find('p').text(resp.message || 'Failed to load history.');
                        self.$table.addClass('d-none');
                        return;
                    }

                    const records = resp.data.records || [];
                    if (records.length === 0) {
                        self.$noData.removeClass('d-none');
                        self.$table.addClass('d-none');
                        self.$count.text('0 records found');
                        $('#ehBtnDeleteAll').addClass('d-none');
                        $('#ehDeleteAllWrap').addClass('d-none');
                        return;
                    }

                    self.$count.text(records.length + ' record(s) found');
                    $('#ehBtnDeleteAll').removeClass('d-none');
                    $('#ehDeleteAllWrap').removeClass('d-none');
                    self.renderTable(records);
                })
                .fail(function () {
                    self.$loading.addClass('d-none');
                    self.$noData.removeClass('d-none');
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to fetch exam history. Please try again.', confirmButtonColor: '#893B15' });
                });
        }

        // ====================================================================
        // RENDER TABLE
        // ====================================================================

        renderTable(records) {

            const self = this;
            let html = '';

            // Update heading
            const reportType = this.summary ? 'Summary' : 'Detailed';
            const dateFromParts = this.dateFrom.split('-');
            const dateToParts = this.dateTo.split('-');
            const formattedDateFrom = dateFromParts.length === 3 ? `${dateFromParts[2]}/${dateFromParts[1]}/${dateFromParts[0]}` : this.dateFrom;
            const formattedDateTo = dateToParts.length === 3 ? `${dateToParts[2]}/${dateToParts[1]}/${dateToParts[0]}` : this.dateTo;

            if (!this.recent) {
                $('#ehReportHeading').text(`Exam history ${reportType}: ${formattedDateFrom} to ${formattedDateTo}`).removeClass('d-none');
            } else {
                $('#ehReportHeading').addClass('d-none');
            }

            // Info icons for tooltips
            const info = {
                qtype: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Question Type"></i>',
                set: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Set Number"></i>',
                st: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Start Time"></i>',
                tt: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Time Taken (min)"></i>',
                tq: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Total Questions"></i>',
                at: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Attempted Questions"></i>',
                ca: '<i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Correct Answers"></i>',
            };

            // Update table headers based on mode
            const $thead = this.$table.find('thead tr');
            if (this.summary) {
                $thead.html(`
                        <th>Sno</th>
                        <th>ExamId</th>
                        <th>Type</th>
                        <th>QType ${info.qtype}</th>
                        <th>TQ ${info.tq}</th>
                        <th>AT ${info.at}</th>
                        <th>CA ${info.ca}</th>
                        <th>Avg Score%</th>
                    `);
            } else {
                $thead.html(`
                        <th>Sno</th>
                        <th>ExamId</th>
                        <th>Type</th>
                        <th>QType ${info.qtype}</th>
                        <th>Set ${info.set}</th>
                        <th>ST ${info.st}</th>
                        <th>TT ${info.tt}</th>
                        <th>TQ ${info.tq}</th>
                        <th>AT ${info.at}</th>
                        <th>CA ${info.ca}</th>
                        <th>Score%</th>
                        <th class="d-print-none">Actions</th>
                    `);
            }

            // Re-initialize Bootstrap tooltips after header update
            if (window.bootstrap && typeof window.bootstrap.Tooltip === 'function') {
                $thead.find('[data-bs-toggle="tooltip"]').each(function () {
                    new window.bootstrap.Tooltip(this);
                });
            }

            records.forEach(function (r, idx) {
                if (self.summary) {
                    const scoreClass = parseFloat(r.percentage) >= 50 ? 'eh-score-pass' : 'eh-score-fail';
                    html += '<tr>';
                    html += '<td>' + (idx + 1) + '</td>';
                    html += '<td>' + self.escapeHtml(self.ucfirst(r.examid)) + '</td>';
                    html += '<td>' + self.escapeHtml(self.ucfirst(r.exam_type)) + '</td>';
                    const qtypeDisplay = ((r.exam_type || '').toLowerCase() === 'full') ? 'All' : self.escapeHtml(self.ucfirst(r.question_type));
                    html += '<td>' + qtypeDisplay + '</td>';
                    html += '<td>' + r.total_questions + '</td>';
                    html += '<td>' + r.attempted_questions + '</td>';
                    html += '<td>' + r.correct_answers + '</td>';
                    html += '<td class="' + scoreClass + '">' + parseFloat(r.percentage).toFixed(1) + '%</td>';
                    html += '</tr>';
                } else {
                    const isFull = (r.exam_type || '').toLowerCase() === 'full';
                    const typeClass = isFull ? ' eh-type-full' : '';
                    const scoreClass = parseFloat(r.percentage) >= 50 ? 'eh-score-pass' : 'eh-score-fail';
                    const startTime = self.formatDateTime(r.starttime);
                    const timeTaken = (r.timetaken !== null && r.timetaken !== undefined) ? r.timetaken + ' min' : '-';

                    // Check if retake eligible: set_number > 0, exam_type = premium, question_type = mcq or case
                    const setNum = parseInt(r.set_number) || 0;
                    const etype = (r.exam_type || '').toLowerCase();
                    const qtype = (r.question_type || '').toLowerCase();
                    const sc = r.sc || '';
                    const isRetakeEligible = setNum > 0 && etype === 'premium' && (qtype === 'mcq' || qtype === 'case');

                    html += '<tr data-sno="' + r.sno + '">';
                    html += '<td>' + (idx + 1) + '</td>';
                    html += '<td>' + self.escapeHtml(r.examid) + '</td>';
                    html += '<td class="' + typeClass + '">' + self.escapeHtml(self.ucfirst(r.exam_type)) + '</td>';
                    // Show 'All' for full exams, otherwise show question type
                    const qtypeDisplay = ((r.exam_type || '').toLowerCase() === 'full') ? 'All' : self.escapeHtml(self.ucfirst(r.question_type));
                    html += '<td>' + qtypeDisplay + '</td>';
                    if (isFull) {
                        html += '<td></td>';
                    } else {
                        html += '<td>' + self.escapeHtml(r.set_number) + '</td>';
                    }
                    html += '<td>' + startTime + '</td>';
                    html += '<td>' + timeTaken + '</td>';
                    html += '<td>' + r.total_questions + '</td>';
                    html += '<td>' + r.attempted_questions + '</td>';
                    html += '<td>' + r.correct_answers + '</td>';
                    html += '<td class="' + scoreClass + '">' + parseFloat(r.percentage).toFixed(1) + '%</td>';
                    html += '<td class="d-print-none">';
                    html += '<button class="btn eh-btn-review" data-sno="' + r.sno + '" title="Review Exam"><i class="bi bi-eye-fill"></i></button>';
                    if (isRetakeEligible && !self.bofficeUser) {
                        html += ' <button class="btn eh-btn-retake" data-examid="' + self.escapeHtml(r.examid) + '" data-sc="' + self.escapeHtml(sc) + '" data-setnumber="' + setNum + '" data-questiontype="' + self.escapeHtml(qtype) + '" title="Retake Exam"><i class="bi bi-arrow-clockwise"></i></button>';
                    }
                    html += ' <button class="btn eh-btn-delete" data-sno="' + r.sno + '" title="Delete"><i class="bi bi-trash-fill text-danger"></i></button>';
                    html += '</td>';
                    html += '</tr>';
                }
            });

            this.$tbody.html(html);
        }

        // ====================================================================
        // LOAD REVIEW (EXAM REVIEW MODAL)
        // ====================================================================

        loadReview(examwriterSno) {
            // Submit form POST to exam-review.php which sets up session and redirects to exam-start.php in review mode
            const $form = $('#ehReviewForm');
            if ($form.length === 0) {
                console.error('Review form #ehReviewForm not found on page');
                return;
            }
            $form.find('input[name="examwriter_sno"]').val(examwriterSno);
            $form.find('input[name="user"]').val(this.user);

            Swal.fire({
                title: 'Loading Review...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $form.submit();
        }

        // ====================================================================
        // RETAKE FROM HISTORY
        // ====================================================================

        retakeFromHistory(examId, sc, setNumber, questionType) {
            if (!sc) {
                Swal.fire({
                    icon: 'info',
                    title: 'Retake Not Available',
                    text: 'Certification code is missing for this old exam record. Retake is available only for exams taken after the latest update.',
                    confirmButtonColor: '#893B15'
                });
                return;
            }

            Swal.fire({
                title: 'Retake Exam?',
                text: 'This will start a new exam session for Set ' + setNumber + '.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Retake',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#893B15'
            }).then((result) => {
                if (result.isConfirmed) {
                    const url = 'index.php?exam-type=premium&user=' + encodeURIComponent(this.user) +
                        '&sc=' + encodeURIComponent(sc) +
                        '&examid=' + encodeURIComponent(examId) +
                        '&setnumber=' + encodeURIComponent(setNumber) +
                        '&QuestionType=' + encodeURIComponent(questionType) +
                        '&mode=retake';
                    window.location.href = url;
                }
            });
        }



        // ====================================================================
        // DELETE SINGLE EXAM
        // ====================================================================

        deleteSingleExam(sno, $tr) {
            const self = this;
            $.ajax({
                url: this.apiUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ action: 'delete-exam', user: this.user, sno: sno }),
                dataType: 'json'
            })
                .done(function (resp) {
                    if (!resp.success) {
                        Swal.fire({ icon: 'error', title: 'Error', text: resp.message || 'Delete failed.', confirmButtonColor: '#893B15' });
                        return;
                    }
                    $tr.fadeOut(300, function () {
                        $(this).remove();
                        // Update displayed count
                        const remaining = self.$tbody.find('tr').length;
                        self.$count.text(remaining + ' record(s) found');
                        if (remaining === 0) {
                            self.$table.addClass('d-none');
                            self.$noData.removeClass('d-none');
                            self.$count.text('0 records found');
                        }
                    });
                })
                .fail(function () {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Delete failed. Please try again.', confirmButtonColor: '#893B15' });
                });
        }

        // ====================================================================
        // DELETE ALL EXAMS
        // ====================================================================

        deleteAllExams() {
            const self = this;
            Swal.fire({
                title: 'Delete All History?',
                text: 'This will permanently delete your entire exam history. This cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete All',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#dc3545'
            }).then((result) => {
                if (!result.isConfirmed) return;
                Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                $.ajax({
                    url: self.apiUrl,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ action: 'delete-all-exams', user: self.user }),
                    dataType: 'json'
                })
                    .done(function (resp) {
                        Swal.close();
                        if (!resp.success) {
                            Swal.fire({ icon: 'error', title: 'Error', text: resp.message || 'Delete failed.', confirmButtonColor: '#893B15' });
                            return;
                        }
                        self.loadHistory();
                    })
                    .fail(function () {
                        Swal.close();
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Delete failed. Please try again.', confirmButtonColor: '#893B15' });
                    });
            });
        }

        // ====================================================================
        // EXPORT TO EXCEL (CSV)
        // ====================================================================

        exportToExcel() {
            const self = this;

            Swal.fire({
                title: 'Preparing Export...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: this.apiUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    action: 'export-history',
                    user: this.user,
                    date_from: this.dateFrom,
                    date_to: this.dateTo,
                    summary: this.summary
                }),
                dataType: 'json'
            })
                .done(function (resp) {
                    Swal.close();

                    if (!resp.success || !resp.data.records || resp.data.records.length === 0) {
                        Swal.fire({ icon: 'info', title: 'No Data', text: 'No records to export.', confirmButtonColor: '#893B15' });
                        return;
                    }

                    self.downloadCsv(resp.data.records);
                })
                .fail(function () {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Export failed. Please try again.', confirmButtonColor: '#893B15' });
                });
        }

        downloadCsv(records) {
            const self = this;
            let headers = [];
            if (this.summary) {
                headers = ['Sno', 'ExamId', 'QType', 'Total Questions', 'Attempted', 'Correct Answers', 'Avg Score%'];
            } else {
                headers = ['Sno', 'ExamId', 'Type', 'QType', 'Set', 'Start Time', 'Time Taken (min)', 'Total Questions', 'Attempted', 'Correct Answers', 'Score%'];
            }
            let csv = headers.join(',') + '\n';

            records.forEach(function (r, idx) {
                let row = [];
                if (self.summary) {
                    row = [
                        idx + 1,
                        '"' + (r.examid || '').replace(/"/g, '""') + '"',
                        '"' + (r.question_type || '') + '"',
                        r.total_questions,
                        r.attempted_questions,
                        r.correct_answers,
                        parseFloat(r.percentage).toFixed(1)
                    ];
                } else {
                    row = [
                        idx + 1,
                        '"' + (r.examid || '').replace(/"/g, '""') + '"',
                        '"' + (r.exam_type || '') + '"',
                        '"' + (r.question_type || '') + '"',
                        r.set_number,
                        '"' + (r.starttime || '') + '"',
                        r.timetaken !== null ? r.timetaken : '',
                        r.total_questions,
                        r.attempted_questions,
                        r.correct_answers,
                        parseFloat(r.percentage).toFixed(1)
                    ];
                }
                csv += row.join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const reportType = this.summary ? 'summary' : 'detailed';
            link.setAttribute('download', 'exam-history-' + reportType + '-' + this.user + '-' + this.dateFrom + '-to-' + this.dateTo + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        // ====================================================================
        // UTILITY METHODS
        // ====================================================================

        formatDateTime(dt) {
            if (!dt) return '-';
            const d = new Date(dt);
            if (isNaN(d.getTime())) return dt;
            const pad = n => String(n).padStart(2, '0');
            return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() +
                ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        ucfirst(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        }
    }

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) {
            e.preventDefault();
            window.open(link.href, '_blank', 'noopener');
        }
    });


})(jQuery);

/**
 * Global Submit Button Loading State
 * Disables all submit buttons on click and sets a loading spinner.
 */
(function ($) {
    'use strict';
    $(document).on('submit', 'form', function () {
        const $form = $(this);

        // Skip forms that manage their own submit button state.
        const managedSubmitForms = ['formAddQuestion', 'formCaseEssay', 'ehFilterForm'];
        if (managedSubmitForms.indexOf($form.attr('id')) !== -1) return;

        // Find all submit buttons within this form
        const $btns = $form.find('button[type="submit"], input[type="submit"]');

        // Disable and show loading state
        $btns.prop('disabled', true);
        $btns.each(function () {
            const $btn = $(this);
            // Store original HTML if not already stored
            if (!$btn.attr('data-original-html')) {
                $btn.attr('data-original-html', $btn.html());
            }
            $btn.html('<i class="bi bi-arrow-repeat bi-spin me-2"></i> loading pls wait...');
        });
    });
})(jQuery);
