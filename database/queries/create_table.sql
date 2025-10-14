-- MySQL 8.0 schema for Reddit-style discussion board

-- =========================================================
-- Global defaults
-- =========================================================
CREATE DATABASE IF NOT EXISTS discussion_board
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE discussion_board;

-- =========================================================
-- Users
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  user_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  username      VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    TEXT NULL,
  avatar_pid    VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Threads
-- =========================================================
CREATE TABLE IF NOT EXISTS threads (
  thread_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id       BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  views           BIGINT UNSIGNED NOT NULL DEFAULT 0,
  likes_count     BIGINT UNSIGNED NOT NULL DEFAULT 0,  -- optional cache
  comments_count  BIGINT UNSIGNED NOT NULL DEFAULT 0,  -- optional cache
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id),
  KEY idx_threads_author (author_id),
  KEY idx_threads_created_at (created_at),
  CONSTRAINT fk_threads_author
    FOREIGN KEY (author_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fulltext for threads (title + description)
ALTER TABLE threads
  ADD FULLTEXT KEY ftx_threads_title_desc (title, description);

-- =========================================================
-- Comments (nested via parent_comment_id + JSON path)
-- =========================================================
CREATE TABLE IF NOT EXISTS comments (
  comment_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id          BIGINT UNSIGNED NOT NULL,
  author_id          BIGINT UNSIGNED NOT NULL,
  parent_comment_id  BIGINT UNSIGNED NULL,
  body               TEXT NOT NULL,
  path               JSON NOT NULL DEFAULT (JSON_ARRAY()), -- ancestor comment_ids
  depth              INT UNSIGNED NOT NULL DEFAULT 0,      -- optional mirror of JSON_LENGTH(path)
  likes_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,   -- optional cache
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id),
  KEY idx_comments_thread (thread_id),
  KEY idx_comments_thread_parent (thread_id, parent_comment_id),
  KEY idx_comments_author (author_id),
  CONSTRAINT fk_comments_thread
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comments_author
    FOREIGN KEY (author_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fulltext for comments (body)
ALTER TABLE comments
  ADD FULLTEXT KEY ftx_comments_body (body);

-- =========================================================
-- Likes (polymorphic)
-- =========================================================
-- Use ENUM for target_type; target_id points to either threads.thread_id or comments.comment_id
CREATE TABLE IF NOT EXISTS likes (
  _id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  target_type ENUM('thread','comment') NOT NULL,
  target_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (_id),
  UNIQUE KEY uq_likes_user_target (user_id, target_type, target_id),
  KEY idx_likes_target (target_type, target_id),
  KEY idx_likes_user (user_id),
  CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
  -- NOTE: cannot enforce FK to two different tables in one column; ensure existence at application layer.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Thread views (optional analytics)
-- =========================================================
CREATE TABLE IF NOT EXISTS thread_views (
  thread_id  BIGINT UNSIGNED NOT NULL,
  viewer_key VARCHAR(255) NOT NULL,  -- session id / IP hash / user id
  first_view DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, viewer_key),
  KEY idx_thread_views_thread (thread_id),
  CONSTRAINT fk_thread_views_thread
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Helpful generated columns / indexes (optional)
-- =========================================================
-- If you want to query by depth frequently:
-- ALTER TABLE comments ADD KEY idx_comments_depth (depth);

-- If you often filter by updated time:
-- ALTER TABLE threads ADD KEY idx_threads_updated_at (updated_at);
-- ALTER TABLE comments ADD KEY idx_comments_updated_at (updated_at);

-- =========================================================
-- Notes on Search & Ranking by Term Frequency
-- =========================================================
-- FULLTEXT indexes above allow MATCH(...) AGAINST(...) queries for relevance.
-- If you must rank by raw term frequency across thread title/description + all its comments,
-- compute it in application code (e.g., REGEXP_COUNT in SELECTs and SUM per thread),
-- or pre-aggregate counts and store into a materialized table for fast sorting.
