insert into profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Owner Absolut'),
  ('00000000-0000-0000-0000-000000000002', 'owner', 'Owner Van Gogh'),
  ('00000000-0000-0000-0000-000000000003', 'curator', 'Curator One'),
  ('00000000-0000-0000-0000-000000000004', 'admin', 'Admin One')
on conflict do nothing;

insert into rooms (id, owner_id, title, slug, theme, mission, visibility, qr_code_url, hero_image_url) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Absolut', 'absolut', 'Kuracja najwyzszej jakosci inspiracji', 'Porzadek i selekcja wiedzy.', 'public_room', 'https://www.mtaquestwebsidex.com/rooms/absolut', '/placeholder/absolut.jpg'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Van Gogh Edition', 'van-gogh-edition', 'Emocja i kolor', 'Narracja obrazu i gestu.', 'public_room', 'https://www.mtaquestwebsidex.com/rooms/van-gogh-edition', '/placeholder/van-gogh.jpg')
on conflict do nothing;

insert into entries (id, room_id, title, content, visibility, is_curated) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mapa selekcji', 'ABSOLUT laczy approved fragments.', 'curated_public', true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Kolor jako decyzja', 'Kazdy ton prowadzi emocje bez chaosu.', 'public_room', true)
on conflict do nothing;

insert into curations (id, entry_id, curator_status, featured_level, published_at) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'approved', 3, now())
on conflict do nothing;
