# TallyAssist

TallyAssist is a comprehensive AI-powered SaaS application designed to automate the extraction, categorization, and management of invoices. By leveraging Google's Gemini 2.5 Flash vision model, TallyAssist eliminates manual data entry, allowing businesses to seamlessly process invoices and export the data directly into Tally ERP format.

## 🚀 Key Features

*   **AI-Powered OCR & Extraction:** Instantly extracts Vendor Name, Invoice Number, Date, GSTIN, Total Amount, and detailed Line Items from any PDF, JPG, or PNG invoice.
*   **Smart Folder Organization:** Categorize your invoices into custom folders. Organize your expenses by project, vendor, or month using an intuitive dynamic dropdown system.
*   **Live Quota Tracking:** Stay on top of your API usage with real-time tracking of your Gemini API limits (per minute and per day) directly on the upload dashboard.
*   **Line Item Management:** Full control over extracted data. Manually edit, add, or delete specific line items before exporting.
*   **Tally ERP Export:** One-click JSON export perfectly structured for seamless importing into Tally ERP software.
*   **Premium Glassmorphism UI:** A stunning, modern, and responsive interface featuring dynamic scanner animations and tailored aesthetics.

## 🛠️ Technology Stack

**Frontend:**
*   React.js with Vite
*   React Router (SPA Navigation)
*   Lucide React (Icons)
*   Custom Vanilla CSS (Glassmorphism & Keyframe Animations)

**Backend:**
*   FastAPI (High-performance Python web framework)
*   SQLAlchemy & Psycopg2 (ORM and PostgreSQL driver)
*   Google GenAI SDK (Gemini 2.5 Flash for OCR)
*   PyJWT & Passlib (Authentication & Security)

**Database:**
*   PostgreSQL (Hosted via Neon)

## ⚙️ Local Development Setup

Follow these instructions to run TallyAssist locally.

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)
*   PostgreSQL Database URL
*   Google Gemini API Key

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL="postgresql://user:password@host/dbname"
   SECRET_KEY="your-super-secret-key"
   GEMINI_API_KEY="your-gemini-api-key"
   ```
5. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### 3. Access the Application
Open your browser and navigate to the local frontend server URL (usually `http://localhost:5173`). 

*   **Demo Account:** `demo@tallyassist.com`
*   **Password:** `password123`

## 📦 Deployment Ready

TallyAssist is architected for modern cloud deployment. 
*   The **Backend** is ready to be hosted on services like Render, Heroku, or AWS via Uvicorn.
*   The **Frontend** can be instantly built (`npm run build`) and deployed to Vercel, Netlify, or Cloudflare Pages.
*   The **Database** utilizes Neon, ensuring robust cloud-native PostgreSQL performance.
