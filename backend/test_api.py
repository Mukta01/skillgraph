import requests

# 1. Create a dummy resume text file
dummy_resume_content = """
Mukta
Email: mukta@example.com
Target: Cloud Engineer

Professional Summary:
Enthusiastic developer with hands-on experience in building Python applications and setting up local container environments. Looking to transition into a Cloud Engineer role.

Technical Skills:
- Programming: Python, HTML, CSS, JavaScript
- Frameworks: FastAPI, Next.js
- Tools & Databases: Docker, PostgreSQL, Git, VS Code
- Systems: Windows, Linux
"""

resume_filename = "dummy_resume.txt"
with open(resume_filename, "w", encoding="utf-8") as f:
    f.write(dummy_resume_content)

print(f"Created temporary file: {resume_filename}")

# 2. Configure request details
url = "http://localhost:8000/api/analyze"
files = {"resume": (resume_filename, open(resume_filename, "rb"), "text/plain")}
data = {"target_role": "Cloud Engineer"}

print(f"Sending POST request to {url} for target role: '{data['target_role']}'...")

try:
    response = requests.post(url, files=files, data=data)
    print(f"Response Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n=== End-to-End Test Succeeded ===")
        print(f"Session ID: {result.get('session_id')}")
        print(f"Readiness Score: {result['gap']['readiness_score'] * 100:.1f}%")
        
        print("\nMatched Skills:")
        for skill in result['gap']['matched_skills']:
            print(f" [OK] {skill['name']} - User Level: {skill['user_level']}, Required: {skill['required_level']}")
            
        print("\nMissing Skills:")
        for skill in result['gap']['missing_skills']:
            print(f" [MISS] {skill['name']} ({skill['category']}) - Level: {skill['level']}")
            
        print("\nPhased Learning Roadmap:")
        for phase in result['roadmap']['phases']:
            skill_names = [s['name'] for s in phase['skills']]
            print(f"\n[PHASE] {phase['title']} (Duration: {phase['duration_weeks']} weeks)")
            print(f"   Skills covered: {', '.join(skill_names)}")
            print("   Resources:")
            for s in phase['skills']:
                for resource in s['resources']:
                    print(f"     - [{resource['type']}] {s['name']} - {resource['title']}: {resource['url']}")
    else:
        print(f"Test Failed: {response.text}")
        
except Exception as e:
    print(f"Request failed: {e}")

finally:
    # Close file handle and clean up
    files["resume"][1].close()
    import os
    if os.path.exists(resume_filename):
        os.remove(resume_filename)
        print(f"Cleaned up temporary file: {resume_filename}")
