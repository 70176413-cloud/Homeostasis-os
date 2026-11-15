# HOMEOSTASIS-OS

The interface uses the FastAPI service in the sibling `backend` folder. Start
the backend from that folder:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Serve this folder with VS Code Live Server (or another static web server), then
open `index.html` from that server. The API defaults to `http://127.0.0.1:8000`.
To use a different backend address, set `window.HOMEOSTASIS_API_URL` in the
page before `js/api.js` loads.

The interface fetches crew dashboards at startup and sends simulator
interactions to the matching API endpoints. The API connection indicator in
the header reports connection and request errors.
