<div align="center">

# 🛡️ CrimeIntel

## AI-Powered Criminal Network Analysis System

> **From fragmented crime records to connected, explainable investigation intelligence.**

</div>

---

## 📌 Problem Statement

### **AI-Powered Criminal Network Analysis System**

Modern criminal activities are rarely limited to a single individual, case, or jurisdiction. Criminal networks can involve multiple associates, aliases, organizations, vehicles, locations, communication channels, and financial relationships spread across different records and police jurisdictions.

Law enforcement agencies may have access to large volumes of heterogeneous data, including:

* 📄 **FIRs and case narratives**
* 📞 **Call Detail Records (CDRs)**
* 💳 **Financial transaction records**
* 📍 **Location, surveillance, toll and ANPR data**
* 🏛️ **Criminal history and court records**

The challenge is not simply collecting this information — it is **connecting it meaningfully**.

### 🔴 Key Problems

#### 1. Data Fragmentation

Relevant information is distributed across different cases, police stations, databases, and data formats. Investigators may have to examine multiple sources separately before discovering that they are connected.

#### 2. Identity Obfuscation

The same person may appear with different name spellings, aliases, phone numbers, vehicles, or other identifiers across records.

For example:

```text
Station A → Ramu Kumar
Station B → Ramesh Kumar
Station C → R. Kumar
```

Treating these as separate entities can hide important connections between cases.

#### 3. Manual Network Analysis

Connecting thousands of people, cases, calls, transactions, locations, and organizations manually is time-consuming and can make it difficult to discover non-obvious relationships.

#### 4. Hidden Network Structures

Important actors may not be the most frequently mentioned individuals. They may instead act as intermediaries or bridges between otherwise disconnected groups.

#### 5. Lack of Explainable Intelligence

A system that simply produces a prediction or anomaly score is not sufficient for investigation. Investigators need to understand **what was detected, why it was detected, and which underlying records contributed to the finding**.

#### 6. Data Integrity and Accountability

Sensitive investigative information requires controlled access, traceable actions, and mechanisms to detect unauthorized modification of evidence or analytical records.

---

# 💡 Proposed Solution

## **CrimeIntel**

**CrimeIntel** is an AI-powered criminal-network intelligence platform designed to transform fragmented structured and unstructured crime data into a **connected, explainable and investigation-oriented intelligence view**.

Instead of treating every case or record independently, CrimeIntel follows an end-to-end workflow:

```text
DATA INGESTION
      ↓
DATA PREPROCESSING
      ↓
NLP + NER
      ↓
ENTITY & RELATIONSHIP EXTRACTION
      ↓
MULTI-SIGNAL ENTITY RESOLUTION
      ↓
DYNAMIC KNOWLEDGE GRAPH
      ↓
ML + GRAPH + TEMPORAL ANALYSIS
      ↓
ANOMALY & PATTERN DETECTION
      ↓
INTELLIGENCE CORRELATION
      ↓
INVESTIGATION DASHBOARD
      ↓
REPORTS / DOSSIERS / ALERTS
```

### 🎯 What CrimeIntel Provides

| Problem                                  | CrimeIntel Solution                              |
| ---------------------------------------- | ------------------------------------------------ |
| Fragmented records                       | Unified forensic data workspace                  |
| Different aliases / duplicate identities | Multi-signal entity resolution                   |
| Unstructured FIR narratives              | NLP + NER                                        |
| Hidden relationships                     | Relationship extraction + knowledge graph        |
| Difficult network analysis               | PageRank, Betweenness and Degree Centrality      |
| Unusual activities                       | Isolation Forest + DBSCAN                        |
| Cross-case connections                   | Association and lead ranking                     |
| Changing criminal networks               | Temporal analysis                                |
| Black-box ML results                     | Explainability with SHAP and evidence provenance |
| Manual investigation reports             | Automated 360° dossiers and reports              |
| Unauthorized access                      | RBAC + audit trail                               |
| Evidence tampering concerns              | Cryptographic evidence ledger                    |

---

# 🔄 Core Workflow

## 1. Data Ingestion

CrimeIntel accepts structured and unstructured investigation data such as:

* FIRs and case narratives
* CDRs
* Financial records
* Location and surveillance data
* Criminal history
* Other authorized investigation records

The data is brought into a unified analytical environment.

---

## 2. Data Preprocessing

Before analysis, the system:

* Cleans inconsistent records
* Handles missing values
* Removes duplicates where appropriate
* Normalizes dates, identifiers and formats
* Standardizes extracted entities

This ensures that downstream ML and graph analysis operate on consistent information.

---

## 3. NLP & Named Entity Recognition

Unstructured case narratives can contain important information that is difficult to analyze manually.

CrimeIntel uses NLP and a **DistilBERT-based NER model** to identify entities such as:

```text
PERSON
ORGANIZATION
VEHICLE
PHONE
LOCATION
IPC_SECTION
```

