# 🧪 SQA A-to-Z Live Testing Hub (Enterprise SQA Sandbox)

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-10b981?style=for-the-badge&logo=github)](https://shoyebrabbi.github.io/SQA-live-testing-hub/)
[![Database](https://img.shields.io/badge/Backend-Supabase_PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Bilingual](https://img.shields.io/badge/Language-বাংলা_%7C_English-06b6d4?style=for-the-badge)](#)

An interactive, bilingual (**Bengali & English**) **Software Quality Assurance (SQA) Testing Platform** built to practice, demonstrate, and verify end-to-end manual, API, database, security, performance, and automated testing workflows in a real cloud-connected sandbox.

🔗 **Live Platform:** [https://shoyebrabbi.github.io/SQA-live-testing-hub/](https://shoyebrabbi.github.io/SQA-live-testing-hub/)

---

## ✨ Key Highlights for Recruiters & Testers

* **One-Click Guest / Demo Mode:** Explore and test all 9 SQA modules immediately without creating an account. Guest actions persist safely in `sessionStorage` until the browser tab closes and support full `.csv` report exports.
* **Real Cloud Backend (Supabase PostgreSQL + RLS):** Authenticated sessions perform real CRUD operations (`INSERT`, `SELECT`, `UPDATE`, `DELETE`) secured by Supabase Auth and Row Level Security (RLS) policies.
* **Intentional Defect Seeding & One-Click Bug Logging:** Includes realistic, intentional functional, business-logic, and UI defects with one-click **"Fill Buggy Sample"** and **"Log This Bug"** workflows that auto-populate the Bug Tracker.
* **Admin Control Panel (`sqa_site_settings`):** Role-restricted site administration allowing the owner to control global themes, announcement banners, module visibility, and guest permissions directly from the UI.
* **Full Bilingual Experience (`বাংলা` / `English`):** Instant language switching across all forms, tables, validation alerts, test cases, and exported CSV reports.

---

## 🧩 9 Core SQA Testing Modules

| # | Module | Testing Techniques & Capabilities |
| :--- | :--- | :--- |
| **1** | **Registration & Validation** | Functional & negative input validation, Boundary Value Analysis (BVA — intentional `age = 17` bypass & broken `Reset` button), and RBAC Role Simulator (`Admin`, `QA`, `User`). |
| **2** | **Orders & Business Rules** | Dynamic e-commerce pricing, tax (`10%`), coupon logic (`SAVE20`), and negative quantity (`-1`) edge-case defect testing. |
| **3** | **UI/UX & Compatibility** | Desktop vs. Mobile viewport toggle, overlapping button defect, broken image placeholder, and WCAG accessibility checklist. |
| **4** | **Test Suite & RTM** | 10 interactive Smoke, Sanity, and Regression test cases with live Pass/Fail rate calculation and Requirement Traceability Matrix (RTM). |
| **5** | **REST API Sandbox** | Live Supabase REST calls (`GET 200`, `POST 201`, `DELETE 204`), local error simulations (`400 Bad Request`, `401 Unauthorized`), latency tracking (`ms`), and **JSON Schema Validator**. |
| **6** | **Database Verification** | Live PostgreSQL table inspection (`sqa_users`, `sqa_orders`), user-order relational mapping, inline user editing, order status updates, 50-user bulk volume test, and one-click dummy data cleanup (`@example.test`). |
| **7** | **Security & Performance** | Safe local SQL Injection (`' OR '1'='1`) and XSS (`<script>`) payload analyzer, 5-attempt login lockout simulation, 100-task concurrency benchmark, and live Browser Navigation Timing profiler. |
| **8** | **Bug Tracker & Test Cases** | Full Defect Management lifecycle (`Open` → `In Progress` → `Fixed` → `Closed`), severity/resolution metrics bar, inline bug editing, RTM mapping, and **CSV Test Report Export**. |
| **9** | **Auto Test Runner** | One-click automated assertion runner verifying BVA rules, order discount math, API health, and DB connectivity, plus copy-ready **Playwright (JS)** and **cURL/Postman** snippets. |

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** Semantic HTML5, Tailwind CSS, Vanilla JavaScript (ES6+), Custom Glassmorphic Themes (`Aurora Dark`, `Clean Light`, `Midnight Violet`)
* **Backend & Auth:** Supabase Auth, Supabase PostgREST API, PostgreSQL (`sqa_users`, `sqa_orders`, `sqa_bug_reports`, `sqa_site_settings`)
* **Security:** Row Level Security (RLS), XSS output escaping, CSV formula-injection sanitization
* **Hosting:** GitHub Pages

---

## 🗄️ Database Schema Overview

To replicate this project with your own Supabase instance, create the following tables:

1. `sqa_users` (`id`, `full_name`, `email`, `password`, `age`, `status`, `created_at`)
2. `sqa_orders` (`order_id`, `user_id`, `product_name`, `quantity`, `total_price`, `order_status`, `ordered_at`)
3. `sqa_bug_reports` (`bug_id`, `module_name`, `bug_title`, `severity`, `priority`, `status`, `steps_to_reproduce`, `expected_result`, `actual_result`, `reported_at`)
4. `sqa_site_settings` (`id`, `default_theme`, `lock_theme`, `guest_enabled`, `allow_guest_export`, `visible_tabs`, `announcement_bn`, `announcement_en`, `show_announcement`)

---

## 🚀 How to Use

1. Open [https://shoyebrabbi.github.io/SQA-live-testing-hub/](https://shoyebrabbi.github.io/SQA-live-testing-hub/).
2. Click **"Test Without Login (Guest Mode)"** for instant access with preloaded sample records, or sign in with Supabase Auth to interact with the live PostgreSQL database.
3. Trigger intentional defects in **Modules 1–3**, log them directly into **Module 8**, execute checks in **Modules 4 & 9**, and download your test summary via **Export Test Report (CSV)**.

---

## 👨‍💻 Author

**Md Shoyeb Rabbi**  
BSc in CSIT · Data Analyst & SQA Enthusiast  
* Website: [shoyebrabbi.com](https://shoyebrabbi.com)  
* GitHub: [@shoyebrabbi](https://github.com/shoyebrabbi)
