import os
import sys
import requests


def main():
    base_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
    sample_path = os.path.join(os.path.dirname(__file__), "test_data", "..", "..", "public", "sample", "Gazetted-Digital-Assets-and-Registered-Exchanges-Act-2024.pdf")
    sample_path = os.path.normpath(sample_path)

    if not os.path.exists(sample_path):
        print(f"Sample not found: {sample_path}")
        sys.exit(1)

    session_id = f"test-{os.getpid()}"

    with open(sample_path, "rb") as f:
        files = {"file": (os.path.basename(sample_path), f, "application/pdf")}
        data = {"session_id": session_id}

        print(f"POST {base_url}/api/extract with {os.path.basename(sample_path)} ...")
        resp = requests.post(f"{base_url}/api/extract", files=files, data=data, timeout=600)
        if resp.status_code != 200:
            print("Request failed:", resp.status_code, resp.text)
            sys.exit(2)

        result = resp.json()
        hierarchy_nodes = len(result.get("document_data", {}).get("hierarchy", []))
        entity_count = len(result.get("entity_graph", {}).get("entities", []))
        print(f"✅ SUCCESS. Hierarchy nodes: {hierarchy_nodes}, Entities: {entity_count}")


if __name__ == "__main__":
    main()


