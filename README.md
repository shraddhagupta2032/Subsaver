# SubSaver

> **"A Smart App to Track, Share and Split Subscriptions & Group Expenses."**

SubSaver is a full-stack, cross-platform financial application designed to simplify personal recurring subscriptions, shared group plans (such as Netflix Family, Spotify Family, WiFi, utilities), split expenses, and automated payment tracking.

---

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database**: [PostgreSQL](https://www.postgresql.org/) / SQLite (Development & Unit Testing)
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) & [Pydantic V2](https://docs.pydantic.dev/)
- **Security**: JWT Authentication (OAuth2 Bearer Tokens) & Passlib (Bcrypt password hashing)
- **AI & OCR Engine**: [Google Gemini Vision AI](https://ai.google.dev/) (`gemini-1.5-flash`) for multi-format invoice & receipt OCR extraction

### Mobile
- **Framework**: [React Native](https://reactnative.dev/) with [Expo SDK 51](https://expo.dev/)
- **Navigation**: [React Navigation 6](https://reactnavigation.org/) (Native Stack + Bottom Tabs)
- **Storage**: AsyncStorage (Secure local token & session persistence)
- **Icons**: Expo Vector Icons (`Ionicons`)
- **Theme**: Dark Slate Modern Fintech Design System (`#0F172A` / `#6366F1`)

---

## Major Features

1. **Authentication & Session Security**:
   - Secure registration, email normalization, bcrypt password hashing, and JWT token issuance.
   - Client-side token storage, session auto-restoration, and automatic 401 interception.

2. **Group Management & Equal Splits**:
   - Create private groups, invite members, and manage shared group environments.
   - Exact **cent-safe splitting** algorithm guaranteeing sum of member shares strictly equals total expense (zero lost cents).

3. **Payment Tracking & Pay Later**:
   - Individual split state machine (`PENDING`, `PAY_LATER`, `PAID`).
   - Promise payment dates with automated validation and paid timestamp recording.

4. **Personal & Shared Group Subscriptions**:
   - Recurring billing cycles (`MONTHLY`, `YEARLY`, `WEEKLY`, `CUSTOM`).
   - Automated group renewal generator: automatically generates group expenses on renewal dates and advances next billing dates with leap year and month-end safety.

5. **AI Bill Scanner & Smart Draft Review (Human-in-the-Loop)**:
   - Camera & Gallery receipt capture with Google Gemini OCR parsing.
   - Extracts merchant name, total amount, billing cycle, renewal date, and document type.
   - Interactive review screen allowing users to edit fields before explicit confirmation into an Expense, Personal Subscription, or Shared Subscription.

6. **Subscription Intelligence & Health Scoring**:
   - Monthly and annualized subscription burden calculation.
   - Category concentration analysis and overlap detection (e.g. streaming, cloud services).
   - Subscription Health Rating (0–100) with diagnostic factors and smart optimization recommendations.

7. **Category Budgets & Alerts**:
   - Set monthly spending limits per category (Food, Entertainment, Utilities, etc.) with customizable alert thresholds (e.g. 80%).
   - Dynamic authoritative statuses: `WITHIN_LIMIT`, `NEAR_LIMIT`, `OVER_LIMIT`.

8. **Group Debt Settlement & Simplification**:
   - Graph-based debt simplification algorithm minimizing total cross-payments in groups.
   - Record settlement payments across multiple payment methods (`UPI`, `CASH`, `BANK_TRANSFER`, `OTHER`).

9. **Automated Notification & Reminder Center**:
   - Automated detection of upcoming subscription renewals and expense due dates.
   - In-app notification center with read/unread tracking and quick batch actions.

10. **Unified Financial Dashboard & Analytics**:
    - Top 4 summary cards: Monthly Spending, Subscriptions, You Owe, You Are Owed.
    - MoM spending comparisons and 6-month historical monthly spending bar chart.
    - Unified recent activity feed across expenses, subscriptions, and settlements.

---

## Architecture

### System Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                   React Native Mobile                    │
│    (Expo / React Navigation / AsyncStorage / REST Client)│
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS / JSON (JWT Auth)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    FastAPI Backend                       │
│  ├── Auth & User Management                              │
│  ├── Groups & Cent-Safe Expense Split Engine             │
│  ├── Personal & Shared Group Subscription Engine         │
│  ├── Category Budget Status & Alert Engine               │
│  ├── Debt Simplification & Settlement Engine             │
│  ├── Automated Notification & Reminder Engine            │
│  └── Subscription Intelligence & Analytics Engine        │
└────────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│  PostgreSQL Database  │         │ Google Gemini AI OCR  │
│  (SQLAlchemy Models)  │         │  (Vision API Service) │
└───────────────────────┘         └───────────────────────┘
```

### AI Bill Scanner Workflow (Human-in-the-Loop)

```text
[Invoice / Receipt] ──► [Mobile Upload] ──► [FastAPI /bill-scanner/scan]
                                                    │
                                                    ▼
                                            [Gemini Vision OCR]
                                                    │
                                                    ▼
[Backend Database] ◄── [User Explicit Confirmation] ◄── [Interactive Draft Review]
```

---

## Getting Started Locally

### 1. Backend Setup

```bash
# Navigate to Backend directory
cd Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API interactive documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2. Mobile App Setup

```bash
# Navigate to Mobile directory
cd Mobile

# Install dependencies
npm install

# Start Expo development server
npm start
```

Run on:
- **Android Emulator**: Press `a` in the terminal or run `npm run android`
- **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
- **Physical Device**: Scan the QR code using the **Expo Go** app.

---

## Environment Variables

### Backend Configuration (`Backend/.env`)

```ini
# Database URL (Defaults to PostgreSQL or SQLite fallback)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subsaver_db

# Security & JWT Configuration
SECRET_KEY=your_secure_random_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google Gemini API Key for AI Bill Scanner (Optional)
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Mobile Configuration

By default:
- **Android Emulator**: connects to `http://10.0.2.2:8000`
- **iOS Simulator / Web**: connects to `http://localhost:8000`
- **Physical Devices**: configure the server IP in app settings or via `setApiBaseUrl('http://<YOUR_LAN_IP>:8000')`.

---

## Verification & Testing

Run all automated integration test suites across all 20 phases:

```bash
cd Backend
.\venv\Scripts\python.exe -m pytest scratch/
```

---

## License

MIT License • Developed for SubSaver Project.