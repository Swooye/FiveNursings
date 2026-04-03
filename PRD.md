# Project Analysis: FiveNursings (康养家)

## 1. Project Overview
FiveNursings is a comprehensive oncology (cancer) health management platform comprising three main technical layers:
*   **User Terminal**: High-fidelity mobile-first web app for patients and families.
*   **Admin Terminal**: Management portal for doctors, nurses, and admins.
*   **Unified Backend**: Dual-environment API (Express/Firebase) connecting to MongoDB.

## 2. Technical Architecture

### Frontend Components
| Component | Stack | Purpose | Key Features |
| :--- | :--- | :--- | :--- |
| **User** | React, Vite, Tailwind CSS, Lucide | Patient facing | Health tracking, recovery journal, AI assistance, health marketplace. |
| **Admin** | React, Refine, Ant Design | Staff facing | Patient record management, protocol editing, order processing. |

### Backend Strategy
The system uses a shared logic codebase with two entry points:
1.  **Local Development ([server/index.js](file:///Users/wayne/Documents/FiveNursings_Forge/server/index.js))**: Runs on port 3002. Provides easy local iteration with MongoDB.
2.  **Production ([functions/src/index.ts](file:///Users/wayne/Documents/FiveNursings_Forge/functions/src/index.ts))**: Deployed as Firebase Cloud Functions. Connects to production database and handles scaling.

### Database (MongoDB Atlas)
*   **fivenursing_dev**: Used for local development and testing.
*   **fivenursing_pro**: Production database.
*   **test**: Staging/Source database used by migration scripts.

## 3. Key Data Flows

### Authentication & User Sync
1.  User signs in via **Firebase Authentication** in the frontend.
2.  Frontend calls `/api/users/sync` with the Firebase `uid`.
3.  Backend checks MongoDB for a matching `firebaseUid` or `phoneNumber`.
4.  If not found, a new profile is created in MongoDB; otherwise, it returns the existing profile.

### Environment Switching
*   **Frontend**: Detects `import.meta.env.DEV` to decide whether to hit `/api` (Vite Proxy) or the absolute Firebase Function URL.
*   **Backend**: Cloud Functions detect the Firebase Project ID to automatically switch between `fivenursing_dev` and `fivenursing_pro`.

## 4. Maintenance Infrastructure
The root directory contains several [.cjs](file:///Users/wayne/Documents/FiveNursings_Forge/migrate_data.cjs) scripts for critical database operations:
*   **Data Migration**: [migrate_data.cjs](file:///Users/wayne/Documents/FiveNursings_Forge/migrate_data.cjs) and [sync_protocols.cjs](file:///Users/wayne/Documents/FiveNursings_Forge/sync_protocols.cjs) move collections between environments.
*   **Auditing**: [audit_pro_v2.cjs](file:///Users/wayne/Documents/FiveNursings_Forge/audit_pro_v2.cjs) allows staff to verify production data counts and structures safely.
*   **Fixes**: [fix_mall_images.cjs](file:///Users/wayne/Documents/FiveNursings_Forge/fix_mall_images.cjs) (implied) handles ad-hoc data cleanup.

## 5. Execution Status (Current State)
> [!NOTE]
> The project is **fully operational** in the new local environment.
> Updated: 2026-03-26

### Verified Components
*   **Backend**: Running on port 3002, connected to MongoDB Atlas.
*   **User Frontend**: Accessible at `http://localhost:3000`.
*   **Admin Frontend**: Accessible at `http://localhost:5174`.
*   **Dependencies**: All `node_modules` are correctly installed in root and subdirectories.

### Steps to Run
1.  **Start all services**:
    ```bash
    bash start-dev.sh
    ```
    This script automatically kills previous instances, starts the backend, user frontend, and admin dashboard.

### Steps to Run
1.  **Dependency Installation**:
    ```bash
    # Root & Server
    npm install
    # User Frontend
    cd user && npm install
    # Admin Frontend
    cd admin && npm install
    # Cloud Functions
    cd functions && npm install
    ```
2.  **Start Local Backend**:
    ```bash
    cd server && npm start # Runs on http://localhost:3002
    ```
3.  **Start Frontends**:
    *   **User**: `npm run user` (from root)
    *   **Admin**: `npm run admin` (from root)

## 6. Environment Configuration (.env)
*   **Consolidation**: The project uses a single source of truth at the root [.env](file:///Users/wayne/FiveNursings/.env).
*   **Symlinks**: `admin/.env` and `user/.env` are symbolic links pointing to the root `.env`.
*   **Templates**: [.env.example](file:///Users/wayne/FiveNursings/.env.example) is provided for setting up new environments.
*   **Rule**: Never commit `.env` to Git; it is ignored by [.gitignore](file:///Users/wayne/FiveNursings/.gitignore).

## 7. Architectural Observations
*   **"God Component" Pattern**: The [user/App.tsx](file:///Users/wayne/Documents/FiveNursings_Forge/user/App.tsx) is a large (25k+) file managing nearly all application states and "routing". while compact, it would benefit from refactoring.
*   **Refine Framework**: The Admin panel is highly efficient due to its use of the `refinedev` ecosystem.
*   **Firebase Integration**: Leverages Firebase Auth and Functions while maintaining data in MongoDB Atlas.
