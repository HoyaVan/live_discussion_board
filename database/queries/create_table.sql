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


CREATE TABLE IF NOT EXISTS threads (
  thread_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id       BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  views           BIGINT UNSIGNED NOT NULL DEFAULT 0,
  likes_count     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  comments_count  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id),
  KEY idx_threads_author (author_id),
  KEY idx_threads_created_at (created_at),
  CONSTRAINT fk_threads_author
    FOREIGN KEY (author_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS comments (
  comment_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id          BIGINT UNSIGNED NOT NULL,
  author_id          BIGINT UNSIGNED NOT NULL,
  parent_comment_id  BIGINT UNSIGNED NULL,
  body               TEXT NOT NULL,
  path               JSON NOT NULL DEFAULT (JSON_ARRAY()),
  depth              INT UNSIGNED NOT NULL DEFAULT 0,
  is_deleted         TINYINT(1) NOT NULL DEFAULT 0,
  likes_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS thread_views (
  thread_id  BIGINT UNSIGNED NOT NULL,
  viewer_key VARCHAR(255) NOT NULL,
  first_view DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, viewer_key),
  KEY idx_thread_views_thread (thread_id),
  CONSTRAINT fk_thread_views_thread
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
