/*
  # Create finance table

  1. New Tables
    - `finance_data`
      - `id` (uuid, primary key)
      - `username` (text, not null)
      - `year` (integer, not null)
      - `month` (integer, not null)
      - `npm` (text, not null)
      - `asisten` (text, not null)
      - `bulan` (text, not null)
      - `mata_kuliah` (text, not null)
      - `jumlah_jam` (text, not null)
      - `honor_per_jam` (text, not null)
      - `jumlah_pembayaran` (text, not null)
      - `status` (text, not null)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `finance_data` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS finance_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  npm text NOT NULL,
  asisten text NOT NULL,
  bulan text NOT NULL,
  mata_kuliah text NOT NULL,
  jumlah_jam text NOT NULL,
  honor_per_jam text NOT NULL,
  jumlah_pembayaran text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS finance_data_username_year_month_idx ON finance_data (username, year, month);

-- Enable RLS
ALTER TABLE finance_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own finance data"
  ON finance_data
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE username = finance_data.username
  ));

-- Function to update updated_at on update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_finance_data_updated_at
  BEFORE UPDATE ON finance_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();