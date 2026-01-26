-- Drop trigger and function with CASCADE to remove all dependencies
DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON transactions;
DROP FUNCTION IF EXISTS log_transaction_changes() CASCADE;