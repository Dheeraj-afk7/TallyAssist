import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

def run_migration():
    print("Connecting to database to add category column...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Add column if it doesn't exist
        cur.execute("""
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE invoices ADD COLUMN category VARCHAR DEFAULT 'Uncategorized';
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column category already exists in invoices.';
                END;
            END $$;
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Migration successful! Added 'category' column.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
