-- Local dev seed: a couple of official mocks + sample questions per subject.
-- Real question banks are uploaded via the Vault/Arena upload pipeline (Phase 3).

insert into public.mocks (id, title, description, mock_type, source, marks_total, duration_minutes, status)
values
  ('00000000-0000-0000-0000-000000000001', 'GATE DA Full Mock — 01', 'Official full-length mock, 100 marks.', 'standard', 'official', 100, 180, 'published'),
  ('00000000-0000-0000-0000-000000000002', 'ML + AI Sectional Assault', 'Sectional mock covering Machine Learning and AI.', 'sectional', 'official', 40, 60, 'published');
