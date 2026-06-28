-- ============================================================================
-- Two Weddings — seed data (run AFTER schema.sql)
-- Populates the two weddings, five ceremonies, and sample budget / guests /
-- tasks so the dashboard has live data to render. Re-runnable.
-- ============================================================================

-- Weddings ------------------------------------------------------------------
insert into weddings (code, city, country, event_date, currency, accent) values
  ('HP', 'Hải Phòng', 'Vietnam',  '2027-10-08', 'VND', 'hp'),
  ('KK', 'Kota Kinabalu', 'Malaysia', '2027-10-16', 'MYR', 'kk')
on conflict (code) do nothing;

-- Events --------------------------------------------------------------------
insert into events (wedding_id, name_en, name_vi, name_zh, event_date, start_time, end_time, location, event_type, is_halal, sort_order)
select w.id, v.name_en, v.name_vi, v.name_zh, v.d::date, v.st::time, v.et::time, v.loc, v.etype, v.halal, v.so
from (values
  ('HP','Family Introduction (Lễ Dạm Ngõ)','Lễ Dạm Ngõ','提亲','2027-10-08','17:00','20:00','Bride''s family home','gathering', false, 1),
  ('HP','Engagement Ceremony (Lễ Ăn Hỏi)','Lễ Ăn Hỏi','订婚礼 (Lễ Ăn Hỏi)','2027-10-09','09:00','13:00','Bride''s family home','ceremony', false, 2),
  ('HP','Wedding Reception (Lễ Cưới)','Lễ Cưới','婚礼 (Lễ Cưới)','2027-10-10','11:00','22:00','Hải Phòng banquet hall','reception', false, 3),
  ('KK','Tea Ceremony & Evening Banquet','Lễ trà & Tiệc tối','敬茶礼与晚宴','2027-10-16','08:00','22:00','Kota Kinabalu hotel','ceremony', false, 1),
  ('KK','Halal-Friendly Lunch','Tiệc trưa thân thiện Halal','清真午宴','2027-10-17','12:00','15:00','Kota Kinabalu (Halal venue)','reception', true, 2)
) as v(wcode,name_en,name_vi,name_zh,d,st,et,loc,etype,halal,so)
join weddings w on w.code = v.wcode
where not exists (select 1 from events e where e.name_en = v.name_en);

-- Budget — planned per category (one overall planned amount each) ------------
insert into budget_categories (wedding_id, category, planned)
select w.id, c.category, c.planned
from (values
  ('HP','Venue', 120000000),
  ('HP','Catering', 200000000),
  ('HP','Attire', 60000000),
  ('HP','Photography', 40000000),
  ('HP','Florals', 30000000),
  ('KK','Venue', 25000),
  ('KK','Catering', 40000),
  ('KK','Attire', 8000),
  ('KK','Photography', 12000),
  ('KK','Transport', 5000)
) as c(wcode,category,planned)
join weddings w on w.code = c.wcode
on conflict (wedding_id, category) do nothing;

-- Budget — actual expense items (a category may have several) -----------------
insert into budget_items (wedding_id, category, label, actual)
select w.id, b.category, b.label, b.actual
from (values
  ('HP','Venue','Banquet hall deposit', 60000000),
  ('HP','Venue','Banquet hall balance', 40000000),
  ('HP','Catering','Catering deposit', 80000000),
  ('HP','Catering','Menu tasting & add-ons', 20000000),
  ('HP','Catering','Banquet balance', 80000000),
  ('HP','Attire','Áo dài (bride)', 35000000),
  ('HP','Attire','Groom suits', 20000000),
  ('HP','Photography','Photo + video package', 40000000),
  ('HP','Florals','Ceremony flowers deposit', 12000000),
  ('KK','Venue','Ballroom deposit', 8000),
  ('KK','Venue','Ballroom balance', 12000),
  ('KK','Catering','Banquet catering', 23000),
  ('KK','Catering','Halal lunch', 12000),
  ('KK','Attire','Qipao', 4000),
  ('KK','Attire','Changshan', 2500),
  ('KK','Photography','Photo + video', 12000),
  ('KK','Transport','Car deposit', 2000)
) as b(wcode,category,label,actual)
join weddings w on w.code = b.wcode
where not exists (select 1 from budget_items bi where bi.label = b.label and bi.wedding_id = w.id);

