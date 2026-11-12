# 🧪 SQA A-to-Z Live Testing Hub (Complete SQA Enterprise Sandbox)

An interactive, single-page **Software Quality Assurance (SQA)** testing sandbox connected to a live **Supabase PostgreSQL** backend. Designed to practice and demonstrate end-to-end manual, API, database, security, and performance testing workflows.

🔗 **Live Demo:** `https://shoyebrabbi.github.io/SQA-live-testing-hub/`

---

## 🎯 Key Testing Modules Covered (8-in-1 Sandbox)

1. **Functional, Negative, BVA & RBAC (`sqa_users`):**
   - User registration with Boundary Value Analysis (Age 18–60) and intentional validation defects (Age 17 bypass & non-functional Reset button) for defect reporting practice.
   - Live Login, Session Management, 3-attempt Brute-Force Lockout (State Transition Testing), and Role-Based Access Control (`Admin` vs `QA` vs `User`).
2. **E-Commerce & Business Logic (`sqa_orders`):**
   - Real-time order calculation with quantity controls, `SAVE20` coupon discount (20%), 10% tax, and an intentional negative quantity (`-1`) business logic bug.
3. **UI/UX, Accessibility & Compatibility:**
   - Desktop/Mobile viewport switcher, visual bug audit (overlapping button & broken image placeholder), and WCAG accessibility checklist.
4. **Smoke, Sanity & Regression Test Suite:**
   - Interactive 10-point test execution checklist with live Pass/Fail percentage calculation and dynamic execution summary.
5. **Live REST API Testing Sandbox:**
   - Direct HTTP requests (`GET 200`, `POST 201`, `DELETE 204`) to Supabase REST endpoints alongside simulated `400 Bad Request` and `401 Unauthorized` responses with latency tracking (`ms`).
6. **PostgreSQL Database & Relational Verification:**
   - Live data tables verifying `sqa_users` and relational `sqa_orders` (`JOIN`), search/filtering, record deletion, and one-click **50 Bulk Test Users** volume generation.
7. **Security & Performance Testing:**
   - Local payload inspection for **SQL Injection** (`' OR '1'='1`) and **XSS** (`<script>`), login lockout simulation, and 100-task concurrent load & API latency benchmarking.
8. **Jira-Style Bug Tracker & Test Cases (`sqa_bug_reports`):**
   - Live bug reporting form saving defects directly to PostgreSQL with real-time status updates (`Open`, `In Progress`, `Fixed`, `Closed`) plus 10 pre-loaded standard test cases.

---

## 🛠️ Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript (ES6+)
- **Backend & Database:** Supabase (PostgreSQL & REST API)
- **Hosting:** GitHub Pages

---

## 👤 Author
**Md Shoyeb Rabbi**  
*BSc in CSIT | Data Analyst & SQA Practitioner*  
🌐 Website: [shoyebrabbi.com](https://shoyebrabbi.com)
