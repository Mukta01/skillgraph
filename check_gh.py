import urllib.request
import json

def get_runs():
    url = "https://api.github.com/repos/Mukta01/skillgraph/actions/runs?per_page=5"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github.v3+json"})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for run in data.get("workflow_runs", []):
                print(f"Workflow: {run['name']}, Status: {run['status']}, Conclusion: {run['conclusion']}")
    except Exception as e:
        print("Error fetching runs:", e)

get_runs()
