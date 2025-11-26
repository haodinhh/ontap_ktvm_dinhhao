// Global variables
let allQuestions = [];
let currentQuiz = [];
let userAnswers = {};
let isSubmitted = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadMarkdownContent();
    setupEventListeners();
    loadThemePreference();
    setupScrollListener();
});

// Load and parse markdown content
async function loadMarkdownContent() {
    try {
        const response = await fetch('de_cleaned.md');
        const markdown = await response.text();

        // Parse questions from markdown
        parseQuestions(markdown);

    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('quizContent').innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">⚠️</div>
                <h2 style="color: var(--error-color);">Không thể tải nội dung</h2>
                <p>Vui lòng kiểm tra file <code>de_cleaned.md</code> có tồn tại trong cùng thư mục.</p>
            </div>
        `;
    }
}

// Parse questions from markdown
function parseQuestions(markdown) {
    const lines = markdown.split('\n');
    let currentQuestion = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if line starts with "**Câu"
        if (line.match(/^\*\*Câu\s+(\d+):/)) {
            // Save previous question if exists
            if (currentQuestion && currentQuestion.answers.length === 4) {
                allQuestions.push(currentQuestion);
            }

            // Start new question
            const questionMatch = line.match(/^\*\*Câu\s+(\d+):\*\*\s*(.+)/);
            if (questionMatch) {
                currentQuestion = {
                    id: parseInt(questionMatch[1]),
                    text: questionMatch[2],
                    answers: [],
                    correctAnswer: null
                };
            }
        }
        // Check for answer options - improved regex to handle various formats
        else if (line.match(/^-\s+\[(x| )\]/) && currentQuestion) {
            // Try to match: "- [x] **b. Text**" or "- [ ] a. Text"
            let answerMatch = line.match(/^-\s+\[(x| )\]\s+\*\*([a-d])\.\s*(.+?)\*\*/);

            // If not matched, try without bold: "- [ ] a. Text"
            if (!answerMatch) {
                answerMatch = line.match(/^-\s+\[(x| )\]\s+([a-d])\.\s*(.+)/);
            }

            if (answerMatch) {
                const isCorrect = answerMatch[1] === 'x';
                const optionLetter = answerMatch[2];
                let answerText = answerMatch[3];

                // Clean up answer text - remove extra ** and trailing text in parentheses
                answerText = answerText
                    .replace(/\*\*/g, '') // Remove all **
                    .replace(/\s*\(Giải thích:.*?\)\s*$/i, '') // Remove explanations
                    .replace(/\s*\(.*?\)\s*$/i, '') // Remove other parentheses content
                    .trim();

                currentQuestion.answers.push({
                    letter: optionLetter,
                    text: answerText,
                    isCorrect: isCorrect
                });

                if (isCorrect) {
                    currentQuestion.correctAnswer = optionLetter;
                }
            }
        }
    }

    // Add last question if it has 4 answers
    if (currentQuestion && currentQuestion.answers.length === 4) {
        allQuestions.push(currentQuestion);
    }

    console.log(`✅ Loaded ${allQuestions.length} questions`);

    // Debug: log first question to verify parsing
    if (allQuestions.length > 0) {
        console.log('Sample question:', allQuestions[0]);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
    document.getElementById('generateQuiz').addEventListener('click', generateRandomQuiz);
    document.getElementById('regenerateQuiz').addEventListener('click', regenerateQuiz);
    document.getElementById('submitQuiz').addEventListener('click', submitQuiz);
    document.getElementById('resetQuiz').addEventListener('click', resetQuiz);

    // Floating panel buttons
    document.getElementById('floatingRegenerate').addEventListener('click', regenerateQuiz);
    document.getElementById('floatingSubmit').addEventListener('click', submitQuiz);
    document.getElementById('floatingReset').addEventListener('click', resetQuiz);
}

// Setup scroll listener for floating panel
function setupScrollListener() {
    window.addEventListener('scroll', () => {
        const floatingPanel = document.getElementById('floatingPanel');
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Only show floating panel if quiz is active (currentQuiz has items)
        if (currentQuiz.length > 0) {
            // Show panel when scrolling down past 200px
            if (currentScroll > 200) {
                floatingPanel.style.display = 'flex';
            } else {
                floatingPanel.style.display = 'none';
            }
        }
    });
}

// Toggle dark/light theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const btn = document.getElementById('toggleTheme');
    btn.textContent = newTheme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối';
}

// Load theme preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const btn = document.getElementById('toggleTheme');
    btn.textContent = savedTheme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối';
}

// Generate random quiz with 40 questions
function generateRandomQuiz() {
    console.log(`Total questions available: ${allQuestions.length}`);

    if (allQuestions.length < 40) {
        alert(`Không đủ câu hỏi để tạo đề thi! Chỉ có ${allQuestions.length} câu.`);
        return;
    }

    // Reset state
    userAnswers = {};
    isSubmitted = false;

    // Shuffle and pick 40 random questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    currentQuiz = shuffled.slice(0, 40);

    console.log('Generated quiz with 40 questions');

    // Display quiz
    displayQuiz();

    // Show/hide buttons
    document.getElementById('generateQuiz').style.display = 'none';
    document.getElementById('regenerateQuiz').style.display = 'flex';
    document.getElementById('submitQuiz').style.display = 'flex';
    document.getElementById('resetQuiz').style.display = 'flex';
    document.getElementById('stats').style.display = 'grid';
    document.getElementById('scoreCard').style.display = 'none';

    // Update stats
    updateStats();
}

// Regenerate quiz - create new quiz without resetting to welcome screen
function regenerateQuiz() {
    const confirm = window.confirm('Bạn có chắc muốn tạo đề mới? Tất cả câu trả lời hiện tại sẽ bị xóa.');
    if (!confirm) return;

    // Simply call generateRandomQuiz again
    generateRandomQuiz();
}

// Display quiz questions
function displayQuiz() {
    const quizContent = document.getElementById('quizContent');

    const grid = document.createElement('div');
    grid.className = 'questions-grid';

    currentQuiz.forEach((question, index) => {
        const questionCard = createQuestionCard(question, index + 1);
        grid.appendChild(questionCard);
    });

    quizContent.innerHTML = '';
    quizContent.appendChild(grid);

    // Render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise([quizContent]).catch((err) => console.log('MathJax error:', err));
    }
}

// Create question card HTML
function createQuestionCard(question, displayNumber) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.questionId = question.id;

    const header = document.createElement('div');
    header.className = 'question-header';

    const number = document.createElement('div');
    number.className = 'question-number';
    number.textContent = displayNumber;

    const text = document.createElement('div');
    text.className = 'question-text';
    text.innerHTML = question.text;

    header.appendChild(number);
    header.appendChild(text);

    const answersList = document.createElement('ul');
    answersList.className = 'answers-list';

    question.answers.forEach(answer => {
        const li = document.createElement('li');
        li.className = 'answer-option';

        const label = document.createElement('label');
        label.className = 'answer-label';
        label.dataset.correct = answer.isCorrect;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `question-${question.id}`;
        radio.value = answer.letter;
        radio.addEventListener('change', () => handleAnswerChange(question.id, answer.letter));

        const answerText = document.createElement('span');
        answerText.className = 'answer-text';
        answerText.innerHTML = `<strong>${answer.letter}.</strong> ${answer.text}`;

        label.appendChild(radio);
        label.appendChild(answerText);
        li.appendChild(label);
        answersList.appendChild(li);
    });

    card.appendChild(header);
    card.appendChild(answersList);

    return card;
}

// Handle answer selection
function handleAnswerChange(questionId, selectedAnswer) {
    if (!isSubmitted) {
        userAnswers[questionId] = selectedAnswer;
        updateStats();
    }
}

// Update statistics
function updateStats() {
    const answeredCount = Object.keys(userAnswers).length;
    document.getElementById('answeredQuestions').textContent = answeredCount;
}

// Submit quiz and show results
function submitQuiz() {
    if (Object.keys(userAnswers).length < 40) {
        const confirm = window.confirm(`Bạn mới trả lời ${Object.keys(userAnswers).length}/40 câu. Bạn có chắc muốn nộp bài?`);
        if (!confirm) return;
    }

    isSubmitted = true;

    // Calculate score
    let correctCount = 0;
    currentQuiz.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (userAnswer === question.correctAnswer) {
            correctCount++;
        }
    });

    const score = (correctCount / 40 * 10).toFixed(2);

    // Show results
    document.getElementById('scoreDisplay').textContent = `${correctCount}/40 (${score} điểm)`;
    document.getElementById('scoreCard').style.display = 'block';

    // Mark correct/wrong answers
    document.querySelectorAll('.question-card').forEach(card => {
        card.classList.add('submitted');
        const questionId = parseInt(card.dataset.questionId);
        const question = currentQuiz.find(q => q.id === questionId);
        const userAnswer = userAnswers[questionId];

        card.querySelectorAll('.answer-label').forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            const answerLetter = radio.value;
            const isCorrect = label.dataset.correct === 'true';

            if (isCorrect) {
                label.classList.add('correct');
            } else if (answerLetter === userAnswer && !isCorrect) {
                label.classList.add('wrong');
            }
        });
    });

    // Hide submit and regenerate buttons
    document.getElementById('submitQuiz').style.display = 'none';
    document.getElementById('regenerateQuiz').style.display = 'none';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
    }
}

// Reset quiz - redo the current quiz (keep same questions, clear answers)
function resetQuiz() {
    const confirm = window.confirm('Bạn có chắc muốn làm lại đề này? Tất cả câu trả lời sẽ bị xóa.');
    if (!confirm) return;

    // Reset answers and state
    userAnswers = {};
    isSubmitted = false;

    // Re-display the same quiz
    displayQuiz();

    // Show/hide buttons - back to quiz mode
    document.getElementById('generateQuiz').style.display = 'none';
    document.getElementById('regenerateQuiz').style.display = 'flex';
    document.getElementById('submitQuiz').style.display = 'flex';
    document.getElementById('resetQuiz').style.display = 'flex';
    document.getElementById('stats').style.display = 'grid';
    document.getElementById('scoreCard').style.display = 'none';

    // Reset stats
    updateStats();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
