from copy import deepcopy
from typing import Dict, List, Optional
import sqlite3
import os
from .data_seed import SEED_CREW_PROFILES, SEED_MED_KIT
from .models import CrewVitals, MedKitItem, MicroCheckLogEntry, VitalsPatch

DB_PATH = "nasa_spaceflight.db"

class MissionStore:
    """
    Stateful mission store integrated with local SQLite NASA database ('nasa_spaceflight.db')
    and fallback memory for simulation and microcheck histories.
    """

    def __init__(self) -> None:
        self._crew: Dict[str, CrewVitals] = deepcopy(SEED_CREW_PROFILES)
        self._med_kit: List[MedKitItem] = deepcopy(SEED_MED_KIT)
        self._microcheck_logs: Dict[str, List[MicroCheckLogEntry]] = {}
        
        # Load any dynamic data or crew info from SQLite if available
        self._sync_with_db()

    def _sync_with_db(self) -> None:
        """Fetch records from local SQLite NASA database if it exists"""
        if os.path.exists(DB_PATH):
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                
                # Check tables in database (e.g., subject_info or target info)
               # cursor.name = DB_PATH
                # Example: If subject_info table exists, we could load extra crew metadata here
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]
                print(f"📊 Connected to Database. Active tables found: {len(tables)}")
                
                conn.close()
            except Exception as e:
                print(f"⚠️ Could not sync store with SQLite DB: {e}")

    def list_crew(self) -> List[CrewVitals]:
        return list(self._crew.values())

    def get_crew(self, crew_id: str) -> Optional[CrewVitals]:
        # Check in-memory state first (updated via patches/simulations)
        if crew_id in self._crew:
            return self._crew.get(crew_id)
            
        # Optional: Try fetching/mapping dynamically from SQLite database tables if crew_id matches a record
        return self._crew.get(crew_id)

    def update_crew(self, vitals: CrewVitals) -> CrewVitals:
        self._crew[vitals.crew_id] = vitals
        return vitals

    def patch_crew_vitals(self, crew_id: str, patch: VitalsPatch) -> Optional[CrewVitals]:
        current = self._crew.get(crew_id)
        if not current:
            return None
        updates = patch.model_dump(exclude_none=True)
        updated = current.model_copy(update=updates)
        self._crew[crew_id] = updated
        return updated

    def get_med_kit(self) -> List[MedKitItem]:
        return self._med_kit

    def get_med(self, med_id: str) -> Optional[MedKitItem]:
        for med in self._med_kit:
            if med.med_id == med_id:
                return med
        return None

    def log_microcheck(self, entry: MicroCheckLogEntry) -> None:
        history = self._microcheck_logs.setdefault(entry.crew_id, [])
        history.insert(0, entry)  # newest first

    def get_microcheck_history(self, crew_id: str) -> List[MicroCheckLogEntry]:
        return self._microcheck_logs.get(crew_id, [])

    def reset_demo_state(self) -> None:
        self._crew = deepcopy(SEED_CREW_PROFILES)
        self._med_kit = deepcopy(SEED_MED_KIT)
        self._microcheck_logs = {}
        self._sync_with_db()


store = MissionStore()