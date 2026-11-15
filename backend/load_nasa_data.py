import os
import sqlite3
import pandas as pd

DB_NAME = "nasa_spaceflight.db"
DATA_DIR = "data"

def load_all_datasets():
    print("🚀 Scanning 'backend/data/' folder for all NASA & Wearable datasets...")
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ Error: '{DATA_DIR}' folder not found!")
        return

    # SQLite Database Connection
    conn = sqlite3.connect(DB_NAME)
    print(f"📦 Connected to SQLite Database: {DB_NAME}")

    files_processed = 0

    # Recursive walk to find files inside subfolders (like Wearable_Dataset or OSD-656)
    for root, dirs, files in os.walk(DATA_DIR):
        for file in files:
            file_path = os.path.join(root, file)
            
            # Hum CSV files aur un files ko target karenge jo tabular data ho sakti hain
            if file.endswith(".csv") or file.endswith(".txt"):
                print(f"📄 Processing: {file} ...")
                try:
                    # Try reading as CSV/TSV/Tabular text
                    # Kuch files tab-separated ya comma-separated ho sakti hain, delimiter=None auto-detect karega ya comma try karega
                    df = None
                    for sep in [',', '\t', ';']:
                        try:
                            df = pd.read_csv(file_path, sep=sep, low_memory=False)
                            if df is not None and df.shape[1] > 1: # Agar multiple columns mil gayein matlab separator theek hai
                                break
                        except:
                            continue
                    
                    if df is None or df.empty:
                        df = pd.read_csv(file_path, low_memory=False) # Fallback standard read

                    # Clean table name for SQLite
                    table_name = file.replace(".", "_").replace("-", "_").replace(" ", "_").lower()
                    table_name = "".join(c for c in table_name if c.isalnum() or c == '_')
                    
                    # Save to Database
                    df.to_sql(table_name, conn, if_exists="replace", index=False)
                    print(f"   ✅ Saved to table: '{table_name}' ({len(df)} rows, {len(df.columns)} columns)")
                    files_processed += 1
                except Exception as e:
                    print(f"   ⚠️ Could not parse {file} as tabular data: {e}")

    conn.close()
    print(f"\n🎉 Success! Total {files_processed} dataset files successfully imported into '{DB_NAME}' database!")

if __name__ == "__main__":
    load_all_datasets()