-- Tasks ---------------------------------------------------------------------
insert into tasks (wedding_id, title, due_date, status, assignee)
select w.id, tk.title, tk.due::date, tk.status, tk.assignee
from (values
  ('HP','Confirm banquet hall deposit','2026-07-15','in_progress','Couple'),
  ('HP','Order mâm quả trays for Lễ Ăn Hỏi','2027-08-01','todo','Groom''s family'),
  ('HP','Book áo dài fittings','2026-09-01','todo','Bride'),
  ('KK','Verify Halal certification for Day 2 venue','2026-08-01','todo','Planner'),
  ('KK','Confirm tea ceremony set & red packets','2027-09-01','todo','Couple'),
  ('KK','Book hotel room block','2026-07-30','in_progress','Planner')
) as tk(wcode,title,due,status,assignee)
join weddings w on w.code = tk.wcode
where not exists (select 1 from tasks t where t.title = tk.title);

-- Shared task (no wedding)
insert into tasks (wedding_id, title, due_date, status, assignee)
select null, 'Finalise guest list across both weddings', '2026-08-15', 'in_progress', 'Couple'
where not exists (select 1 from tasks t where t.title = 'Finalise guest list across both weddings');

-- Guests + per-event RSVP ----------------------------------------------------
-- 18 sample guests; each linked to one reception with a varied RSVP status.
insert into guests (full_name, email, side, plus_one, dietary)
select g.full_name, g.email, g.side, g.plus_one, g.dietary
from (values
  ('Nguyễn Văn An','an@example.com','bride',  true,  '{}'::text[]),
  ('Trần Thị Bình','binh@example.com','bride', false, '{vegetarian}'::text[]),
  ('Lê Hoàng Cường','cuong@example.com','groom',true,  '{}'::text[]),
  ('Phạm Thu Dung','dung@example.com','bride', false, '{}'::text[]),
  ('Đỗ Minh Đức','duc@example.com','groom',   true,  '{}'::text[]),
  ('Vũ Thị Hà','ha@example.com','bride',       false, '{}'::text[]),
  ('Hoàng Văn Hải','hai@example.com','groom',  false, '{}'::text[]),
  ('Bùi Thị Lan','lan@example.com','bride',    true,  '{}'::text[]),
  ('Tan Wei Ming','weiming@example.com','groom', true, '{}'::text[]),
  ('Lim Mei Ling','meiling@example.com','bride',false,'{}'::text[]),
  ('Wong Kah Wai','kahwai@example.com','groom', true, '{}'::text[]),
  ('Siti Nurhaliza','siti@example.com','bride', false,'{halal}'::text[]),
  ('Ahmad Faizal','faizal@example.com','groom', true, '{halal}'::text[]),
  ('Chong Li Hua','lihua@example.com','bride',  false,'{}'::text[]),
  ('Goh Boon Hai','boonhai@example.com','groom',false,'{}'::text[]),
  ('Aishah Binti Omar','aishah@example.com','bride', true,'{halal}'::text[]),
  ('James Carter','james@example.com','groom',  true, '{}'::text[]),
  ('Emily Watson','emily@example.com','bride',  false,'{vegan}'::text[])
) as g(full_name,email,side,plus_one,dietary)
where not exists (select 1 from guests gg where gg.email = g.email);

-- Link guests to receptions with statuses (idempotent).
with hp_recep as (select id from events where name_en = 'Wedding Reception (Lễ Cưới)' limit 1),
     kk_banq  as (select id from events where name_en = 'Tea Ceremony & Evening Banquet' limit 1),
     kk_lunch as (select id from events where name_en = 'Halal-Friendly Lunch' limit 1)
insert into guest_events (guest_id, event_id, rsvp_status)
select gid, eid, status from (
  -- HP reception: 6 confirmed, 1 pending, 1 declined
  select (select id from guests where email='an@example.com') gid, (select id from hp_recep) eid, 'confirmed' status union all
  select (select id from guests where email='binh@example.com'), (select id from hp_recep), 'confirmed' union all
  select (select id from guests where email='cuong@example.com'),(select id from hp_recep), 'confirmed' union all
  select (select id from guests where email='dung@example.com'), (select id from hp_recep), 'confirmed' union all
  select (select id from guests where email='duc@example.com'),  (select id from hp_recep), 'confirmed' union all
  select (select id from guests where email='ha@example.com'),   (select id from hp_recep), 'confirmed' union all
  select (select id from guests where email='hai@example.com'),  (select id from hp_recep), 'pending'   union all
  select (select id from guests where email='lan@example.com'),  (select id from hp_recep), 'declined'  union all
  -- KK banquet: 5 confirmed, 2 pending
  select (select id from guests where email='weiming@example.com'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where email='meiling@example.com'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where email='kahwai@example.com'), (select id from kk_banq), 'confirmed' union all
  select (select id from guests where email='lihua@example.com'),  (select id from kk_banq), 'confirmed' union all
  select (select id from guests where email='boonhai@example.com'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where email='james@example.com'),  (select id from kk_banq), 'pending'   union all
  select (select id from guests where email='emily@example.com'),  (select id from kk_banq), 'pending'   union all
  -- KK Halal lunch: 3 confirmed, 1 pending
  select (select id from guests where email='siti@example.com'),   (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where email='faizal@example.com'), (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where email='aishah@example.com'), (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where email='lihua@example.com'),  (select id from kk_lunch), 'pending'
) rows
where gid is not null and eid is not null
on conflict (guest_id, event_id) do nothing;

