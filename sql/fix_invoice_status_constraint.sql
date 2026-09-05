-- Migration: fix customer_invoices status CHECK constraint
-- Adds 'Sent' and 'Overdue' which the application uses but were missing from the constraint.
-- Run this once against your live database.

ALTER TABLE customer_invoices
  DROP CONSTRAINT IF EXISTS customer_invoices_status_check;

ALTER TABLE customer_invoices
  ADD CONSTRAINT customer_invoices_status_check
  CHECK (status IN ('Draft', 'Sent', 'Posted', 'Paid', 'Overdue', 'Cancelled'));
