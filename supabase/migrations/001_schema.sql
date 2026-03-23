-- Enums
CREATE TYPE order_status AS ENUM (
  'concept', 'bevestigd', 'in_behandeling', 'geleverd', 'gefactureerd'
);

CREATE TYPE factuur_status AS ENUM ('concept', 'verzonden', 'betaald');

-- Klanten
CREATE TABLE klanten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Facturatie codes
CREATE TABLE facturatie_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  omschrijving text NOT NULL,
  tarief numeric(10, 4) NOT NULL,
  actief boolean NOT NULL DEFAULT true,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Profielen (mirrors auth.users for display names)
CREATE TABLE profielen (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  naam text NOT NULL,
  email text NOT NULL,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_nummer text NOT NULL UNIQUE,
  order_code text NOT NULL,
  klant_id uuid NOT NULL REFERENCES klanten(id),
  facturatie_code_id uuid NOT NULL REFERENCES facturatie_codes(id),
  order_grootte integer NOT NULL CHECK (order_grootte > 0),
  aantal_per_doos integer NOT NULL DEFAULT 0,
  aantal_per_inner integer NOT NULL DEFAULT 0,
  aantal_per_pallet integer NOT NULL DEFAULT 0,
  bewerking text NOT NULL DEFAULT '',
  opwerken boolean NOT NULL DEFAULT false,
  omschrijving text NOT NULL DEFAULT '',
  status order_status NOT NULL DEFAULT 'concept',
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Facturen (created before leveringen FK to avoid circular reference)
CREATE TABLE facturen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_nummer text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id),
  totaal_eenheden integer NOT NULL,
  tarief numeric(10, 4) NOT NULL,
  totaal_bedrag numeric(12, 2) NOT NULL,
  status factuur_status NOT NULL DEFAULT 'concept',
  factuurdatum date NOT NULL DEFAULT CURRENT_DATE,
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Leveringen
CREATE TABLE leveringen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  factuur_id uuid REFERENCES facturen(id),
  aantal_geleverd integer NOT NULL CHECK (aantal_geleverd > 0),
  leverdatum date NOT NULL,
  notities text NOT NULL DEFAULT '',
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);
