-- ============================================================================
-- Two Weddings — seed data (run AFTER schema.sql)
-- Populates the two weddings, five ceremonies, and sample vendors / budget /
-- guests / tasks so every module has live data to render. Re-runnable.
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

-- Vendors --------------------------------------------------------------------
-- Mirrors SEED_VENDORS in lib/seed-data.js so preview mode and a freshly seeded
-- database show the same list. Without this the vendors table was the only one
-- seed.sql left empty, which is what made the Vendors page look disconnected.
insert into vendors (wedding_id, name, category, contact_name, email, phone, contract_status, total_cost, deposit_paid, is_halal_certified, notes)
select w.id, v.name, v.category, v.contact_name, v.email, v.phone, v.contract_status, v.total_cost, v.deposit_paid, v.halal, v.notes
from (values
  ('HP','Hải Phòng Grand Palace','Venue','Mr. Tuấn','events@hpgrand.vn','+84 225 123 456','booked', 120000000, 40000000, false,'Banquet hall for Lễ Cưới, capacity 300.'),
  ('HP','Saigon Lens Studio','Photography','Linh Phạm','hello@saigonlens.vn','+84 90 234 5678','paid', 40000000, 40000000, false,'Photo + cinematic video, both VN events.'),
  ('HP','Áo Dài Hạnh Couture','Attire','Cô Hạnh','hanh@aodaicouture.vn','+84 91 555 1212','quoted', 60000000, 0, false,'Bridal áo dài + groom suits. Awaiting fitting.'),
  ('HP','Bloom & Petal Décor','Florals','Mai Nguyễn','studio@bloompetal.vn','+84 93 777 8899','enquiry', 30000000, 0, false,'Ceremony arch + table florals.'),
  ('KK','Sutera Harbour Resort','Venue','Ms. Farah','weddings@suteraharbour.my','+60 88 318 888','booked', 25000, 8000, true,'Ballroom for tea ceremony & banquet.'),
  ('KK','Borneo Halal Catering','Catering','Encik Razak','book@borneohalal.my','+60 16 820 4455','booked', 40000, 12000, true,'Halal-certified — Day 2 lunch + banquet.'),
  ('KK','KK Frame & Motion','Photography','Daniel Wong','daniel@kkframe.my','+60 12 345 6677','paid', 12000, 12000, false,'Photo + video for both KK events.'),
  ('KK','Sabah Premier Transfers','Transport','Mr. Lim','fleet@sabahtransfers.my','+60 17 998 2211','quoted', 5000, 0, false,'Guest shuttles, airport + venue.')
) as v(wcode,name,category,contact_name,email,phone,contract_status,total_cost,deposit_paid,halal,notes)
join weddings w on w.code = v.wcode
where not exists (select 1 from vendors x where x.name = v.name and x.wedding_id = w.id);

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
-- Keyed on full_name, not email: that column was dropped in e4a5668 and this
-- file was never updated, so every statement here errored until now. full_name
-- is not unique, which makes the guard weaker than the old one — it matches the
-- convention already used elsewhere in this file (tasks guard on title, events
-- on name_en), and it is the only natural key left on the table.
insert into guests (full_name, side, plus_one, plus_one_name, dietary)
select g.full_name, g.side, g.plus_one, g.plus_one_name, g.dietary
from (values
  ('Nguyễn Văn An',     'bride', true,  'Nguyễn Thị Mai',  '{}'::text[]),
  ('Trần Thị Bình',     'bride', false, null,              '{vegetarian}'::text[]),
  ('Lê Hoàng Cường',    'groom', true,  'Phạm Thị Hương',  '{}'::text[]),
  ('Phạm Thu Dung',     'bride', false, null,              '{}'::text[]),
  ('Đỗ Minh Đức',       'groom', true,  'Trần Thị Ngọc',   '{}'::text[]),
  ('Vũ Thị Hà',         'bride', false, null,              '{}'::text[]),
  ('Hoàng Văn Hải',     'groom', false, null,              '{}'::text[]),
  ('Bùi Thị Lan',       'bride', true,  'Bùi Văn Tú',      '{}'::text[]),
  ('Tan Wei Ming',      'groom', true,  'Tan Siew Lan',    '{}'::text[]),
  ('Lim Mei Ling',      'bride', false, null,              '{}'::text[]),
  ('Wong Kah Wai',      'groom', true,  'Wong Pui Yee',    '{}'::text[]),
  ('Siti Nurhaliza',    'bride', false, null,              '{halal}'::text[]),
  ('Ahmad Faizal',      'groom', true,  'Nurul Ain',       '{halal}'::text[]),
  ('Chong Li Hua',      'bride', false, null,              '{}'::text[]),
  ('Goh Boon Hai',      'groom', false, null,              '{}'::text[]),
  ('Aishah Binti Omar', 'bride', true,  'Omar Bin Yusof',  '{halal}'::text[]),
  ('James Carter',      'groom', true,  'Sarah Carter',    '{}'::text[]),
  ('Emily Watson',      'bride', false, null,              '{vegan}'::text[])
) as g(full_name,side,plus_one,plus_one_name,dietary)
where not exists (select 1 from guests gg where gg.full_name = g.full_name);

