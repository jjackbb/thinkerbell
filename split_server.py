import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of async function startServer()
start_server_idx = content.find('async function startServer()')

if start_server_idx != -1:
    api_content = content[:start_server_idx]
    
    # Clean up the api_content: remove export default app; from the middle
    api_content = api_content.replace('export default app;\n', '')
    api_content += '\nexport default app;\n'
    
    with open('api/index.ts', 'w', encoding='utf-8') as f:
        f.write(api_content)
        
    server_content = 'import app from "./api/index.js";\nimport express from "express";\nimport path from "path";\n\n'
    server_content += 'const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;\n\n'
    server_content += content[start_server_idx:]
    
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(server_content)
        
    print("Successfully split server.ts and api/index.ts")
else:
    print("Could not find startServer()")