Example:

```text
"Ravi met Kumar near Salem using TN-xx-xxxx."

Ravi          → PERSON
Kumar         → PERSON
Salem         → LOCATION
TN-xx-xxxx    → VEHICLE
```

The extracted information becomes structured data for subsequent analysis.

---

# 🪪 4. Multi-Signal Entity Resolution

One of CrimeIntel's key capabilities is resolving potentially duplicated or fragmented identities.

Instead of matching individuals only by name, the system compares multiple authorized signals:

$$
M =
w_1S_{name}
+w_2S_{phone}
+w_3S_{DOB}
+w_4S_{address}
+w_5S_{vehicle}
$$

where:

* \(S_{name}\) = name similarity
* \(S_{phone}\) = phone match
* \(S_{DOB}\) = date-of-birth match
* \(S_{address}\) = address similarity
* \(S_{vehicle}\) = vehicle overlap

Name similarity can use techniques such as:

* **Jaro-Winkler**
* **Levenshtein distance**

The system generates a **candidate match**, rather than blindly merging records.

```text
Ramu Kumar
     │
     │ possible match
     ▼
Ramesh Kumar
     │
     ▼
Entity Resolution
     │
     ├── PROBABLE_MATCH
     ├── CONFIRMED
     └── REJECTED
```

### 🔐 Provenance Preservation

Original records are not overwritten.

The system preserves:

* Original station record
* Source information
* Candidate relationship
* Match decision
* Investigator action
* Audit history

This allows investigators to distinguish **source evidence from analytical conclusions**.

---

# 🕸️ 5. Dynamic Knowledge Graph

Once entities and relationships are extracted and resolved, CrimeIntel represents them as a graph:

$$
G=(V,E)
$$

where:

* \(V\) = entities
* \(E\) = relationships

Possible nodes include:

```text
PERSON
ORGANIZATION
LOCATION
VEHICLE
ACCOUNT
CASE
```

Possible relationships include:

```text
COMMUNICATED_WITH
TRANSACTED_WITH
CO_LOCATED
DIRECTOR_OF
OPERATES_VEHICLE
INVOLVED_IN
```

This allows investigators to move from isolated records to a **connected network view**.

---

# 📊 6. Network Analysis

CrimeIntel applies graph-analysis techniques to understand the structure of the network.

### Degree Centrality

Identifies highly connected entities:

$$
C_D(v)=\frac{deg(v)}{|V|-1}
$$

### Betweenness Centrality

Identifies entities acting as bridges between different parts of the network:

$$
C_B(v)=
\sum_{s\neq v\neq t}
\frac{\sigma_{st}(v)}{\sigma_{st}}
$$

### PageRank

Identifies structurally influential nodes based on the importance of their connections.

### Community Detection

Network communities can be identified to reveal clusters of closely connected entities.

### Shortest Path Analysis

Investigators can identify how two entities are connected through intermediate entities.

---

# 🚨 7. Anomaly & Suspicious Pattern Detection

CrimeIntel analyzes behavioral and network features to identify unusual patterns.

### Isolation Forest

Used for detecting unusual observations within activity data.

Potential features include:

* Interaction frequency
* Transaction frequency
* Network activity
* Temporal behavior
* Location changes
* New connections

### DBSCAN

Used to identify spatial clusters and unusual spatial observations.

### Temporal Analysis

The system can analyze how activity and relationships change over time.

For example:

```text
Normal activity
      ↓
Increase in communication
      ↓
New connections
      ↓
Cross-cluster interaction
      ↓
Potential anomaly
```

The objective is to **surface investigative leads**, not automatically declare an individual guilty.

---

# 🎯 8. Cross-Case Intelligence & Lead Ranking

CrimeIntel correlates information across cases to identify potentially relevant associations.

Features from the network and activity data can be combined for lead prioritization.

The system can use **XGBoost-based ranking** together with **SHAP explainability** to identify which features contributed to a lead score.

Instead of simply showing:

```text
Score: 0.91
```

the system can provide context such as:

```text
Lead Priority

✓ Shared network connections
✓ Multiple cross-case associations
✓ Increased interaction frequency
✓ Strong relationship with central network nodes
```

This makes the output more useful to investigators.

---

# 📑 9. Investigation Reports & 360° Dossiers

CrimeIntel converts analyzed information into investigation-oriented outputs.

### 360° Entity Dossier

Provides a consolidated view of an entity, including available:

* Primary identity
* Known aliases
* Vehicles
* Phone identifiers
* Related cases
* Network relationships
* Timeline
* Analytical findings

### Automated Case Report

The report engine can aggregate:

```text
Case Information
      +
Entities
      +
Relationships
      +
Network Analysis
      +
Timeline
      +
CDR / Transaction Information
      +
AI-Generated Leads
      ↓
Investigation Report
```

---

# 🛡️ 10. Security, Governance & Evidence Integrity

