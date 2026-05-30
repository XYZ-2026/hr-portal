# College Simplified — HR Portal 💼

Welcome to the **College Simplified HR Portal** (developed for Concept Simplified). This is a state-of-the-art, premium administrative dashboard built for managing employees, analyzing department headcount/expenditures, and programmatically generating and emailing official documents.

---

## 🌟 Key Features

### 1. 📊 Interactive Dashboard & Metrics
- **Dynamic Charting**: Visualize monthly salary expenditures and headcount statistics with sleek interactive charts.
- **Department Insights**: Drill down into average salary numbers, total budgets, and headcount percentages for each team.
- **Employee Directory**: Easily search, view, and update details for active and historical employees.

### 2. 📄 Document Generation Pipeline
- **Offer Letters**: Generate custom offer letters using your custom `OFFER_LETTER.pptx` corporate letterhead.
- **Experience Letters**: Generate formal experience letters. Dynamic values like **Joining Date**, **Relieving Date**, and **Total Duration** are rendered in **Poppins Bold** while leaving surrounding text clean and un-bolded.
- **Letters of Recommendation (LOR)**: Create simplified general LORs addressed *"To Whomsoever It May Concern"*. Supports automatic replacement of the LOR body paragraph, including fixing custom typos (like replacing `"Test"` with the employee's name dynamically).

### 3. ⚙️ Robust Headless PDF Engine (Windows & Linux Support)
- **Multi-Platform Support**: Uses **headless LibreOffice** for ultra-fast PowerPoint-to-PDF conversion.
- **Windows COM Fallback**: If LibreOffice is absent on Windows, falls back gracefully to headless Microsoft PowerPoint (`pywin32`).
- **Antigravity COM Enhancer**: Automatically detects and terminates lingering background PowerPoint processes, suppresses alert dialogs (`DisplayAlerts = 0`), and disposes of COM hooks (`del powerpoint`) to ensure the server never hangs.
- **Extended Connection Timeout**: Increased frontend connection timeout to **90 seconds** to tolerate slow rendering under peak system load.

### 4. 📬 Gmail API Delivery
- Real-time official document delivery via the **Gmail API**.
- Sends clean emails with attachments to the candidate/employee and carbon-copies to **`support@collegesimplified.in`**.
- Automatic server-side cleanup of temporary `.pptx` and `.pdf` cache files after successful email delivery.

### 5. 🔒 High-Security Authentication
- Administrator-only sign-in page.
- **Shoulder-Surfing Protection**: Masks both the **Email Address** and **Password** inputs securely as bullets (`••••••••`) by default.
- Toggle visibility buttons (`Eye` / `EyeOff` icons) allow administrators to quickly review and verify their inputs in public environments.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 14 (App Router), React, TailwindCSS / CSS variables, Lucide React, Axios.
* **Backend**: FastAPI (Python), `python-pptx`, `pywin32` (win32com fallback), `lxml`, Uvicorn.
* **Database**: Firebase Firestore (for employee records and document tracking).

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **LibreOffice** (Optional, but highly recommended for fast PDF generation. Windows fallback will use Microsoft PowerPoint).

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd hr-portal/backend
   ```

2. Create a virtual environment and install requirements:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

3. Configure Gmail Auth:
   - Ensure `credentials.json` is present in the `backend/` directory.
   - Run the auth helper to generate the authorization token:
     ```bash
     python gmail_auth.py
     ```

4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd hr-portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   # Add Firebase credentials here
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

---

## 📦 Production Deployment (PM2)

You can manage both services in production using **PM2** and the provided `ecosystem.config.js` file:

```bash
# Start all apps (Frontend + Backend)
pm2 start ecosystem.config.js

# Monitor services
pm2 monit

# Restart services
pm2 restart all
```