-- Seating tables -------------------------------------------------------------
insert into seating_tables (wedding_id, name, capacity, sort_order)
select w.id, s.name, s.capacity, s.so
from (values
  ('HP','Family Table 1', 10, 1),
  ('HP','Family Table 2', 10, 2),
  ('HP','Friends Table', 10, 3),
  ('KK','Head Table', 8, 1),
  ('KK','Table A', 8, 2)
) as s(wcode,name,capacity,so)
join weddings w on w.code = s.wcode
where not exists (select 1 from seating_tables st where st.name = s.name and st.wedding_id = w.id);

-- Sample seat assignments (idempotent) ---------------------------------------
with hp_t1 as (select id from seating_tables where name = 'Family Table 1' limit 1),
     kk_h  as (select id from seating_tables where name = 'Head Table' limit 1)
insert into seating_assignments (table_id, guest_id)
select tid, gid from (
  select (select id from hp_t1) tid, (select id from guests where email='an@example.com') gid union all
  select (select id from hp_t1), (select id from guests where email='binh@example.com') union all
  select (select id from hp_t1), (select id from guests where email='cuong@example.com') union all
  select (select id from kk_h),  (select id from guests where email='weiming@example.com') union all
  select (select id from kk_h),  (select id from guests where email='meiling@example.com')
) rows
where tid is not null and gid is not null
on conflict (table_id, guest_id) do nothing;

-- Mood board items -----------------------------------------------------------
insert into moodboard_items (wedding_id, board, title, image_url, swatches, notes, sort_order)
select w.id, m.board, m.title, m.image_url, m.swatches, m.notes, m.so
from (values
  ('HP','Colour palette','Red & gold','https://picsum.photos/seed/hp-palette/600/400', array['#be123c','#d4af37','#fee2e2'], 'Auspicious reds with gold accents', 1),
  ('HP','Florals','Ceremony arch','https://picsum.photos/seed/hp-florals/600/400', array['#e11d48','#fb7185','#fde68a'], 'Roses + orchids', 2),
  ('HP','Décor','Banquet tablescape','https://picsum.photos/seed/hp-decor/600/400', array['#9f1239','#d4af37'], 'Round tables, gold chargers', 3),
  ('KK','Colour palette','Teal & gold','https://picsum.photos/seed/kk-palette/600/400', array['#0d9488','#d4af37','#ccfbf1'], 'Coastal teal with warm gold', 1),
  ('KK','Florals','Tropical blooms','https://picsum.photos/seed/kk-florals/600/400', array['#14b8a6','#f59e0b','#fca5a5'], 'Hibiscus + frangipani', 2)
) as m(wcode,board,title,image_url,swatches,notes,so)
join weddings w on w.code = m.wcode
where not exists (select 1 from moodboard_items mi where mi.title = m.title and mi.wedding_id = w.id);

-- Attire items ---------------------------------------------------------------
insert into attire_items (wedding_id, role, title, image_url, status, notes, sort_order)
select w.id, a.role, a.title, a.image_url, a.status, a.notes, a.so
from (values
  ('HP','bride','Áo dài (red & gold)','https://picsum.photos/seed/hp-bride/500/700','confirmed','Tailored, embroidered',1),
  ('HP','groom','Navy suit','https://picsum.photos/seed/hp-groom/500/700','inspiration','With gold tie',2),
  ('HP','family','Mothers'' áo dài','https://picsum.photos/seed/hp-family/500/700','inspiration','Coordinated colours',3),
  ('KK','bride','Qipao (teal)','https://picsum.photos/seed/kk-bride/500/700','confirmed','Silk, fitted',1),
  ('KK','groom','Changshan','https://picsum.photos/seed/kk-groom/500/700','inspiration','Matching teal',2)
) as a(wcode,role,title,image_url,status,notes,so)
join weddings w on w.code = a.wcode
where not exists (select 1 from attire_items ai where ai.title = a.title and ai.wedding_id = w.id);
