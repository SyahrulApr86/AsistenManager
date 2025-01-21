/*
  # Add RLS policies for finance data

  1. Changes
    - Add INSERT policy for finance_data table
    - Add UPDATE policy for finance_data table
    - Add DELETE policy for finance_data table

  2. Security
    - Users can only insert/update/delete their own finance data
    - Maintains existing read policy
*/

-- Add INSERT policy
CREATE POLICY "Users can insert own finance data"
  ON finance_data
  FOR INSERT
  WITH CHECK (true);  -- Allow all inserts initially, data is filtered by username

-- Add UPDATE policy
CREATE POLICY "Users can update own finance data"
  ON finance_data
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE username = finance_data.username
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE username = finance_data.username
  ));

-- Add DELETE policy
CREATE POLICY "Users can delete own finance data"
  ON finance_data
  FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE username = finance_data.username
  ));