Because the platform deals with sensitive investigative information, security is integrated into the architecture.

### Role-Based Access Control

Access is separated according to role:

```text
VIEWER
   ↓
ANALYST
   ↓
INVESTIGATOR
   ↓
ADMIN
```

### Audit Trail

Important system actions are recorded, including:

* Login attempts
* Data access
* Searches
* Entity-match decisions
* Report generation
* Security events

### Cryptographic Evidence Integrity

Digital evidence can be associated with a **SHA-256 cryptographic chain** so that unauthorized modification can be detected through hash verification.

The system therefore provides both:

**Intelligence generation + governance and traceability**

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                             │
│ FIR • CDR • Transactions • Location • Criminal Records      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATA INGESTION & PREPROCESSING             │
│ Cleaning • Normalization • Deduplication • Validation       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     AI / ML LAYER                           │
│                                                             │
│ DistilBERT NER                                              │
│ Entity Resolution                                           │
│ Isolation Forest • DBSCAN                                   │
│ XGBoost Ranking • SHAP                                      │
│ FLAN-T5 Summarization                                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE GRAPH LAYER                       │
│                                                             │
│ Entities • Relationships • Centrality • Communities         │
│ Shortest Paths • Network Structure • Temporal Analysis      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENCE CORRELATION LAYER                 │
│                                                             │
│ Cross-Case Links • Anomalies • Leads • Timelines             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  INVESTIGATION INTERFACE                    │
│                                                             │
│ Dashboard • Case Manager • Entity Dossiers                  │
│ Network Graph • Timeline • Evidence Vault • Audit            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                         OUTPUT                              │
│                                                             │
│ Network Intelligence • Investigation Leads                  │
│ Anomaly Findings • Connected Cases • Reports • Dossiers     │
└─────────────────────────────────────────────────────────────┘
```

---

# 🧠 Technology Stack

| Layer               | Technology                                   |
| ------------------- | -------------------------------------------- |
| Frontend            | React 18, TypeScript, Vite, TailwindCSS      |
| Backend             | FastAPI, Pydantic                            |
| Database            | SQLite / Supabase PostgreSQL                 |
| NLP                 | DistilBERT                                   |
| Entity Resolution   | Jaro-Winkler, Levenshtein, weighted matching |
| Anomaly Detection   | Isolation Forest, DBSCAN                     |
| Lead Ranking        | XGBoost                                      |
| Explainability      | SHAP                                         |
| Graph Visualization | D3.js                                        |
| Graph Analysis      | PageRank, Betweenness, Degree Centrality     |
| Authentication      | JWT + RBAC                                   |
| Evidence Integrity  | SHA-256 cryptographic ledger                 |
| Storage             | Supabase Storage                             |

---

# ⭐ What Makes CrimeIntel Different?

CrimeIntel is not simply a crime database, prediction model, or network visualization tool.

Its key contribution is the **integration of the complete intelligence workflow**:

```text
Fragmented Records
       ↓
Understand the Data
       ↓
Extract Entities
       ↓
Resolve Fragmented Identities
       ↓
Discover Relationships
       ↓
Construct the Network
       ↓
Analyze Network + Time + Behavior
       ↓
Detect Anomalies
       ↓
Correlate Across Cases
       ↓
Explain the Findings
       ↓
Generate Investigation Intelligence
```

### The central idea

> **Instead of asking investigators to manually connect thousands of records, CrimeIntel builds those connections computationally and presents the resulting network, patterns, anomalies and supporting context in an explainable investigation workflow.**

---

# ⚖️ Responsible Use

CrimeIntel is intended as an **investigative decision-support system**, not an autonomous criminal-judgment system.

* AI-generated matches and leads require authorized human review.
* Analytical scores should not be treated as proof of criminal activity.
* Original source records are preserved.
* Access to sensitive information is controlled through RBAC.
* Important actions are recorded through audit mechanisms.
* Evidence integrity mechanisms help detect unauthorized modification.

---

# 🚀 Quick Start

## Prerequisites

* Python 3.10+
* Node.js 18+
* npm
* Git

## Setup

```bash
git clone https://github.com/AswinNS-dev/Genesis.git
cd Genesis

cp .env.example .env

pip install -r backend/requirements.txt

python seed.py

cd frontend
npm install
cd ..
```

## Run

```bash
npm run dev:all
```

Application:

```text
Frontend → http://localhost:3000
Backend  → http://localhost:8000
Swagger  → http://localhost:8000/docs
ReDoc    → http://localhost:8000/redoc
```

---

# 🧪 Testing

### Backend

```bash
pytest -v
```

### Frontend

```bash
npm --prefix frontend run build
```

---

<div align="center">

### 🛡️ CrimeIntel

**AI-Powered Criminal Network Analysis System**

**Smart India Hackathon • Problem Statement 26189**

*From fragmented records to connected investigation intelligence.*

</div>
