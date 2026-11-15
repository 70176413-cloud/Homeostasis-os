window.HomeostasisApi = (() => {
  const baseUrl = (window.HOMEOSTASIS_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = payload && payload.detail ? payload.detail : `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return payload;
  }

  function post(path, body) {
    return request(path, { method: "POST", body: JSON.stringify(body) });
  }

  return {
    health: () => request("/health"),
    listCrew: () => request("/api/crew"),
    dashboard: crewId => request(`/api/dashboard/${encodeURIComponent(crewId)}`),
    evaluateConflicts: (crewId, protocol) =>
      post(`/api/conflicts/evaluate/${encodeURIComponent(crewId)}`, protocol),
    simulateDose: (crewId, medId) =>
      post(`/api/rx-drift/${encodeURIComponent(crewId)}/simulate-dose/${encodeURIComponent(medId)}?log_consumption=false`),
    submitMicroCheck: payload => post("/api/microcheck", payload),
    whatIf: payload => post("/api/what-if", payload)
  };
})();
