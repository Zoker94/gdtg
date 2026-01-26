-- Fix transaction deletion by adding CASCADE to foreign key constraints
-- This allows automatic deletion of related logs and messages when a transaction is deleted

-- Drop existing foreign key constraints
ALTER TABLE transaction_logs 
DROP CONSTRAINT IF EXISTS transaction_logs_transaction_id_fkey;

ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_transaction_id_fkey;

-- Re-add constraints with ON DELETE CASCADE
ALTER TABLE transaction_logs 
ADD CONSTRAINT transaction_logs_transaction_id_fkey 
FOREIGN KEY (transaction_id) 
REFERENCES transactions(id) 
ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT messages_transaction_id_fkey 
FOREIGN KEY (transaction_id) 
REFERENCES transactions(id) 
ON DELETE CASCADE;