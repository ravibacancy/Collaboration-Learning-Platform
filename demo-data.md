# Demo Data

This file provides demo data for the Digital Document Collaboration Platform.

## Users

| ID | Name | Email | Role |
|----|------|------|------|
| 1 | Ravi Chauhan | ravi@example.com | teacher |
| 2 | Aisha Khan | aisha@example.com | student |
| 3 | John Smith | john@example.com | student |

---

## Classrooms

| ID | Name | Teacher ID |
|----|------|------------|
| 1 | English Literature | 1 |
| 2 | History 101 | 1 |

---

## Documents

| ID | Title | Uploaded By | Classroom |
|----|------|-------------|-----------|
| 1 | Shakespeare Essay | 1 | English Literature |
| 2 | World War II Notes | 1 | History 101 |

---

## Assignments

| ID | Title | Document | Classroom | Due Date |
|----|------|----------|-----------|----------|
| 1 | Annotate Shakespeare Text | Shakespeare Essay | English Literature | 2026-03-30 |
| 2 | Highlight Important Events | World War II Notes | History 101 | 2026-04-02 |

---

## Annotations

| ID | Document | User | Type | Content |
|----|----------|------|------|--------|
| 1 | Shakespeare Essay | Aisha Khan | highlight | Important quote |
| 2 | Shakespeare Essay | John Smith | comment | Explain this paragraph |

---

## Comments

| ID | Annotation | User | Comment |
|----|------------|------|--------|
| 1 | 1 | Ravi Chauhan | Good observation |
| 2 | 2 | Ravi Chauhan | Please elaborate |

---

## Notifications

| ID | User | Message |
|----|------|---------|
| 1 | Aisha Khan | Assignment due in 2 days |
| 2 | John Smith | New comment on your annotation |