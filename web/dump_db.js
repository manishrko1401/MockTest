const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

if (!dbUrl) {
  console.error("DATABASE_URL not found in web/.env");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database backup...");

  // Extract databaseHost and databaseRef from the URL
  // Example URL: postgresql://postgres.hnckbhnfwdxwamkjbltn:...@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
  let databaseHost = "unknown-host";
  let databaseRef = "unknown-ref";

  try {
    const matchHost = dbUrl.match(/@([^:/]+)/);
    if (matchHost) {
      databaseHost = matchHost[1];
    }
    const matchUser = dbUrl.match(/:\/\/([^:]+)/);
    if (matchUser) {
      const username = matchUser[1];
      if (username.startsWith("postgres.")) {
        databaseRef = username.split("postgres.")[1];
      } else {
        databaseRef = username;
      }
    }
  } catch (e) {
    console.warn("Could not parse dbUrl for host and ref:", e.message);
  }

  // Define tables in matching order to old FULL_DATABASE_BACKUP.json
  const tables = {};

  try {
    console.log("Fetching SubscriptionTiers...");
    tables.subscription_tiers = await prisma.subscriptionTier.findMany();

    console.log("Fetching Users...");
    tables.users = await prisma.user.findMany();

    console.log("Fetching UserSubscriptions...");
    tables.user_subscriptions = await prisma.userSubscription.findMany();

    console.log("Fetching Categories...");
    tables.categories = await prisma.category.findMany();

    console.log("Fetching Exams...");
    tables.exams = await prisma.exam.findMany();

    console.log("Fetching TestSeries...");
    tables.test_series = await prisma.testSeries.findMany();

    console.log("Fetching MockTests...");
    tables.mock_tests = await prisma.mockTest.findMany();

    console.log("Fetching Sections...");
    tables.sections = await prisma.section.findMany();

    console.log("Fetching Questions...");
    tables.questions = await prisma.question.findMany();

    console.log("Fetching UserTestSessions...");
    tables.user_test_sessions = await prisma.userTestSession.findMany();

    console.log("Fetching QuestionResponseStates...");
    tables.question_response_states = await prisma.questionResponseState.findMany();

    console.log("Fetching Notices...");
    tables.notices = await prisma.notice.findMany();

    console.log("Fetching ReportedQuestions...");
    tables.reported_questions = await prisma.reportedQuestion.findMany();

    console.log("Fetching SupportMessages...");
    tables.support_messages = await prisma.supportMessage.findMany();

    console.log("Fetching Feedbacks...");
    tables.feedbacks = await prisma.feedback.findMany();

    console.log("Fetching Suggestions...");
    tables.suggestions = await prisma.suggestion.findMany();

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      databaseHost,
      databaseRef,
      tables
    };

    const outputPath = path.join(__dirname, '..', 'FULL_DATABASE_BACKUP.json');
    console.log(`Writing backup to ${outputPath}...`);
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log("Backup complete!");
  } catch (error) {
    console.error("Backup failed:", error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
