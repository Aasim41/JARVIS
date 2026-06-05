import sys
import json
from ddgs import DDGS

def main():
    if len(sys.argv) < 2:
        print(json.dumps([]))
        return
        
    query = sys.argv[1]
    results = []
    
    try:
        ddgs = DDGS()
        # Search using DuckDuckGo
        for r in ddgs.text(query, max_results=5):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")
            })
    except Exception as e:
        # Silently fail, returns empty array
        pass
        
    print(json.dumps(results))

if __name__ == "__main__":
    main()
