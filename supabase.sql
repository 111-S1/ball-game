-- Supabase > SQL Editor 에 통째로 붙여넣고 Run
create table if not exists balls (
  id serial primary key,
  name text not null,
  ability text not null,
  color text not null,
  hp int not null default 100,
  atk int not null default 10
);

create table if not exists matches (
  id serial primary key,
  winner_name text,
  created_at timestamptz default now()
);

alter table balls enable row level security;
alter table matches enable row level security;

create policy "balls_read" on balls for select using (true);
create policy "matches_read" on matches for select using (true);
create policy "matches_insert" on matches for insert with check (true);

insert into balls (name, ability, color, hp, atk) values
  ('분열볼', 'split',   '#7ad7f0', 100, 10),
  ('회복볼', 'heal',    '#7be495', 100, 9),
  ('가속볼', 'speed',   '#ffd23f', 100, 8),
  ('폭발볼', 'explode', '#ff6b4a', 100, 10),
  ('방어볼', 'shield',  '#b69cff', 100, 10),
  ('흡혈볼', 'vampire', '#ff4f8b', 100, 9);
