import requests

try:
    url = "https://api.github.com/repos/Mukta01/skillgraph/actions/runs?per_page=5"
    r = requests.get(url).json()
    print("=== GitHub Actions Run Statuses ===")
    for run in r.get('workflow_runs', []):
        print(f"Workflow: {run['name']}")
        print(f"  Status:     {run['status']}")
        print(f"  Conclusion: {run['conclusion']}")
        print(f"  Created At: {run['created_at']}")
        print(f"  Commit:     {run['head_commit']['message'].strip() if run.get('head_commit') else 'N/A'}")
        print("-" * 40)
except Exception as e:
    print(f"Error checking runs: {e}")
