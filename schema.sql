-- ==========================================
-- Database Schema for Mock Test Platform
-- Optimized for PostgreSQL
-- Supports Testbook features (Subscriptions, Analytics) 
-- & TCS iON CBT Engine state tracking.
-- ==========================================

-- Enable UUID extension for secure identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    profile_photo_url VARCHAR(512),
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'content_creator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 2. Subscription Tiers Table (Testbook Pass Tiers)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(255) UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    validity_days INT NOT NULL CHECK (validity_days > 0),
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_subscriptions_modtime
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 3. User Subscriptions Table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > starts_at),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);


-- 4. Tests Table
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- e.g., 'SSC CGL', 'UPSC', 'IBPS PO'
    required_subscription_tier_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL, -- NULL = free
    total_duration_minutes INT NOT NULL CHECK (total_duration_minutes > 0),
    passing_cutoff NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tests_category ON tests(category);
CREATE INDEX idx_tests_subscription ON tests(required_subscription_tier_id);

CREATE TRIGGER update_tests_modtime
    BEFORE UPDATE ON tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 5. Sections Table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_index INT NOT NULL,
    positive_mark NUMERIC(4, 2) NOT NULL DEFAULT 2.00 CHECK (positive_mark >= 0),
    negative_mark NUMERIC(4, 2) NOT NULL DEFAULT 0.50 CHECK (negative_mark >= 0),
    UNIQUE(test_id, order_index)
);

CREATE INDEX idx_sections_test ON sections(test_id);


-- 6. Questions Table
-- content_json structure includes multi-lingual texts (en/hi), options lists, graphics, and mathematical expressions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'numerical_value', 'true_false')),
    content_json JSONB NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, order_index)
);

CREATE INDEX idx_questions_section ON questions(section_id);


-- 7. User Test Sessions Table
CREATE TABLE user_test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'auto_submitted', 'paused')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    remaining_seconds INT NOT NULL,
    anti_cheat_violations_count INT NOT NULL DEFAULT 0,
    calculated_score NUMERIC(6, 2),
    accuracy_percentage NUMERIC(5, 2),
    time_spent_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_test_sessions_user ON user_test_sessions(user_id);
CREATE INDEX idx_user_test_sessions_test ON user_test_sessions(test_id);
CREATE INDEX idx_user_test_sessions_status ON user_test_sessions(status);


-- 8. User Responses Table
-- Tracks state, selection, and response timing.
-- state integer represents:
-- 1 = NOT_VISITED (TCS iON State 1)
-- 2 = NOT_ANSWERED (TCS iON State 2)
-- 3 = ANSWERED (TCS iON State 3)
-- 4 = MARKED_FOR_REVIEW (TCS iON State 4)
-- 5 = ANSWERED_AND_MARKED_FOR_REVIEW (TCS iON State 5)
CREATE TABLE user_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES user_test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_index INT, -- Stores 0, 1, 2, 3 or null for cleared/unselected questions
    state INT DEFAULT 1 CHECK (state IN (1, 2, 3, 4, 5)),
    elapsed_seconds INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

CREATE INDEX idx_user_responses_session ON user_responses(session_id);
CREATE INDEX idx_user_responses_question ON user_responses(question_id);

CREATE TRIGGER update_user_responses_modtime
    BEFORE UPDATE ON user_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
