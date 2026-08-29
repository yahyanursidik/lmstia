# Database Schema

Database: **Neon PostgreSQL**  
ORM: **Drizzle ORM**

## Core Entities

```text
users
profiles
roles
academic_stages
terms
term_enrollments
courses
term_courses
course_instructors
modules
weeks
lessons
lesson_resources
activities
activity_attempts
worksheets
worksheet_submissions
quizzes
quiz_questions
quiz_attempts
sessions
attendance
lesson_progress
course_progress
term_progress
notes
bookmarks
announcements
certificates
audit_logs
```

## academic_stages

```text
id
code
name
display_name
description
sequence
created_at
updated_at
```

## terms

```text
id
stage_id
code
slug
name
title
subtitle
start_date
end_date
registration_start
registration_end
status
is_public
sequence
created_at
updated_at
```

## term_enrollments

```text
id
user_id
term_id
status
registered_at
approved_at
started_at
completed_at
progress
completion_status
certificate_status
created_at
updated_at
```

Enrollment harus per caturwulan.

## courses

```text
id
code
slug
name
description
category
delivery_model
is_active
created_at
updated_at
```

## term_courses

```text
id
term_id
course_id
role
sequence
weekly_load
is_required
created_at
```

Role: `INTENSIVE | FOUNDATION | COMPANION`

## weeks

```text
id
module_id
number
title
type
starts_at
ends_at
sequence
```

Type: `ORIENTATION | REGULAR | REVIEW | ASSESSMENT | BREAK`

## lessons

```text
id
week_id
title
slug
type
description
content
duration_minutes
sequence
is_required
is_essential
publish_status
published_at
```

## sessions

```text
id
term_course_id
lesson_id nullable
type
title
starts_at
ends_at
location_type
meeting_url
address
map_url
recording_url
attendance_enabled
```

Session type: `ONLINE_CLASS | ONLINE_PRACTICE | OFFLINE_CLASS | MAJLIS_TASIL`

## Indexes

Wajib index:
- term_enrollments(user_id, term_id)
- lessons(week_id, sequence)
- lesson_progress(user_id, lesson_id)
- attendance(session_id, user_id)
- sessions(starts_at)
