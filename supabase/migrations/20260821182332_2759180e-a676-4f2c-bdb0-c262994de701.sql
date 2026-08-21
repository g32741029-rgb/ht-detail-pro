
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.vehicle_type AS ENUM ('carro','moto');
CREATE TYPE public.booking_status AS ENUM ('aguardando_orcamento','orcamento_enviado','aguardando_confirmacao','confirmado','concluido','cancelado');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.vehicle_type NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 60,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read" ON public.services FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "services admin all" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  vehicle_type public.vehicle_type NOT NULL,
  vehicle_model text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  custom_service text,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'aguardando_orcamento',
  price numeric(10,2),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bookings_active_slot_idx ON public.bookings (booking_date, booking_time)
  WHERE status <> 'cancelado';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings admin all" ON public.bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'Indisponível',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked dates public read" ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blocked dates admin all" ON public.blocked_dates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL,
  blocked_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocked_date, blocked_time)
);
GRANT SELECT ON public.blocked_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_slots TO authenticated;
GRANT ALL ON public.blocked_slots TO service_role;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked slots public read" ON public.blocked_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blocked slots admin all" ON public.blocked_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'Detalhamento',
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery public read" ON public.gallery_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "gallery admin all" ON public.gallery_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_taken_slots(_date date)
RETURNS TABLE (slot time) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT booking_time FROM public.bookings WHERE booking_date = _date AND status <> 'cancelado'
  UNION
  SELECT blocked_time FROM public.blocked_slots WHERE blocked_date = _date;
$$;
GRANT EXECUTE ON FUNCTION public.get_taken_slots(date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_booking(
  _customer_name text, _customer_phone text, _vehicle_type public.vehicle_type,
  _vehicle_model text, _service_id uuid, _service_name text, _custom_service text,
  _booking_date date, _booking_time time
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF length(trim(_customer_name)) < 2 OR length(_customer_name) > 100 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(regexp_replace(_customer_phone,'\D','','g')) NOT BETWEEN 10 AND 13 THEN RAISE EXCEPTION 'Telefone inválido'; END IF;
  IF length(trim(_vehicle_model)) < 2 OR length(_vehicle_model) > 100 THEN RAISE EXCEPTION 'Modelo inválido'; END IF;
  IF _booking_date < current_date THEN RAISE EXCEPTION 'Data indisponível'; END IF;
  IF EXTRACT(ISODOW FROM _booking_date) > 5 THEN RAISE EXCEPTION 'Data indisponível'; END IF;
  IF _booking_time NOT IN ('08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00') THEN RAISE EXCEPTION 'Horário inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE blocked_date = _booking_date) THEN RAISE EXCEPTION 'Data indisponível'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_slots WHERE blocked_date = _booking_date AND blocked_time = _booking_time) THEN RAISE EXCEPTION 'Horário indisponível'; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE booking_date = _booking_date AND booking_time = _booking_time AND status <> 'cancelado') THEN RAISE EXCEPTION 'Horário indisponível'; END IF;

  INSERT INTO public.bookings (customer_name, customer_phone, vehicle_type, vehicle_model, service_id, service_name, custom_service, booking_date, booking_time)
  VALUES (trim(_customer_name), trim(_customer_phone), _vehicle_type, trim(_vehicle_model), _service_id, _service_name, nullif(trim(coalesce(_custom_service,'')),''), _booking_date, _booking_time)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_booking(text,text,public.vehicle_type,text,uuid,text,text,date,time) TO anon, authenticated;

INSERT INTO public.services (name, category, description, duration_minutes, sort_order) VALUES
('Vitrificação de pintura','carro','Proteção cerâmica que realça o brilho e protege a pintura por meses.',480,1),
('Vitrificação total','carro','Vitrificação completa: pintura, vidros, rodas e plásticos.',600,2),
('Polimento','carro','Remoção de riscos e marcas, devolvendo o brilho original.',240,3),
('Lavagem detalhada','carro','Lavagem técnica minuciosa por dentro e por fora.',120,4),
('Higienização interna','carro','Limpeza profunda de bancos, carpetes, teto e painéis.',240,5),
('Vitrificação','moto','Proteção cerâmica para pintura e partes plásticas da moto.',300,6),
('Polimento','moto','Polimento técnico para remover riscos e recuperar o brilho.',180,7),
('Lavagem detalhada','moto','Lavagem detalhada com atenção a cada componente.',90,8),
('Pintura geral','moto','Serviço completo de pintura e acabamento.',960,9);
