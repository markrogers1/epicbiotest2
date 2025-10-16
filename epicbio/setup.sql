CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE bios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  username TEXT UNIQUE,
  bio_content TEXT,
  video_url TEXT,
  links JSONB,
  use_ig_profile BOOLEAN DEFAULT false,
  ig_background_url TEXT,
  views INTEGER DEFAULT 0,
  purchased BOOLEAN DEFAULT false
);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  code TEXT UNIQUE,
  username TEXT,
  used BOOLEAN DEFAULT false
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  enable_templates BOOLEAN DEFAULT false
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (id, enable_templates) VALUES (1, false);