-- Link guests to receptions with statuses (idempotent).
with hp_recep as (select id from events where name_en = 'Wedding Reception (Lễ Cưới)' limit 1),
     kk_banq  as (select id from events where name_en = 'Tea Ceremony & Evening Banquet' limit 1),
     kk_lunch as (select id from events where name_en = 'Halal-Friendly Lunch' limit 1)
insert into guest_events (guest_id, event_id, rsvp_status)
select gid, eid, status from (
  -- HP reception: 6 confirmed, 1 pending, 1 declined
  select (select id from guests where full_name='Nguyễn Văn An') gid, (select id from hp_recep) eid, 'confirmed' status union all
  select (select id from guests where full_name='Trần Thị Bình'), (select id from hp_recep), 'confirmed' union all
  select (select id from guests where full_name='Lê Hoàng Cường'),(select id from hp_recep), 'confirmed' union all
  select (select id from guests where full_name='Phạm Thu Dung'), (select id from hp_recep), 'confirmed' union all
  select (select id from guests where full_name='Đỗ Minh Đức'),  (select id from hp_recep), 'confirmed' union all
  select (select id from guests where full_name='Vũ Thị Hà'),   (select id from hp_recep), 'confirmed' union all
  select (select id from guests where full_name='Hoàng Văn Hải'),  (select id from hp_recep), 'pending'   union all
  select (select id from guests where full_name='Bùi Thị Lan'),  (select id from hp_recep), 'declined'  union all
  -- KK banquet: 5 confirmed, 2 pending
  select (select id from guests where full_name='Tan Wei Ming'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where full_name='Lim Mei Ling'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where full_name='Wong Kah Wai'), (select id from kk_banq), 'confirmed' union all
  select (select id from guests where full_name='Chong Li Hua'),  (select id from kk_banq), 'confirmed' union all
  select (select id from guests where full_name='Goh Boon Hai'),(select id from kk_banq), 'confirmed' union all
  select (select id from guests where full_name='James Carter'),  (select id from kk_banq), 'pending'   union all
  select (select id from guests where full_name='Emily Watson'),  (select id from kk_banq), 'pending'   union all
  -- KK Halal lunch: 3 confirmed, 1 pending
  select (select id from guests where full_name='Siti Nurhaliza'),   (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where full_name='Ahmad Faizal'), (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where full_name='Aishah Binti Omar'), (select id from kk_lunch), 'confirmed' union all
  select (select id from guests where full_name='Chong Li Hua'),  (select id from kk_lunch), 'pending'
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
  select (select id from hp_t1) tid, (select id from guests where full_name='Nguyễn Văn An') gid union all
  select (select id from hp_t1), (select id from guests where full_name='Trần Thị Bình') union all
  select (select id from hp_t1), (select id from guests where full_name='Lê Hoàng Cường') union all
  select (select id from kk_h),  (select id from guests where full_name='Tan Wei Ming') union all
  select (select id from kk_h),  (select id from guests where full_name='Lim Mei Ling')
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
